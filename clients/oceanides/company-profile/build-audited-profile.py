"""Build the reviewed white/blue profile and its native PowerPoint layout.

Keeps the prior draft unchanged. Source images are only cropped for placement.
No generated image is represented as a completed Oceanides engagement.
"""
from pathlib import Path
import json, math, hashlib, sys
from PIL import Image, ImageOps
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
from reportlab.lib.utils import simpleSplit

ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent
TMP = ROOT / '.tmp/oceanides-audited-profile'
OUT = HERE / 'output'
TMP.mkdir(parents=True, exist_ok=True)
for folder in ['pdf', 'pptx', 'preview']:
    (OUT / folder).mkdir(exist_ok=True)
REV = sys.argv[1] if len(sys.argv) > 1 else 'Audited-Review-v1'
assert all(c.isalnum() or c == '-' for c in REV)
W, H = 1280, 720
NAVY, BLUE, SKY = '#0E2C5E', '#1267A5', '#2DAEEC'
INK, MUTED, PALE, RULE = '#102B49', '#456079', '#ECF7FF', '#D5E8F5'
FONT = {'Body': {'family': 'Segoe UI', 'bold': False},
        'Strong': {'family': 'Segoe UI', 'bold': True}}
pdfmetrics.registerFont(TTFont('Body', 'C:/Windows/Fonts/segoeui.ttf'))
pdfmetrics.registerFont(TTFont('Strong', 'C:/Windows/Fonts/segoeuib.ttf'))
data = json.loads((HERE / 'profile-content.json').read_text(encoding='utf-8-sig'))
coverage = json.loads((HERE / 'coverage.json').read_text(encoding='utf-8-sig'))
pages = []


def rect(p, x, y, w, h, color):
    p['elements'].append(dict(type='rect', x=x, y=y, w=w, h=h, color=color))


def text(p, s, x, y, w, h, size=22, font='Body', color=INK):
    assert pdfmetrics.stringWidth(s, font, size) <= w + 1, (s, w, size)
    p['elements'].append(dict(type='text', text=s, x=x, y=y, w=w, h=h,
                              size=size, font=font, color=color))


def para(p, s, x, y, w, size=22, font='Body', color=INK, leading=None):
    leading = leading or size * 1.32
    lines = []
    for chunk in s.split('\n'):
        lines.extend(simpleSplit(chunk, font, size, w) if chunk else [''])
    for i, line in enumerate(lines):
        text(p, line, x, y + i * leading, w, leading + 3, size, font, color)
    return y + len(lines) * leading


def image(p, source, x, y, w, h, alt, contain=False, bbox=None, center=(.5, .5)):
    source = Path(source)
    if not source.is_absolute():
        source = ROOT / source
    im = Image.open(source).convert('RGBA')
    if bbox:
        im = im.crop(tuple(bbox))
    bg = Image.new('RGBA', im.size, 'white')
    bg.alpha_composite(im)
    im = bg.convert('RGB')
    if contain:
        im = ImageOps.contain(im, (round(w * 1.8), round(h * 1.8)))
        bg = Image.new('RGB', (round(w * 1.8), round(h * 1.8)), 'white')
        bg.paste(im, ((bg.width - im.width)//2, (bg.height - im.height)//2))
        im = bg
    else:
        im = ImageOps.fit(im, (round(w * 1.8), round(h * 1.8)), centering=center)
    key = hashlib.sha256((str(source) + str((w, h, contain, bbox, center))).encode()).hexdigest()[:16]
    target = TMP / (key + '.jpg')
    im.save(target, quality=94, optimize=True)
    p['elements'].append(dict(type='image', path=str(source), renderPath=str(target),
                              x=x, y=y, w=w, h=h, fit='cover', alt=alt))


def page(section, notes=''):
    p = {'background': '#FFFFFF', 'elements': [], 'notes': section + '\n' + notes,
         'section': section}
    pages.append(p)
    rect(p, 0, 0, W, 119, PALE)
    rect(p, 0, 115, W, 4, SKY)
    image(p, 'clients/oceanides/assets/logo.jpg', 42, 15, 78, 78,
          'Oceanides existing company logo', contain=True)
    text(p, 'OCEANIDES', 142, 14, 800, 30, 25, 'Strong', NAVY)
    text(p, 'Plumbing, Siphoning, and Pest Management Services OPC', 142, 46, 1000, 26, 19, 'Strong', NAVY)
    text(p, '(02) 8633 8486   |   Globe 0917 671 6383   |   Smart 0939 245 6217', 142, 75, 1000, 23, 16, 'Body', NAVY)
    text(p, 'marketing@oceanidessepticandpest.com', 142, 97, 750, 19, 14, 'Body', NAVY)
    text(p, 'OPC TIN: TO FOLLOW', 1014, 20, 230, 20, 13, 'Strong', BLUE)
    text(p, 'OCEANIDES', 850, 579, 390, 65, 55, 'Strong', '#F2F8FC')
    rect(p, 0, 658, W, 62, NAVY)
    rect(p, 0, 658, 1280, 3, SKY)
    text(p, 'oceanidesph.com   |   facebook.com/OceanidesMalabanan', 42, 670, 1060, 22, 15, 'Body', '#FFFFFF')
    text(p, 'marketing@oceanidessepticandpest.com   |   corporate@oceanidessepticandpest.com', 42, 695, 1090, 20, 14, 'Body', '#FFFFFF')
    text(p, 'REVIEW DRAFT', 1114, 670, 130, 19, 12, 'Strong', '#FFFFFF')
    text(p, f'{len(pages):02d}', 1206, 694, 38, 20, 15, 'Strong', '#FFFFFF')
    return p


def title(p, s, sub=''):
    y = para(p, s, 42, 149, 1196, 42, 'Strong', BLUE, 48)
    rect(p, 42, y + 8, 82, 4, SKY)
    if sub:
        para(p, sub, 42, y + 25, 1185, 20, 'Body', MUTED)
    return y


def caption(p, s, x, y, w, size=13):
    return para(p, s, x, y, w, size, 'Body', MUTED, size * 1.3)


def scope(p, items, x, y, w, size=20):
    for item in items:
        rect(p, x, y + 10, 6, 6, SKY)
        y = para(p, item, x + 21, y, w - 21, size) + 10
    return y


def note(p, s):
    p['notes'] += '\n' + s


# The owner's white/blue brief overrides the amber/Anton social-creative defaults.
p = page('Company profile', 'Owner interview 2026-10-11; old profile supplied 2026-10-12. No unverified establishment date is asserted.')
rect(p, 635, 119, 645, 539, NAVY)
image(p, 'clients/oceanides/company-profile/assets-interview/cover-property-services.png',
      635, 180, 645, 425, 'AI conceptual property-services illustration', contain=True)
text(p, 'COMPANY PROFILE', 42, 161, 540, 28, 17, 'Strong', BLUE)
para(p, 'One partner for\nyour property\nservice needs', 42, 224, 575, 57, 'Strong', NAVY, 65)
para(p, 'Plumbing. Septic services. Pest management.\nCleaning. Renovation. Treatment systems.', 42, 455, 565, 23, 'Body', INK, 34)
text(p, 'Commercial  /  Industrial  /  Residential', 42, 578, 580, 30, 21, 'Strong', BLUE)
para(p, 'AI conceptual illustration; not a project or engineering design.', 660, 620, 570, 12, 'Body', '#FFFFFF', 16)

p = page('About Oceanides', 'Company history is date-neutral: old source says established2021, DTI certificate2022, BIR trade registration2023. Current SEC certificate still required.')
title(p, 'Essential services, one point of contact')
para(p, 'Oceanides brings plumbing, septic tank services, pest management, cleaning and property improvement together for commercial, industrial and residential clients.', 42, 235, 705, 27, 'Strong', NAVY, 36)
para(p, 'Our service relationships grew through recurring plumbing, septic tank and grease tank work. We have expanded our offer under Oceanides Plumbing, Siphoning, and Pest Management Services OPC.', 42, 398, 705, 23)
image(p, 'clients/oceanides/assets/van.jpg', 810, 234, 428, 322, 'Existing Oceanides white box service van photo')
caption(p, 'Oceanides asset-library photograph', 810, 568, 420)
para(p, 'Priority service in Metro Manila and nearby provinces.\nNationwide work by arrangement.', 42, 563, 740, 22, 'Strong', BLUE, 30)

p = page('Mission, vision and values', 'Adapted from old profile page3, expanding plumbing wording to the owner-confirmed service offer. These are statements of purpose, not measured results.')
title(p, 'Our purpose and service values')
rect(p, 42, 235, 532, 330, NAVY)
text(p, 'OUR MISSION', 70, 267, 470, 28, 17, 'Strong', '#FFFFFF')
para(p, 'Provide professional, reliable property services with clear scope, responsive coordination and care for the client\'s site.', 70, 322, 466, 29, 'Strong', '#FFFFFF', 39)
text(p, 'OUR VISION', 626, 240, 610, 28, 17, 'Strong', BLUE)
para(p, 'Be a long-term service partner that clients trust with their property maintenance and improvement needs.', 626, 286, 600, 26)
text(p, 'OUR VALUES', 626, 435, 600, 28, 17, 'Strong', BLUE)
para(p, 'Quality. Integrity. Respect.\nTeamwork. Customer satisfaction.', 626, 480, 600, 27, 'Strong', NAVY, 39)

p = page('Service directory', 'All eleven service categories from owner interview included. Service scope and schedule agreed per engagement.')
title(p, 'A broader range of property services')
groups = [
    ('SEPTIC AND DRAINAGE', ['Septic tank siphoning', 'Manual septic tank cleaning', 'Drain and pipe declogging', 'Grease tank and trap cleaning']),
    ('REPAIRS AND PROPERTY CARE', ['Plumbing', 'Excavation', 'General cleaning', 'Renovation, restoration and leak repairs', 'Air-conditioning cleaning']),
    ('PEST AND TREATMENT SYSTEMS', ['Pest management', 'Onsite wastewater treatment systems'])]
for i, (head, items) in enumerate(groups):
    x = 42 + i * 407
    rect(p, x, 239, 375, 6, SKY)
    para(p, head, x, 266, 365, 19, 'Strong', BLUE)
    scope(p, items, x, 340, 365, 23)

logos = json.loads((HERE / 'assets-refresh/client-logos/sources.json').read_text(encoding='utf-8'))['assets']


def logo(p, brand, x, y, w=250, h=112):
    source_brand = 'Jollibee Group / Jollibee Foods Corporation' if brand == 'Jollibee Group' else brand
    options = [a for a in logos if a.get('brand') == source_brand and a.get('file')]
    if brand == 'Avida Land':
        options = [a for a in logos if a.get('brand') == 'Avida Land (current official inline mark)' and a.get('file')]
    if not options:
        return para(p, brand, x, y + 30, w, 25, 'Strong', NAVY)
    a = options[-1]
    filename = a.get('raster_file') or a['file']
    image(p, HERE / 'assets-refresh/client-logos' / filename, x, y, w, h,
          brand + ' brand mark identifying owner-reported service experience',
          contain=True, bbox=a.get('visible_content_bbox'))
    note(p, json.dumps(a, ensure_ascii=False))


for index, brands in enumerate([
    ['Ayala Land', 'Avida Land', 'Toyota', 'Eagle Cement', 'UNIQLO', 'Starmall', 'Hotel Sogo', 'San Miguel Beer', 'San Miguel Properties'],
    ['Jollibee Group', 'Mang Inasal', 'KFC', 'Kenny Rogers Roasters', 'Papa Johns', 'Yellow Cab Pizza Co.', 'Siomai King', 'GH Greenhills', 'BVMIC - Brenton International Venture Manufacturing Corporation']]):
    p = page('Selected clients and service experience', 'Relationship source: owner interview and current user confirmation2026-10-12. Not independently verified by brand-mark downloads. No group-wide contract or endorsement asserted. Specific branches/sites and scopes to be completed in supporting records.')
    title(p, 'Selected clients and service experience',
          'Property, industrial and business clients' if index == 0 else 'Food-service and other client experience')
    for i, brand in enumerate(brands):
        cols, cell = 3, 400
        x, y = 42 + (i % cols) * cell, 270 + (i // cols) * 115
        if i // cols > 0:
            rect(p, x, y - 12, cell - 28, 1, RULE)
        logo(p, brand, x + 22, y, cell - 74, 67)
        label = 'Jollibee Foods Corporation' if brand == 'Jollibee Group' else ('Brenton (BVMIC)' if brand.startswith('BVMIC') else brand)
        if brand != 'San Miguel Beer':
            para(p, label, x + 22, y + 76, cell - 54, 17, 'Strong', NAVY)
    caption(p, 'Company-supplied service history. Engagements relate to individual sites and service scopes; no endorsement is implied.', 42, 624, 1190)

p = page('Actual work photographs', 'Existing before-1.jpg and after-1.jpg; provenance clients/oceanides/kuya-marvin/organic/VALUE-WEEK-01.md. Site/date/client not supplied. No client logo associated with these images.')
title(p, 'Cleaning work: before and after')
for x, path, label in [(42, 'before-1.jpg', 'BEFORE CLEANING'), (654, 'after-1.jpg', 'AFTER CLEANING')]:
    image(p, 'clients/oceanides/assets/' + path, x, 238, 584, 298, 'Oceanides existing ' + label.lower() + ' chamber photo', center=(.5, .63))
    text(p, label, x, 551, 580, 30, 20, 'Strong', BLUE)
para(p, 'Actual Oceanides photographs show the chamber condition before and after cleaning.', 42, 598, 1180, 21, 'Strong', NAVY)
caption(p, 'The specific project site, service date and approved case-study details are still to be added.', 42, 630, 1175)

service_images = {
    'siphoning': ('clients/oceanides/assets/tb2-hero-manhole.png', 'AI-generated service illustration'),
    'manual-septic-cleaning': ('clients/oceanides/assets/tb2-hero-tank.png', 'AI-generated service illustration'),
    'plumbing': ('clients/oceanides/company-profile/assets-interview/plumbing-service.png', 'AI-generated service illustration'),
    'excavation': ('clients/oceanides/company-profile/assets-refresh/service-stock/excavation-water-main-wikimedia.jpg', 'Stock: IntangibleArts / Wikimedia Commons, CC BY 2.0; cropped'),
    'declogging': ('clients/oceanides/assets/tb2-hero-banyo.png', 'AI-generated drainage illustration'),
    'grease-tank-cleaning': ('clients/oceanides/assets/after-1.jpg', 'Oceanides asset-library photograph; client/site not specified'),
    'pest-control': ('clients/oceanides/company-profile/assets-interview/pest-control-service.png', 'AI-generated service illustration'),
    'general-cleaning': ('clients/oceanides/company-profile/assets-refresh/service-stock/general-cleaning-pexels-6195278.jpg', 'Representative stock photograph; not an Oceanides project'),
    'renovation-restoration': ('clients/oceanides/company-profile/assets-interview/renovation-service.png', 'AI-generated service illustration'),
    'aircon-cleaning': ('clients/oceanides/company-profile/assets-refresh/service-stock/aircon-service-pexels-5463576.jpg', 'Stock air-conditioning maintenance photo; not an Oceanides project')}
short_titles = {'renovation-restoration': 'Renovation, restoration and leak repairs',
                'grease-tank-cleaning': 'Grease tank and trap cleaning'}
benefits = {
    'siphoning': 'Plan servicing around your operations and reduce avoidable tank-related disruption.',
    'manual-septic-cleaning': 'Choose a cleaning plan that matches tank conditions, access and safety requirements.',
    'plumbing': 'Coordinate repair and maintenance concerns through one point of contact.',
    'excavation': 'Coordinate excavation, repairs and reinstatement through one agreed work scope.',
    'declogging': 'Understand whether a recurring problem needs cleaning, inspection or repair.',
    'grease-tank-cleaning': 'Manage grease buildup with a cleaning schedule suited to your kitchen.',
    'pest-control': 'Combine treatment, prevention advice and follow-up in one agreed program.',
    'general-cleaning': 'Use a clear checklist to coordinate cleaning and review completion.',
    'renovation-restoration': 'Coordinate related repairs, access, schedules and turnover in one scope.',
    'aircon-cleaning': 'Plan unit upkeep and identify issues that need technical attention.'}
for i, s in enumerate(data['services']):
    p = page(s['title'], 'Scope based on owner interview. Final method, personnel requirements and price follow site review. ' + s['benefit'])
    title(p, short_titles.get(s['id'], s['title']))
    source, attribution = service_images[s['id']]
    if not (ROOT / source).is_file():
        raise FileNotFoundError('Relevant service image required: ' + source)
    # Two related layouts plus a full-width image strip give the services rhythm.
    mode = i % 3
    if mode in [0, 1]:
        tx, ix = (42, 748) if mode == 0 else (638, 42)
        tw, iw = (653, 490) if mode == 0 else (600, 545)
        y = para(p, s['lead'], tx, 235, tw, 26, 'Strong', NAVY, 34)
        y = para(p, s['description'], tx, y + 16, tw, 20.5, 'Body', INK, 27) + 16
        scope(p, s['includes'], tx, y, tw, 19)
        center = (.5, .65) if s['id'] == 'general-cleaning' else ((.5, 1) if s['id'] == 'excavation' else (.5, .5))
        image(p, source, ix, 238, iw, 292, s['title'] + ' representative image', center=center)
        caption(p, attribution, ix, 538, iw, 12)
        rect(p, ix, 577, iw, 63, PALE)
        end = para(p, benefits[s['id']], ix + 15, 588, iw - 30, 18, 'Strong', NAVY, 24)
        assert end <= 640, (s['id'], end)
    else:
        image(p, source, 42, 235, 444, 340, s['title'] + ' representative image')
        caption(p, attribution, 42, 586, 440, 12)
        y = para(p, s['lead'], 530, 235, 708, 27, 'Strong', NAVY, 35)
        y = para(p, s['description'], 530, y + 18, 708, 21, 'Body', INK, 28) + 14
        scope(p, s['includes'], 530, y, 708, 20)
        rect(p, 530, 586, 708, 54, PALE)
        end = para(p, benefits[s['id']], 546, 594, 675, 18, 'Strong', NAVY, 23)
        assert end <= 640, (s['id'], end)
    note(p, attribution + '; source image: ' + source)
    if 'service-stock' in source:
        note(p, (HERE / 'assets-refresh/service-stock/sources.json').read_text(encoding='utf-8'))

p = page('Onsite treatment system offer', 'Owner calls this Septage Treatment Facility. Wastewater source and volume, technology, supplier, design capacity and discharge requirements are not yet established. Generic process diagram below is a project scoping diagram, not a technical flow sheet.')
title(p, 'Onsite wastewater treatment systems')
para(p, 'A treatment system at your property, backed by agreed operating support.', 42, 235, 1185, 33, 'Strong', NAVY, 44)
para(p, 'Begin with a site assessment to define a suitable treatment approach and a complete operating plan.', 42, 334, 1175, 25)
for i, (head, body) in enumerate([
    ('Your property', 'Wastewater flows, tanks, space and maintenance records'),
    ('Technical assessment', 'Treatment approach, capacity, installation and costs'),
    ('Operating plan', 'Maintenance, monitoring, sludge removal and agreed support')]):
    x = 42 + i * 407
    rect(p, x, 435, 375, 121, NAVY if i == 1 else PALE)
    text(p, head, x + 17, 449, 342, 32, 24, 'Strong', '#FFFFFF' if i == 1 else NAVY)
    para(p, body, x + 17, 493, 342, 19, 'Body', '#FFFFFF' if i == 1 else INK, 25)
    if i < 2:
        rect(p, x + 375, 489, 32, 4, SKY)
para(p, 'Compare the proposed system with your current maintenance pattern before deciding.', 42, 599, 1175, 23, 'Strong', BLUE)

p = page('Treatment planning', 'Decision framework only; no fixed saving, zero-siphoning, automatic self-treatment or maintenance-free guarantee. Economics and service intervals depend on the chosen system and site.')
title(p, 'What changes with a treatment system?')
for x, heading, body, items in [
    (42, 'Your current service pattern', 'Start with the property\'s actual operating records.', ['Tank condition and available space', 'Siphoning and cleaning frequency', 'Disruption, access and service cost']),
    (658, 'A proposed treatment plan', 'Assess the complete operating requirements.', ['System capacity and installation works', 'Energy, monitoring and sludge removal', 'Maintenance, support fees and responsibilities'])]:
    rect(p, x, 237, 580, 61, PALE)
    text(p, heading, x + 20, 253, 540, 38, 27, 'Strong', NAVY)
    para(p, body, x, 329, 565, 24)
    scope(p, items, x, 421, 565, 23)
para(p, 'Any reduction in cost or service frequency must be supported by a site-specific assessment.', 42, 600, 1180, 23, 'Strong', BLUE)

p = page('Treatment project and after-sales support', 'Proposed sequence. Support duration, fees, warranty, response arrangements and client operating duties to be agreed. Permit-document assistance is not guaranteed regulatory approval.')
title(p, 'Installation is the start of ongoing support')
steps = [('Assess', 'Review flows, tanks, access and operating needs.'),
         ('Propose', 'Define technology, capacity, scope and costs.'),
         ('Install', 'Coordinate delivery, checks and handover.'),
         ('Support', 'Agree servicing, guidance and document assistance.')]
for i, (head, body) in enumerate(steps):
    x = 42 + i * 306
    text(p, f'{i+1:02d}', x, 257, 110, 65, 48, 'Strong', BLUE)
    rect(p, x, 340, 272, 4, SKY)
    text(p, head, x, 375, 272, 40, 31, 'Strong', NAVY)
    para(p, body, x, 435, 272, 24, 'Body', INK, 33)
rect(p, 42, 572, 1196, 67, PALE)
para(p, 'Support terms and permit-document responsibilities are agreed in writing. Regulatory decisions remain with the relevant authority.', 62, 584, 1155, 21, 'Strong', NAVY, 28)

p = page('Organizational structure', 'Names and existing roles confirmed current by user2026-10-12. Reporting lines are proposed for management confirmation. Operations supervisor is a role, not an invented named manager. No headcount or new specialist license asserted.')
title(p, 'Organizational structure')
rect(p, 443, 230, 394, 81, NAVY)
text(p, 'Agosto Cepriano', 465, 246, 350, 32, 26, 'Strong', '#FFFFFF')
text(p, 'CEO / Founder', 465, 281, 350, 25, 19, 'Body', '#FFFFFF')
rect(p, 638, 311, 4, 35, SKY)
rect(p, 213, 342, 854, 4, SKY)
branches = [(42, 'Allan', 'Finance / HR Manager', ['Finance and accounting', 'HR and administration']),
            (449, 'Operations', 'Supervisor / Team Leader', ['Drivers, servicers and helpers', 'Onsite service coordination']),
            (856, 'Neil', 'Marketing Head', ['Digital marketing', 'Sales and inquiry coordination'])]
for x, name, role, duties in branches:
    rect(p, x + 171, 344, 4, 25, SKY)
    rect(p, x, 369, 382, 88, PALE)
    text(p, name, x + 18, 382, 345, 32, 25, 'Strong', NAVY)
    text(p, role, x + 18, 420, 345, 28, 19, 'Body', NAVY)
    para(p, '\n'.join(duties), x + 18, 483, 345, 20, 'Body', INK, 29)
para(p, 'Client support: Floreza  |  Digital marketing: Queenie and Aubrey', 42, 575, 1185, 23, 'Strong', BLUE)
caption(p, 'Current names and roles confirmed. Reporting lines remain for management confirmation.', 42, 623, 1190)

portraits = HERE / 'assets-refresh/legacy-photos'
teams = [
    ('Leadership and management', [('Agosto Cepriano', 'CEO / Founder', 'page-06-X14.png', 'Company leadership and strategic direction.'), ('Allan', 'Finance / HR Manager', 'page-06-X16.png', 'Finance, people and administrative coordination.'), ('Neil', 'Marketing Head', 'page-06-X18.jpg', 'Marketing direction and client acquisition.')]),
    ('Marketing and client support', [('Queenie', 'Digital Marketing Specialist', 'page-08-X14.png', 'Digital campaigns and online lead generation.'), ('Aubrey', 'Digital Marketing Specialist', 'page-08-X16.png', 'Digital channels and campaign coordination.'), ('Floreza', 'Customer Service Representative', 'page-08-X18.png', 'Client inquiries and service coordination.')])]
for heading, people in teams:
    p = page(heading, 'Portraits extracted unchanged from old profile pages6 and8. User confirmed all names/roles current2026-10-12. No surnames for staff invented. Photo framing only; no generated people.')
    title(p, heading)
    for i, (name, role, photo, responsibility) in enumerate(people):
        x = 42 + i * 407
        crop = {'Queenie': (80, 65, 390, 455), 'Aubrey': (100, 130, 470, 550),
                'Neil': (24, 36, 255, 340)}.get(name)
        image(p, portraits / photo, x + 72, 234, 232, 230,
              name + ' portrait from supplied prior profile', bbox=crop, center=(.5, .35))
        text(p, name, x, 484, 375, 38, 29, 'Strong', NAVY)
        para(p, role, x, 525, 375, 20, 'Strong', BLUE, 27)
        para(p, responsibility, x, 588, 375, 20, 'Body', INK, 27)

p = page('Supplier documentation', 'Old profile pages13-22 contain historical sole-proprietor records and Reed provider records. Current OPC SEC certificate, BIR COR and current business permit not supplied. Do not label applicant affidavit, individual PCO accreditation or payment receipt as Oceanides facility permits. No agency logo badges used as proof.')
title(p, 'Company and project documentation')
para(p, 'Documentation is coordinated during supplier accreditation and project scoping.', 42, 236, 1175, 29, 'Strong', NAVY, 39)
items = [('Company registration', 'Current OPC registration, tax and business-permit records'),
         ('Service-specific records', 'Documents applicable to the agreed work and service provider'),
         ('Treatment and disposal', 'Relevant facility records, agreements and supporting documentation'),
         ('Project handover', 'Agreed completion records, operating guidance and service reports')]
for i, (head, body) in enumerate(items):
    y = 349 + i * 63
    text(p, head, 42, y, 380, 30, 22, 'Strong', BLUE)
    para(p, body, 439, y, 795, 21)
caption(p, 'Review status: current OPC documents and service-specific supporting copies are still to be inserted.', 42, 624, 1190)

p = page('Service coordination', 'Proposed client engagement workflow. All scope, cost, timing and responsibilities documented in the service agreement.')
title(p, 'A clear process for every engagement')
for i, item in enumerate(data['workflow']):
    y = 239 + i * 77
    text(p, f'{i+1:02d}', 42, y, 60, 43, 30, 'Strong', BLUE)
    text(p, item['title'], 133, y, 1095, 31, 25, 'Strong', NAVY)
    para(p, item['text'], 133, y + 35, 1090, 20)

p = page('Service coverage overview', 'Owner-confirmed priority service areas. Availability depends on service/site/schedule. Detailed190LGUs in appendix; nationwidebyarrangement. No instantarrivalpromise.')
title(p, 'Metro Manila first. Wider reach by arrangement.')
text(p, 'PRIORITY SERVICE AREAS', 42, 242, 700, 30, 18, 'Strong', BLUE)
para(p, 'Metro Manila\nCavite, Laguna, Batangas and Rizal\nBulacan, Pampanga and Bataan\nZambales, including Subic and Olongapo', 42, 302, 750, 29, 'Strong', NAVY, 48)
rect(p, 834, 235, 404, 321, PALE)
text(p, 'EXTENDED COVERAGE', 858, 266, 355, 27, 17, 'Strong', BLUE)
para(p, 'Central and Northern Luzon\n\nNationwide projects by arrangement', 858, 319, 350, 25, 'Body', INK, 36)
para(p, 'Detailed city and municipality coverage follows in the appendix.', 42, 585, 1170, 23, 'Strong', BLUE)
caption(p, 'Service availability, travel requirements and schedules are confirmed for each request.', 42, 628, 1190)

p = page('Contact Oceanides', 'Mobiles and primary landline agree between new letterhead and oldprofile. Conflicting secondlandline omitted pendingconfirmation. Address supplied by user screenshot2026-10-12: TramoStreetCornerDandan,PasayCity,Philippines1300. OPC TIN userconfirmedtofollow. Website and Facebook from client configuration. No unverified office number added.')
title(p, 'Let us review your property service needs')
para(p, 'Arrange a site assessment or discuss a service proposal with Oceanides.', 42, 236, 1180, 28, 'Strong', NAVY)
text(p, '0917 671 6383', 42, 322, 570, 68, 50, 'Strong', BLUE)
text(p, '0939 245 6217', 659, 322, 575, 68, 50, 'Strong', BLUE)
text(p, '(02) 8633 8486', 42, 412, 560, 40, 29, 'Strong', NAVY)
para(p, 'Tramo Street Corner Dandan\nPasay City, Philippines 1300', 659, 411, 574, 24, 'Body', INK, 34)
para(p, 'marketing@oceanidessepticandpest.com\ncorporate@oceanidessepticandpest.com', 42, 514, 1180, 26, 'Strong', NAVY, 40)
caption(p, 'Please share the service, site location and preferred schedule so we can coordinate the next step.', 42, 624, 1190, 17)

for c in coverage:
    p = page('Coverage appendix - ' + c['name'], 'Owner service coverage. Geographic names verified against PSA PSGC: ' + c['source'])
    title(p, c['name'], 'Coverage appendix | Cities and municipalities')
    names = c['cities']
    rows = math.ceil(len(names) / 3)
    for i, name in enumerate(names):
        col, row = i // rows, i % rows
        x, y = 42 + col * 407, 290 + row * 26
        rect(p, x, y + 11, 5, 5, SKY)
        text(p, name, x + 18, y, 375, 29, 21, 'Body', INK)
    caption(p, 'Geographic names: PSA PSGC. Service schedule and availability confirmed upon inquiry.', 42, 626, 1190)

spec = {'width': W, 'height': H, 'fonts': FONT, 'revision': REV, 'pages': pages}
(TMP / 'layout.json').write_text(json.dumps(spec, ensure_ascii=False, indent=2), encoding='utf-8')
final = OUT / 'pdf' / f'Oceanides-Company-Profile-{REV}.pdf'
if final.exists():
    raise FileExistsError('Preserve prior revision: ' + str(final))
c = canvas.Canvas(str(final), pagesize=(W * .75, H * .75))
c.setTitle('Oceanides Company Profile - Audited Review')
c.setAuthor('Oceanides Plumbing, Siphoning, and Pest Management Services OPC')
for p in pages:
    c.saveState()
    c.scale(.75, .75)
    for el in p['elements']:
        x, y, w, h = (el[k] for k in ['x', 'y', 'w', 'h'])
        if el['type'] == 'rect':
            c.setFillColor(HexColor(el['color']))
            c.rect(x, H - y - h, w, h, fill=1, stroke=0)
        elif el['type'] == 'image':
            c.drawImage(el['renderPath'], x, H - y - h, w, h)
        else:
            c.setFillColor(HexColor(el['color']))
            c.setFont(el['font'], el['size'])
            c.drawString(x, H - y - el['size'] * .96, el['text'])
    c.restoreState()
    c.showPage()
c.save()
print(json.dumps({'pdf': str(final), 'slides': len(pages), 'layout': str(TMP / 'layout.json')}))
