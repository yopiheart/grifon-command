"""Build the internal Oceanides Taglish STP speaking and Q&A guide.

The four A4 pages deliberately contain no cover-only page or new imagery.
Used Century Gothic and Corbel fonts are embedded in the final PDF.
"""
from pathlib import Path
from html import escape
import hashlib
import json
import os
import tempfile

from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parent
QA = ROOT.parents[2] / '.tmp' / 'oceanides-presenter-guide'
OUT = ROOT / 'output' / 'pdf' / 'Oceanides-STP-Presenter-Guide-August-2026.pdf'
DATA = json.loads((ROOT / 'stp-presenter-guide.content.json').read_text(encoding='utf-8'))
MM = 72 / 25.4
W, H = 210 * MM, 297 * MM
LEFT, RIGHT = 20 * MM, 190 * MM
CW = RIGHT - LEFT
NAVY, BLUE, INK, GRAY, PAPER, WHITE = '#0A1F45', '#1C63AD', '#0B1B33', '#526174', '#F4F6FA', '#FFFFFF'
RECEIPT = {'pageSizeMm': [210, 297], 'text': [], 'pages': [], 'overflow': [], 'questions': []}
for name, filename in [('Display', 'GOTHIC.TTF'), ('Heading', 'GOTHICB.TTF'), ('Body', 'corbel.ttf'), ('BodyBold', 'corbelb.ttf')]:
    pdfmetrics.registerFont(TTFont(name, 'C:/Windows/Fonts/' + filename))
pdfmetrics.registerFontFamily('Body', normal='Body', bold='BodyBold', italic='Body', boldItalic='BodyBold')


def para(c, value, top, *, size=12.5, leading=16.7, font='Body', color=INK, x=LEFT, width=CW, markup=False):
    content = value if markup else escape(value)
    p = Paragraph(content, ParagraphStyle('guide', fontName=font, fontSize=size, leading=leading, textColor=HexColor(color), spaceAfter=0))
    _, height = p.wrap(width, H)
    bottom = top + height
    if x < LEFT - .1 or x + width > RIGHT + .1 or top < 20 * MM - .1 or bottom > 277 * MM + .1:
        RECEIPT['overflow'].append({'page': c.getPageNumber(), 'text': value, 'box': [x, top, width, height]})
        raise ValueError('Outside safe content area: ' + value)
    p.drawOn(c, x, H - bottom)
    RECEIPT['text'].append({'page': c.getPageNumber(), 'value': value, 'boxPt': [x, top, width, height], 'font': font, 'sizePt': size})
    return bottom


def rule(c, top, color='#D5DEE9'):
    c.setStrokeColor(HexColor(color)); c.setLineWidth(.6)
    c.line(LEFT, H - top, RIGHT, H - top)


def panel(c, top, height, color=PAPER):
    c.setFillColor(HexColor(color))
    c.rect(LEFT, H - top - height, CW, height, fill=1, stroke=0)


def page(c, chapter, title, subtitle):
    number = c.getPageNumber()
    RECEIPT['pages'].append({'page': number, 'title': title})
    c.bookmarkPage(f'chapter-{chapter}')
    c.addOutlineEntry(title, f'chapter-{chapter}', level=0, closed=False)
    c.setFillColor(HexColor(NAVY)); c.rect(0, H - 8 * MM, W, 8 * MM, fill=1, stroke=0)
    top = para(c, 'OCEANIDES / STP', 20 * MM, size=9, leading=11, font='BodyBold', color=BLUE)
    para(c, f'{chapter} / 04', 20 * MM, x=RIGHT - 40, width=40, size=9, leading=11, font='Body', color=GRAY)
    top = para(c, title, top + 12, size=27, leading=32, font='Display', color=NAVY)
    top = para(c, subtitle, top + 8, size=11, leading=14.5, color=GRAY)
    rule(c, top + 13)
    # Footer is separate from the 20mm content area.
    c.setFillColor(HexColor(GRAY)); c.setFont('Body', 8.5)
    c.drawString(LEFT, 13 * MM, DATA['audience'])
    c.drawRightString(RIGHT, 13 * MM, f'{number:02} / 04')
    return top + 27


def question(c, q, top, gap=19):
    nwidth = 28
    para(c, f"{q['id']:02}", top + 1, size=11, leading=15, font='Heading', color=BLUE, width=nwidth)
    qtop = para(c, q['question'], top, size=13.2, leading=17.2, font='Heading', color=NAVY, x=LEFT + 35, width=CW - 35)
    end = para(c, q['answer'], qtop + 7, x=LEFT + 35, width=CW - 35)
    RECEIPT['questions'].append({'id': q['id'], 'page': c.getPageNumber()})
    return end + gap


def build(path):
    c = canvas.Canvas(str(path), pagesize=(W, H), pageCompression=1)
    c.setTitle(DATA['title']); c.setAuthor('Oceanides'); c.setSubject('Taglish post-video explanation and client Q&A for August')
    top = page(c, '01', 'Pagkatapos ng STP video', 'Sabihin sa client. Ikonekta ang treatment sa current expenses at sa site assessment.')
    # The full spoken script remains visually separate from internal cues.
    for value in DATA['script']:
        top = para(c, value, top, size=12.8, leading=17.2) + 8
    top += 2
    note_height = 46
    panel(c, top, note_height)
    para(c, '<b>Presenter note:</b> ' + escape(DATA['presenterNote']), top + 9, size=9.4, leading=12.1, x=LEFT + 10, width=CW - 20, markup=True)
    c.showPage()

    top = page(c, '02', 'Gastos at savings', 'Client Q&A / Presyo, operating costs at pagbawi ng investment.')
    for q in DATA['questions'][:4]:
        top = question(c, q, top, gap=22)
    top += 2
    panel(c, top, 65, NAVY)
    top_formula = para(c, 'Simple payback estimate', top + 11, size=11.4, leading=14, font='Heading', color=WHITE, x=LEFT + 12, width=CW - 24)
    para(c, 'Installation cost / positive net annual savings = estimated years to recover the cost', top_formula + 5, size=11.4, leading=15, font='BodyBold', color=WHITE, x=LEFT + 12, width=CW - 24)
    top += 79
    para(c, 'Net annual savings = current annual siphoning costs minus all estimated annual STP operating costs. Gamitin lang ang formula kung positive ang net savings; estimate ito, hindi guaranteed return.', top, size=10.7, leading=14.3, color=GRAY)
    c.showPage()

    top = page(c, '03', 'Maintenance at siphoning', 'Client Q&A / Alin ang posibleng mabawasan at alin ang kailangan pa rin.')
    for q in DATA['questions'][4:9]:
        top = question(c, q, top, gap=17)
    rule(c, top)
    para(c, '<b>Key distinction:</b> Posibleng mabawasan ang liquid hauling. May sludge removal at equipment care pa rin.', top + 12, size=11.5, leading=15.3, color=BLUE, markup=True)
    c.showPage()

    top = page(c, '04', 'Installation at next step', 'Client Q&A / Existing tank, water reuse, service support at closing.')
    for q in DATA['questions'][9:]:
        top = question(c, q, top, gap=14)
    top = para(c, 'Closing na puwedeng sabihin', top + 2, size=13.3, leading=17.1, font='Heading', color=BLUE)
    top = para(c, DATA['closing'], top + 7, size=12.3, leading=16.2) + 10
    top = para(c, DATA['closingCue'], top, size=10.2, leading=13.4, color=GRAY) + 13
    top = para(c, 'I-request para sa assessment', top, size=11.4, leading=14.5, font='Heading', color=BLUE) + 6
    for value in DATA['checklist']:
        top = para(c, '- ' + value, top, size=10.4, leading=13.5) + 3
    top += 9
    rule(c, top)
    top = para(c, 'Technical references / Presenter background', top + 9, size=8.5, leading=10.5, font='BodyBold', color=GRAY) + 4
    for source in DATA['sources']:
        top = para(c, f'<link href="{escape(source["url"], quote=True)}" color="{BLUE}">{escape(source["label"])}</link>', top, size=8.5, leading=11, color=BLUE, markup=True) + 3
    para(c, 'General background lang ang sources. Ang final capacity, outlet/reuse route, permits, operation at warranty ay i-confirm sa site design at supplier proposal.', top + 3, size=8.5, leading=11, color=GRAY)
    c.showPage()
    c.save()


def verify(path):
    reader = PdfReader(path)
    if len(reader.pages) != 4:
        raise ValueError('Expected four A4 pages')
    page_texts = [p.extract_text() for p in reader.pages]
    normalize = lambda text: ' '.join(text.split())
    all_text = normalize(' '.join(page_texts))
    expected = DATA['script'] + [v for q in DATA['questions'] for v in [q['question'], q['answer']]] + [DATA['closing'], DATA['closingCue']] + DATA['checklist']
    for value in expected:
        if normalize(value) not in all_text:
            raise ValueError('Required content missing: ' + value)
    embedded = []
    for p in reader.pages:
        if abs(float(p.mediabox.width) - W) > .01 or abs(float(p.mediabox.height) - H) > .01:
            raise ValueError('Wrong A4 geometry')
        for fref in p['/Resources'].get('/Font', {}).values():
            font = fref.get_object()
            # Canvas defaults may leave an unused Helvetica resource. Check every used TrueType family.
            if font.get('/Subtype') == '/TrueType':
                descriptor = font['/FontDescriptor'].get_object()
                if not any(key in descriptor for key in ['/FontFile', '/FontFile2', '/FontFile3']):
                    raise ValueError('Unembedded TrueType font')
                embedded.append(str(font['/BaseFont']))
    if len(set(embedded)) != 4:
        raise ValueError('Expected four embedded used fonts')
    RECEIPT['requiredContentChecks'] = len(expected)
    RECEIPT['embeddedFonts'] = sorted(set(embedded))
    RECEIPT['pageCount'] = len(reader.pages)
    RECEIPT['fontNote'] = 'Helvetica is an unused canvas default resource; every actual text font is embedded.'


def main():
    QA.mkdir(parents=True, exist_ok=True); OUT.parent.mkdir(parents=True, exist_ok=True)
    handle, candidate_name = tempfile.mkstemp(prefix='.stp-presenter-guide-', suffix='.pdf', dir=OUT.parent)
    os.close(handle)
    candidate = Path(candidate_name)
    try:
        build(candidate); verify(candidate)
        import pdfplumber
        with pdfplumber.open(candidate) as pdf:
            outside = [{'page': i+1, 'char': ch['text'], 'box': [ch['x0'], ch['top'], ch['x1'], ch['bottom']]} for i,p in enumerate(pdf.pages) for ch in p.chars if ch['x0'] < 0 or ch['x1'] > W+.1 or ch['top'] < 0 or ch['bottom'] > H+.1]
        if outside:
            raise ValueError('Characters outside page')
        RECEIPT['outOfPageCharacters'] = outside
        os.replace(candidate, OUT)
        RECEIPT['output'] = str(OUT)
        RECEIPT['bytes'] = OUT.stat().st_size
        RECEIPT['sha256'] = hashlib.sha256(OUT.read_bytes()).hexdigest()
        (QA / 'layout-verification.json').write_text(json.dumps(RECEIPT, ensure_ascii=False, indent=2), encoding='utf-8')
        print(json.dumps({key: RECEIPT[key] for key in ['output', 'pageCount', 'bytes', 'sha256', 'requiredContentChecks', 'embeddedFonts', 'outOfPageCharacters']}, indent=2))
    finally:
        if candidate.exists():
            candidate.unlink()


if __name__ == '__main__':
    main()
