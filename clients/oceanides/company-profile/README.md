# Oceanides company profile

Current deliverables:

- `output/pdf/Oceanides-Company-Profile-2026.pdf` — fixed six-page A4 print layout.
- `output/pptx/Oceanides-Company-Profile-final.pptx` — editable native text and shapes.

The unsuffixed PDF is an earlier, superseded design. The new filename avoids an
open-file lock and makes the current version explicit.

Rebuild with `./clients/oceanides/company-profile/build-profile.ps1 -Revision <name>`.
Each PDF and PPTX receives that revision suffix. Review the generated pages before
using a rebuilt document; the presentation builder checks package and geometry.

Content comes from `profile-content.json`. Four generated illustrations are visibly
labeled in the document; their exact prompts and provenance are recorded in
`assets/generated-sources.json`. They do not represent Oceanides employees,
completed projects, owned equipment or an engineering plan. The actual vehicle
image and same-site before/after pair retain their separate source records.

The PDF embeds its typography. The PPTX uses approved Arial/Arial Narrow native
text. Portable previews substitute the display font; Microsoft PowerPoint rendering
has not been tested. Use the PDF for consistent printing.
