"""Build the interview draft PDF and an editable presentation layout.

Run with the bundled Codex Python. Existing assets are read without alteration.
"""
from pathlib import Path
import json, math, subprocess, hashlib
from xml.sax.saxutils import escape
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
from reportlab.lib.utils import ImageReader, simpleSplit
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent
TMP = ROOT / '.tmp/oceanides-profile-build'
OUT = HERE / 'output'
TMP.mkdir(parents=True, exist_ok=True)
(OUT/'pdf').mkdir(parents=True, exist_ok=True)
(OUT/'pptx').mkdir(parents=True, exist_ok=True)
ASSETS = HERE/'assets-interview'
ASSETS.mkdir(exist_ok=True)
for name in ['plumbing-service.png','pest-control-service.png','renovation-service.png','cover-property-services.png','interior-pexels-8089170.jpg']:
    target=ASSETS/name
    if not target.exists():
        target.write_bytes(subprocess.run(['git','show','codex/oceanides-company-profile:clients/oceanides/company-profile/assets/'+name],cwd=ROOT,capture_output=True,check=True).stdout)
name='cover-property-minimal.png'
if not (ASSETS/name).exists():
    (ASSETS/name).write_bytes(subprocess.run(['git','show','codex/oceanides-company-profile:clients/oceanides/company-profile/assets/'+name],cwd=ROOT,capture_output=True,check=True).stdout)
for name in ['sources.json','generated-sources.json']:
    if not (ASSETS/name).exists():
        (ASSETS/name).write_bytes(subprocess.run(['git','show','codex/oceanides-company-profile:clients/oceanides/company-profile/assets/'+name],cwd=ROOT,capture_output=True,check=True).stdout)

pdfmetrics.registerFont(TTFont('Body',r'C:/Windows/Fonts/segoeui.ttf'))
pdfmetrics.registerFont(TTFont('Strong',r'C:/Windows/Fonts/segoeuib.ttf'))
FONT={'Body':{'family':'Segoe UI','bold':False},'Strong':{'family':'Segoe UI','bold':True}}
NAVY='#0E2C5E'; BLUE='#1C63AD'; SKY='#5AA6E6'; INK='#0B1B33'; MUTED='#516782'; PALE='#EAF3FC'
W,H=1280,720
pages=[]
logo='clients/oceanides/assets/logo.jpg'
data=json.loads((HERE/'profile-content.json').read_text(encoding='utf-8-sig'))
coverage=json.loads((HERE/'coverage.json').read_text(encoding='utf-8-sig'))

def page(section):
    p={'background':'#FFFFFF','elements':[],'notes':section}
    pages.append(p)
    rect(p,0,0,W,98,NAVY)
    image(p,logo,40,15,70,70,'Oceanides supplied logo',contain=True)
    text(p,'OCEANIDES',132,19,800,29,23,'Strong','#FFFFFF')
    text(p,'Plumbing, Siphoning, and Pest Management Services OPC',132,51,1080,31,22,'Strong','#FFFFFF')
    rect(p,0,98,W,49,PALE)
    text(p,'Landline  (02) 8633 8486  /  (02) 8330 1329     Globe  0917 671 6383     Smart  0939 245 6217',40,105,1170,18,14,'Body',NAVY)
    text(p,'marketing@oceanidessepticandpest.com  |  corporate@oceanidessepticandpest.com     TIN  260-084-087-00000',40,125,1190,17,13,'Body',NAVY)
    text(p,'OCEANIDES',830,566,410,74,59,'Strong','#F1F6FB')
    rect(p,0,650,W,70,NAVY)
    text(p,'oceanidesph.com   |   facebook.com/OceanidesMalabanan',40,663,1000,21,15,'Body','#FFFFFF')
    text(p,'marketing@oceanidessepticandpest.com   |   corporate@oceanidessepticandpest.com',40,687,1000,20,13,'Body','#DFE8F5')
    text(p,'FIRST DRAFT',1120,663,120,20,12,'Strong','#DFE8F5')
    text(p,f'{len(pages):02d}',1190,688,50,20,14,'Strong','#FFFFFF')
    return p

def rect(p,x,y,w,h,color):
    p['elements'].append(dict(type='rect',x=x,y=y,w=w,h=h,color=color))

def text(p,s,x,y,w,h,size=22,font='Body',color=INK):
    p['elements'].append(dict(type='text',text=s,x=x,y=y,w=w,h=h,size=size,font=font,color=color))

def para(p,s,x,y,w,size=21,font='Body',color=INK,leading=None):
    leading=leading or size*1.35
    lines=[]
    for chunk in s.split('\n'):
        lines.extend(simpleSplit(chunk,font,size,w) if chunk else [''])
    for i,line in enumerate(lines): text(p,line,x,y+i*leading,w,leading+2,size,font,color)
    return y+len(lines)*leading

def heading(p,title,kicker=''):
    if kicker: text(p,kicker.upper(),40,170,1180,23,14,'Strong',BLUE)
    return para(p,title,40,199,1190,41,'Strong',NAVY,48)

def bullets(p,items,x,y,w,size=21,gap=12,start=1):
    for i,s in enumerate(items):
        text(p,f'{i+start:02d}',x,y,w,28,17,'Strong',BLUE)
        y=para(p,s,x+43,y,w-43,size)+gap
    return y

def image(p,path,x,y,w,h,alt,contain=False):
    source=ROOT/path
    assert source.is_file(),source
    # Cropping here is solely presentation placement; the source remains exact.
    im=Image.open(source).convert('RGB')
    if contain:
        im=ImageOps.contain(im,(round(w*1.5),round(h*1.5)))
        bg=Image.new('RGB',(round(w*1.5),round(h*1.5)),'white')
        bg.paste(im,((bg.width-im.width)//2,(bg.height-im.height)//2));im=bg
    else: im=ImageOps.fit(im,(round(w*1.5),round(h*1.5)))
    key=hashlib.sha256((str(path)+str((w,h,contain))).encode()).hexdigest()[:14]
    target=TMP/(key+'.jpg')
    if not target.exists(): im.save(target,quality=91,optimize=True)
    p['elements'].append(dict(type='image',path=str(path),renderPath=str(target),x=x,y=y,w=w,h=h,fit='cover',alt=alt))

def caption(p,s,x,y,w): para(p,s,x,y,w,12,'Body',MUTED,16)

def note(p,s): p['notes']+='\n'+s

p=page('Company profile cover. Company details supplied in voice interview 2026-10-11. Logo source unchanged.')
text(p,'COMPANY PROFILE',40,180,600,25,15,'Strong',BLUE)
para(p,'Property services\nwith Oceanides',40,229,560,55,'Strong',NAVY,62)
para(p,'Plumbing, septic tank services, pest management, cleaning and property improvement.',40,386,500,25,'Body',INK,34)
para(p,'Commercial  /  Industrial  /  Residential',40,548,560,19,'Strong',BLUE)
image(p,'clients/oceanides/company-profile/assets-interview/cover-property-services.png',646,184,594,390,'AI conceptual property cutaway')
caption(p,'AI-generated conceptual illustration; not a completed project or engineering plan.',646,585,594)

p=page('Company overview. History and scope are owner-reported in the interview.')
heading(p,'About Oceanides','Company overview')
para(p,'Oceanides brings essential property services together through one service partner. We serve commercial, industrial and residential properties, including restaurants, hotels, offices, warehouses, factories, hospitals and homes.',40,271,725,23)
para(p,'Registered in 2023 as Oceanides Plumbing Services under DTI; now an SEC-registered One Person Corporation.',40,429,725,22)
para(p,'Customer relationships built through recurring septic tank, grease tank and plumbing service.',40,540,725,22)
image(p,'clients/oceanides/kuya-marvin/organic/stills-week01/vw1-s2-tank-check.png',835,271,405,300,'AI service illustration of tank inspection',contain=True)
caption(p,'AI-generated service illustration',835,582,405)

p=page('Service directory. Scope supplied by company owner. All work subject to site review and agreed quotation.')
heading(p,'Our services','Service directory')
left=['Septic tank siphoning','Manual septic tank cleaning','Plumbing services','Excavation services','Drain and pipe declogging','Grease tank and trap cleaning']
right=['Pest management','General cleaning','Renovation and restoration','Air-conditioning cleaning','Onsite wastewater treatment systems']
bullets(p,left,40,281,575,23,12)
bullets(p,right,680,281,560,23,12,start=7)

service_images={
 'siphoning':('clients/oceanides/assets/tb2-hero-manhole.png','AI-generated service illustration'),
 'manual-septic-cleaning':('clients/oceanides/assets/tb2-hero-tank.png','AI-generated service illustration'),
 'plumbing':('clients/oceanides/company-profile/assets-interview/plumbing-service.png','AI-generated service illustration'),
 'excavation':('clients/oceanides/company-profile/assets-interview/cover-property-minimal.png','Conceptual property illustration; not an excavation plan'),
 'declogging':('clients/oceanides/assets/tb2-hero-banyo.png','AI-generated illustration of a drainage concern'),
 'grease-tank-cleaning':('clients/oceanides/assets/before-1.jpg','Oceanides project photo; site identity not specified'),
 'pest-control':('clients/oceanides/company-profile/assets-interview/pest-control-service.png','AI-generated service illustration'),
 'general-cleaning':('clients/oceanides/company-profile/assets-interview/interior-pexels-8089170.jpg','Illustrative property interior; not an Oceanides project'),
 'renovation-restoration':('clients/oceanides/company-profile/assets-interview/renovation-service.png','AI-generated service illustration'),
 'air-conditioning-cleaning':('clients/oceanides/company-profile/assets-interview/interior-pexels-8089170.jpg','Illustrative indoor setting; aircon service photo to follow')
}
for i,s in enumerate(data['services']):
    p=page('Service: '+s['title']+'. Copy based on owner interview; illustrative scope, final method and quotation follow assessment.')
    heading(p,s['title'],f'Service {i+1:02d}')
    y=para(p,s['lead'],40,264,650,25,'Strong',BLUE)
    end=para(p,s['description'],40,y+18,635,20)
    bullets(p,s['includes'],40,max(429,end+20),635,18,8)
    pair=service_images.get(s['id'])
    if pair is None:
        pair=('clients/oceanides/company-profile/assets-interview/renovation-service.png','AI-generated service illustration') if 'renov' in s['id'] else service_images['air-conditioning-cleaning']
    image(p,pair[0],738,267,502,295,s['title']+' representative image')
    caption(p,pair[1],738,572,502)
    note(p,pair[1]+'; original image '+pair[0])
    if 'pexels' in pair[0]: note(p,'Stock photo: Max Vakhtbovych, https://www.pexels.com/photo/an-interior-of-a-living-room-8089170/ ; license https://www.pexels.com/license/')

p=page('Actual photo pair from assets/before-1.jpg and after-1.jpg; provenance recorded in organic/VALUE-WEEK-01.md. No specific client claimed.')
heading(p,'A closer look at our work','Project photographs')
image(p,'clients/oceanides/assets/before-1.jpg',40,272,575,295,'Existing Oceanides chamber photograph before cleaning')
image(p,'clients/oceanides/assets/after-1.jpg',665,272,575,295,'Existing Oceanides chamber photograph after cleaning')
text(p,'BEFORE',40,581,500,25,18,'Strong',BLUE)
text(p,'AFTER',665,581,500,25,18,'Strong',BLUE)
caption(p,'Actual Oceanides photos from the existing asset library. Project site and date to be added.',40,615,1190)

p=page('Onsite treatment system offer. The interview used Septage Treatment Facility; exact technology not yet documented, so final terminology, design and capacity await technical review.')
heading(p,'Onsite wastewater treatment systems','New service offer')
para(p,'A treatment system installed at your property, with Oceanides coordinating the project and agreed ongoing support.',40,275,645,28,'Strong',BLUE)
para(p,'We begin with the existing wastewater setup, site constraints and operating needs. The technical proposal defines the process, capacity, installation scope and service requirements.',40,413,645,22)
image(p,'clients/oceanides/company-profile/assets-interview/cover-property-minimal.png',745,272,495,291,'Conceptual property and subsurface wastewater illustration')
caption(p,'Conceptual illustration; not the proposed equipment or a technical design.',745,575,495)
caption(p,'Regular operation, inspection, servicing and sludge removal remain part of the system plan.',40,608,1190)

p=page('Treatment project steps are proposed scope. Any cost savings, permit scope, warranty and ongoing support terms must be defined in a project-specific agreement.')
heading(p,'Treatment project and ongoing support','How the offer works')
steps=[('Assess the site','Review current tanks, wastewater flows, access and operating needs.'),('Define the proposal','Confirm technical design, capacity, installation scope and quotation.'),('Install and hand over','Coordinate specialist delivery and agreed operator guidance.'),('Support operation','Agree servicing, troubleshooting and permit-document assistance.')]
for i,(title,body) in enumerate(steps):
    x=40+(i%2)*630;y=278+(i//2)*148
    text(p,f'0{i+1}',x,y,65,45,35,'Strong',SKY)
    text(p,title,x+85,y,510,35,25,'Strong',NAVY)
    para(p,body,x+85,y+45,505,21)
para(p,'Potential maintenance savings are evaluated against the current service pattern and the proposed system. Support scope, fees and responsibilities are agreed in writing.',40,586,1190,17,'Body',MUTED)

p=page('Client names and relationships are company owner statements in interview, not independently verified. Confirm contracted entity, branch/site, work scope and permission before external client promotion. No endorsement asserted.')
heading(p,'Selected clients and service experience','Company owner supplied references')
clients=['Ayala Land','San Miguel Beer','Jollibee Foods Corporation','Hotel Sogo','Mang Inasal','KFC','Kenny Rogers','Eagle Cement']
for i,name in enumerate(clients):
    x=40+(i%2)*630;y=278+(i//2)*73
    text(p,name,x,y,585,42,29,'Strong',NAVY)
para(p,'Experience includes septic tank, plumbing, grease tank, cleaning and pest-management work, as applicable to each engagement.',40,580,1190,20)
caption(p,'First-draft reference list: specific contracted entities, branches, sites and service records to be confirmed.',40,620,1190)

p=page('Organization chart is a proposed role-based draft for owner confirmation; no individual or headcount is invented. Native editable boxes indicate reporting levels.')
heading(p,'Organizational structure','Proposed role structure for confirmation')
rect(p,430,275,420,70,NAVY)
text(p,'President / CEO',455,294,370,35,28,'Strong','#FFFFFF')
rect(p,638,345,4,40,SKY)
rect(p,166,381,948,4,SKY)
roles=[('Operations','Manager and supervisors\nTechnicians and service crews'),('HR and Administration','Personnel coordination\nOffice administration'),('Finance and Accounting','Billing and collections\nAccounting records'),('Sales and Marketing','Inquiries and proposals\nClient relationships')]
for i,(title,body) in enumerate(roles):
    x=40+i*310
    rect(p,x+126,383,4,33,SKY)
    rect(p,x,416,270,60,PALE)
    para(p,title,x+15,431,240,19,'Strong',NAVY,25)
    para(p,body,x+10,498,270,18,'Body',INK,28)
caption(p,'Positions and reporting lines are a draft for management review. Names and final appointments to be added.',40,612,1190)

p=page('The owner reports company registration and permits. Current copies have not been supplied for this draft; validity and accreditation are not established by this profile. Agency logos are not permit copies.')
heading(p,'Company registration and supporting documents','Document appendix')
para(p,'Supporting documents can be submitted with the project or supplier-accreditation package.',40,268,1170,25,'Strong',BLUE)
items=[('SEC registration','OPC certificate and exact registration details'),('BIR registration','Certificate of Registration and tax documentation'),('Business permits','Current permit copies for the relevant entity'),('Service-specific documents','Applicable clearances, agreements and project documents')]
for i,(title,desc) in enumerate(items):
    y=338+i*60
    text(p,title,40,y,410,28,21,'Strong',NAVY)
    text(p,desc,460,y,770,28,20,'Body',INK)
para(p,'Permit scans and validity details will be inserted after the owner provides the current copies. This draft does not establish license validity or accreditation.',40,589,1170,18,'Body',MUTED)

p=page('Service coverage as stated by owner; scheduling depends on service, site access and team availability. No instant nationwide arrival promise.')
heading(p,'Service coverage','Metro Manila and nearby provinces first')
para(p,'Priority areas',40,275,610,30,'Strong',BLUE)
para(p,'Metro Manila\nCavite, Laguna, Batangas and Rizal\nBulacan, Pampanga and Bataan\nZambales, including Subic and Olongapo',40,331,700,27,'Body',INK,44)
para(p,'Wider reach',840,275,395,30,'Strong',BLUE)
para(p,'Central and Northern Luzon\nNationwide service by arrangement',840,331,395,25,'Body',INK,40)
para(p,'Availability and schedule are confirmed for each site and service request.',40,575,1190,22,'Strong',NAVY)

for c in coverage:
    p=page('Coverage supplied by owner. City/municipality names checked against Philippine Statistics Authority PSGC: '+c['source'])
    heading(p,c['name'],'Priority service areas')
    text(p,'Cities and municipalities covered',40,268,1170,32,24,'Strong',BLUE)
    names=c['cities'];colsize=math.ceil(len(names)/3)
    for i,name in enumerate(names):
        col=i//colsize;row=i%colsize
        text(p,name,40+col*415,326+row*23,390,27,18,'Body',INK)
    caption(p,'Geographic names: Philippine Statistics Authority PSGC. Availability and project schedule confirmed upon inquiry.',40,618,1190)

p=page('Proposed service engagement workflow; exact agreement defines scope, timing, cost and documentation.')
heading(p,'Working with Oceanides','From inquiry to follow-up')
items=[('Tell us what you need','Share the service, property location, concerns and preferred schedule.'),('Arrange a site assessment','Review conditions, access and the requirements of the work.'),('Approve a written quotation','Confirm the scope, cost, schedule and responsibilities.'),('Complete the work and review','Coordinate service delivery, turnover and agreed follow-up.')]
for i,(title,body) in enumerate(items):
    y=279+i*80
    text(p,f'0{i+1}',40,y,70,40,30,'Strong',SKY)
    text(p,title,130,y,1090,30,25,'Strong',NAVY)
    para(p,body,130,y+35,1080,20)

p=page('Contact details from owner supplied attached HEADER 111 DOCX. Website and Facebook from existing client configuration. Confirm contact and TIN before broad circulation.')
heading(p,'Discuss your property service needs','Contact Oceanides')
para(p,'Arrange a site assessment',40,280,1170,38,'Strong',NAVY)
para(p,'Tell us the service you need, your site location and your preferred inspection schedule. We will coordinate the next step and prepare a proposal for the agreed scope.',40,346,1140,26)
text(p,'0917 671 6383',40,468,650,57,44,'Strong',BLUE)
text(p,'0939 245 6217',690,468,550,57,44,'Strong',BLUE)
para(p,'(02) 8633 8486  /  (02) 8330 1329',40,542,1170,27)
para(p,'marketing@oceanidessepticandpest.com',40,593,1170,23,'Strong',NAVY)

spec={'width':W,'height':H,'fonts':FONT,'pages':pages}
(TMP/'layout.json').write_text(json.dumps(spec,ensure_ascii=False,indent=2),encoding='utf-8')
final=OUT/'pdf/Oceanides-Company-Profile-First-Draft.pdf'
c=canvas.Canvas(str(final),pagesize=(W*.75,H*.75))
c.setTitle('Oceanides Company Profile First Draft')
c.setAuthor('Oceanides Plumbing, Siphoning, and Pest Management Services OPC')
for p in pages:
    c.saveState();c.scale(.75,.75)
    for el in p['elements']:
        x,y,w,h=el['x'],el['y'],el['w'],el['h']
        if el['type']=='rect':
            c.setFillColor(HexColor(el['color']));c.rect(x,H-y-h,w,h,fill=1,stroke=0)
        elif el['type']=='image': c.drawImage(el['renderPath'],x,H-y-h,w,h)
        else:
            c.setFillColor(HexColor(el['color']));c.setFont(el['font'],el['size'])
            c.drawString(x,H-y-el['size']*.96,el['text'])
    c.restoreState();c.showPage()
c.save()
print(json.dumps({'pdf':str(final),'pages':len(pages),'layout':str(TMP/'layout.json')}))
