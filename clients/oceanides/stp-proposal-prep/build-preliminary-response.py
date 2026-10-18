"""Dated, review-stage response to the STP evaluator; no engineering approval."""
from pathlib import Path
from xml.sax.saxutils import escape
import hashlib
import json
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'output' / 'pdf' / 'Oceanides-STP-Preliminary-Technical-Response-2026-10-18.pdf'
QA = ROOT.parents[2] / '.tmp' / 'oceanides-supplier-review' / 'sunday' / 'qa'
W, H, M = 595.276, 841.89, 43
CW = W - 2*M
NAVY, BLUE, INK, GRAY, PAPER, RULE = '#0A1F45', '#1C63AD', '#0B1B33', '#526174', '#F4F6FA', '#CED8E5'
for name, filename in [('Display','GOTHIC.TTF'),('Heading','GOTHICB.TTF'),('Body','corbel.ttf'),('Bold','corbelb.ttf')]:
    pdfmetrics.registerFont(TTFont(name, 'C:/Windows/Fonts/'+filename))
receipts = []


def box(c, x, y, width, height, color):
    c.setFillColor(HexColor(color)); c.rect(x, H-y-height, width, height, fill=1, stroke=0)


def text(c, value, top, x=M, width=CW, size=10.8, font='Body', color=INK, leading=None, footer=False):
    p = Paragraph(escape(value).replace('\n','<br/>'), ParagraphStyle('p', fontName=font, fontSize=size,
        leading=leading or size*1.28, textColor=HexColor(color)))
    _, h = p.wrap(width, H)
    assert x >= M-.1 and x+width <= W-M+.1 and top >= 30
    assert top+h <= (H-32 if footer else H-78), (c.getPageNumber(), value, top+h)
    p.drawOn(c, x, H-top-h)
    receipts.append({'page':c.getPageNumber(),'text':value,'bounds':[x,top,x+width,top+h]})
    return top+h


def rule(c,y):
    c.setStrokeColor(HexColor(RULE)); c.setLineWidth(.6); c.line(M,H-y,W-M,H-y)


def header(c, n, title, subtitle):
    box(c,0,0,W,13,NAVY)
    text(c,'OCEANIDES / STP ENGINEERING REVIEW',33,size=8.2,font='Bold',color=BLUE)
    y=text(c,title,57,size=23.5,font='Heading',leading=28)
    y=text(c,subtitle,y+10,size=10.1,color=GRAY)
    rule(c,y+13)
    text(c,'18 October 2026 | Preliminary response - for review, not for construction',H-53,
         size=8.0,color=GRAY,footer=True,width=CW-55)
    text(c,f'{n:02} / 03',H-53,x=W-M-44,width=44,size=8.0,color=GRAY,footer=True)
    return y+28


def heading(c,title,y):
    return text(c,title,y,size=12.8,font='Heading',color=BLUE)+7


def para(c,value,y,size=10.8):
    return text(c,value,y,size=size)+10


def rows(c, items, y, widths=(142,367.276), size=9.8):
    for i, row in enumerate([('Requested information','Available response / remaining requirement')]+items):
        heights=[]
        for v,w in zip(row,widths):
            p=Paragraph(escape(v).replace('\n','<br/>'),ParagraphStyle('m',fontName='Bold' if i==0 else 'Body',fontSize=size,leading=size*1.25))
            heights.append(p.wrap(w-16,H)[1])
        h=max(heights)+16
        assert y+h < H-79, (i,y+h)
        box(c,M,y,CW,h,NAVY if i==0 else (PAPER if i%2 else '#FFFFFF'))
        x=M
        for v,w in zip(row,widths):
            text(c,v,y+8,x=x+8,width=w-16,size=size,font='Bold' if i==0 else 'Body',
                 color='#FFFFFF' if i==0 else INK,leading=size*1.25)
            x+=w
        rule(c,y+h); y+=h
    return y


def build():
    OUT.parent.mkdir(parents=True,exist_ok=True); QA.mkdir(parents=True,exist_ok=True)
    c=canvas.Canvas(str(OUT),pagesize=(W,H),pageCompression=1,initialFontName='Body',initialFontSize=10.8)
    c.setTitle('Oceanides STP - Preliminary Technical Response - 18 October 2026')
    c.setAuthor('Oceanides | prepared for August review')
    c.setSubject('Review-stage response; supplier reference information and outstanding engineering requirements')
    y=header(c,1,'Preliminary technical response','Prepared for August\'s review before submission to the engineering evaluation team.')
    y=heading(c,'Purpose and submission status',y)
    y=para(c,'This initial response organizes the available supplier information against the requested technical and commercial details. The full technical package remains incomplete. It does not establish site suitability, regulatory compliance, final equipment selection, installed price or savings.',y)
    y=heading(c,'Available supplier process reference',y+2)
    y=para(c,'The supplied BioGreen 30 CMD drawing identifies industrial wastewater at an average daily flow of 30 cubic meters/day. Its reference train is electrocoagulation with PAC/PAM dosing, multi-stage settling, filtration and advanced oxidation. Domestic-wastewater applicability and site-specific performance require the supplier\'s written confirmation.',y)
    y=para(c,'The existing Oceanides explainer illustrates a generic biological treatment process. It is introductory material and does not depict this supplier train. The final process explanation must follow the confirmed design.',y)
    y=heading(c,'Scope and operating costs requiring attention',y+2)
    y=para(c,'The drawing assigns electromechanical supply and installation to BioGreen. Civil works and STP tank construction are excluded; main power and service water are assigned to the client in the supplier notes. These interfaces must be allocated in the project scope and total installed cost.',y)
    y=para(c,'Regular sludge removal/desludging is expressly included in operation and maintenance. No zero-siphoning claim or quantified saving is established. Energy, staffing, chemicals, replacement parts, testing, waste disposal and continuing utility charges must enter the cost comparison.',y)
    y=heading(c,'Reference basis',y+2)
    y=para(c,'Supplier: STP 30 CMD PLAN - Copy.pdf, sheets 1-3; 4. Company Profile.pdf, 16 pages. These are supplier references, not an approved design for any client site. Original attribution is retained. Source claims have not been independently verified.',y,size=9.6)
    c.showPage()
    y=header(c,2,'Response to requested information','Available evidence is separated from information still needed for an engineering decision.')
    data=[
        ('Brochure / company information','An existing Oceanides company brochure is available separately for version confirmation by August. It is not attached to this response; its STP illustration is not this supplier\'s approved design.'),
        ('Process and capacity','30 m3/day average is printed on the industrial reference drawing. Domestic applicability, actual flow/peak loading and final process selection remain pending.'),
        ('Equipment and footprint','Tank, equipment-list and pump-room sheets are available as references. Confirm units, working volumes, equipment models/duties, site layout and maintenance access; total installed footprint is unverified.'),
        ('Pumps, power and staffing','Duty/standby pumps, 1.5 HP, 220 V single-phase/60 Hz are noted. Pump duty point, complete electrical load, runtime, kWh/day, staffing and training requirements are pending.'),
        ('PLC, cycles and setpoints','A control panel is listed. PLC details, sequence of operation, treatment times, interlocks, alarms and setpoints have not been established in the supplied package.'),
        ('Compliance and performance','Printed effluent values are supplier targets only. Obtain actual applicable limits, inlet design envelope, corrected parameter units, laboratory evidence, acceptance tests and written performance conditions.'),
        ('Actual installations','Supplier profile lists projects. Obtain comparable capacity/process/date, recent influent/effluent results, scope delivered and permission to contact or visit an operating reference.'),
        ('Quotation and payment terms','The earlier quotation mentioned in the meeting must be retrieved and its basis reconfirmed. A verified project-specific installed quotation and payment milestones are not included in this submission.'),
        ('Three-year expenses / savings','A monetary comparison cannot yet be completed: current bills/volumes and supplier CAPEX/OPEX are missing. No cost saving, payback or remaining siphoning frequency is promised.')
    ]
    y=rows(c,data,y,size=9.9)
    text(c,'Outstanding information remains part of the original request. This preliminary response does not represent those items as completed.',y+13,size=9.5,font='Bold',color=BLUE)
    c.showPage()
    y=header(c,3,'Inputs and completion plan','Each site needs its own design basis. Dates for remaining deliverables require confirmation.')
    y=heading(c,'Separate scopes discussed',y)
    y=para(c,'Current building: reported Maynilad connection and retired STP; first establish the actual quality gap and whether targeted treatment is sufficient. Carmona building: approximately 30 m3/day reported. Carmona subdivision: approximately 150 m3/day reported. These are meeting-summary figures, not validated design capacities.',y)
    y=heading(c,'Requested from the client engineering team',y+2)
    y=para(c,'Please provide the exact applicable Maynilad/discharge requirements and reference version; discharge or reuse destination; latest laboratory reports with sampling point/date; measured daily and peak flow or an agreed measurement plan; existing tank/site drawings; available space, power and access; and current siphoning/utility bills and hauled volumes.',y)
    y=heading(c,'Required from the supplier technical lead',y+2)
    y=para(c,'Confirm the responsible designer and relevant credentials; domestic applicability of the reference train; process calculations and equipment/control schedules; comparable operating references with lab evidence; complete supply/civil/electrical interfaces; installed price; three-year operating and replacement costs; commissioning/acceptance criteria; performance conditions; training, warranty and service obligations.',y)
    y=para(c,'Please also reconcile the supplier video\'s chemical-free claim with PAC/PAM dosing in the plan, confirm the actual filter technology, and correct incomplete parameter units. Printed effluent targets must not be treated as confirmed Maynilad requirements.',y)
    y=heading(c,'Next deliverables and ownership',y+2)
    y=para(c,'Oceanides coordinates document collection, the earlier quotation, client communication and a joint technical review. The proposed supplier/designer, once appointed, must own the engineering basis, selections and calculations. Contracting, technical responsibility and reference-use permissions remain to be agreed in writing.',y)
    y=para(c,'After supplier acknowledgement and receipt of required site data, issue a confirmed delivery schedule for: revised site-specific technical package; equipment/layout/control details; acceptance and service terms; and an itemized quotation with a three-year cost comparison. No further completion date has yet been agreed in this response.',y)
    rule(c,y+2)
    y=para(c,'Review request: confirm the priority site, share the available records, and agree a joint technical clarification with the responsible supplier engineer.',y+14,size=10.7)
    text(c,'Oceanides | 0917 671 6383 | marketing@oceanidessepticandpest.com',y+3,size=9.6,font='Bold',color=BLUE)
    c.save()
    reader=PdfReader(OUT)
    assert len(reader.pages)==3
    full='\n'.join(p.extract_text() or '' for p in reader.pages)
    for expected in ['industrial','PAC/PAM','sludge','three-year','payment','Maynilad','incomplete']:
        assert expected.lower() in full.lower(),expected
    receipt={'path':str(OUT),'pages':len(reader.pages),'sha256':hashlib.sha256(OUT.read_bytes()).hexdigest(),
             'bytes':OUT.stat().st_size,'textBounds':receipts}
    (QA/'response-geometry.json').write_text(json.dumps(receipt,indent=2),encoding='utf-8')
    print(json.dumps({k:v for k,v in receipt.items() if k!='textBounds'}))


if __name__ == '__main__':
    build()
