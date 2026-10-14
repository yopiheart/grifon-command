"""Build the bundled, tabular-digit Inter derivatives. Not needed to render quotes.

Build dependency: fonttools 4.60.1. Source and matching OFL must be supplied together.
"""
import argparse
from pathlib import Path
import shutil

from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont


def build(source, output):
    source, output = Path(source), Path(output)
    license_path = source.parent / 'OFL-Inter.txt'
    if not license_path.is_file():
        raise ValueError('The original Inter source requires its matching OFL-Inter.txt.')
    output.mkdir(parents=True, exist_ok=True)
    for role, weight, optical_size, style in [
        ('Regular', 400, 14, 'Regular'),
        ('Semibold', 600, 14, 'Semibold'),
        ('Display', 600, 32, 'Display Semibold'),
    ]:
        font = instantiateVariableFont(TTFont(source, recalcTimestamp=False),
                                       {'wght': weight, 'opsz': optical_size}, inplace=True)
        # ReportLab does not execute GSUB features. Map digits to Inter's own tnum
        # glyphs so equal advances are preserved in every embedded PDF.
        substitutions = {}
        gsub = font['GSUB'].table
        for feature in gsub.FeatureList.FeatureRecord:
            if feature.FeatureTag == 'tnum':
                for index in feature.Feature.LookupListIndex:
                    for subtable in gsub.LookupList.Lookup[index].SubTable:
                        substitutions.update(getattr(subtable, 'mapping', {}))
        for cmap in font['cmap'].tables:
            if cmap.isUnicode():
                for digit in '0123456789':
                    glyph = cmap.cmap.get(ord(digit))
                    if glyph in substitutions:
                        cmap.cmap[ord(digit)] = substitutions[glyph]
                    elif glyph not in substitutions.values():
                        raise ValueError('Source font has no complete tabular-digit substitution.')
        digits = font.getBestCmap()
        if len({font['hmtx'][digits[ord(d)]][0] for d in '0123456789'}) != 1:
            raise ValueError('Tabular-digit advances are not equal.')
        # A distinct derivative family keeps the original Inter copyright/license.
        names = {1: 'Oceanides Sans', 2: style, 3: 'OceanidesSans-' + role + '-1.0',
                 4: 'Oceanides Sans ' + style, 6: 'OceanidesSans-' + role,
                 16: 'Oceanides Sans', 17: style}
        for record in font['name'].names:
            if record.nameID in names:
                record.string = names[record.nameID].encode(record.getEncoding())
        font.recalcTimestamp = False
        font.save(output / f'OceanidesSans-{role}.ttf')
    shutil.copyfile(license_path, output / 'OFL-Inter.txt')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', required=True)
    parser.add_argument('--output-dir', required=True)
    args = parser.parse_args()
    build(args.source, args.output_dir)
