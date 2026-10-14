"""Preserve source OOXML while inserting native Artifact Tool brand bands."""
from pathlib import Path
from copy import deepcopy
import hashlib, json, posixpath, zipfile
from lxml import etree as E

ROOT = Path(__file__).resolve().parents[3]
BASE = Path(__file__).resolve().parent
TMP = ROOT / '.tmp/oceanides-stp-header-footer'
SOURCE = BASE / 'source/Advanced-STP-Presentation-Original.pptx'
NS = {'p':'http://schemas.openxmlformats.org/presentationml/2006/main',
      'a':'http://schemas.openxmlformats.org/drawingml/2006/main',
      'r':'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
      'rel':'http://schemas.openxmlformats.org/package/2006/relationships'}
EMU = 9525
def xml(data): return E.fromstring(data)
def encoded(node): return E.tostring(node, xml_declaration=True, encoding='UTF-8', standalone=True)
def shape_id(node):
    prop = node.find('.//p:cNvPr',NS)
    return int(prop.get('id')) if prop is not None else None
def content(node): return ''.join(node.xpath('.//a:t/text()',namespaces=NS))
def bounds(node):
    return node.find('./p:spPr/a:xfrm',NS)
def change_y(node,y): bounds(node).find('a:off',NS).set('y',str(round(y*EMU)))
def recolor_text(node,color):
    for run in node.xpath('.//a:rPr|.//a:defRPr|.//a:endParaRPr',namespaces=NS):
        for fill in run.findall('a:solidFill',NS): run.remove(fill)
        fill=E.SubElement(run,'{'+NS['a']+'}solidFill')
        E.SubElement(fill,'{'+NS['a']+'}srgbClr',val=color)

with zipfile.ZipFile(SOURCE) as source, zipfile.ZipFile(TMP/'brand-bands.pptx') as brand:
    files={name:source.read(name) for name in source.namelist()}
    # Remove the old inherited header/logo/footer, retaining all body content.
    for part,remove_ids in [('ppt/slideLayouts/slideLayout2.xml',{2,3}),
                            ('ppt/slideLayouts/slideLayout3.xml',{2,3,4,7,25})]:
        root=xml(files[part]); tree=root.find('p:cSld/p:spTree',NS)
        for node in list(tree):
            if shape_id(node) in remove_ids: tree.remove(node)
        files[part]=encoded(root)
    shifts={2:35.187,3:0,4:33.171,5:35.187,6:48.378,7:48.378,8:48.378,9:1.779}
    receipt=[]
    for number in range(1,10):
        part=f'ppt/slides/slide{number}.xml'
        root=xml(files[part]); tree=root.find('p:cSld/p:spTree',NS)
        original_text=[]
        for node in list(tree):
            ident=shape_id(node)
            if ident is None: continue
            value=content(node)
            is_page_number=node.find('.//p:ph[@type="sldNum"]',NS) is not None
            if is_page_number or (number==1 and ident==37):
                tree.remove(node); continue
            original_text.extend(node.xpath('.//a:t/text()',namespaces=NS))
            if number>1 and ident in {2,3}:
                change_y(node,103 if ident==2 else 157)
                recolor_text(node,'0E2C5E')
            elif number>1:
                transform=bounds(node)
                if transform is not None:
                    offset=transform.find('a:off',NS)
                    offset.set('y',str(int(offset.get('y'))+round(shifts[number]*EMU)))
                    # This empty card alone can extend behind the new subtitle.
                    # Trim its unused top margin; diagram internals stay exact.
                    if number==4 and ident==5:
                        extent=transform.find('a:ext',NS)
                        bottom=int(offset.get('y'))+int(extent.get('cy'))
                        offset.set('y',str(182*EMU)); extent.set('cy',str(bottom-182*EMU))
        next_id=max([shape_id(n) or 0 for n in tree])+1
        newroot=xml(brand.read(part)); newtree=newroot.find('p:cSld/p:spTree',NS)
        rel_part=f'ppt/slides/_rels/slide{number}.xml.rels'
        relations=xml(files[rel_part])
        new_relations=xml(brand.read(rel_part))
        for node in newtree:
            if E.QName(node).localname in {'nvGrpSpPr','grpSpPr'}: continue
            node=deepcopy(node)
            for prop in node.findall('.//p:cNvPr',NS):
                prop.set('id',str(next_id)); next_id+=1
            for blip in node.findall('.//a:blip',NS):
                old_id=blip.get('{'+NS['r']+'}embed')
                relation=next(r for r in new_relations if r.get('Id')==old_id)
                target=relation.get('Target')
                media_part=target.lstrip('/') if target.startswith('/') else posixpath.normpath(posixpath.join('ppt/slides',target))
                data=brand.read(media_part)
                # Preserve file format so the original content-type defaults apply.
                suffix=Path(target).suffix
                media_name='oceanides-brand-logo'+suffix
                files['ppt/media/'+media_name]=data
                relation_id='RbrandLogo'
                if not any(r.get('Id')==relation_id for r in relations):
                    E.SubElement(relations,'{'+NS['rel']+'}Relationship',
                      Id=relation_id,Type=relation.get('Type'),Target='../media/'+media_name)
                blip.set('{'+NS['r']+'}embed',relation_id)
            tree.append(node)
        files[part]=encoded(root); files[rel_part]=encoded(relations)
        receipt.append({'slide':number,'source_text_runs':original_text,
                        'body_shift_px':shifts.get(number,0)})
    # The supplied deck only has a PNG. The inserted original logo is JPEG.
    types=xml(files['[Content_Types].xml'])
    content_ns='http://schemas.openxmlformats.org/package/2006/content-types'
    if not any(e.get('Extension')=='jpeg' for e in types):
        E.SubElement(types,'{'+content_ns+'}Default',Extension='jpeg',ContentType='image/jpeg')
    if not any(e.get('Extension')=='jpg' for e in types):
        E.SubElement(types,'{'+content_ns+'}Default',Extension='jpg',ContentType='image/jpeg')
    files['[Content_Types].xml']=encoded(types)
    with zipfile.ZipFile(TMP/'candidate.pptx','w',zipfile.ZIP_DEFLATED) as target:
        for name,data in files.items(): target.writestr(name,data)
    (TMP/'preservation.json').write_text(json.dumps({'source_sha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
      'slides':receipt,'notes_and_unrelated_package_parts_preserved':True},indent=2),encoding='utf-8')
print(json.dumps({'candidate':str(TMP/'candidate.pptx'),'slides':9}))
