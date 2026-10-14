"""Validated Oceanides quotations, flowing PDFs and private immutable revisions."""
from __future__ import annotations

import argparse
from contextlib import contextmanager
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP
from html import escape
import json
import os
from pathlib import Path
import re
import shutil
import sys
import tempfile
import uuid

from reportlab.lib import colors
from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import BaseDocTemplate, CondPageBreak, Frame, HRFlowable, KeepTogether, PageTemplate, Paragraph, Spacer, Table, TableStyle

ROOT = Path(__file__).resolve().parents[1]
CENT = Decimal('0.01')
MANILA = timezone(timedelta(hours=8))
NAVY, BLUE, INK, PAPER, MUTED = map(colors.HexColor, ['#0A1F45', '#1C63AD', '#0B1B33', '#F4F6FA', '#526278'])
RED = colors.HexColor('#B42336')
FIELDS = {'schema_version', 'client', 'title', 'summary', 'pricing', 'services', 'payments', 'conditions', 'confirmed', 'issue_date', 'valid_days', 'record'}
GROUPS = {'siphoning', 'plumbing', 'renovation-restoration', 'pest-control', 'stp'}
PLACEHOLDER = re.compile(r'\b(?:TBD|TODO|TBC|placeholder|lorem ipsum|not yet confirmed)\b|\{\{.*?\}\}|\[.*?\]|⟦.*?⟧', re.I)


class QuoteError(ValueError):
    pass


def read_json(path):
    try:
        return json.loads(Path(path).read_text(encoding='utf-8-sig'), parse_constant=lambda x: (_ for _ in ()).throw(ValueError(x)))
    except (OSError, ValueError) as exc:
        raise QuoteError(f'Cannot read valid JSON from {path}') from exc


def money(value, field, positive=False):
    if not isinstance(value, str) or not re.fullmatch(r'\d+(?:\.\d{1,2})?', value):
        raise QuoteError(f'{field}: use a decimal string with at most two decimal places.')
    result = Decimal(value)
    if result > Decimal('999999999999.99') or (positive and result <= 0):
        raise QuoteError(f'{field}: amount outside the supported range.')
    return result


def text_value(value, field, mode):
    if not isinstance(value, str) or not value.strip():
        raise QuoteError(f'{field}: non-empty text required.')
    if any(ord(c) < 32 and c not in '\n\t' for c in value):
        raise QuoteError(f'{field}: unsupported control characters.')
    if mode == 'final' and PLACEHOLDER.search(value):
        raise QuoteError(f'{field}: unresolved placeholder.')
    return value.strip()


def only_keys(obj, allowed, field):
    if not isinstance(obj, dict) or set(obj) - set(allowed):
        raise QuoteError(f'{field}: invalid object or unknown fields.')


def measure(value, field, whole=False):
    if not isinstance(value, str) or not re.fullmatch(r'\d+(?:\.\d{1,3})?', value):
        raise QuoteError(f'{field}: use a positive decimal string (max 3 decimal places).')
    number = Decimal(value)
    if not 0 < number <= Decimal('999999999') or (whole and number != number.to_integral_value()):
        raise QuoteError(f'{field}: outside supported range or not a whole number of loads.')
    return format(number.normalize(), 'f')


def volume_unit(unit):
    return {'m³': 'm³', 'm3': 'm³', 'cbm': 'm³', 'l': 'L', 'liters': 'L', 'litres': 'L'}.get(unit.lower())


def validate_measures(item, prefix, mode, itemized):
    if itemized or 'quantity' in item or 'unit' in item:
        item['quantity'] = measure(item.get('quantity'), f'{prefix}.quantity')
        item['unit'] = text_value(item.get('unit'), f'{prefix}.unit', mode)
    load_quantity = item.get('unit', '').lower() in {'load', 'loads'}
    if 'loads' in item:
        item['loads'] = measure(item['loads'], f'{prefix}.loads', whole=True)
    if load_quantity:
        quantity = measure(item['quantity'], f'{prefix}.quantity', whole=True)
        if 'loads' in item and Decimal(item['loads']) != Decimal(quantity):
            raise QuoteError(f'{prefix}: loads must match the quoted load quantity.')
        item['loads'] = quantity
    if 'volume' not in item:
        return
    volume = item['volume']
    only_keys(volume, {'unit', 'basis', 'per_load', 'total'}, f'{prefix}.volume')
    if volume.get('unit') not in {'m³', 'L'} or volume.get('basis') not in {'included', 'estimated', 'capacity'}:
        raise QuoteError(f'{prefix}.volume: specify unit m³ or L and basis included, estimated or capacity.')
    if not any(k in volume for k in ['per_load', 'total']):
        raise QuoteError(f'{prefix}.volume: specify per_load or total.')
    for key in ['per_load', 'total']:
        if key in volume:
            volume[key] = measure(volume[key], f'{prefix}.volume.{key}')
    if 'per_load' in volume:
        if 'loads' not in item:
            raise QuoteError(f'{prefix}.volume.per_load requires a confirmed number of loads.')
        expected = Decimal(item['loads']) * Decimal(volume['per_load'])
        if 'total' in volume and Decimal(volume['total']) != expected:
            raise QuoteError(f'{prefix}: total volume must equal loads times volume per load.')
        volume['total'] = measure(format(expected, 'f'), f'{prefix}.volume.total')
    billed_unit = volume_unit(item.get('unit', ''))
    if billed_unit:
        # Compare physical quantities; billing remains quantity x price, never x volume again.
        quoted_volume = Decimal(volume['total']) / (1000 if volume['unit'] == 'L' else 1)
        billed_volume = Decimal(item['quantity']) / (1000 if billed_unit == 'L' else 1)
        if billed_volume != quoted_volume:
            raise QuoteError(f'{prefix}: billed volume quantity must match the quoted total volume.')


def validate(data, mode='final'):
    if mode not in {'final', 'draft', 'sample'}:
        raise QuoteError('Unknown quotation mode.')
    only_keys(data, FIELDS, 'quote')
    if type(data.get('schema_version')) is not int or data['schema_version'] != 1:
        raise QuoteError('schema_version must be 1.')
    d = json.loads(json.dumps(data))
    d.pop('record', None)
    client = d.get('client', {})
    only_keys(client, {'name', 'site', 'contact', 'billing_address'}, 'client')
    for key in ['name', 'site']:
        client[key] = text_value(client.get(key) or ('Not yet confirmed' if mode != 'final' else None), f'client.{key}', mode)
    for key in ['contact', 'billing_address']:
        if key in client:
            client[key] = text_value(client[key], f'client.{key}', mode)
    d['client'] = client
    for key in ['title', 'summary']:
        d[key] = text_value(d.get(key), key, mode)
    confirmed = d.get('confirmed', {})
    only_keys(confirmed, {'client', 'scope', 'price', 'payment'}, 'confirmed')
    if any(type(v) is not bool for v in confirmed.values()):
        raise QuoteError('Confirmation flags must be booleans.')
    if mode == 'final' and any(confirmed.get(k) is not True for k in ['client', 'scope', 'price', 'payment']):
        raise QuoteError('Final export requires explicit client, scope, price and payment confirmation.')
    d['confirmed'] = confirmed
    try:
        issued = date.fromisoformat(d.get('issue_date', datetime.now(MANILA).date().isoformat()))
    except (ValueError, TypeError) as exc:
        raise QuoteError('issue_date must be YYYY-MM-DD.') from exc
    days = d.get('valid_days', 30)
    if type(days) is not int or not 1 <= days <= 366:
        raise QuoteError('valid_days must be an integer from 1 to 366.')
    if mode == 'final' and issued + timedelta(days=days) < datetime.now(MANILA).date():
        raise QuoteError('Quotation is already expired; confirm renewed dates before final export.')
    d['issue_date'], d['valid_days'] = issued.isoformat(), days
    pricing = d.get('pricing', {})
    only_keys(pricing, {'mode', 'total'}, 'pricing')
    if pricing.get('mode') not in {'itemized', 'package'}:
        raise QuoteError('pricing.mode must be itemized or package.')
    total = money(pricing.get('total'), 'pricing.total', True)
    services = d.get('services')
    if not isinstance(services, list) or not services:
        raise QuoteError('At least one confirmed service is required.')
    computed = Decimal('0')
    for index, item in enumerate(services):
        prefix = f'services[{index}]'
        only_keys(item, {'group', 'name', 'description', 'quantity', 'unit', 'unit_price', 'amount', 'loads', 'volume'}, prefix)
        if item.get('group') not in GROUPS:
            raise QuoteError(f'{prefix}: unknown service group.')
        for key in ['name', 'description']:
            item[key] = text_value(item.get(key), f'{prefix}.{key}', mode)
        validate_measures(item, prefix, mode, pricing['mode'] == 'itemized')
        if pricing['mode'] == 'package':
            if any(k in item for k in ['unit_price', 'amount']):
                raise QuoteError('Package scopes may contain quantities/volume, but not invented individual rates or amounts.')
        else:
            quantity = Decimal(item['quantity'])
            rate = money(item.get('unit_price'), f'{prefix}.unit_price')
            amount = (quantity * rate).quantize(CENT, rounding=ROUND_HALF_UP)
            if amount > Decimal('999999999999.99'):
                raise QuoteError(f'{prefix}: line amount outside supported range.')
            if 'amount' in item and money(item['amount'], f'{prefix}.amount') != amount:
                raise QuoteError(f'{prefix}: line amount does not match quantity times rate.')
            item['amount'] = str(amount)
            computed += amount
    if pricing['mode'] == 'itemized' and computed != total:
        raise QuoteError('Itemized amounts do not match the confirmed final total.')
    pricing['total'] = str(total.quantize(CENT))
    payments = d.get('payments')
    if not isinstance(payments, list) or not payments:
        raise QuoteError('Specify this client\'s payment schedule, including amounts and triggers.')
    paid = Decimal('0')
    for index, payment in enumerate(payments):
        only_keys(payment, {'trigger', 'amount', 'percent'}, f'payments[{index}]')
        payment['trigger'] = text_value(payment.get('trigger'), f'payments[{index}].trigger', mode)
        amount = money(payment.get('amount'), f'payments[{index}].amount', True)
        if 'percent' in payment:
            percentage = money(payment['percent'], f'payments[{index}].percent', True)
            if percentage > 100 or (total * percentage / 100).quantize(CENT, rounding=ROUND_HALF_UP) != amount:
                raise QuoteError('Payment percentage does not match its amount; use exact amounts for a rounding-adjusted balance.')
        paid += amount
    if paid != total:
        raise QuoteError('Payment amounts must add up exactly to the final total.')
    conditions = d.get('conditions', [])
    if not isinstance(conditions, list):
        raise QuoteError('conditions must be a list of confirmed statements.')
    d['conditions'] = [text_value(c, f'conditions[{i}]', mode) for i, c in enumerate(conditions)]
    return d


def register_fonts(font_dir=None):
    folder = Path(font_dir) if font_dir else Path(os.environ.get('WINDIR', 'C:/Windows')) / 'Fonts'
    for name, filename in {'OBody': 'corbel.ttf', 'OBold': 'corbelb.ttf', 'OTitle': 'GOTHIC.TTF', 'OHeading': 'GOTHICB.TTF'}.items():
        path = folder / filename
        if not path.is_file():
            raise QuoteError(f'Missing licensed font: {path}. Supply --font-dir; no automatic substitution.')
        pdfmetrics.registerFont(TTFont(name, str(path)))
    pdfmetrics.registerFontFamily('OBody', normal='OBody', bold='OBold', italic='OBody', boldItalic='OBold')


def check_glyphs(data):
    texts = [data['title'], data['summary'], *data['client'].values(), *data['conditions']]
    texts += [v for item in data['services'] for k, v in item.items() if k in {'name', 'description', 'unit'}]
    texts += [item['volume']['unit'] for item in data['services'] if 'volume' in item]
    texts += [p['trigger'] for p in data['payments']]
    # Check actual font roles, including generated currency. Century Gothic has no peso glyph.
    for name, rendered in [('OBody', texts + ['₱']), ('OBold', texts + ['₱']), ('OHeading', [data['title']])]:
        cmap = pdfmetrics.getFont(name).face.charToGlyph
        missing = {ord(c) for text in rendered for c in text if not c.isspace() and ord(c) not in cmap}
        if missing:
            raise QuoteError(f'{name} lacks codepoints {sorted(missing)}. Confirm a suitable licensed font before export.')


def fmt(value):
    return f'₱{Decimal(value):,.2f}'


def render_pdf(data, destination, record, font_dir=None):
    register_fonts(font_dir)
    check_glyphs(data)
    company = read_json(ROOT / 'references/company.json')
    width = A4[0] - 88
    styles = {
        'body': ParagraphStyle('body', fontName='OBody', fontSize=10.5, leading=14, textColor=INK, allowOrphans=0, allowWidows=0),
        'small': ParagraphStyle('small', fontName='OBody', fontSize=9, leading=12, textColor=MUTED),
        'label': ParagraphStyle('label', fontName='OBold', fontSize=8.5, leading=12, textColor=BLUE),
        'head': ParagraphStyle('head', fontName='OHeading', fontSize=12, leading=16, textColor=NAVY, spaceBefore=14, spaceAfter=8, keepWithNext=True),
        'title': ParagraphStyle('title', fontName='OHeading', fontSize=29, leading=35, textColor=NAVY),
        'project': ParagraphStyle('project', fontName='OHeading', fontSize=17, leading=22, textColor=NAVY, spaceAfter=7, keepWithNext=True),
        'money': ParagraphStyle('money', fontName='OBold', fontSize=10.5, leading=14, alignment=TA_RIGHT, textColor=INK),
        'white': ParagraphStyle('white', fontName='OBold', fontSize=9, leading=12, textColor=colors.white),
        'contact': ParagraphStyle('contact', fontName='OBody', fontSize=7.5, leading=10, textColor=NAVY),
        'footer': ParagraphStyle('footer', fontName='OBody', fontSize=7.5, leading=10, textColor=colors.white),
    }
    styles['scopehead'] = ParagraphStyle('scopehead', parent=styles['head'], keepWithNext=False)
    styles['priceunit'] = ParagraphStyle('priceunit', parent=styles['small'], alignment=TA_RIGHT)
    styles['whiteRight'] = ParagraphStyle('whiteRight', parent=styles['white'], alignment=TA_RIGHT)
    def p(value, style='body', markup=False):
        safe = str(value) if markup else escape(str(value)).replace('\n', '<br/>')
        return Paragraph(safe, styles[style])

    def table(rows, widths, extra=(), **kwargs):
        obj = Table(rows, colWidths=widths, hAlign='LEFT', **kwargs)
        obj.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10), ('TOPPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0), *extra]))
        return obj

    quote_id, revision, mode = record['quote_id'], record['revision'], record['mode']
    issued = date.fromisoformat(data['issue_date'])
    expires = issued + timedelta(days=data['valid_days'])
    identity = f'{quote_id} / R{revision:02}'
    date_label = lambda x: x.strftime('%d %b %Y')
    doc = BaseDocTemplate(str(destination), pagesize=A4, title=f'Oceanides quotation - {identity}',
                          author=company['company']['legalName'], pageCompression=1)

    def page_chrome(canvas, document):
        canvas.saveState()
        top = A4[1] - (25 if mode != 'final' else 0)
        if mode != 'final':
            canvas.setFillColor(RED)
            canvas.rect(0, A4[1] - 25, A4[0], 25, fill=1, stroke=0)
            canvas.setFillColor(colors.white)
            canvas.setFont('OBold', 9)
            banner = 'SAMPLE ONLY  /  FICTIONAL SCOPE AND AMOUNTS  /  NOT FOR CLIENT USE' if mode == 'sample' else 'DRAFT  /  NOT APPROVED FOR CLIENT ACCEPTANCE'
            canvas.drawCentredString(A4[0] / 2, A4[1] - 16, banner)
        canvas.setFillColor(NAVY)
        canvas.rect(0, top - 53, A4[0], 53, fill=1, stroke=0)
        canvas.setFillColor(colors.white)
        canvas.rect(44, top - 47, 41, 41, fill=1, stroke=0)
        canvas.drawImage(str(ROOT / 'assets/logo.png'), 46, top - 45, 37, 37, preserveAspectRatio=True, mask='auto')
        canvas.setFillColor(colors.white)
        canvas.setFont('OHeading', 12)
        canvas.drawString(97, top - 21, company['company']['brand'])
        canvas.setFont('OBold', 9.5)
        canvas.drawString(97, top - 37, company['company']['legalName'].split(' ', 1)[1])
        canvas.setFillColor(colors.HexColor('#EAF2FA'))
        canvas.rect(0, top - 99, A4[0], 46, fill=1, stroke=0)
        contact = company['contact']
        lines = [
            f"Landline {contact['landline']}   |   Globe {contact['phone']}   |   Smart {contact['smart']}",
            f"{contact['email']}   |   {contact['corporateEmail']}",
            f"{contact['address']}   |   TIN {company['company']['tin']}",
        ]
        y = top - 59
        for line in lines:
            paragraph = p(line, 'contact')
            _, height = paragraph.wrap(width, 100)
            paragraph.drawOn(canvas, 44, y - height)
            y -= height + 1
        if y < top - 99:
            raise QuoteError('Company contact header exceeds its reserved area.')
        canvas.setFillColor(NAVY)
        canvas.rect(0, 0, A4[0], 58, fill=1, stroke=0)
        for line, y in [(contact['website'] + '   |   ' + contact['facebook'], 43),
                        (contact['email'] + '   |   ' + contact['corporateEmail'], 31)]:
            paragraph = p(line, 'footer')
            _, height = paragraph.wrap(width, 12)
            if height > 12:
                raise QuoteError('Company footer exceeds its reserved area.')
            paragraph.drawOn(canvas, 44, y)
        canvas.setStrokeColor(colors.HexColor('#526B90'))
        canvas.setLineWidth(.4)
        canvas.line(44, 25, A4[0] - 44, 25)
        canvas.setFillColor(colors.white)
        canvas.setFont('OBody', 7.5)
        canvas.drawString(44, 12, f'{identity}  |  Quotation, not an invoice')
        canvas.drawRightString(A4[0] - 44, 12, f'Page {document.page}')
        canvas.restoreState()

    # Zero frame padding makes every paragraph, rule and table share the same rail.
    body_top = A4[1] - (25 if mode != 'final' else 0) - 117
    frame = Frame(44, 74, width, body_top - 74, leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
    doc.addPageTemplates(PageTemplate(id='quotation', frames=[frame], onPage=page_chrome))
    story = [p('Service quotation', 'title'), Spacer(1, 7),
             p(f'{identity}    •    Issued {date_label(issued)}    •    Valid until {date_label(expires)}', 'small'),
             Spacer(1, 12), HRFlowable(width='100%', thickness=1.3, color=BLUE), Spacer(1, 12)]
    client = data['client']
    left = [p('PREPARED FOR', 'label'), Spacer(1, 4), p(client['name'])]
    if client.get('contact'):
        left += [Spacer(1, 3), p(client['contact'], 'small')]
    right = [p('SERVICE LOCATION', 'label'), Spacer(1, 4), p(client['site'])]
    if client.get('billing_address'):
        left += [Spacer(1, 4), p('Billing address: ' + client['billing_address'], 'small')]
    story += [table([[left, right]], [width * .47, width * .53], splitByRow=1, splitInRow=1), Spacer(1, 20),
              p(data['title'], 'project'), p(data['summary']), CondPageBreak(110), p('Scope & pricing', 'scopehead')]
    itemized = data['pricing']['mode'] == 'itemized'
    has_quantity = itemized or any('quantity' in i or 'loads' in i for i in data['services'])
    has_volume = any('volume' in i for i in data['services'])
    headers = ['SERVICE / AGREED SCOPE']
    numeric_widths = []
    if has_quantity:
        headers += ['QTY']
        quantity_tokens = [token for i in data['services']
                           for token in [i.get('quantity', ''), i.get('loads', ''), *i.get('unit', '').split()]]
        quantity_width = max(48, max(pdfmetrics.stringWidth(token, 'OBody', 9) for token in quantity_tokens) + 22)
        numeric_widths += [quantity_width]
    if has_volume:
        headers += ['VOLUME']
        volume_width = max(86, max(pdfmetrics.stringWidth(i['volume']['total'] + ' ' + i['volume']['unit'], 'OBody', 9)
                                   for i in data['services'] if 'volume' in i) + 22)
        numeric_widths += [volume_width]
    if itemized:
        headers += ['PRICE', 'TOTAL']
        rate_width = max(76, max(pdfmetrics.stringWidth(fmt(i['unit_price']), 'OBold', 10.5) for i in data['services']) + 22)
        amount_width = max(76, max(pdfmetrics.stringWidth(fmt(i['amount']), 'OBold', 10.5) for i in data['services']) + 22)
        numeric_widths += [rate_width, amount_width]
    widths = [width - sum(numeric_widths), *numeric_widths]
    if widths[0] < 135:
        raise QuoteError('Numeric columns leave too little room for readable scope. Use smaller grouped rows or a package scope; do not shrink the document.')
    rows = [[p(h, 'whiteRight' if h in {'PRICE', 'TOTAL'} else 'white') for h in headers]]
    for item in data['services']:
        detail = [p('<b>' + escape(item['name']) + '</b>', markup=True), Spacer(1, 4)]
        for index, paragraph in enumerate(item['description'].split('\n\n')):
            if index:
                detail.append(Spacer(1, 8))
            detail.append(p(paragraph))
        row = [detail]
        if has_quantity:
            quantity_text = item['quantity'] + '\n' + item['unit'] if 'quantity' in item else ''
            if 'loads' in item and item.get('unit', '').lower() not in {'load', 'loads'}:
                quantity_text += ('\n' if quantity_text else '') + item['loads'] + ' loads'
            row += [p(quantity_text or '-', 'small')]
        if has_volume:
            volume = item.get('volume')
            if volume:
                volume_text = volume['total'] + ' ' + volume['unit']
                if 'per_load' in volume:
                    volume_text += '\n' + volume['per_load'] + ' ' + volume['unit'] + ' / load'
                volume_text += '\n' + {'included': 'Included volume', 'estimated': 'Estimated volume', 'capacity': 'Truck capacity'}[volume['basis']]
            else:
                volume_text = '-'
            row += [p(volume_text, 'small')]
        if itemized:
            price_unit = 'load' if item['unit'].lower() in {'load', 'loads'} else item['unit']
            row += [[p(fmt(item['unit_price']), 'money'), p('/ ' + price_unit, 'priceunit')], p(fmt(item['amount']), 'money')]
        rows.append(row)
    story += [table(rows, widths, [
        ('BACKGROUND', (0, 0), (-1, 0), NAVY), ('ROWBACKGROUNDS', (0, 1), (-1, -1), [PAPER, colors.white]),
        ('LINEBELOW', (0, 1), (-1, -1), .5, colors.HexColor('#D8E1EC')),
        ('LEFTPADDING', (0, 0), (-1, -1), 11), ('RIGHTPADDING', (0, 0), (-1, -1), 11),
        ('TOPPADDING', (0, 0), (-1, -1), 10), ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
    ], repeatRows=1, splitByRow=1, splitInRow=1), Spacer(1, 12)]
    total_style = ParagraphStyle('total', fontName='OBold', fontSize=23, leading=29, textColor=colors.white, alignment=TA_RIGHT)
    total_width = max(width * .52, pdfmetrics.stringWidth(fmt(data['pricing']['total']), 'OBold', 23) + 28)
    total = table([[p('FINAL TOTAL / PHP' if itemized else 'PACKAGE TOTAL / PHP', 'white'),
                    Paragraph(escape(fmt(data['pricing']['total'])), total_style)]], [width - total_width, total_width], [
        ('BACKGROUND', (0, 0), (-1, -1), NAVY), ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 14), ('RIGHTPADDING', (0, 0), (-1, -1), 14),
        ('TOPPADDING', (0, 0), (-1, -1), 12), ('BOTTOMPADDING', (0, 0), (-1, -1), 12)])
    pay_rows = []
    for payment in data['payments']:
        suffix = f" ({payment['percent']}%)" if 'percent' in payment else ''
        pay_rows.append([p(payment['trigger'] + suffix), p(fmt(payment['amount']), 'money')])
    payment_table = table(pay_rows, [width - 125, 125], [
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6), ('LINEBELOW', (0, -1), (-1, -1), .5, colors.HexColor('#D8E1EC'))],
        splitByRow=1, splitInRow=1)
    story += [KeepTogether([total, p('Payment agreement', 'head'), payment_table])]
    closing = [p('Scope notes & conditions', 'head')]
    standard = ['This quotation covers only the scope listed above.',
                'Any additional work requires a revised written quotation and client approval before it begins.']
    for condition in [*data['conditions'], *standard]:
        closing += [p(condition, 'small'), Spacer(1, 4)]
    accept = [p('Acceptance & next step', 'head'),
              p('To proceed, sign below and return this quotation to Oceanides. We will coordinate scheduling under the agreed payment terms.', 'small'),
              Spacer(1, 22), table([[p('Client signature over printed name', 'small'), '', p('Date signed', 'small')]], [width * .62, width * .06, width * .32], [
                  ('LINEABOVE', (0, 0), (0, 0), .7, NAVY), ('LINEABOVE', (2, 0), (2, 0), .7, NAVY), ('TOPPADDING', (0, 0), (-1, -1), 6)])]
    # Nested KeepTogether reports an artificial height and unnecessarily moves short closings.
    # Chain acceptance flowables so they remain grouped if unusually long notes must split.
    for flowable in accept[:-1]:
        flowable.keepWithNext = True
    story += [KeepTogether(closing + accept)]
    doc.build(story)


def private_path(path):
    resolved = Path(path).expanduser().resolve()
    if resolved == ROOT or ROOT in resolved.parents:
        raise QuoteError('Actual client records must be outside the skill package.')
    for parent in [resolved, *resolved.parents]:
        if (parent / '.git').exists() or parent.name.lower() in {'public', 'wwwroot', 'htdocs'}:
            raise QuoteError('Actual client records must be outside Git and public folders.')
    return resolved


def write_json(path, data):
    Path(path).write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


@contextmanager
def store_lock(store):
    store.mkdir(parents=True, exist_ok=True)
    lock = store / '.quotation.lock'
    try:
        handle = os.open(str(lock), os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    except FileExistsError as exc:
        raise QuoteError('Store busy or interrupted run. Inspect .quotation.lock before retrying; do not automatically remove it.') from exc
    try:
        os.write(handle, str(os.getpid()).encode('ascii'))
        os.close(handle)
        yield
    finally:
        lock.unlink()


def issue(data, mode, store, revise=None, font_dir=None):
    d = validate(data, mode)
    store = private_path(store)
    if revise and (mode != 'final' or not re.fullmatch(r'OCE-\d{8}-\d{3,}', revise)):
        raise QuoteError('--revise requires a valid final quotation ID.')
    with store_lock(store):
        register_path = store / 'register.json'
        register = read_json(register_path) if register_path.exists() else {'schema_version': 1, 'entries': []}
        if not isinstance(register, dict) or register.get('schema_version') != 1 or not isinstance(register.get('entries'), list):
            raise QuoteError('Invalid register; preserved without changes.')
        if mode == 'draft':
            quote_id = 'DRAFT-' + uuid.uuid4().hex[:12].upper()
        elif revise:
            quote_id = revise
            if not (store / quote_id).is_dir():
                raise QuoteError('Cannot revise an unknown quotation.')
        else:
            prefix = 'OCE-' + d['issue_date'].replace('-', '') + '-'
            existing = [int(p.name[len(prefix):]) for p in store.iterdir() if p.name.startswith(prefix) and p.name[len(prefix):].isdigit()]
            quote_id = prefix + f'{max(existing, default=0) + 1:03}'
        folder = store / quote_id
        revisions = [int(p.name[1:]) for p in folder.glob('r*') if p.is_dir() and p.name[1:].isdigit()]
        revision = max(revisions, default=0) + 1
        record = {'quote_id': quote_id, 'revision': revision, 'mode': mode, 'issued_at': datetime.now(MANILA).isoformat(),
                  'expires_on': (date.fromisoformat(d['issue_date']) + timedelta(days=d['valid_days'])).isoformat()}
        stage = Path(tempfile.mkdtemp(prefix='.pending-', dir=store))
        destination = folder / f'r{revision:02}'
        try:
            render_pdf(d, stage / 'quotation.pdf', record, font_dir)
            write_json(stage / 'quote.json', {**d, 'record': record})
            shutil.copytree(ROOT / 'references', stage / 'source' / 'references')
            (stage / 'source' / 'assets').mkdir(parents=True)
            shutil.copyfile(ROOT / 'assets/logo.png', stage / 'source/assets/logo.png')
            (stage / 'source' / 'scripts').mkdir()
            shutil.copyfile(Path(__file__), stage / 'source/scripts/quote.py')
            folder.mkdir(exist_ok=True)
            stage.rename(destination)
            register['entries'].append(record)
            temp_register = store / ('.register-' + uuid.uuid4().hex + '.json')
            write_json(temp_register, register)
            os.replace(temp_register, register_path)
        except Exception:
            if stage.exists() and stage.resolve().parent == store and not stage.is_symlink():
                shutil.rmtree(stage)
            # A record renamed before register failure stays intact and consumes its number.
            if destination.exists():
                raise QuoteError(f'PDF/source saved at {destination}, but register update failed. Reconcile the register; do not issue a duplicate.')
            raise
        return {'quote_id': quote_id, 'revision': revision, 'pdf': str(destination / 'quotation.pdf'), 'source': str(destination / 'quote.json')}


def sample(name, output_dir, font_dir=None):
    d = validate(read_json(ROOT / 'samples' / (name + '.json')), 'sample')
    out = Path(output_dir).expanduser().resolve()
    out.mkdir(parents=True, exist_ok=True)
    record = {'quote_id': 'SAMPLE-' + name.upper(), 'revision': 1, 'mode': 'sample'}
    pdf = out / f'Oceanides-Sample-{name.title()}.pdf'
    render_pdf(d, pdf, record, font_dir)
    write_json(out / (pdf.stem + '.json'), {**d, 'record': record})
    return {'pdf': str(pdf), 'source': str(out / (pdf.stem + '.json'))}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    for command in ['check', 'render']:
        part = sub.add_parser(command)
        part.add_argument('--input', required=True)
        part.add_argument('--mode', choices=['draft', 'final'], default='final')
        if command == 'render':
            part.add_argument('--store', default=str(Path.home() / 'Documents/Oceanides/Quotations'))
            part.add_argument('--revise')
            part.add_argument('--font-dir')
    part = sub.add_parser('sample')
    part.add_argument('name', choices=['short', 'mixed', 'long', 'siphoning'])
    part.add_argument('--output-dir', required=True)
    part.add_argument('--font-dir')
    args = parser.parse_args()
    try:
        if args.command == 'sample':
            result = sample(args.name, args.output_dir, args.font_dir)
        else:
            private_path(args.input)
            data = read_json(args.input)
            if args.command == 'check':
                validate(data, args.mode)
                result = {'valid': True, 'mode': args.mode}
            else:
                result = issue(data, args.mode, args.store, args.revise, args.font_dir)
        print(json.dumps(result, indent=2))
        return 0
    except (QuoteError, OSError) as exc:
        print(f'Quotation not exported: {exc}', file=sys.stderr)
        return 2


if __name__ == '__main__':
    sys.exit(main())
