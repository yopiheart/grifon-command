"""Oceanides blue corporate editorial booklet. All layouts are a new design.

Creates an eight-page A5 reader PDF and a duplex A4 imposed print PDF.
Source photographs, approved film artwork and older deliverables stay intact.
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
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from pypdf import PdfReader, PdfWriter, Transformation

ROOT = Path(__file__).resolve().parent
CLIENT = ROOT.parent
ASSETS = ROOT / 'assets'
OUT = ROOT / 'output' / 'pdf'
QA = ROOT.parents[2] / '.tmp' / 'oceanides-redesign' / 'brochure'
MM = 72 / 25.4
W, H = 148.5 * MM, 210 * MM
SAFE = 13 * MM
CW = W - 2 * SAFE
PAPER, WHITE, INK, BLUE, NAVY, GRAY = '#F4F6FA', '#FFFFFF', '#0B1B33', '#1C63AD', '#0A1F45', '#526174'
FONTS = [('Display', 'GOTHIC.TTF'), ('Heading', 'GOTHICB.TTF'), ('Body', 'corbel.ttf'), ('BodyBold', 'corbelb.ttf')]
for name, filename in FONTS:
    pdfmetrics.registerFont(TTFont(name, 'C:/Windows/Fonts/' + filename))
DATA = json.loads((ROOT / 'premium-content.json').read_text(encoding='utf-8'))
RECEIPT = {'design': 'Blue corporate editorial', 'pageSizeMm': [148.5,210], 'pages': [], 'images': [], 'text': [], 'overflow': []}

def ink(value):
    return colors.HexColor(value)

def panel(c, x, top, width, height, fill):
    c.setFillColor(ink(fill)); c.rect(x*MM, H-(top+height)*MM, width*MM, height*MM, fill=1, stroke=0)

def text(c, value, x, top, width, size=10.8, leading=None, font='Body', fill=INK):
    style=ParagraphStyle('editorial', fontName=font, fontSize=size, leading=leading or size*1.34, textColor=ink(fill))
    paragraph=Paragraph(value.replace('&','&amp;').replace('\n','<br/>'), style)
    _, height=paragraph.wrap(width*MM, H)
    bottom=top+height/MM
    if x<13-.01 or x+width>148.5-13+.01 or top<13-.01 or bottom>197+.01:
        RECEIPT['overflow'].append({'page': c.getPageNumber(),'text': value,'boundsMm': [x,top,width,height/MM]})
        raise ValueError('Text outside 13mm safe margins: '+value)
    paragraph.drawOn(c,x*MM,H-top*MM-height)
    RECEIPT['text'].append({'page': c.getPageNumber(),'value': value,'boundsMm': [x,top,width,height/MM],'font':font,'sizePt':size})
    return bottom

def title(c, value, top, x=23, width=103, size=27, fill=INK):
    return text(c,value,x,top,width,size,size*1.13,'Heading',fill)

def line(c, top, x=23, width=103, fill='#BFCADA'):
    c.setStrokeColor(ink(fill)); c.setLineWidth(.55)
    c.line(x*MM,H-top*MM,(x+width)*MM,H-top*MM)

def photo(c, source, x, top, width, height, fit='cover', crop=None):
    original=Image.open(source); iw,ih=original.size
    box=crop or (0,0,iw,ih)
    bw,bh=box[2]-box[0],box[3]-box[1]
    scale=min(width*MM/bw,height*MM/bh) if fit=='contain' else max(width*MM/bw,height*MM/bh)
    dw,dh=bw*scale,bh*scale
    if original.mode=='RGB':
        encoded=BytesIO(); original.save(encoded,format='JPEG',quality=95,subsampling=0,optimize=True); encoded.seek(0)
        image=ImageReader(encoded)
    else:
        image=ImageReader(str(source))
    c.saveState(); clip=c.beginPath(); clip.rect(x*MM,H-(top+height)*MM,width*MM,height*MM);c.clipPath(clip,stroke=0,fill=0)
    c.drawImage(image,x*MM+(width*MM-dw)/2-box[0]*scale,H-(top+height)*MM+(height*MM-dh)/2-(ih-box[3])*scale,iw*scale,ih*scale,mask='auto')
    c.restoreState()
    RECEIPT['images'].append({'page':c.getPageNumber(),'asset':str(source.relative_to(CLIENT)), 'sourceSize': [iw,ih], 'effectiveDpi':round(72/scale,1),'fit':fit,'crop':crop,'compression':'JPEG quality95, no chroma subsampling' if original.mode=='RGB' else 'Original alpha preserved'})

def page(c, topic):
    c.setFillColor(ink(PAPER));c.rect(0,0,W,H,fill=1,stroke=0)
    RECEIPT['pages'].append({'page':c.getPageNumber(),'topic':topic})

def chapter(c, number, label, dark=False):
    panel(c,13,13,3,23,BLUE if not dark else WHITE)
    text(c,number+' / '+label.upper(),23,14,103,7.3,9.4,'BodyBold',WHITE if dark else BLUE)
    text(c,f'{c.getPageNumber():02}',126.5,192,9,7.5,9,'Body',GRAY)

def scopes(c, values, x, top, width, fill=INK, size=10.4, gap=4):
    for value in values:
        top=text(c,value,x,top,width,size,size*1.3,'Body',fill)+gap
    return top

def build(path):
    c=canvas.Canvas(str(path),pagesize=(W,H),pageCompression=1)
    c.setTitle('Oceanides Company Brochure - Blue Corporate Redesign')
    c.setAuthor('Oceanides')
    c.setSubject('Company background and five property service groups')
    # Cover: typography-led navy composition; new facade overlaps a blue base.
    page(c,'Property services')
    panel(c,13,13,122.5,143,NAVY)
    panel(c,13,159,57,32,BLUE)
    text(c,'COMPANY PROFILE / 2026',23,24,70,7.5,9,'BodyBold',WHITE)
    photo(c,ASSETS/'logo-transparent.png',110,20,17,17,'contain')
    title(c,'Property\nservices.',48,size=34,fill=WHITE)
    text(c,'For homes and\ncompany facilities.',23,83,65,11.5,15.7,'Display',WHITE)
    text(c,DATA['company']['legalName'],23,119,42,8.4,11.3,'Body',WHITE)
    text(c,'Siphoning and plumbing\nRenovation and restoration\nPest control and STP projects',23,164,44,9.3,13.3,'Body',WHITE)
    photo(c,ASSETS/'redesign'/'facade-pexels-14765373.jpg',74,95,61.5,96,'cover')
    text(c,'Illustrative architecture. To Tao / Pexels.',74,193,61.5,6.4,8.2,'Body',GRAY)
    c.showPage()
    # Background: generous blue history block, then a two-column editorial section.
    page(c,'Company background')
    panel(c,13,13,122.5,87,BLUE);chapter(c,'01','Company',True)
    title(c,'Our background.',30,size=25,fill=WHITE)
    text(c,'2021',23,49,49,37,42,'Display',WHITE)
    text(c,DATA['history']['body'],79,53,45.5,9.5,13.0,'Body',WHITE)
    text(c,DATA['about']['body'],23,107,102.5,10.2,13.8)
    line(c,139)
    text(c,'Mission',23,145,46,12,16,'Heading',BLUE)
    text(c,DATA['mission'],23,155,46,9.6,13.1)
    text(c,'Vision',79,145,46.5,12,16,'Heading',BLUE)
    text(c,DATA['vision'],79,155,46.5,9.6,13.1)
    text(c,'VALUES',23,185,18,7.1,9,'BodyBold',BLUE)
    text(c,'Quality / Integrity / Respect / Teamwork / Customer care',46,184,79.5,8.6,11.2)
    c.showPage()
    # Original job evidence. Full source frames; no synthetic cleanup or recropping.
    page(c,'Siphoning');chapter(c,'02','Septic care')
    title(c,'Siphoning.',29,size=30)
    text(c,DATA['services'][0]['description'],23,49,102.5,11,14.7)
    half=58.5
    panel(c,13,72,122.5,93,NAVY)
    photo(c,CLIENT/'assets'/'before-1.jpg',17,77,half-2,75.333,'contain')
    photo(c,CLIENT/'assets'/'after-1.jpg',77,77,half-2,75.333,'contain')
    text(c,'BEFORE',17,157,54,7.4,9,'BodyBold',WHITE)
    text(c,'AFTER',77,157,54,7.4,9,'BodyBold',WHITE)
    text(c,'Actual Oceanides job photographs.',23,168,102.5,7.8,10.4,'Body',GRAY)
    line(c,174)
    text(c,'SERVICE SCOPE',23,179,29,7.2,9,'BodyBold',BLUE)
    scopes(c,DATA['services'][0]['items'],59,177,66.5,size=9.5,gap=1.5)
    c.showPage()
    # Plumbing: whole repair context with an offset blue panel over the lower photo.
    page(c,'Plumbing');chapter(c,'03','Pipe and drainage')
    title(c,'Plumbing.',29,size=30)
    text(c,DATA['services'][1]['description'],23,50,102.5,11,14.7)
    photo(c,ASSETS/'plumbing-service.png',13,72,122.5,81.667,'contain')
    panel(c,13,123,72,68,BLUE)
    text(c,'A defined\nrepair scope.',23,132,52,17,21,'Heading',WHITE)
    scopes(c,DATA['services'][1]['items'],23,154,52,WHITE,9.6,2.6)
    text(c,'AI-generated service illustration.',91,158,44.5,7.2,9.4,'Body',GRAY)
    c.showPage()
    # Renovation: dark title band, complete working scene and a two-column scope.
    page(c,'Renovation and restoration');panel(c,13,13,122.5,51,NAVY);chapter(c,'04','Repair and improve',True)
    title(c,'Renovation &\nrestoration.',29,size=24,fill=WHITE)
    text(c,DATA['services'][2]['description'],23,68,102.5,10.2,13.8)
    photo(c,ASSETS/'renovation-service.png',13,82,122.5,81.667,'contain')
    text(c,'AI-generated service illustration.',23,167,102.5,6.8,8.5,'Body',GRAY)
    for item,x,top in zip(DATA['services'][2]['items'],[23,79,23,79],[173,173,185,185]):
        text(c,item,x,top,46.5,9.6,12.6,'Body',INK)
    c.showPage()
    # Pest: a dark editorial panel with a full landscape view of the treatment.
    page(c,'Pest control');panel(c,13,13,122.5,178,NAVY);chapter(c,'05','Property assessment',True)
    title(c,'Pest control.',30,size=28,fill=WHITE)
    text(c,DATA['services'][3]['description'],23,52,102.5,10.8,14.5,'Body',WHITE)
    panel(c,13,78,3,25,BLUE)
    scopes(c,DATA['services'][3]['items'],23,79,102.5,WHITE,10.6,3)
    photo(c,ASSETS/'pest-control-service.png',23,111,102.5,68.333,'contain')
    text(c,'AI-generated service illustration.',23,183,102.5,6.8,8.7,'Body',WHITE)
    c.showPage()
    # STP: wide approved process illustration with a restrained blue requirements band.
    page(c,'Sewage treatment plant');chapter(c,'06','Wastewater on site')
    title(c,'Sewage treatment\nplant (STP).',29,size=24)
    text(c,DATA['stp']['body'],23,56,102.5,10.6,14.3)
    photo(c,ASSETS/'premium'/'stp-process-source.png',13,88,122.5,52.562,'contain',(280,295,1690,900))
    text(c,'Illustrative process. Actual design follows site assessment.',23,144,102.5,7.1,9.3,'Body',GRAY)
    panel(c,13,156,122.5,35,BLUE)
    text(c,'SITE REQUIREMENTS',23,161,102.5,7.3,9.2,'BodyBold',WHITE)
    text(c,DATA['stp']['qualification'],23,169,102.5,9.1,11.6,'Body',WHITE)
    c.showPage()
    # Closing: white typography, vertical process and a strong blue contact block.
    page(c,'Site assessment and contact');panel(c,13,13,122.5,128,NAVY);chapter(c,'07','Next step',True)
    title(c,'Let\'s assess\nyour site.',30,size=28,fill=WHITE)
    text(c,DATA['callToAction']['body'],23,61,102.5,10.4,14.1,'Body',WHITE)
    top=91
    for number,step in enumerate(DATA['delivery']['steps'],1):
        text(c,f'{number:02}',23,top,10,9.5,12,'Display',WHITE)
        text(c,step['name'],38,top,26,9.4,12,'BodyBold',WHITE)
        bottom=text(c,step['detail'],70,top,55.5,8.8,11.4,'Body',WHITE)
        top=bottom+3.3
    panel(c,13,144,122.5,47,BLUE)
    text(c,DATA['contact']['phone'],23,151,103,20,25,'Heading',WHITE)
    text(c,'GLOBE / INQUIRIES & QUOTATIONS',23,164,103,7.1,9.2,'BodyBold',WHITE)
    text(c,DATA['contact']['email'],23,173,103,10.5,14.2,'Body',WHITE)
    text(c,DATA['contact']['address'],23,182,103,8.2,10.5,'Body',WHITE)
    text(c,DATA['callToAction']['scopeNote'],23,193,103,6.4,8.2,'Body',GRAY)
    c.showPage();c.save()

def impose(source,destination):
    reader=PdfReader(source);writer=PdfWriter();order=[(8,1),(2,7),(6,3),(4,5)]
    if len(reader.pages)!=8:raise ValueError('Eight pages required')
    for left,right in order:
        target=writer.add_blank_page(width=297*MM,height=210*MM)
        target.merge_transformed_page(reader.pages[left-1],Transformation(),expand=False)
        target.merge_transformed_page(reader.pages[right-1],Transformation().translate(tx=W),expand=False)
    writer.add_metadata({'/Title':'Oceanides Blue Corporate Brochure - A4 Booklet Print','/Author':'Oceanides','/Subject':'A4 landscape, actual size, duplex, flip short edge. Nest two sheets and fold.'})
    with open(destination,'wb') as stream:writer.write(stream)
    return order

def main():
    OUT.mkdir(parents=True,exist_ok=True);QA.mkdir(parents=True,exist_ok=True)
    candidate=QA/'brochure-candidate.pdf';print_candidate=QA/'print-candidate.pdf'
    build(candidate);RECEIPT['printOrder']=impose(candidate,print_candidate)
    for file,count,width in [(candidate,8,W),(print_candidate,4,W*2)]:
        reader=PdfReader(file)
        assert len(reader.pages)==count
        assert all(abs(float(p.mediabox.width)-width)<.02 and abs(float(p.mediabox.height)-H)<.02 for p in reader.pages)
        full='\n'.join(p.extract_text() for p in reader.pages)
        assert all(term in full for term in ['0917 671 6383','marketing@oceanidessepticandpest.com','2021','STP','waterproofing','House cleaning','Sludge removal'])
    RECEIPT['printSettings']={'paper':'A4','orientation':'Landscape','scale':'Actual size (100%)','sides':'Duplex','flip':'Short edge','sheets':2,'finish':'Nest both sheets and fold at center'}
    RECEIPT['outputs']=[]
    for source,name in [(candidate,'Oceanides-Company-Brochure-Redesign-A5-2026.pdf'),(print_candidate,'Oceanides-Company-Brochure-Redesign-A4-Print-2026.pdf')]:
        data=source.read_bytes();target=OUT/name
        with tempfile.NamedTemporaryFile(dir=OUT,suffix='.pdf',delete=False) as temp:
            temp.write(data);staged=Path(temp.name)
        os.replace(staged,target)
        RECEIPT['outputs'].append({'path':str(target.relative_to(ROOT)),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
    RECEIPT['fonts']=[{'role':name,'systemSource':filename,'pdf':'Embedded subset'} for name,filename in FONTS]
    RECEIPT['provenance']={'history':'2021 from user-supplied reference deck slide1; no unverified founder claims','proof':['assets/before-1.jpg','assets/after-1.jpg'],'cover':'To Tao / Pexels, illustrative architecture, assets/redesign/facade-pexels-14765373.jpg','generatedImages':'Existing service illustrations visibly labelled','stp':'Existing approved animation frame; illustrative, not engineering design'}
    (QA/'layout-receipt.json').write_text(json.dumps(RECEIPT,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'status':'PASS_STRUCTURAL_PENDING_VISUAL','outputs':RECEIPT['outputs']}))

if __name__=='__main__':main()
