"""Behavioral contracts: arithmetic, finalization, immutable storage and PDF flow."""
import copy
from datetime import datetime, timedelta
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('quote', ROOT / 'scripts/quote.py')
q = importlib.util.module_from_spec(spec)
spec.loader.exec_module(q)


def fixture(name='short', final=True):
    data = q.read_json(ROOT / 'samples' / (name + '.json'))
    if final:
        data['confirmed'] = dict.fromkeys(['client', 'scope', 'price', 'payment'], True)
        data['issue_date'] = datetime.now(q.MANILA).date().isoformat()
    return data


class QuoteTests(unittest.TestCase):
    def test_draft_sentinels_cannot_become_final(self):
        d = fixture(); d['client'] = {}
        draft = q.validate(d, 'draft')
        draft['confirmed'] = dict.fromkeys(['client', 'scope', 'price', 'payment'], True)
        with self.assertRaises(q.QuoteError): q.validate(draft, 'final')

    def test_long_quantity_is_one_number(self):
        d = fixture('mixed')
        d['services'] = [dict(d['services'][0], quantity='000123456.789', unit_price='1.00')]
        d['pricing']['total'] = '123456.79'
        d['payments'] = [{'trigger': 'On completion', 'amount': '123456.79'}]
        with tempfile.TemporaryDirectory() as out:
            result = q.issue(d, 'final', out)
            text = '\n'.join(p.extract_text() for p in PdfReader(result['pdf']).pages)
            self.assertIn('123456.789', text)
            self.assertNotIn('000123456', text)

    def test_decimal_rounding_and_milestones(self):
        d = fixture('mixed')
        d['services'] = [dict(d['services'][0], quantity='3', unit_price='0.10')]
        d['pricing']['total'] = '0.30'
        d['payments'] = [{'trigger': 'On completion', 'amount': '0.30'}]
        self.assertEqual(q.validate(d)['services'][0]['amount'], '0.30')
        d['services'][0]['quantity'] = '1.5'
        d['services'][0]['unit_price'] = '0.01'
        d['pricing']['total'] = d['payments'][0]['amount'] = '0.02'
        self.assertEqual(q.validate(d)['services'][0]['amount'], '0.02')

    def test_mismatches_fail_before_any_pdf(self):
        cases = []
        d = fixture('mixed'); d['pricing']['total'] = '99998.99'; cases.append(d)
        d = fixture('mixed'); d['services'][0]['amount'] = '1.00'; cases.append(d)
        d = fixture(); d['payments'][0]['amount'] = '1.00'; cases.append(d)
        d = fixture(); d['payments'][0]['percent'] = '50'; cases.append(d)
        for d in cases:
            with self.subTest(data=d['pricing']), tempfile.TemporaryDirectory() as out:
                with self.assertRaises(q.QuoteError):
                    q.issue(d, 'final', Path(out) / 'private')
                self.assertFalse(list(Path(out).rglob('*.pdf')))

    def test_no_implicit_fees_or_package_breakdown(self):
        for field in ['tax', 'discount', 'fee', 'currency']:
            d = fixture(); d['pricing'][field] = '12'
            with self.assertRaises(q.QuoteError): q.validate(d)
        d = fixture(); d['services'][0]['unit_price'] = '99999'
        with self.assertRaises(q.QuoteError): q.validate(d)

    def test_bad_amounts_and_quantities(self):
        for amount in [1.23, '-1', 'NaN', 'Infinity', '1.001', '1,000', True, None, '0']:
            d = fixture(); d['pricing']['total'] = amount
            with self.subTest(amount=amount), self.assertRaises(q.QuoteError): q.validate(d)
        for quantity in ['0', '-1', 'NaN', '1.0001', 3]:
            d = fixture('mixed'); d['services'][0]['quantity'] = quantity
            with self.subTest(quantity=quantity), self.assertRaises(q.QuoteError): q.validate(d)

    def test_missing_fields_and_confirmations(self):
        for field in ['client', 'scope', 'price', 'payment']:
            d = fixture(); d['confirmed'][field] = False
            with self.assertRaises(q.QuoteError): q.validate(d)
        for field in ['name', 'site']:
            d = fixture(); d['client'].pop(field)
            with self.assertRaises(q.QuoteError): q.validate(d)
        for field in ['payments', 'services']:
            d = fixture(); d[field] = []
            with self.assertRaises(q.QuoteError): q.validate(d)

    def test_placeholder_and_html_handling(self):
        for text in ['TBD', 'TODO', '[client name]', '{{site}}', 'Lorem ipsum']:
            d = fixture(); d['summary'] = text
            with self.assertRaises(q.QuoteError): q.validate(d)
        with tempfile.TemporaryDirectory() as out:
            d = fixture(); d['client']['name'] = 'Sample <b>literal</b> & Co.'
            result = q.issue(d, 'draft', out)
            text = ''.join(p.extract_text() for p in PdfReader(result['pdf']).pages)
            self.assertIn('<b>literal</b> & Co.', text)

    def test_unknown_fields_and_services_rejected(self):
        d = fixture(); d['hidden_charge'] = '99'
        with self.assertRaises(q.QuoteError): q.validate(d)
        d = fixture(); d['services'][0]['group'] = 'made-up'
        with self.assertRaises(q.QuoteError): q.validate(d)
        d = fixture(); d['confirmed']['scope'] = 'true'
        with self.assertRaises(q.QuoteError): q.validate(d)

    def test_dates_default_and_expiry(self):
        d = fixture(); d.pop('issue_date'); d.pop('valid_days')
        normalized = q.validate(d)
        self.assertEqual(normalized['issue_date'], datetime.now(q.MANILA).date().isoformat())
        self.assertEqual(normalized['valid_days'], 30)
        d['issue_date'] = '1999-01-01'
        with self.assertRaises(q.QuoteError): q.validate(d)
        d = fixture(); d['valid_days'] = True
        with self.assertRaises(q.QuoteError): q.validate(d)

    def test_private_storage_and_input_boundaries(self):
        for path in [ROOT / 'clients', ROOT.parents[2] / 'public' / 'quotes']:
            with self.assertRaises(q.QuoteError): q.private_path(path)
        with tempfile.TemporaryDirectory() as out:
            repo = Path(out) / 'checkout'; repo.mkdir(); (repo / '.git').write_text('gitdir: elsewhere')
            with self.assertRaises(q.QuoteError): q.private_path(repo / 'quotes')
            with self.assertRaises(q.QuoteError): q.private_path(Path(out) / 'public' / 'quotes')

    def test_quote_numbers_revisions_and_sources(self):
        with tempfile.TemporaryDirectory() as out:
            first = q.issue(fixture(), 'final', out)
            original_bytes = Path(first['pdf']).read_bytes()
            saved = q.read_json(first['source'])
            second = q.issue(saved, 'final', out, revise=first['quote_id'])
            third = q.issue(fixture(), 'final', out)
            self.assertEqual(second['quote_id'], first['quote_id'])
            self.assertEqual(second['revision'], 2)
            self.assertNotEqual(third['quote_id'], first['quote_id'])
            self.assertEqual(original_bytes, Path(first['pdf']).read_bytes())
            self.assertEqual(saved['issue_date'], q.read_json(second['source'])['issue_date'])
            expected = (datetime.now(q.MANILA).date() + timedelta(days=30)).isoformat()
            self.assertEqual(saved['record']['expires_on'], expected)
            self.assertTrue((Path(first['source']).parent / 'source/scripts/quote.py').exists())
            self.assertEqual(len(q.read_json(Path(out) / 'register.json')['entries']), 3)

    def test_unknown_revision_and_locks(self):
        with tempfile.TemporaryDirectory() as out:
            with self.assertRaises(q.QuoteError): q.issue(fixture(), 'final', out, revise='OCE-19990101-001')
            (Path(out) / '.quotation.lock').write_text('999999')
            with self.assertRaises(q.QuoteError): q.issue(fixture(), 'final', out)
            self.assertTrue((Path(out) / '.quotation.lock').exists())

    def test_corrupt_register_preserved(self):
        with tempfile.TemporaryDirectory() as out:
            register = Path(out) / 'register.json'; register.write_text('{broken')
            with self.assertRaises(q.QuoteError): q.issue(fixture(), 'final', out)
            self.assertEqual(register.read_text(), '{broken')
            self.assertFalse(list(Path(out).rglob('*.pdf')))

    def test_failed_render_allocates_no_final_number(self):
        with tempfile.TemporaryDirectory() as out, patch.object(q, 'render_pdf', side_effect=q.QuoteError('failure')):
            with self.assertRaises(q.QuoteError): q.issue(fixture(), 'final', out)
            self.assertFalse(list(Path(out).glob('OCE-*')))
            self.assertFalse(list(Path(out).glob('.pending-*')))

    def test_draft_is_marked_and_does_not_allocate_final_id(self):
        with tempfile.TemporaryDirectory() as out:
            result = q.issue(fixture(final=False), 'draft', out)
            self.assertTrue(result['quote_id'].startswith('DRAFT-'))
            for page in PdfReader(result['pdf']).pages:
                self.assertIn('NOT APPROVED FOR CLIENT ACCEPTANCE', page.extract_text())

    def test_sample_pdf_content_pagination_and_embedded_fonts(self):
        with tempfile.TemporaryDirectory() as out:
            for name in ['short', 'mixed', 'long']:
                result = q.sample(name, out)
                reader = PdfReader(result['pdf'])
                texts = [p.extract_text() for p in reader.pages]
                text = '\n'.join(texts)
                self.assertNotIn('\x00', text, 'Generated currency must not use a missing glyph.')
                if name == 'short':
                    self.assertEqual(len(reader.pages), 1, 'Short quote must not strand acceptance on page 2.')
                self.assertIn('₱99,999.00', text)
                self.assertIn('31 Jan 1999', text)
                self.assertIn('Client signature over printed name', text)
                for i, page in enumerate(reader.pages):
                    self.assertIn('SAMPLE ONLY', texts[i])
                    self.assertIn(f'Page {i + 1}', texts[i])
                    self.assertIn('SAMPLE-' + name.upper(), texts[i])
                    for font in page['/Resources']['/Font'].values():
                        font = font.get_object()
                        if '/FontDescriptor' in font:
                            self.assertIn('/FontFile2', font['/FontDescriptor'])
                if name == 'long':
                    self.assertGreater(len(reader.pages), 2)
                    self.assertIn('Scope & pricing', texts[0], 'Long table should start on the first page.')
                    self.assertIn('Scope notes & conditions', texts[-1], 'Do not strand acceptance by itself.')
                    self.assertIn('END OF EXTENDED STP SCOPE.', text)
                    self.assertIn('Sample review item 24', text)
                    self.assertGreater(sum('SERVICE / AGREED SCOPE' in t for t in texts), 1)

    def test_missing_font_and_glyph_fail_clearly(self):
        with tempfile.TemporaryDirectory() as out:
            with self.assertRaises(q.QuoteError): q.sample('short', out, font_dir=out)
            d = fixture(); d['client']['name'] = 'Unsupported \U0001F600'
            with self.assertRaises(q.QuoteError): q.issue(d, 'final', out)


if __name__ == '__main__':
    unittest.main()
