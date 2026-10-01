"""Projector layout using the approved profile content, imagery and typography."""


def build_layout(data, page, text, image, rect, assets, art):
    def divider(p, y, color='line'):
        rect(p, 72, y, 1136, .7, color)

    def header(p):
        text(p, 'Oceanides', 72, 35, 500, 20, 'Strong', 'ink')
        text(p, 'Company profile', 1000, 39, 208, 16, 'Body', 'gray')

    def footer(p, number):
        divider(p, 677)
        text(p, 'Oceanides', 72, 690, 500, 16, 'Body', 'gray', 20)
        text(p, f'{number:02d}', 1178, 690, 30, 16, 'Body', 'gray', 20)

    p = page()
    p['notes'] = 'Cover: AI-generated conceptual architecture, not a real project or engineering plan.'
    image(p, art+'logo-transparent.png', 72, 37, 100, 100,
          alt='Oceanides full logo with transparent outer background')
    text(p, 'Company profile', 72, 174, 560, 22, 'Body', 'gray')
    text(p, 'Property services\nOne point of contact', 72, 223, 592, 60, 'Display', 'blue', 70)
    text(p, 'Siphoning. Plumbing.\nRenovation & restoration.\nPest control.', 72, 438, 550, 26, 'Body', 'ink', 38)
    image(p, art+'cover-property-minimal.png', 674, 183, 534, 356, 'contain',
          'AI-generated conceptual property cutaway; not a completed Oceanides project')
    text(p, 'AI-generated property-services concept', 674, 563, 534, 16, 'Body', 'gray', 22)
    text(p, data['company'], 72, 635, 1136, 18, 'Body', 'gray', 24)
    text(p, '01', 1178, 690, 30, 16, 'Body', 'gray', 20)

    p = page()
    header(p)
    text(p, 'Services for the places you live and work', 72, 108, 1136, 48, 'Display', 'blue', 60)
    text(p, data['overview'], 72, 192, 1136, 25, 'Body', 'gray', 36)
    rows = [
        ('Siphoning', 'Septic tank siphoning and cleaning.'),
        ('Plumbing', 'Drain declogging and pipe leak repairs.'),
        ('Renovation & restoration', 'House and condominium repairs and improvements.'),
        ('Pest control', 'Site assessment, treatment scope and coordination.'),
    ]
    for idx, (title, detail) in enumerate(rows):
        y = 324 + idx*79
        divider(p, y)
        text(p, title, 72, y+23, 492, 28, 'Strong', 'ink', 36)
        text(p, detail, 600, y+25, 608, 24, 'Body', 'gray', 33)
    p['notes'] = data['delivery']
    footer(p, 2)

    p = page()
    header(p)
    text(p, 'Siphoning &\nplumbing', 72, 118, 574, 56, 'Display', 'blue', 64)
    text(p, 'Septic tank services, drain declogging\nand plumbing repairs.', 72, 277, 576, 25, 'Body', 'gray', 36)
    text(p, 'Service scope', 72, 393, 540, 27, 'Strong', 'ink', 36)
    text(p, 'Septic tank siphoning\nSeptic tank cleaning\nDrain declogging\nPipe leak repairs', 72, 446, 540, 26, 'Body', 'ink', 43)
    image(p, art+'plumbing-service.png', 708, 191, 500, 500*2/3, 'contain',
          'AI-generated fictional plumbing specialist')
    text(p, 'AI-generated service illustration', 708, 546, 500, 16, 'Body', 'gray', 22)
    text(p, 'Scope follows site access and tank or pipe conditions.', 72, 635, 1136, 20, 'Body', 'gray', 28)
    p['notes'] = 'Service illustration: AI-generated fictional specialist, not an actual Oceanides employee or completed project.'
    footer(p, 3)

    p = page()
    header(p)
    text(p, 'Actual siphoning work', 72, 109, 1136, 52, 'Display', 'blue', 63)
    text(p, 'Same site before and after service', 72, 191, 1136, 25, 'Body', 'gray', 35)
    image(p, assets+'tb2-ba2-before.png', 156, 241, 400, 400, 'cover',
          'Confirmed actual same-site septic opening before service')
    image(p, assets+'tb2-ba2-after.png', 724, 241, 400, 400, 'cover',
          'Confirmed actual same-site septic opening after service')
    text(p, 'Before service', 156, 649, 400, 22, 'Body', 'gray', 26)
    text(p, 'After service', 724, 649, 400, 22, 'Body', 'gray', 26)
    p['notes'] = ('Actual matched job photos: clients/oceanides/assets/tb2-ba2-before.png and '
                  'tb2-ba2-after.png. Neil confirmed same-site before/after on 2026-08-01; '
                  'see client DESIGN.md and asset builder. Centered square frames preserve the tank opening.')
    footer(p, 4)

    p = page()
    header(p)
    text(p, 'Renovation &\nrestoration', 72, 118, 538, 52, 'Display', 'blue', 61)
    text(p, 'Repair and improvement work for\nhouses and condominiums.', 72, 272, 530, 25, 'Body', 'gray', 36)
    for x, y, title, detail in [
        (72, 402, 'Ceilings', 'Repair and\nreplacement'),
        (350, 402, 'Water protection', 'Roof leak repair\nand waterproofing'),
        (72, 536, 'Renovation', 'Restoration of houses\nand condominiums'),
        (350, 536, 'Cleaning', 'House cleaning to\nagreed scope'),
    ]:
        text(p, title, x, y, 260, 24, 'Strong', 'ink', 32)
        text(p, detail, x, y+43, 260, 23, 'Body', 'gray', 31)
    image(p, art+'renovation-service.png', 640, 180, 568, 568*2/3, 'contain',
          'AI-generated fictional ceiling repair specialist; full tool and worker preserved')
    text(p, 'AI-generated service illustration', 640, 579, 568, 16, 'Body', 'gray', 22)
    p['notes'] = 'Service illustration: AI-generated fictional ceiling repair specialist, not a completed Oceanides project.'
    footer(p, 5)

    p = page()
    header(p)
    image(p, art+'pest-control-service.png', 72, 141, 624, 416, 'contain',
          'AI-generated fictional pest-control specialist; full treatment target preserved')
    text(p, 'AI-generated service illustration', 72, 576, 624, 16, 'Body', 'gray', 22)
    text(p, 'Pest control', 758, 141, 450, 54, 'Display', 'blue', 65)
    text(p, data['serviceGroups'][3]['summary'], 758, 236, 450, 25, 'Body', 'gray', 36)
    for y, label in [(415, 'Assessment of pest activity'),
                     (483, 'Treatment scope based\non site findings'),
                     (572, 'Service scheduling and\ncontractor coordination')]:
        text(p, label, 758, y, 450, 24, 'Body', 'ink', 33)
    text(p, 'Treatment and specialist requirements follow the site assessment.', 72, 635, 1136, 20, 'Body', 'gray', 28)
    p['notes'] = 'Service illustration: AI-generated fictional specialist and localized treatment, not an actual Oceanides employee or completed project.'
    footer(p, 6)

    p = page('navy')
    image(p, art+'logo-transparent.png', 72, 37, 88, 88,
          alt='Oceanides full logo with transparent outer background')
    text(p, 'Your next step', 72, 157, 660, 22, 'Body', 'muted', 30)
    text(p, 'Site assessment\nWritten quotation', 72, 207, 690, 54, 'Display', 'paper', 63)
    text(p, 'Tell us the service, site location and\npreferred inspection schedule.', 72, 370, 660, 26, 'Body', 'muted', 36)
    text(p, data['phone'], 72, 458, 690, 48, 'Display', '#FFFFFF', 58)
    text(p, data['email'], 72, 531, 710, 27, 'Body', 'muted', 35)
    text(p, 'Globe', 72, 576, 660, 20, 'Body', 'dim', 26)
    text(p, data['address'], 72, 611, 720, 22, 'Body', 'muted', 30)
    text(p, 'Supplier accreditation', 834, 159, 374, 28, 'Strong', '#FFFFFF', 36)
    text(p, 'Share your procurement requirements. We can coordinate company documents and project information for your review.', 834, 217, 374, 24, 'Body', 'muted', 35)
    rect(p, 834, 406, 374, .7, 'surface')
    for idx, step in enumerate(data['process']):
        text(p, step['title'], 834, 440+idx*53, 374, 26, 'Strong', '#FFFFFF', 35)
    text(p, data['company'], 72, 688, 1136, 16, 'Body', 'muted', 21)
    p['notes'] = data['delivery'] + '\n' + data['scopeNote'] + '\n' + '\n'.join(
        step['title'] + ': ' + step['detail'] for step in data['process'])
