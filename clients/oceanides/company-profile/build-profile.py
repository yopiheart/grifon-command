"""Build the print PDF and a shared layout specification for the editable PPTX."""
import json
import sys
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
REVISION = sys.argv[1] if len(sys.argv) > 1 else ''
if REVISION and not all(char.isascii() and (char.isalnum() or char == '-') for char in REVISION):
    raise ValueError('Use an alphanumeric revision suffix.')
PDF_NAME = f'Oceanides-Company-Profile{"-" + REVISION if REVISION else ""}.pdf'
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

def polygon(p, x, y, w, h, points, color):
    p['elements'].append(dict(type='polygon', x=x, y=y, w=w, h=h,
                             points=points, color=C.get(color, color)))

def footer(p, n, dark=False):
    rect(p, 0, 1037, W, 86, 'navy')
    polygon(p, 0, 1037, 288, 86, [[0,0],[288,0],[251,86],[0,86]], 'amber')
    text(p, 'OCEANIDES', 34, 1062, 206, 27, 'Display', 'navy')
    text(p, DATA['phone'], 312, 1052, 403, 28, 'Strong', '#FFFFFF')
    text(p, DATA['email'], 312, 1090, 420, 13, 'Body', 'muted')
    text(p, f'{n:02d}', 751, 1067, 27, 15, 'Strong', 'dim')

def band(p, title, y=241, size=45):
    # Angled title plate: the recurring layout device of the selected brochure.
    height = 139 if '\n' in title else 102
    polygon(p, 27, y, 735, height, [[54,0],[735,0],[658,height],[0,height]], 'amber')
    polygon(p, 27, y, 724, height-9, [[54,0],[724,0],[652,height-9],[0,height-9]], 'paper')
    text(p, title, 77, y+18, 609, size, 'Display', 'navy', size*1.04)

def scope(p, items, x, y, w, size=19, color='#FFFFFF', gap=18):
    for item in items:
        rect(p, x, y+8, 5, 5, 'amber')
        y = text(p, item, x+19, y, w-19, size, 'Body', color, size*1.38)+gap
    return y

ASSETS = 'clients/oceanides/assets/'
ART = 'clients/oceanides/company-profile/assets/'

# Cover: commissioned conceptual architecture, separate from actual-job proof.
p=page('navy')
image(p, ASSETS+'logo.jpg', 38, 24, 120, 120, alt='Approved Oceanides logo')
text(p, 'OCEANIDES', 196, 33, 560, 62, 'Display', '#FFFFFF')
text(p, 'Plumbing Siphoning & Pest Management Services OPC', 198, 111, 553, 15, 'Body', 'muted', 21)
image(p, ART+'cover-property-services.png', 0, 176, W, 516, 'cover', 'AI-generated conceptual property-services architecture; not a completed project')
text(p, 'AI-generated property-services concept', 44, 705, 706, 11, 'Body', 'dim')
polygon(p,0,743,27,205,[[0,0],[27,0],[27,190],[0,205]],'amber')
text(p, 'COMPANY PROFILE', 44, 743, 706, 56, 'Display', '#FFFFFF')
text(p, 'Property services. One coordinated point of contact.', 44, 823, 706, 19, 'Body', 'muted')
for x,y,label in [(44,890,'SIPHONING'),(414,890,'PLUMBING'),(44,950,'RENOVATION & RESTORATION'),(414,950,'PEST CONTROL')]:
    text(p,label,x,y,337,24 if x==44 and y==950 else 27,'Display','#FFFFFF')
footer(p,1,True)

# Overview: angled masthead, concise introduction and editorial service index.
p=page()
image(p,ASSETS+'tb2-truck-street.png',0,0,W,261,'cover','Approved field-service vehicle photograph')
band(p,'COMPANY OVERVIEW',205,45)
text(p,DATA['overview'],44,346,706,19,'Body','ink',28)
polygon(p,0,475,W,225,[[0,0],[W,0],[W-89,225],[0,225]],'navy')
text(p,'ONE CONTACT THROUGH TURNOVER',44,503,665,29,'Display','#FFFFFF')
text(p,DATA['delivery'],44,554,650,18,'Body','muted',27)
text(p,'SERVICE PORTFOLIO',44,730,706,14,'Strong','blue')
for x,y,idx in [(44,781,0),(414,781,1),(44,886,2),(414,886,3)]:
    titles=['SIPHONING','PLUMBING','RENOVATION &\nRESTORATION','PEST CONTROL']
    text(p,titles[idx],x,y,334,28,'Display','navy',30)
    summaries=['Septic tank siphoning and cleaning.','Declogging and pipe leak repairs.','House and condominium improvements.','Assessment-based service coordination.']
    text(p,summaries[idx],x,y+(67 if idx==2 else 43),334,15,'Body','gray',21)
footer(p,2)

# Generated service scene above; actual paired job images in a dedicated proof row.
p=page()
image(p,ART+'plumbing-service.png',0,0,W,W*2/3,'contain','AI-generated plumbing service illustration')
rect(p,0,420,W,130,'paper')
band(p,'SIPHONING\n& PLUMBING',344,43)
text(p,'AI-generated service illustration',44,497,706,11,'Body','gray')
rect(p,0,536,W,242,'navy')
text(p,'SEPTIC TANK SERVICES',44,561,333,25,'Display','#FFFFFF')
text(p,'PLUMBING SERVICES',418,561,332,25,'Display','#FFFFFF')
scope(p,DATA['serviceGroups'][0]['items'],44,609,317,16,gap=12)
scope(p,DATA['serviceGroups'][1]['items'],418,609,326,16,gap=12)
text(p,'ACTUAL SIPHONING WORK / SAME SITE',44,801,706,13,'Strong','blue')
image(p,ASSETS+'tb2-ba2-before.png',44,837,342,152,'cover','Actual same-site septic opening before service')
image(p,ASSETS+'tb2-ba2-after.png',408,837,342,152,'cover','Actual same-site septic opening after service')
text(p,'BEFORE SERVICE',44,1002,342,11,'Strong','blue')
text(p,'AFTER SERVICE',408,1002,342,11,'Strong','blue')
footer(p,3)

# Illustrative environment image, not represented as a past project.
p=page()
image(p,ART+'renovation-service.png',0,0,W,W*2/3,'contain','AI-generated ceiling repair service illustration')
rect(p,0,420,W,130,'paper')
band(p,'RENOVATION\n& RESTORATION',344,43)
text(p,'AI-generated service illustration',44,497,706,11,'Body','gray')
text(p,'HOUSES & CONDOMINIUMS',44,543,706,28,'Display','navy')
text(p,DATA['serviceGroups'][2]['summary'],44,592,706,18,'Body','ink',26)
polygon(p,0,653,W,277,[[0,0],[W,0],[W-83,277],[0,277]],'navy')
scope(p,DATA['serviceGroups'][2]['items'],44,685,671,21,gap=21)
text(p,'Oceanides coordinates the field team or specialist contractor for the agreed work.',44,954,663,17,'Body','ink',26)
footer(p,4)

# Recognizable pest subject; does not imply owned equipment or technicians.
p=page()
image(p,ART+'pest-control-service.png',0,0,W,W*2/3,'contain','AI-generated localized pest-treatment service illustration')
band(p,'PEST CONTROL',500,49)
text(p,'AI-generated service illustration',44,616,706,11,'Body','gray')
text(p,'SITE FINDINGS FIRST',44,653,706,27,'Display','navy')
text(p,DATA['serviceGroups'][3]['summary'],44,699,706,18,'Body','ink',25)
rect(p,0,779,W,158,'navy')
scope(p,DATA['serviceGroups'][3]['items'],44,803,685,18,gap=14)
polygon(p,0,951,42,70,[[0,0],[42,0],[18,70],[0,70]],'amber')
text(p,'The treatment scope, service schedule and specialist requirements are confirmed after assessment.',60,964,673,16,'Body','ink',24)
footer(p,5)

# Closing: working process and prominent site-assessment contact information.
p=page('navy')
image(p,ASSETS+'logo.jpg',31,20,125,125,alt='Approved Oceanides logo')
text(p,"LET'S ASSESS\nYOUR SITE.",194,27,563,56,'Display','#FFFFFF',60)
text(p,'Tell us the service, location and preferred inspection schedule.',44,211,706,20,'Body','muted',29)
polygon(p,0,302,W,136,[[0,0],[W,0],[W-61,136],[0,136]],'amber')
text(p,DATA['phone'],44,322,686,57,'Display','navy')
text(p,'GLOBE  /  '+DATA['email'],46,401,674,16,'Body','navy')
text(p,'HOW THE WORK MOVES FORWARD',44,482,706,29,'Display','#FFFFFF')
for idx,(x,y) in enumerate([(44,542),(416,542),(44,690),(416,690)]):
    step=DATA['process'][idx]
    text(p,f'{idx+1:02d}',x,y,50,31,'Display','amber')
    title = 'Coordination' if idx==2 else step['title']
    text(p,title,x+65,y+1,265,22,'Display','#FFFFFF')
    text(p,step['detail'],x,y+52,333,16,'Body','muted',24)
rect(p,44,844,706,1,'surface')
text(p,'FOR MANAGEMENT & PROCUREMENT',44,873,706,14,'Strong','amber')
text(p,DATA['procurement'],44,910,706,16,'Body','muted',24)
text(p,DATA['address'],44,990,706,14,'Body','dim',20)
rect(p,0,1045,W,78,'paper')
text(p,DATA['company'],44,1060,706,15,'Strong','navy')
text(p,DATA['scopeNote'],44,1092,706,11,'Body','gray')

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
c.setSubject('Siphoning, plumbing, renovation and restoration, and pest control')
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
