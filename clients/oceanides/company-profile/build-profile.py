"""Build the print PDF and a shared layout specification for the editable PPTX."""
import json
import sys
import math
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
FORMAT = sys.argv[2] if len(sys.argv) > 2 else 'A4'
if FORMAT not in ('A4', 'Widescreen'):
    raise ValueError('Choose A4 or Widescreen.')
PRIVATE = ROOT / '.tmp' / ('oceanides-widescreen' if FORMAT == 'Widescreen' else 'oceanides-profile')
PRIVATE.mkdir(parents=True, exist_ok=True)
OUT = HERE / 'output' / 'pdf'
OUT.mkdir(parents=True, exist_ok=True)
REVISION = sys.argv[1] if len(sys.argv) > 1 else ''
if REVISION and not all(char.isascii() and (char.isalnum() or char == '-') for char in REVISION):
    raise ValueError('Use an alphanumeric revision suffix.')
PDF_NAME = f'Oceanides-Company-Profile{"-" + REVISION if REVISION else ""}.pdf'
DATA = json.loads((HERE / 'profile-content.json').read_text(encoding='utf-8'))
W, H = (1280, 720) if FORMAT == 'Widescreen' else (794, 1123)
C = dict(navy='#0A1F45', surface='#263D5F', paper='#F7F7F2', ink='#17212B',
         blue='#1C63AD', sky='#89C7F4', muted='#D8DFE9', dim='#AABCD3', gray='#63707D', line='#D9DDD9')
FONTS = {'Body': ('Arial', 'arial.ttf', False),
         'Strong': ('Segoe UI', 'segoeuib.ttf', True),
         'Display': ('Segoe UI', 'segoeui.ttf', False)}
for key, (_, filename, _) in FONTS.items():
    pdfmetrics.registerFont(TTFont(key, str(Path('C:/Windows/Fonts') / filename)))

pages = []
def page(bg='paper'):
    p = {'background': C.get(bg, bg), 'elements': []}
    # Small wave ribbons stay in the top-right margin, behind page content.
    tones = ['#10294D', '#173759', '#21486B'] if bg == 'navy' else ['#E5EEF6', '#D7E6F2', '#BED5E8']
    for idx, tone in enumerate(tones):
        upper = []
        lower = []
        for step in range(41):
            t = step / 40
            y = max(0, 122 * (1-t)**2 - idx*16)
            thickness = 3 + 3*math.sin(t*math.pi)
            upper.append([144*t, y])
            lower.append([144*t, y+thickness])
        p['elements'].append(dict(type='polygon', x=W-144, y=0, w=144, h=132,
                                  points=upper+list(reversed(lower)), color=tone))
    pages.append(p)
    return p

def rect(p, x, y, w, h, color):
    p['elements'].append(dict(type='rect', x=x, y=y, w=w, h=h, color=C.get(color, color)))

def text(p, value, x, y, w=686, size=18, font='Body', color='ink', leading=None):
    if value != 'Oceanides' and font == 'Strong':
        if color == 'ink':
            color = 'blue'
        elif color == '#FFFFFF':
            color = 'paper'
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
    if source.endswith(('logo.jpg', 'logo-transparent.png')):
        render_path = ROOT / source
    else:
        im = Image.open(ROOT / source).convert('RGB')
        im.thumbnail((1800, 1800), Image.Resampling.LANCZOS)
        im.save(optimized, 'JPEG', quality=92, optimize=True)
        render_path = optimized
    p['elements'].append(dict(type='image', path=source, renderPath=str(render_path), x=x, y=y, w=w, h=h, fit=fit, alt=alt))

def rule(p, y, x=64, w=666, color='line'):
    rect(p, x, y, w, .7, color)

def header(p, dark=False):
    text(p, 'Oceanides', 64, 48, 360, 19, 'Strong', '#FFFFFF' if dark else 'ink')
    text(p, 'Company profile', 523, 51, 207, 14, 'Body', 'muted' if dark else 'gray')

def footer(p, n, dark=False):
    rule(p, 1061, color='surface' if dark else 'line')
    text(p, 'Oceanides', 64, 1080, 400, 13, 'Body', 'muted' if dark else 'gray')
    text(p, f'{n:02d}', 701, 1080, 29, 13, 'Body', 'muted' if dark else 'gray')

ASSETS = 'clients/oceanides/assets/'
ART = 'clients/oceanides/company-profile/assets/'

if FORMAT == 'Widescreen':
    from widescreen_layout import build_layout
    build_layout(DATA, page, text, image, rect, ASSETS, ART)
else:
    # Minimal cover: one logo, one subject, one architectural image.
    p=page()
    image(p, ART+'logo-transparent.png', 64, 29, 88, 88, alt='Oceanides logo with transparent outer background')
    text(p, 'Company profile', 64, 160, 666, 17, 'Body', 'gray')
    text(p, 'Property services\nOne point of contact', 64, 206, 666, 61, 'Display', 'blue', 68)
    image(p, ART+'cover-property-minimal.png', 0, 382, W, W*2/3, 'contain', 'AI-generated conceptual architecture, not a completed Oceanides project or engineering plan')
    text(p, 'AI-generated property-services concept', 64, 922, 666, 10, 'Body', 'gray')
    text(p, 'Siphoning. Plumbing. Renovation & restoration. Pest control.\nSewage treatment plants (STP).', 64, 963, 666, 17, 'Body', 'ink')
    text(p, DATA['company'], 64, 1023, 666, 12, 'Body', 'gray')
    footer(p,1)

    # Company overview: a flat service index, not a collection of panels.
    p=page()
    header(p)
    text(p, 'Services for the places\nyou live and work', 64, 135, 666, 46, 'Strong', 'ink', 53)
    text(p, DATA['overview'].replace('and sewage treatment plant (STP) projects.', '\nand sewage treatment plant (STP) projects.'), 64, 278, 666, 21, 'Body', 'gray', 31)
    rows=[
        ('Siphoning', 'Septic tank siphoning and cleaning.'),
        ('Plumbing', 'Drain declogging and pipe leak repairs.'),
        ('Renovation &\nrestoration', 'House and condominium repairs and improvements.'),
        ('Pest control', 'Site assessment, treatment scope and service coordination.'),
        ('Sewage treatment\nplant (STP)', 'Treatment of building wastewater on site.'),
    ]
    for idx,(title,detail) in enumerate(rows):
        y=449+idx*91
        rule(p,y)
        text(p,title,64,y+28,294,24,'Strong','ink',29)
        text(p,detail,389,y+29,341,18,'Body','gray',27)
    rule(p,905)
    text(p,'One contact through turnover',64,938,666,23,'Strong')
    text(p,'Oceanides coordinates assessment, quotation and delivery, including specialist contractors where required.',64,980,666,18,'Body','gray',27)
    footer(p,2)

    # Plumbing and siphoning: image illustration and actual proof remain distinct.
    p=page()
    header(p)
    text(p,'Siphoning &\nplumbing',64,130,666,53,'Strong','ink',59)
    text(p,'Septic tank services, drain declogging and plumbing repairs.',64,279,666,21,'Body','gray',31)
    text(p,'Service scope',64,391,278,23,'Strong')
    text(p,'Septic tank siphoning\nSeptic tank cleaning\nDrain declogging\nPipe leak repairs',64,442,278,19,'Body','ink',39)
    image(p,ART+'plumbing-service.png',372,383,358,358*2/3,'contain','AI-generated fictional plumbing specialist')
    text(p,'AI-generated service illustration',372,638,358,10,'Body','gray')
    rule(p,691)
    text(p,'Actual siphoning work',64,721,666,24,'Strong')
    text(p,'Same site before and after service',64,762,666,16,'Body','gray')
    image(p,ASSETS+'tb2-ba2-before.png',64,801,326,184,'cover','Confirmed actual same-site septic opening before service')
    image(p,ASSETS+'tb2-ba2-after.png',404,801,326,184,'cover','Confirmed actual same-site septic opening after service')
    text(p,'Before service',64,999,326,13,'Body','gray')
    text(p,'After service',404,999,326,13,'Body','gray')
    text(p,'Scope follows site access and tank or pipe conditions.',64,1030,666,13,'Body','gray')
    footer(p,3)

    # New offer: editorial service page with no unverified equipment imagery.
    p=page()
    header(p)
    facility=DATA['serviceGroups'][4]
    text(p,'Sewage treatment\nplant (STP)',64,130,666,53,'Display','blue',64)
    text(p,facility['summary'],64,304,666,21,'Body','gray',31)
    for y,title,detail in [
        (478,'Site assessment','Review wastewater flow, available space and the proposed outlet.'),
        (635,'Scope & quotation','Define the proposed system and installation needs with the specialist provider.'),
        (792,'Specialist coordination','Oceanides coordinates client communication and\nspecialist delivery through turnover.'),
    ]:
        rule(p,y-20)
        text(p,title,64,y,666,24,'Strong','ink',32)
        text(p,detail,64,y+47,666,19,'Body','gray',29)
    rule(p,954)
    text(p,facility['qualification'].replace('maintenance requirements', '\nmaintenance requirements'),64,978,666,17,'Body','gray',25)
    p['notes']='Neil clarified the offer on 2026-10-03: an on-site Sewage Treatment Plant (STP) for building wastewater. '+DATA['delivery']+'\n'+facility['qualification']
    footer(p,4)

    # Renovation: full source aspect preserves the ceiling tool and worker posture.
    p=page()
    header(p)
    text(p,'Renovation &\nrestoration',64,130,666,53,'Strong','ink',59)
    text(p,'Repair and improvement work for houses and condominiums.',64,279,666,21,'Body','gray',31)
    image(p,ART+'renovation-service.png',64,359,666,444,'contain','AI-generated fictional ceiling repair specialist')
    text(p,'AI-generated service illustration',64,816,666,10,'Body','gray')
    for x,y,title,detail in [
        (64,861,'Ceilings','Repair and replacement'),
        (414,861,'Water protection','Roof leak repair and waterproofing'),
        (64,948,'Renovation & restoration','Houses and condominiums'),
        (414,948,'Cleaning','House cleaning to agreed scope'),
    ]:
        text(p,title,x,y,316,20,'Strong','ink',26)
        text(p,detail,x,y+37,316,17,'Body','gray',25)
    footer(p,5)

    # Pest control: image first, title below; no plate obscures the treatment target.
    p=page()
    header(p)
    image(p,ART+'pest-control-service.png',64,132,666,444,'contain','AI-generated fictional pest-control specialist, localized treatment scene')
    text(p,'AI-generated service illustration',64,589,666,10,'Body','gray')
    text(p,'Pest control',64,644,666,52,'Strong')
    text(p,DATA['serviceGroups'][3]['summary'],64,725,666,21,'Body','gray',31)
    for y,label in [(837,'Assessment of pest activity'),(895,'Treatment scope based on site findings'),(953,'Service scheduling and contractor coordination')]:
        rule(p,y-17)
        text(p,label,64,y,666,20,'Body','ink',29)
    text(p,'Treatment and specialist requirements follow the site assessment.',64,1025,666,13,'Body','gray')
    footer(p,6)

    # Closing: calm navy, direct contacts, a short operating process.
    p=page('navy')
    image(p,ART+'logo-transparent.png',64,29,88,88,alt='Oceanides logo with transparent outer background')
    text(p,'Your next step',64,158,666,17,'Body','muted')
    text(p,'Site assessment\nWritten quotation',64,206,666,54,'Display','paper',64)
    text(p,'Tell us the service, site location and preferred inspection schedule.',64,365,666,21,'Body','muted',31)
    text(p,DATA['phone'],64,470,666,47,'Display','#FFFFFF')
    text(p,DATA['email'],64,548,666,22,'Body','muted')
    text(p,'Globe',64,589,666,14,'Body','dim')
    text(p,DATA['address'],64,629,666,17,'Body','muted',25)
    rule(p,691,color='surface')
    text(p,'Supplier accreditation',64,727,666,22,'Strong','#FFFFFF')
    text(p,'Share your procurement requirements. Oceanides can coordinate the company documents and project information for your review.',64,768,666,18,'Body','muted',27)
    for idx,(x,y) in enumerate([(64,871),(414,871),(64,951),(414,951)]):
        step=DATA['process'][idx]
        titles=['Site assessment','Written quotation','Service coordination','Turnover']
        details=['Review the site and requirements.','Confirm the proposed scope and price.','Arrange the field team or specialist.','Review the agreed work with the client.']
        text(p,titles[idx],x,y,316,19,'Strong','#FFFFFF')
        text(p,details[idx],x,y+33,316,16,'Body','muted',24)
    rule(p,1043,color='surface')
    text(p,DATA['company'],64,1063,666,12,'Body','muted')
    text(p,DATA['scopeNote'],64,1090,666,11,'Body','dim',15)

for n,p in enumerate(pages,1):
    for el in p['elements']:
        if el['x']<0 or el['y']<0 or el['x']+el['w']>W+.1 or el['y']+el['h']>H+.1:
            raise ValueError(f'Off-page element on page {n}: {el}')

spec = dict(width=W, height=H, fonts={k:dict(family=v[0], bold=v[2]) for k,v in FONTS.items()}, pages=pages)
(PRIVATE/'layout.json').write_text(json.dumps(spec,indent=2),encoding='utf-8')
pdfpath = OUT/PDF_NAME
c = canvas.Canvas(str(pdfpath), pagesize=(W*.75,H*.75), pageCompression=1)
c.setTitle('Oceanides Company Profile')
c.setAuthor(DATA['company'])
c.setSubject('Siphoning, plumbing, renovation and restoration, pest control and sewage treatment plant (STP) projects')
for p in pages:
    c.saveState()
    c.scale(.75,.75)
    c.setFillColor(HexColor(p['background']))
    c.rect(0,0,W,H,fill=1,stroke=0)
    for el in p['elements']:
        x,y,w,h = (el[k] for k in ['x','y','w','h'])
        if el['type']=='polygon':
            c.setFillColor(HexColor(el['color']))
            shape = c.beginPath()
            for i,(px,py) in enumerate(el['points']):
                (shape.moveTo if i==0 else shape.lineTo)(x+px,H-y-py)
            shape.close()
            c.drawPath(shape,fill=1,stroke=0)
        elif el['type']=='rect':
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
            im = Image.open(src)
            has_alpha = 'A' in im.getbands()
            im = im.convert('RGBA' if has_alpha else 'RGB')
            if el['fit']=='cover':
                im = ImageOps.fit(im,(round(w*3),round(h*3)),method=Image.Resampling.LANCZOS)
            else:
                ratio=min(w/im.width,h/im.height)
                iw,ih=im.width*ratio,im.height*ratio
                x+=(w-iw)/2; y+=(h-ih)/2; w,h=iw,ih
            encoded = BytesIO()
            if has_alpha:
                im.save(encoded, 'PNG')
            else:
                im.save(encoded, 'JPEG', quality=92, optimize=True)
            encoded.seek(0)
            c.drawImage(ImageReader(encoded),x,H-y-h,w,h,mask='auto')
    c.restoreState()
    c.showPage()
c.save()
print(f'Created {pdfpath} ({len(pages)} pages)')
