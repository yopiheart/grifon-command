# Oceanides company profile

Current deliverables:

- `output/pdf/Oceanides-Company-Profile-Ocean-Accent-Final.pdf` — fixed six-page A4 print layout.
- `output/pptx/Oceanides-Company-Profile-Ocean-Accent-Final.pptx` — editable native text and shapes.

Earlier output filenames are superseded. The current profile uses a warm-white,
ink and navy palette, sentence-case Arial typography and generous whitespace.
References: Apple 2025 Environmental Progress Report and OpenAI public brand guidance;
see the scoped profile exception in ../DESIGN.md and swipe-file entry D18.

Rebuild with `./clients/oceanides/company-profile/build-profile.ps1 -Revision <name>`.
Each PDF and PPTX receives that revision suffix. Review the generated pages before
using a rebuilt document; the presentation builder checks package and geometry.

Content comes from `profile-content.json`. Four generated illustrations are visibly
labeled in the document; their exact prompts and provenance are recorded in
`assets/generated-sources.json`. They do not represent Oceanides employees,
completed projects, owned equipment or an engineering plan. The actual same-site before/after pair retains its separate source record.
Older cover and vehicle assets remain recorded but are not used in this revision.

The PDF embeds its typography. The PPTX uses native Arial text and shapes. Microsoft PowerPoint rendering
has not been tested. Use the PDF for consistent printing.

Logo: user-requested transparent outer-background derivative in assets/logo-transparent.png.
Its alpha is preserved in both exports; the supplied canonical JPG remains intact.

Ocean accent revision: colored headings and subtle native wave ribbons in the
upper-right margin; subtitles/body retain neutral colors.
