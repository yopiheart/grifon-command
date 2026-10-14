"""Behavioral contracts: arithmetic, finalization, immutable storage and PDF flow."""
import copy
from datetime import datetime, timedelta
import importlib.util
import json
import shutil
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from pypdf import PdfReader
from reportlab.pdfbase import pdfmetrics

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


def text_positions(page):
    """Read emitted baselines and right edges in page coordinates, not cell boxes."""
    roles = {}
    for role in ['OBody', 'OBold', 'OTitle', 'OHeading']:
        name = pdfmetrics.getFont(role).face.name
        roles[name.decode() if isinstance(name, bytes) else name] = role
    result = []

    def visit(text, cm, tm, font, size):
        line = text.rstrip('\n')
        if not line or '\n' in line or font is None:
            return
        font_name = str(font['/BaseFont']).lstrip('/').split('+')[-1]
        if font_name not in roles:
            return
        advance = pdfmetrics.stringWidth(line, roles[font_name], size)
        x = tm[4] * cm[0] + tm[5] * cm[2] + cm[4]
        y = tm[4] * cm[1] + tm[5] * cm[3] + cm[5]
        right = x + advance * (tm[0] * cm[0] + tm[1] * cm[2])
        result.append({'text': line, 'x': x, 'y': y, 'right': right})

    page.extract_text(visitor_text=visit)
    return result


class QuoteTests(unittest.TestCase):
    def test_changed_font_selection_fails_before_mismatched_snapshot(self):
        q.register_fonts()
        for alternate_face in [True, False]:
            with self.subTest(alternate_face=alternate_face), tempfile.TemporaryDirectory() as out:
                selected = Path(out) / 'selected-fonts'
                shutil.copytree(ROOT / 'assets/fonts', selected)
                regular = selected / 'OceanidesSans-Regular.ttf'
                if alternate_face:
                    regular.write_bytes((selected / 'OceanidesSans-Semibold.ttf').read_bytes())
                else:
                    # A valid newer file can keep the same PostScript face name.
                    regular.write_bytes(regular.read_bytes() + b'\0\0\0\0')
                store = Path(out) / 'private-quotes'
                with self.assertRaisesRegex(q.QuoteError, 'fresh process'):
                    q.issue(fixture(), 'final', store, font_dir=selected)
                self.assertFalse(list(store.rglob('*.pdf')))
                self.assertFalse(list(store.glob('OCE-*')))

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

    def test_package_separate_load_count_is_one_number(self):
        d = fixture()
        d['services'][0].update(quantity='1', unit='project', loads='123456789')
        with tempfile.TemporaryDirectory() as out:
            result = q.issue(d, 'final', out)
            text = '\n'.join(page.extract_text() for page in PdfReader(result['pdf']).pages)
            self.assertIn('123456789', text, 'The separate load count must remain one readable number.')
            self.assertNotRegex(text, r'12345678\s+9|1234567\s+89|123456\s+789')

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

    def test_siphoning_loads_volume_and_money_are_independent(self):
        d = fixture('siphoning')
        item = q.validate(d)['services'][0]
        self.assertEqual(item['quantity'], '3')
        self.assertEqual(item['loads'], '3')
        self.assertEqual(item['volume']['total'], '30')
        self.assertEqual(item['amount'], '37500.75', 'Volume must not multiply the load price again.')
        self.assertEqual(q.validate(d)['payments'][1]['amount'], '18750.37')

    def test_siphoning_derives_total_volume_and_load_count(self):
        d = fixture('siphoning')
        d['services'][0].pop('loads')
        d['services'][0]['volume'].pop('total')
        item = q.validate(d)['services'][0]
        self.assertEqual(item['loads'], '3')
        self.assertEqual(item['volume']['total'], '30')
        # Explicit load counts also work when the billed unit is not a load.
        d = fixture()
        d['services'][0].update(loads='3', volume={'unit': 'L', 'basis': 'capacity', 'per_load': '10000'})
        item = q.validate(d)['services'][0]
        self.assertEqual(item['volume']['total'], '30000')

    def test_volume_only_and_estimates_do_not_invent_loads(self):
        d = fixture()
        d['services'][0]['volume'] = {'unit': 'm³', 'basis': 'estimated', 'total': '30.125'}
        item = q.validate(d)['services'][0]
        self.assertEqual(item['volume']['total'], '30.125')
        self.assertNotIn('loads', item)
        self.assertNotIn('per_load', item['volume'])

    def test_volume_billing_matches_volume_and_converts_units(self):
        for unit in ['m³', 'm3', 'cbm']:
            for volume_unit, volume in [('m³', '30'), ('L', '30000')]:
                d = fixture('siphoning')
                d['services'][0].update(quantity='30', unit=unit, unit_price='1250.02',
                                         volume={'unit': volume_unit, 'basis': 'included', 'total': volume})
                d['pricing']['total'] = '37500.60'
                d['payments'] = [{'trigger': 'On completion', 'amount': '37500.60'}]
                with self.subTest(unit=unit, volume_unit=volume_unit):
                    self.assertEqual(q.validate(d)['services'][0]['amount'], '37500.60')
        for unit in ['L', 'liters', 'litres']:
            d = fixture('siphoning')
            d['services'][0].update(quantity='30000', unit=unit, unit_price='1.25',
                                     volume={'unit': 'm³', 'basis': 'included', 'total': '30'})
            d['pricing']['total'] = '37500.00'
            d['payments'] = [{'trigger': 'On completion', 'amount': '37500.00'}]
            with self.subTest(unit=unit):
                self.assertEqual(q.validate(d)['services'][0]['amount'], '37500.00')

    def test_package_can_show_quantities_without_invented_rates(self):
        for details in [
            {'quantity': '3', 'unit': 'loads'},
            {'loads': '3', 'volume': {'unit': 'm³', 'basis': 'included', 'per_load': '10'}},
            {'quantity': '30', 'unit': 'm³', 'volume': {'unit': 'm³', 'basis': 'included', 'total': '30'}},
        ]:
            d = fixture(); d['services'][0].update(details)
            with self.subTest(details=details):
                item = q.validate(d)['services'][0]
                self.assertNotIn('unit_price', item)
                self.assertNotIn('amount', item)
                self.assertEqual(q.validate(d)['pricing']['total'], '99999.00')
            for forbidden in ['unit_price', 'amount']:
                invalid = copy.deepcopy(d); invalid['services'][0][forbidden] = '99999.00'
                with self.subTest(field=forbidden), self.assertRaises(q.QuoteError): q.validate(invalid)

    def test_package_quantity_unit_requires_pair(self):
        for details in [{'quantity': '3'}, {'unit': 'loads'}]:
            d = fixture(); d['services'][0].update(details)
            with self.subTest(details=details), self.assertRaises(q.QuoteError): q.validate(d)

    def test_invalid_load_counts_and_fractional_billed_loads_rejected(self):
        for value in ['0', '-1', '3.5', 'NaN', 'Infinity', 3, True, None]:
            d = fixture('siphoning'); d['services'][0]['loads'] = value
            with self.subTest(loads=value), self.assertRaises(q.QuoteError): q.validate(d)
        d = fixture('siphoning'); d['services'][0]['loads'] = '4'; d['services'][0]['volume']['total'] = '40'
        with self.assertRaises(q.QuoteError): q.validate(d)
        d = fixture('siphoning'); d['services'][0].pop('loads'); d['services'][0].pop('volume')
        d['services'][0]['quantity'] = '2.5'
        d['pricing']['total'] = '31250.63'; d['payments'] = [{'trigger': 'On completion', 'amount': '31250.63'}]
        with self.assertRaises(q.QuoteError): q.validate(d)
        d = fixture(); d['services'][0].update(quantity='2.5', unit='load')
        with self.assertRaises(q.QuoteError): q.validate(d)

    def test_invalid_volume_rejected_before_export(self):
        invalid_volumes = [
            {}, {'unit': 'm³', 'basis': 'included'},
            {'unit': 'm³', 'total': '30'},
            {'unit': 'cbm', 'basis': 'included', 'total': '30'},
            {'unit': 'm³', 'basis': 'actual', 'total': '30'},
            {'unit': 'm³', 'basis': 'included', 'total': '29', 'per_load': '10'},
            {'unit': 'm³', 'basis': 'included', 'total': '30', 'extra_charge': '1'},
        ]
        for value in ['0', '-1', 'NaN', 'Infinity', '1.0001', 30, True, None]:
            invalid_volumes.append({'unit': 'm³', 'basis': 'included', 'total': value})
            invalid_volumes.append({'unit': 'm³', 'basis': 'included', 'per_load': value})
        for volume in invalid_volumes:
            d = fixture('siphoning'); d['services'][0]['volume'] = volume
            with self.subTest(volume=volume), tempfile.TemporaryDirectory() as out:
                with self.assertRaises(q.QuoteError): q.issue(d, 'final', Path(out) / 'private')
                self.assertFalse(list(Path(out).rglob('*.pdf')))
        d = fixture()
        d['services'][0]['volume'] = {'unit': 'm³', 'basis': 'included', 'per_load': '10'}
        with self.assertRaises(q.QuoteError): q.validate(d)

    def test_billed_volume_mismatch_rejected_without_rounding_it_away(self):
        for unit, quantity, volume_unit, total in [
            ('m³', '30', 'm³', '29.999'),
            ('m3', '30', 'L', '29999.999'),
            ('cbm', '30', 'L', '30001'),
            ('L', '30000', 'm³', '30.001'),
            ('liters', '30000', 'L', '29999'),
            ('litres', '30000', 'm³', '29.999'),
        ]:
            d = fixture()
            d['services'][0].update(quantity=quantity, unit=unit,
                                     volume={'unit': volume_unit, 'basis': 'included', 'total': total})
            with self.subTest(unit=unit, quantity=quantity, total=total), self.assertRaises(q.QuoteError): q.validate(d)

    def test_siphoning_pdf_keeps_volume_and_price_readable(self):
        with tempfile.TemporaryDirectory() as out:
            result = q.sample('siphoning', out)
            text = '\n'.join(page.extract_text() for page in PdfReader(result['pdf']).pages)
            self.assertIn('SAMPLE ONLY', text)
            self.assertIn(fixture('siphoning')['client']['name'], text)
            self.assertIn('VOLUME', text)
            self.assertIn('loads', text)
            self.assertIn('10 m³', text)
            self.assertIn('30 m³', text)
            self.assertIn('₱12,500.25', text)
            self.assertIn('₱37,500.75', text)
            self.assertIn('₱18,750.38', text)
            self.assertIn('₱18,750.37', text)
            self.assertNotIn('\x00', text)

    def test_itemized_primary_text_shares_one_baseline(self):
        with tempfile.TemporaryDirectory() as out:
            result = q.sample('siphoning', out)
            positions = text_positions(PdfReader(result['pdf']).pages[0])
            primary = []
            for text in ['Siphoning and hauling', '3', '30 m³', '₱12,500.25', '₱37,500.75']:
                hits = [position for position in positions if position['text'] == text]
                self.assertTrue(hits, f'Missing primary row text: {text}')
                primary.append(max(hits, key=lambda position: position['y']))
            spread = max(position['y'] for position in primary) - min(position['y'] for position in primary)
            self.assertLessEqual(spread, .5, f'Primary row baselines differ by {spread:.3f} pt: {primary}')

    def test_itemized_headers_and_total_share_numeric_right_rails(self):
        with tempfile.TemporaryDirectory() as out:
            result = q.sample('siphoning', out)
            positions = text_positions(PdfReader(result['pdf']).pages[0])
            def matching(text):
                hits = [position for position in positions if position['text'] == text]
                self.assertTrue(hits, f'Missing numeric rail text: {text}')
                return hits
            price = matching('₱12,500.25')[0]
            self.assertAlmostEqual(price['right'], matching('PRICE')[0]['right'], delta=.5)
            self.assertAlmostEqual(matching('3')[0]['right'], matching('QTY')[0]['right'], delta=.5)
            self.assertAlmostEqual(matching('30 m³')[0]['right'], matching('VOLUME')[0]['right'], delta=.5)
            totals = matching('₱37,500.75')
            self.assertEqual(len(totals), 2, 'The line amount and final total must both be present.')
            self.assertAlmostEqual(totals[0]['right'], totals[1]['right'], delta=.5,
                                   msg='The line amount and final total must use the same right rail.')
            self.assertAlmostEqual(totals[0]['right'], matching('TOTAL')[0]['right'], delta=.5)

    def test_body_and_amount_fonts_have_tabular_digits(self):
        q.register_fonts()
        for role in ['OBody', 'OBold']:
            widths = [pdfmetrics.stringWidth(str(digit), role, 10) for digit in range(10)]
            with self.subTest(role=role):
                self.assertLessEqual(max(widths) - min(widths), .001,
                                     'Currency and quantity digits must have equal advance widths.')

    def test_default_fonts_work_without_windows_fonts(self):
        with tempfile.TemporaryDirectory() as out, patch.dict(q.os.environ, {'WINDIR': out + '/missing-windows'}):
            result = q.sample('siphoning', out)
            text = '\n'.join(page.extract_text() for page in PdfReader(result['pdf']).pages)
            self.assertIn('₱37,500.75', text)
            self.assertNotIn('\x00', text)

    def test_issued_source_preserves_bundled_fonts_and_license(self):
        filenames = ['OceanidesSans-Regular.ttf', 'OceanidesSans-Semibold.ttf',
                     'OceanidesSans-Display.ttf', 'OFL-Inter.txt']
        with tempfile.TemporaryDirectory() as out:
            result = q.issue(fixture(), 'final', out)
            snapshot = Path(result['source']).parent / 'source/assets/fonts'
            for filename in filenames:
                with self.subTest(filename=filename):
                    self.assertEqual((snapshot / filename).read_bytes(), (ROOT / 'assets/fonts' / filename).read_bytes())

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
