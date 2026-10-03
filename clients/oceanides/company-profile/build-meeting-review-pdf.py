from pathlib import Path
import json
import hashlib
import os
import sys
import tempfile
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from pypdf import PdfReader

workspace = Path.cwd()
build = workspace / '.tmp/oceanides-meeting'
output = workspace / 'clients/oceanides/company-profile/output/pdf/Oceanides-Company-Profile-STP-Meeting-Review.pdf'
output.parent.mkdir(parents=True, exist_ok=True)
if output.exists():
    if '--replace-review' not in sys.argv:
        raise FileExistsError('Preserve the existing review PDF unless this task-owned review revision is explicitly replaced.')
descriptor, staged_name = tempfile.mkstemp(prefix=f'.{output.stem}-', suffix='.pdf', dir=output.parent)
os.close(descriptor)
staged = Path(staged_name)
try:
    deck = canvas.Canvas(str(staged), pagesize=(960, 540), pageCompression=1)
    deck.setTitle('Oceanides company profile and STP film')
    deck.setAuthor('Oceanides')
    for number in range(1, 10):
        deck.drawImage(ImageReader(str(build / f'slide-{number}.png')), 0, 0, 960, 540, preserveAspectRatio=True)
        deck.showPage()
    deck.save()
    reader = PdfReader(staged)
    assert len(reader.pages) == 9
    assert all(tuple(float(x) for x in page.mediabox) == (0, 0, 960, 540) for page in reader.pages)
    if output.exists() and '--replace-review' not in sys.argv:
        raise FileExistsError('A review PDF appeared during validation; preserve it.')
    os.replace(staged, output)
finally:
    staged.unlink(missing_ok=True)
receipt = {'path': str(output), 'pages': 9, 'pageSizePt': [960, 540], 'sha256': hashlib.sha256(output.read_bytes()).hexdigest(), 'byteCount': output.stat().st_size, 'videoIsStaticPoster': True}
(build / 'pdf-verification.json').write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
print(json.dumps(receipt))
