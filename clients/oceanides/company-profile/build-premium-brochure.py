"""Build the eight-page A5 review booklet and duplex A4 booklet print file.

Uses the confirmed service/contact content and the user's supplied history source.
Keeps original artwork and older deliverables unchanged. No generation calls.
"""
from pathlib import Path
from io import BytesIO
import hashlib
import json
import os
import tempfile
from PIL import Image

from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from pypdf import PdfReader, PdfWriter, Transformation

ROOT = Path(__file__).resolve().parent
ASSETS = ROOT / 'assets'
CLIENT = ROOT.parent
OUT = ROOT / 'output' / 'pdf'
QA = ROOT.parents[2] / '.tmp' / 'oceanides-premium' / 'brochure'
MM = 72 / 25.4
W, H = 148.5 * MM, 210 * MM
LEFT, RIGHT = 13 * MM, 13 * MM
CW = W - LEFT - RIGHT
PAPER, INK, BLUE, NAVY, GRAY = '#F7F7F2', '#17212B', '#1C63AD', '#0A1F45', '#52616E'
FONT_DIR = Path('C:/Windows/Fonts')
for name, file in [('Display','segoeuil.ttf'), ('Heading','seguisb.ttf'), ('Body','arial.ttf'), ('BodyBold','arialbd.ttf')]:
    pdfmetrics.registerFont(TTFont(name, str(FONT_DIR / file)))
DATA = json.loads((ROOT / 'premium-content.json').read_text(encoding='utf-8'))
RECEIPT = {'pageSizeMm':[148.5,210], 'pages':[], 'images':[], 'overflow':[]}

def color(v):
    return colors.HexColor(v)

def paragraph(c, text, top, size=10.8, leading=None, font='Body', fill=INK, x=LEFT, width=CW):
    style = ParagraphStyle('body', fontName=font, fontSize=size, leading=leading or size*1.42,
                           textColor=color(fill), alignment=TA_LEFT, spaceAfter=0)
    p = Paragraph(text.replace('&', '&amp;').replace('\n', '<br/>'), style)
    _, height = p.wrap(width, H)
    if top+height > H-13*MM or x < 0 or x+width > W+0.1:
        RECEIPT['overflow'].append({'page':c.getPageNumber(),'text':text,'top':top,'height':height})
        raise ValueError(f'Text outside safe page area: {text}')
    p.drawOn(c, x, H-top-height)
    return top+height

def title(c, text, top=21*MM, size=29, fill=BLUE, width=CW):
    return paragraph(c,text,top,size,size*1.10,'Heading',fill,width=width)

def photo(c, path, left, top, width, height, fit='contain', crop=None):
    original=Image.open(path)
    iw, ih=original.size
    # High-quality print compression only. Source artwork/geometry stays unchanged.
    if original.mode=='RGB':
        encoded=BytesIO();original.save(encoded,format='JPEG',quality=95,subsampling=0,optimize=True)
        encoded.seek(0);image=ImageReader(encoded)
    else:
        image=ImageReader(str(path))
    box=crop or (0,0,iw,ih)
    bw,bh=box[2]-box[0],box[3]-box[1]
    scale=min(width/bw,height/bh) if fit=='contain' else max(width/bw,height/bh)
    dw,dh=bw*scale,bh*scale
    c.saveState()
    clip = c.beginPath(); clip.rect(left,H-top-height,width,height); c.clipPath(clip,stroke=0,fill=0)
    x=left+(width-dw)/2-box[0]*scale
    y=H-top-height+(height-dh)/2-(ih-box[3])*scale
    c.drawImage(image,x,y,iw*scale,ih*scale,mask='auto')
    c.restoreState()
    RECEIPT['images'].append({'page':c.getPageNumber(),'asset':str(path.relative_to(CLIENT)),
                            'effectiveDpi':round(72/scale,1),'fit':fit,'crop':crop,
                            'compression':'JPEG quality 95, chroma subsampling off' if original.mode=='RGB' else 'Original alpha preserved'})

def rule(c, top, fill='#D9E0E6'):
    c.setStrokeColor(color(fill)); c.setLineWidth(.55)
    c.line(LEFT,H-top,W-RIGHT,H-top)

def page(c, name, dark=False):
    c.setFillColor(color(NAVY if dark else PAPER)); c.rect(0,0,W,H,fill=1,stroke=0)
    if c.getPageNumber()>1:
        c.setFont('Body',7.5); c.setFillColor(color('#B9CBE1' if dark else GRAY))
        c.drawString(LEFT,H-11*MM,'Oceanides')
        c.drawRightString(W-RIGHT,9*MM,f'{c.getPageNumber():02}')
    RECEIPT['pages'].append({'page':c.getPageNumber(),'topic':name})

def caption(c, text, top):
    return paragraph(c,text,top,7.6,10,'Body',GRAY)

def items(c, entries, top, fill=INK):
    for entry in entries:
        top=paragraph(c,entry,top,10.8,15,'Body',fill)+3.3*MM
    return top

def service_body(c, index, top):
    service=DATA['services'][index]
    top=paragraph(c,service['description'],top,11.1,15.8)+6*MM
    rule(c,top);top+=6*MM
    return items(c,service['items'],top)

def build(path):
    c=canvas.Canvas(str(path),pagesize=(W,H),pageCompression=1)
    c.setTitle('Oceanides Company Profile - A5 Brochure')
    c.setAuthor('Oceanides')
    c.setSubject('Company background, property services and contact information')
    # Cover. One original logo, direct title, one conceptual architectural image.
    page(c,'Company profile')
    photo(c,ASSETS/'logo-transparent.png',LEFT,12*MM,39*MM,39*MM)
    title(c,'Company\nprofile',61*MM,35)
    paragraph(c,DATA['subtitle'],94*MM,11.3,15.8,width=112*MM)
    photo(c,ASSETS/'cover-property-minimal.png',0,114*MM,W,71*MM)
    caption(c,'AI-generated architectural illustration',185*MM)
    paragraph(c,DATA['company']['legalName'],193*MM,8.0,10.6)
    c.showPage()
    # History comes from the supplied reference, not inferred years of experience.
    page(c,'Company background')
    top=title(c,'Company\nbackground',22*MM,28)+7*MM
    top=paragraph(c,DATA['about']['body'],top,10.5,14.6)+8*MM
    paragraph(c,'2021',top,34,39,'Display',BLUE)
    top+=18*MM
    top=paragraph(c,DATA['history']['body'],top,10.5,14.6)+8*MM
    for heading, text in [('Mission',DATA['mission']),('Vision',DATA['vision'])]:
        top=paragraph(c,heading,top,11,14,'Heading',BLUE)+2*MM
        top=paragraph(c,text,top,10,13.8)+5*MM
    top=paragraph(c,'Values',top,11,14,'Heading',BLUE)+2*MM
    paragraph(c,', '.join(v['name'] for v in DATA['values']),top,10,13.8)
    c.showPage()
    # Actual before/after evidence is separate from illustrative service images.
    page(c,'Siphoning')
    top=title(c,'Siphoning',22*MM,31)+6*MM
    top=paragraph(c,DATA['services'][0]['description'],top,11.1,15.8)+6*MM
    half=(CW-4*MM)/2
    photo(c,CLIENT/'assets'/'tb2-ba2-before.png',LEFT,top,half,66*MM,'cover')
    photo(c,CLIENT/'assets'/'tb2-ba2-after.png',LEFT+half+4*MM,top,half,66*MM,'cover')
    paragraph(c,'Before',top+67*MM,8.4,11,'Heading',GRAY,width=half)
    paragraph(c,'After',top+67*MM,8.4,11,'Heading',GRAY,x=LEFT+half+4*MM,width=half)
    top=caption(c,'Actual Oceanides job photographs',top+74*MM)+6*MM
    items(c,DATA['services'][0]['items'],top)
    c.showPage()
    page(c,'Plumbing')
    photo(c,ASSETS/'plumbing-service.png',LEFT,21*MM,CW,79*MM)
    caption(c,'AI-generated service illustration',102*MM)
    top=title(c,'Plumbing',114*MM,29)+6*MM
    service_body(c,1,top)
    c.showPage()
    page(c,'Renovation and restoration')
    top=title(c,'Renovation &\nrestoration',22*MM,27)+5*MM
    top=paragraph(c,DATA['services'][2]['description'],top,10.5,14.6)+5*MM
    top=items(c,DATA['services'][2]['items'],top)
    photo(c,ASSETS/'renovation-service.png',LEFT,top+2*MM,CW,59*MM)
    caption(c,'AI-generated service illustration',top+63*MM)
    c.showPage()
    page(c,'Pest control')
    photo(c,ASSETS/'pest-control-service.png',LEFT,21*MM,CW,79*MM)
    caption(c,'AI-generated service illustration',102*MM)
    top=title(c,'Pest control',114*MM,29)+6*MM
    service_body(c,3,top)
    c.showPage()
    page(c,'Sewage treatment plant')
    top=title(c,'Sewage treatment\nplant (STP)',22*MM,26)+5*MM
    top=paragraph(c,DATA['stp']['body'],top,10.5,14.6)+5*MM
    visual_height=CW*605/1410
    photo(c,ASSETS/'premium'/'stp-process-source.png',LEFT,top,CW,visual_height,crop=(280,295,1690,900))
    top=caption(c,'Illustrative treatment process. Actual design follows site assessment.',top+visual_height+2*MM)+5*MM
    rule(c,top);top+=5*MM
    top=paragraph(c,'Site requirements',top,11,14,'Heading',BLUE)+2*MM
    paragraph(c,DATA['stp']['qualification'],top,10,13.8)
    c.showPage()
    page(c,'Site assessment and contact',dark=True)
    top=title(c,'Arrange a site\nassessment',22*MM,28,PAPER)+6*MM
    top=paragraph(c,DATA['callToAction']['body'],top,10.6,15,'Body',PAPER)+7*MM
    for i,step in enumerate(DATA['delivery']['steps'],1):
        top=paragraph(c,f'{i:02}  {step["name"]}',top,11,14,'Heading',PAPER)+2*MM
        top=paragraph(c,step['detail'],top,9.3,12.6,'Body',PAPER)+4.5*MM
    rule(c,top,'#436185');top+=6*MM
    top=paragraph(c,DATA['contact']['phone']+'  (Globe)',top,15,19,'Heading',PAPER)+3*MM
    top=paragraph(c,DATA['contact']['email'],top,8.7,11.8,'Body',PAPER)+3*MM
    top=paragraph(c,DATA['contact']['address'],top,8.5,11.8,'Body','#C9DDF4')+4*MM
    paragraph(c,DATA['callToAction']['scopeNote'],top,7.4,10,'Body','#C9DDF4')
    c.showPage();c.save()

def impose(source, destination):
    reader=PdfReader(source);writer=PdfWriter()
    if len(reader.pages)!=8:raise ValueError('Eight pages required for this booklet')
    order=[(8,1),(2,7),(6,3),(4,5)]
    for left,right in order:
        target=writer.add_blank_page(width=297*MM,height=210*MM)
        target.merge_transformed_page(reader.pages[left-1],Transformation(),expand=False)
        target.merge_transformed_page(reader.pages[right-1],Transformation().translate(tx=W),expand=False)
    writer.add_metadata({'/Title':'Oceanides A4 Duplex Booklet Print','/Author':'Oceanides',
                         '/Subject':'Print landscape, actual size, duplex, flip on short edge. Fold both sheets together.'})
    with open(destination,'wb') as f:writer.write(f)
    return order

def main():
    OUT.mkdir(parents=True,exist_ok=True);QA.mkdir(parents=True,exist_ok=True)
    candidate=QA/'brochure-candidate.pdf';imposed=QA/'print-candidate.pdf'
    build(candidate);order=impose(candidate,imposed)
    for p,count,size in [(candidate,8,(W,H)),(imposed,4,(2*W,H))]:
        reader=PdfReader(p)
        assert len(reader.pages)==count
        assert all(abs(float(page.mediabox.width)-size[0])<.02 and abs(float(page.mediabox.height)-size[1])<.02 for page in reader.pages)
        text='\n'.join(page.extract_text() for page in reader.pages)
        assert all(x in text for x in ['0917 671 6383','marketing@oceanidessepticandpest.com','2021','STP','waterproofing','House cleaning'])
    RECEIPT['printOrder']=order
    RECEIPT['printSettings']={'paper':'A4','orientation':'Landscape','scale':'Actual size (100%)','sides':'Duplex','flip':'Short edge','sheets':2,'finish':'Nest sheets and fold at the center'}
    RECEIPT['outputs']=[]
    for candidate,name in [(candidate,'Oceanides-Company-Brochure-A5-2026.pdf'),(imposed,'Oceanides-Company-Brochure-A4-Booklet-Print-2026.pdf')]:
        target=OUT/name;data=candidate.read_bytes()
        with tempfile.NamedTemporaryFile(dir=OUT,suffix='.pdf',delete=False) as temp:temp.write(data);staged=Path(temp.name)
        os.replace(staged,target)
        RECEIPT['outputs'].append({'path':str(target.relative_to(ROOT)),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
    (QA/'layout-receipt.json').write_text(json.dumps(RECEIPT,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'status':'PASS_STRUCTURAL_CHECKS_PENDING_VISUAL_REVIEW','pages':8,'printSurfaces':4,'outputs':RECEIPT['outputs']}))

if __name__=='__main__':main()
