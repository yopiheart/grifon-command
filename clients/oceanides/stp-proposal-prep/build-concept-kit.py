"""Build a discussion-only STP concept and practical engineering follow-up kit.

No equipment sizing, site-specific effluent limits or performance claims are
generated. Font and geometric QA receipts stay private under .tmp/.
"""
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
OUT = ROOT / 'output' / 'pdf'
QA = ROOT.parents[2] / '.tmp' / 'oceanides-stp-proposal-prep' / 'pdf'
W, H = 595.275590551, 841.88976378
M, CW = 43, W - 86
NAVY, BLUE, PAPER, INK, GRAY, RULE = '#0A1F45', '#1C63AD', '#F4F6FA', '#0B1B33', '#526174', '#CED8E5'
FONTS = [('Display', 'GOTHIC.TTF'), ('Heading', 'GOTHICB.TTF'), ('Body', 'corbel.ttf'), ('BodyBold', 'corbelb.ttf')]
for name, filename in FONTS:
    pdfmetrics.registerFont(TTFont(name, 'C:/Windows/Fonts/' + filename))
RECEIPT = {'pages': [], 'text': [], 'outOfBounds': []}


def panel(c, x, top, width, height, fill=PAPER):
    c.setFillColor(HexColor(fill))
    c.rect(x, H-top-height, width, height, stroke=0, fill=1)


def text(c, value, x=M, top=0, width=CW, size=10.6, leading=None, font='Body', fill=INK, rich=False):
    style = ParagraphStyle('copy', fontName=font, fontSize=size, leading=leading or size*1.32,
                           textColor=HexColor(fill), spaceBefore=0, spaceAfter=0)
    content = value if rich else escape(value).replace('\n', '<br/>')
    p = Paragraph(content, style)
    _, height = p.wrap(width, H)
    bounds = [x, top, x+width, top+height]
    bottom_limit = H-43 if top >= H-58 else H-83
    if x < M-.1 or x+width > W-M+.1 or top < 32 or top+height > bottom_limit:
        RECEIPT['outOfBounds'].append({'page': c.getPageNumber(), 'bounds': bounds, 'text': value})
        raise ValueError('Text outside safe bounds: '+value)
    p.drawOn(c, x, H-top-height)
    RECEIPT['text'].append({'page': c.getPageNumber(), 'text': value, 'boundsPt': bounds, 'font': font, 'sizePt': size})
    return top+height


def rule(c, top, x=M, width=CW):
    c.setStrokeColor(HexColor(RULE)); c.setLineWidth(.6)
    c.line(x, H-top, x+width, H-top)


def page(c, number, title, subtitle):
    panel(c, 0, 0, W, 14, NAVY)
    text(c, 'OCEANIDES / ENGINEERING FOLLOW-UP', top=33, size=8.1, font='BodyBold', fill=BLUE)
    y = text(c, title, top=57, size=24, leading=29, font='Heading')
    y = text(c, subtitle, top=y+9, size=10.3, fill=GRAY)
    rule(c, y+13)
    text(c, 'Concept for technical review - not for construction or equipment sizing', top=H-58, size=8.1, fill=GRAY)
    text(c, f'{number:02} / 06', x=W-M-49, top=H-58, width=49, size=8.1, fill=GRAY)
    RECEIPT['pages'].append({'number': number, 'title': title})
    c.bookmarkPage(f'page{number}'); c.addOutlineEntry(title, f'page{number}', 0)
    return y+27


def heading(c, title, top):
    return text(c, title, top=top, size=13, leading=17, font='Heading', fill=BLUE)+7


def callout(c, value, top, dark=False, size=10.6, font='BodyBold'):
    p = Paragraph(escape(value).replace('\n', '<br/>'), ParagraphStyle('measure', fontName=font, fontSize=size, leading=size*1.32))
    _, ph = p.wrap(CW-24, H)
    panel(c, M, top, CW, ph+22, NAVY if dark else PAPER)
    bottom = text(c, value, x=M+12, top=top+11, width=CW-24, size=size, font=font, fill='#FFFFFF' if dark else INK)
    return bottom+11


def bullets(c, values, top, size=10.6, gap=5):
    for value in values:
        text(c, '-', x=M, top=top, width=9, size=size, fill=BLUE, font='BodyBold')
        top = text(c, value, x=M+15, top=top, width=CW-15, size=size)+gap
    return top


def table(c, headers, rows, widths, top, size=9.6, padding=7):
    # Native PDF text stays searchable. Row heights come from wrapped content.
    allrows = [headers]+rows
    for ri, row in enumerate(allrows):
        heights=[]
        for cell, width in zip(row, widths):
            p=Paragraph(escape(cell).replace('\n','<br/>'), ParagraphStyle('cell', fontName='BodyBold' if ri==0 else 'Body', fontSize=size, leading=size*1.27))
            heights.append(p.wrap(width-padding*2, H)[1])
        rh=max(heights)+padding*2
        if top+rh > H-83:
            raise ValueError('Table overflows page '+str(c.getPageNumber()))
        panel(c,M,top,CW,rh,NAVY if ri==0 else ('#FFFFFF' if ri%2 else PAPER))
        x=M
        for cell, width in zip(row,widths):
            text(c,cell,x=x+padding,top=top+padding,width=width-padding*2,size=size,
                 font='BodyBold' if ri==0 else 'Body',fill='#FFFFFF' if ri==0 else INK)
            x+=width
        rule(c,top+rh)
        top+=rh
    return top


def node(c, title, body, x, top, width, height, dark=False):
    panel(c,x,top,width,height,NAVY if dark else PAPER)
    text(c,title,x=x+10,top=top+9,width=width-20,size=10.2,leading=12.7,font='BodyBold',fill='#FFFFFF' if dark else BLUE)
    text(c,body,x=x+10,top=top+29,width=width-20,size=9.6,leading=12.1,fill='#FFFFFF' if dark else INK)


def arrow(c, x1, t1, x2, t2, color=BLUE):
    import math
    y1,y2=H-t1,H-t2
    c.setStrokeColor(HexColor(color));c.setFillColor(HexColor(color));c.setLineWidth(1)
    c.line(x1,y1,x2,y2)
    angle=math.atan2(y2-y1,x2-x1)
    p=c.beginPath();p.moveTo(x2,y2)
    for a in (angle+2.65,angle-2.65):
        p.lineTo(x2+6*math.cos(a),y2+6*math.sin(a))
    p.close();c.drawPath(p,stroke=0,fill=1)


def build(path):
    c=canvas.Canvas(str(path),pagesize=(W,H),pageCompression=1)
    c.setTitle('Oceanides STP Concept Study and Engineering Follow-Up')
    c.setAuthor('Oceanides - prepared for Neil and August')
    c.setSubject('Discussion-only concept, evidence requests and technical partner brief; 14 October 2026')

    y=page(c,1,'STP concept study and\nengineering follow-up','Working kit for Neil and August | Review date: 14 October 2026')
    y=callout(c,'We can prepare the concept and proposal structure now. A qualified STP designer must validate the inputs, select the technology and own the calculations and performance commitments.',y,dark=True)+13
    y=heading(c,'What to do next, in order',y)
    y=table(c,['Step / owner','Action and required output'],[
        ['1 / August + client engineer','Agree on three separate site scopes. Request the records on pages 2-3 and confirm the actual discharge or reuse route for each site. Output: data register with source and date.'],
        ['2 / Neil + August','Use this kit to brief qualified STP engineers or suppliers now, in parallel with data collection. Output: named technical lead, checkable references and written engineering scope.'],
        ['3 / Client + technical lead','Arrange site inspection and a sampling/flow-measurement plan. Verify tanks, piping, space, access, power and existing equipment. Output: measured site record and gap list.'],
        ['4 / Technical lead','Confirm the design basis and applicable written limits. Compare suitable process options. Output: signed-off basis, concept selection and preliminary layout with assumptions.'],
        ['5 / Technical lead + supplier','Prepare process calculations, equipment schedule, control narrative, operation plan, performance conditions and itemized costs. Output: engineer-reviewable technical proposal.'],
        ['6 / August + client engineer','Review technical gaps, three-year cost comparison and acceptance tests before commercial commitment. Output: agreed next actions, owners and dates.'],
    ],[108,CW-108],y,size=10.05)
    y=heading(c,'Keep these roles clear',y+16)
    y=text(c,'Oceanides: client contact, scope coordination, document control and delivery coordination. Technical partner: process selection, engineering calculations, safety and design review, equipment specifications, commissioning criteria and agreed performance obligations.',top=y)
    c.showPage()

    y=page(c,2,'Two messages to prepare','Copyable drafts for review. Nothing has been sent or represented as a confirmed engineering offer.')
    y=heading(c,'A. Request to the client engineer',y)
    client='Engineer, salamat po sa discussion. Para maitugma natin ang recommendation sa requirements ninyo, puwede po naming makuha ang following records para sa bawat site?\n\n1. Current connection agreement at exact Maynilad parameter reference/version o ibang applicable limits, kasama ang actual outlet/discharge/reuse point at permit conditions kung available.\n2. Latest wastewater laboratory reports: sampling point, date, results, methods at laboratory name.\n3. Actual wastewater flow records, operating hours at occupancy. Kung wala pa, mag-agree tayo ng measurement plan.\n4. Site/tank plans, existing STP drawings, equipment list at available space, power at access.\n5. Siphoning bills at service records: dates, volume/weight kung recorded, liquid/sludge scope, Maynilad/sewer/wastewater service charges at other operating costs.\n\nConcept study pa lang po ang hawak natin. Ipapareview natin ang data sa qualified STP technical partner bago mag-finalize ng technology, capacity, layout at costing. Puwede po tayong mag-schedule ng joint site inspection kasama ang facilities team ninyo?'
    y=callout(c,client,y,size=10.3,font='Body')+15
    y=heading(c,'B. Qualification request to an STP engineer / supplier',y)
    supplier='May three separate wastewater scopes kaming gustong ipa-assess: an existing Maynilad-connected building, a Carmona building at reported 30 m3/day, at a Carmona subdivision at reported 150 m3/day. Unverified requirements pa ang capacities; wala pa kaming actual lab results, flow records o site plans.\n\nPlease provide your named design lead and relevant credentials; dated comparable project references with capacity/process, commissioned lab results and checkable contacts; sample calculation/equipment deliverables; and proposed engineering scope. Pakilinaw rin ang commissioning tests, written performance conditions, local after-sales support, training, warranty, commercial terms at exclusions.\n\nPlease state what data and site work you need before selecting or sizing a system, plus your assessment/design fee and timeline. SBR is one concept option only; no technology has been selected. Oceanides will coordinate the client relationship, with technical responsibilities clearly written in the agreement.'
    y=callout(c,supplier,y,size=10.3,font='Body')
    c.showPage()

    y=page(c,3,'Separate the three sites','Source-status register: reported information is a lead for verification, not a design basis.')
    y=table(c,['Site','Reported in meeting analyses','Must be verified'],[
        ['Current building','Maynilad-connected; former STP reportedly retired. A wastewater-quality concern was discussed.','Connection/discharge route, written acceptance limits, present results, reason the STP was retired, usable existing assets and actual intervention needed.'],
        ['Carmona building','Approximately 30 m3/day was discussed.','Whether this is measured flow or requested capacity; average/peak patterns, wastewater quality, space, discharge/reuse route and governing requirements.'],
        ['Carmona subdivision','Approximately 150 m3/day was discussed for an independent system.','Connected population/occupancy and phasing, flow records/projections, quality, sewer collection, land/access, discharge route and governing requirements.'],
    ],[91,173,CW-264],y,size=10)
    y=callout(c,'The reported 20 m2 is a footprint discussion only. It is not flow capacity, an approved layout or a promise that a complete plant will fit. The source site and full space requirements still need confirmation.',y+14,size=10.4)+16
    y=heading(c,'Minimum intake register for each site',y)
    y=table(c,['Record / measurement','Status now','Next owner'],[
        ['Exact site ID, client decision-maker and technical contact','To confirm','August + client'],
        ['Discharge/reuse point, connection record and written limits','Not available','Client + technical lead'],
        ['Influent and relevant effluent lab results; sampling context','Not available','Client + laboratory'],
        ['Average/peak flow, hours, occupancy and variability','Not available','Client + technical lead'],
        ['Tank/site plans, elevations, access, power and asset condition','Not available','Client + site survey'],
        ['Hauling bills, utility/sewer charges, O&M and replacement records','Not available','Client + August'],
        ['Qualified technical lead and supplier agreement','Not confirmed','Oceanides'],
    ],[259,104,CW-363],y,size=9.7)
    y=text(c,'For every received file: record site, filename, revision/date, source contact and whether verified. Keep gaps visible. Ask the technical lead to define the appropriate sampling and measurement scope.',top=y+13,size=10.4)
    c.showPage()

    y=page(c,4,'Two preliminary process paths','Discussion diagrams only. No technology is selected; no tank or equipment has been sized.')
    y=heading(c,'A. Current building: assess before choosing an upgrade',y)
    gap=14; bw=(CW-gap)/2; bh=67
    node(c,'1. Verify the present route','Connection, discharge/reuse point, existing assets and written limits.',M,y,bw,bh)
    node(c,'2. Measure the actual gap','Flow and representative lab results against applicable requirements.',M+bw+gap,y,bw,bh)
    arrow(c,M+bw,y+bh/2,M+bw+gap,y+bh/2)
    node(c,'3. Engineer compares options','Repair, targeted upgrade or a full system only if the findings justify it.',M,y+bh+19,bw,bh)
    node(c,'4. Validate the chosen scope','Calculations, layout, equipment, operation and agreed acceptance tests.',M+bw+gap,y+bh+19,bw,bh)
    arrow(c,M+bw+gap+bw/2,y+bh,M+bw/2,y+bh+19)
    arrow(c,M+bw,y+bh+19+bh/2,M+bw+gap,y+bh+19+bh/2)
    y+=2*bh+33
    y=text(c,'No assumption that a new whole STP is required, or that clarification/chlorination alone can meet an unknown wastewater-quality gap.',top=y,size=10.1)+15
    y=heading(c,'B. Carmona sites: one candidate SBR concept',y)
    y=text(c,'SBR = sequencing batch reactor. Evaluate separately for each site. This candidate is not selected or represented by the approved video.',top=y,size=10.3)+11
    node(c,'Influent screening','Remove coarse debris. Add flow balancing/storage where the chosen batch configuration and actual flow require it.',M,y,CW,59)
    arrow(c,M+CW/2,y+59,M+CW/2,y+72)
    y+=72
    panel(c,M,y,CW,105,NAVY)
    text(c,'SBR CYCLE - TIMED PHASES IN THE SAME REACTOR',x=M+10,top=y+9,width=CW-20,size=10.4,font='BodyBold',fill='#FFFFFF')
    phasew=(CW-20)/5
    for i,(label,desc) in enumerate([('1. Fill','Receive flow'),('2. React','Biological treatment'),('3. Settle','Solids settle'),('4. Draw','Decant treated water'),('5. Idle','As designed')]):
        px=M+10+i*phasew
        text(c,label,x=px,top=y+35,width=phasew-6,size=9.7,font='BodyBold',fill='#FFFFFF')
        text(c,desc,x=px,top=y+51,width=phasew-8,size=9.4,leading=11.7,fill='#FFFFFF')
    text(c,'Phase durations, aeration/mixing, decant control and tank arrangement: to confirm by design.',x=M+10,top=y+83,width=CW-20,size=9.2,fill='#FFFFFF')
    arrow(c,M+CW*.75,y+105,M+CW*.75,y+119)
    arrow(c,M+CW*.25,y+105,M+CW*.25,y+119)
    y+=119
    node(c,'Excess sludge branch','Sludge holding/processing and approved removal route, defined by the designer.',M,y,bw,80)
    node(c,'Decanted water branch','Downstream balancing, filtration and disinfection as required; sampling, then permitted discharge/reuse.',M+bw+gap,y,bw,80)
    y+=92
    y=text(c,'Conventional SBR settles and decants in the same reactor. No external return-sludge loop is assumed here. Final removal rates, effluent quality and residuals must be demonstrated by the proposed design.',top=y,size=9.8)
    c.showPage()

    y=page(c,5,'Meet the buying criteria','Bring evidence the client engineer can review and take to management.')
    y=table(c,['Buying criterion','Required evidence in the technical proposal'],[
        ['Specific system','Selected process with selection rationale, flow diagram, mass/flow basis and limitations. Identify designer, manufacturer and model; distinguish proposed from confirmed.'],
        ['Actual equipment + footprint','Equipment schedule with duties, electrical loads and service access; site layout with tanks, pipework, elevations, access, ventilation and residuals handling.'],
        ['Treatment results','Influent design envelope and parameter-by-parameter target sheet; relevant project results; written performance conditions and agreed commissioning/acceptance test protocol.'],
        ['Operations + controls','Control narrative, alarms/interlocks, power-failure/restart response, monitoring, routine operator duties, chemical needs if any, maintenance and sludge plan.'],
        ['Delivery + after-sales','Engineering/civil/electrical/permit interfaces, schedule, exclusions, training, manuals/as-builts, spare parts, warranty, service response and accountable parties.'],
        ['Three-year expenses','Comparable itemized capital and operating costs, quantities, unit rates, assumptions, taxes, replacements and remaining waste removal. State unknowns and sensitivity.'],
    ],[128,CW-128],y,size=10)
    y=heading(c,'Build the three-year comparison without a savings promise',y+15)
    y=text(c,'Current setup: three years of hauling, Maynilad/sewer/wastewater service charges, operation, testing and repairs/replacements. Proposed setup: all installation/engineering costs plus three years of power, staffing, testing, consumables, service, sludge/waste removal, scheduled replacements and continuing utility/environmental fees. Installing an STP does not automatically remove those fees. Use the same period, volume, occupancy and price basis; avoid double-counting.',top=y,size=10.5)+9
    y=callout(c,'Three-year difference = current three-year cost minus proposed three-year total cost. Show low/base/high cases where assumptions vary. Three years is the requested comparison period, not an approved payback claim.',y,size=10.4)+13
    y=heading(c,'Flow for the next technical meeting',y)
    y=text(c,'1. Confirm each site and the remaining gaps. 2. Let the technical partner explain the design basis and options. 3. Review layout/equipment and performance evidence. 4. Compare total costs and responsibilities. 5. Agree on remaining tests, owners and the next review date.',top=y,size=10.5)
    c.showPage()

    y=page(c,6,'Record the numbers before using them','Blank working register. Applicable parameter list and numerical limits must be confirmed in writing.')
    y=table(c,['Parameter','Influent result / date','Required limit / source','Proposed output / evidence'],[
        ['Flow (average / peak)','','',''],
        ['pH','','',''],
        ['BOD / COD','','',''],
        ['TSS','','',''],
        ['Oil and grease','','',''],
        ['Ammonia / nutrients\n(as applicable)','','',''],
        ['Fecal coliform / other\nrequired indicators','','',''],
        ['Other written\nsite requirements','','',''],
    ],[119,115,139,CW-373],y,size=9.8,padding=9)
    y=text(c,'Site: ____________________  Sampling point: ____________________\nLab / report reference: ____________________  Discharge or reuse route: ____________________\nRecord units, sampling date and methods with each result. Flow is a design input.',top=y+11,size=10.1)+13
    y=heading(c,'Engineering values left open',y)
    y=text(c,'Tank volume and dimensions; HRT/SRT; process loading; number of trains; pump/blower duties; aeration and decant rates; chemical doses; PLC setpoints; sludge production/removal intervals; and backup/storage needs: all to confirm by design. A process diagram alone cannot establish capacity or compliance.',top=y,size=10.4)+13
    y=heading(c,'Source status and references',y)
    y=text(c,'Meeting facts: New Recording 21 - Knowledge Transfer (DOCX) and Gemini shared analysis. These are two AI analyses, not a certified transcript. The original audio was not available for this kit. Site names, capacities, connection status and footprint remain reported/unverified.',top=y,size=9.8)+6
    refs=[
        ('Gemini meeting analysis','https://share.gemini.google/NK6djEkH4NTO'),
        ('US EPA: Sequencing Batch Reactors factsheet','https://www.epa.gov/system/files/documents/2022-10/sequencing-batch-reactors-factsheet.pdf'),
        ('DENR DAO 2016-08: water quality / general effluent standards','https://emb.gov.ph/wp-content/uploads/2019/04/DAO-2016-08_WATER-QUALITY-GUIDELINES-AND-GENERAL-EFFLUENT-STANDARDS.pdf'),
        ('DENR DAO 2021-19: updated selected parameters','https://water.emb.gov.ph/wp-content/uploads/2022/09/DAO-2021-19_1627862906.pdf'),
    ]
    for label,url in refs:
        y=text(c,f'<link href="{url}" color="{BLUE}">{escape(label)}</link>',top=y,size=9.5,rich=True)+5
    text(c,'General references explain process and regulatory context. They do not establish the exact Maynilad, LLDA or other site limits. The qualified technical lead must verify current applicable requirements and document the design basis.',top=y+3,size=9.5,fill=GRAY)
    c.save()


if __name__ == '__main__':
    OUT.mkdir(parents=True,exist_ok=True);QA.mkdir(parents=True,exist_ok=True)
    path=OUT/'Oceanides-STP-Concept-and-Follow-Up-Kit-2026.pdf'
    build(path)
    reader=PdfReader(str(path))
    assert len(reader.pages)==6
    embedded=[]
    for p in reader.pages:
        assert abs(float(p.mediabox.width)-W)<.01 and abs(float(p.mediabox.height)-H)<.01
        for ref in p['/Resources']['/Font'].values():
            f=ref.get_object();name=str(f.get('/BaseFont',''))
            if name.startswith('/AAAAAA+'):
                desc=f['/FontDescriptor'].get_object()
                assert any(k in desc for k in ['/FontFile','/FontFile2','/FontFile3'])
                embedded.append(name)
    RECEIPT.update({'path':str(path),'pageCount':len(reader.pages),'bytes':path.stat().st_size,
                    'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'pageSizeMm':[210,297],
                    'embeddedFonts':sorted(set(embedded)), 'contentBlocks':len(RECEIPT['text'])})
    (QA/'layout-receipt.json').write_text(json.dumps(RECEIPT,indent=2),encoding='utf-8')
    print(json.dumps({k:RECEIPT[k] for k in ['path','pageCount','bytes','sha256','embeddedFonts','contentBlocks','outOfBounds']},indent=2))
