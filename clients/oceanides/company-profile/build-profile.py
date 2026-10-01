"""Build the print PDF and a shared layout specification for the editable PPTX."""
import json
from pathlib import Path
from io import BytesIO
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
from reportlab.lib.utils import ImageReader
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent
PRIVATE = ROOT / '.tmp' / 'oceanides-profile'
PRIVATE.mkdir(parents=True, exist_ok=True)
OUT = HERE / 'output' / 'pdf'
OUT.mkdir(parents=True, exist_ok=True)
DATA = json.loads((HERE / 'profile-content.json').read_text(encoding='utf-8'))
W, H = 794, 1123
C = dict(navy='#0A1F45', surface='#0E2C5E', paper='#F4F6FA', ink='#0B1B33',
         amber='#F5B301', blue='#1C63AD', muted='#DFE8F5', dim='#8FB3DD', gray='#5B6B85')
FONTS = {'Body': ('Arial', 'arial.ttf', False), 'Strong': ('Arial', 'arialbd.ttf', True),
         'Display': ('Arial Narrow', 'ARIALNB.TTF', True)}
for key, (_, filename, _) in FONTS.items():
    pdfmetrics.registerFont(TTFont(key, str(Path('C:/Windows/Fonts') / filename)))

pages = []
def page(bg='paper'):
    p = {'background': C.get(bg, bg), 'elements': []}
    pages.append(p)
    return p

def rect(p, x, y, w, h, color):
    p['elements'].append(dict(type='rect', x=x, y=y, w=w, h=h, color=C.get(color, color)))

def text(p, value, x, y, w=686, size=18, font='Body', color='ink', leading=None):
    if font == 'Display':
        value = value.upper()
    leading = leading or size * 1.3
    lines = []
    for para in value.split('\n'):
        current = ''
        for word in para.split():
            test = (current + ' ' + word).strip()
            if pdfmetrics.stringWidth(test, font, size) > w and current:
                lines.append(current)
                current = word
            else:
                current = test
        lines.append(current)
    for i, line in enumerate(lines):
        width = pdfmetrics.stringWidth(line, font, size)
        if width > w + .1:
            raise ValueError(f'Text exceeds its frame: {line}')
        p['elements'].append(dict(type='text', text=line, x=x, y=y+i*leading, w=w,
                                 h=leading+2, size=size, font=font, color=C.get(color, color)))
    return y + len(lines)*leading

def image(p, source, x, y, w, h, fit='contain', alt=''):
    optimized = PRIVATE / 'images' / (Path(source).stem + '.jpg')
    optimized.parent.mkdir(parents=True, exist_ok=True)
    if source.endswith('logo.jpg'):
        render_path = ROOT / source
    else:
        im = Image.open(ROOT / source).convert('RGB')
        im.thumbnail((1800, 1800), Image.Resampling.LANCZOS)
        im.save(optimized, 'JPEG', quality=92, optimize=True)
        render_path = optimized
    p['elements'].append(dict(type='image', path=source, renderPath=str(render_path), x=x, y=y, w=w, h=h, fit=fit, alt=alt))

def footer(p, n, dark=False):
    color = 'dim' if dark else 'gray'
    rect(p, 54, 1065, 686, 1, 'surface' if dark else '#D6DFE9')
    text(p, 'OCEANIDES  /  COMPANY PROFILE', 54, 1080, 600, 11, 'Strong', color)
    text(p, f'{n:02d}', 712, 1076, 28, 16, 'Display', 'amber' if dark else 'blue')

ASSETS = 'clients/oceanides/assets/'
p=page('navy')
image(p, ASSETS+'logo.jpg', 54, 42, 162, 162, alt='Approved Oceanides logo')
text(p, 'OCEANIDES', 253, 61, 488, 58, 'Display', '#FFFFFF')
text(p, 'Plumbing Siphoning &\nPest Management Services OPC', 256, 133, 480, 18, 'Body', 'muted')
rect(p, 54, 234, 80, 5, 'amber')
text(p, 'COMPANY\nPROFILE', 48, 272, 692, 110, 'Display', '#FFFFFF', 110)
text(p, 'Siphoning  /  Plumbing\nRenovation & restoration  /  Pest control', 54, 530, 686, 21, 'Body', 'muted', 31)
image(p, ASSETS+'tb2-truck-street.png', 54, 643, 686, 335, 'cover', 'Field-service vehicle; source image approved in client design records')
text(p, DATA['phone']+'  |  '+DATA['carrier'], 54, 1000, 686, 19, 'Strong', '#FFFFFF')
text(p, DATA['email'], 54, 1030, 686, 16, 'Body', 'muted')
footer(p, 1, True)

p=page()
text(p, 'OCEANIDES', 54, 56, 686, 48, 'Display', 'blue')
text(p, 'Company overview', 54, 126, 686, 36, 'Display')
end=text(p, DATA['overview'], 54, 201, 686, 21, leading=30)
text(p, DATA['delivery'], 54, end+28, 686, 19, leading=29)
rect(p, 54, 472, 686, 2, 'blue')
text(p, 'OUR SERVICES', 54, 505, 686, 15, 'Strong', 'blue')
y=556
for idx, group in enumerate(DATA['serviceGroups'], 1):
    text(p, f'{idx:02d}', 54, y, 58, 38, 'Display', 'blue')
    text(p, group['title'], 136, y-1, 604, 29, 'Display')
    text(p, group['summary'], 136, y+45, 604, 17, leading=25)
    y+=123
footer(p, 2)

p=page()
text(p, 'SIPHONING\n& PLUMBING', 54, 65, 686, 53, 'Display', 'ink', 55)
text(p, 'Assessment before the final scope', 54, 203, 686, 21, 'Strong', 'blue')
text(p, 'Oceanides reviews the site conditions and coordinates the appropriate work with the field team.', 54, 250, 686, 19, leading=28)
text(p, 'Siphoning', 54, 355, 320, 29, 'Display')
text(p, 'Plumbing', 422, 355, 318, 29, 'Display')
for x, group in [(54, DATA['serviceGroups'][0]), (422, DATA['serviceGroups'][1])]:
    y=406
    for item in group['items']:
        end=text(p, item, x, y, 318, 18, leading=26)
        y=end+15
rect(p,54,609,686,2,'blue')
text(p, 'PREVIOUS SITE WORK', 54, 635, 686, 14, 'Strong', 'blue')
image(p, ASSETS+'tb2-ba2-before.png', 54, 677, 327, 290, 'cover', 'Matched previous site-work image before siphoning')
image(p, ASSETS+'tb2-ba2-after.png', 413, 677, 327, 290, 'cover', 'Matched previous site-work image after siphoning')
text(p, 'BEFORE', 54, 982, 327, 13, 'Strong', 'blue')
text(p, 'AFTER', 413, 982, 327, 13, 'Strong', 'blue')
text(p, 'Same site, before and after service.', 54, 1012, 686, 14, 'Body', 'gray')
footer(p, 3)

p=page('navy')
text(p, 'RENOVATION\n& RESTORATION', 54, 65, 686, 53, 'Display', '#FFFFFF', 55)
text(p, 'Homes and condominiums', 54, 205, 686, 21, 'Strong', 'amber')
text(p, DATA['serviceGroups'][2]['summary'], 54, 252, 686, 20, 'Body', 'muted', 29)
y=367
for item in DATA['serviceGroups'][2]['items']:
    text(p, item, 54, y, 686, 22, 'Body', '#FFFFFF', 31)
    y+=51
rect(p,54,604,686,2,'amber')
text(p, 'PEST CONTROL', 54, 651, 686, 51, 'Display', '#FFFFFF')
text(p, DATA['serviceGroups'][3]['summary'], 54, 731, 686, 20, 'Body', 'muted', 29)
y=843
for item in DATA['serviceGroups'][3]['items']:
    text(p, item, 54, y, 686, 19, 'Body', '#FFFFFF', 27)
    y+=46
text(p, 'Work scope and specialist requirements follow the site assessment.', 54, 1012, 686, 14, 'Body', 'dim')
footer(p, 4, True)

p=page()
text(p, 'PROJECT\nCOORDINATION', 54, 64, 686, 53, 'Display', 'ink', 55)
text(p, 'One main contact through turnover', 54, 205, 686, 21, 'Strong', 'blue')
y=282
for idx, step in enumerate(DATA['process'],1):
    text(p, f'{idx:02d}', 54, y, 60, 43, 'Display', 'blue')
    text(p, step['title'], 138, y-1, 602, 28, 'Display')
    text(p, step['detail'], 138, y+43, 602, 18, leading=27)
    if idx<4: rect(p,138,y+116,602,1,'#D6DFE9')
    y+=150
rect(p,54,908,686,2,'blue')
text(p, 'WORKING WITH PROCUREMENT', 54, 940, 686, 15, 'Strong', 'blue')
text(p, DATA['procurement'], 54, 978, 686, 17, leading=24)
footer(p, 5)

p=page('navy')
image(p, ASSETS+'logo.jpg', 54, 42, 143, 143, alt='Approved Oceanides logo')
text(p, 'OCEANIDES', 232, 74, 508, 57, 'Display', '#FFFFFF')
rect(p,54,237,80,5,'amber')
text(p, 'SITE ASSESSMENT\n& QUOTATION', 54, 284, 686, 58, 'Display', '#FFFFFF', 62)
text(p, DATA['callToActionBody'], 54, 461, 686, 21, 'Body', 'muted', 31)
text(p, 'CONTACT', 54, 623, 686, 14, 'Strong', 'amber')
text(p, DATA['phone'], 54, 668, 686, 51, 'Display', '#FFFFFF')
text(p, DATA['carrier'], 54, 736, 686, 16, 'Body', 'dim')
text(p, DATA['email'], 54, 787, 686, 21, 'Strong', '#FFFFFF')
text(p, DATA['address'], 54, 843, 686, 19, 'Body', 'muted', 28)
text(p, DATA['company'], 54, 938, 686, 16, 'Body', 'muted', 25)
text(p, DATA['scopeNote'], 54, 1007, 686, 13, 'Body', 'dim', 19)
footer(p, 6, True)

for n,p in enumerate(pages,1):
    for el in p['elements']:
        if el['x']<0 or el['y']<0 or el['x']+el['w']>W+.1 or el['y']+el['h']>H+.1:
            raise ValueError(f'Off-page element on page {n}: {el}')

spec = dict(width=W, height=H, fonts={k:dict(family=v[0], bold=v[2]) for k,v in FONTS.items()}, pages=pages)
(PRIVATE/'layout.json').write_text(json.dumps(spec,indent=2),encoding='utf-8')
pdfpath = OUT/'Oceanides-Company-Profile.pdf'
c = canvas.Canvas(str(pdfpath), pagesize=(W*.75,H*.75), pageCompression=1)
c.setTitle('Oceanides Company Profile')
c.setAuthor(DATA['company'])
c.setSubject('Siphoning, plumbing, renovation and restoration, and pest control')
for p in pages:
    c.saveState()
    c.scale(.75,.75)
    c.setFillColor(HexColor(p['background']))
    c.rect(0,0,W,H,fill=1,stroke=0)
    for el in p['elements']:
        x,y,w,h = (el[k] for k in ['x','y','w','h'])
        if el['type']=='rect':
            c.setFillColor(HexColor(el['color']))
            c.rect(x,H-y-h,w,h,fill=1,stroke=0)
        elif el['type']=='text':
            c.setFillColor(HexColor(el['color']))
            c.setFont(el['font'],el['size'])
            # A consistent baseline keeps PDF and native text frames aligned.
            c.drawString(x,H-y-el['size']*.94,el['text'])
            if el['text']==DATA['email']:
                c.linkURL('mailto:'+DATA['email'],(x,H-y-h,x+w,H-y),relative=1)
            if el['text']==DATA['phone']:
                c.linkURL('tel:+639176716383',(x,H-y-h,x+w,H-y),relative=1)
        else:
            src = Path(el['renderPath'])
            im = Image.open(src).convert('RGB')
            if el['fit']=='cover':
                im = ImageOps.fit(im,(round(w*3),round(h*3)),method=Image.Resampling.LANCZOS)
            else:
                ratio=min(w/im.width,h/im.height)
                iw,ih=im.width*ratio,im.height*ratio
                x+=(w-iw)/2; y+=(h-ih)/2; w,h=iw,ih
            encoded = BytesIO()
            im.save(encoded, 'JPEG', quality=92, optimize=True)
            encoded.seek(0)
            c.drawImage(ImageReader(encoded),x,H-y-h,w,h,mask='auto')
    c.restoreState()
    c.showPage()
c.save()
print(f'Created {pdfpath} ({len(pages)} pages)')
