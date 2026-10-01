# Oceanides company profile

Current deliverables:

- `output/pptx/Oceanides-Company-Profile-Widescreen-Final.pptx` — seven editable 16:9 slides for a laptop/projector.
- `output/pdf/Oceanides-Company-Profile-Widescreen-Final.pdf` — the same widescreen presentation with embedded fonts.
- `output/pdf/Oceanides-Company-Profile-Navy-Refined.pdf` — six-page A4 profile for printed copies.
- `output/pptx/Oceanides-Company-Profile-Navy-Refined.pptx` — editable A4 source.

Earlier output filenames are superseded. The current profile uses a warm-white,
ink and navy palette, sentence-case Segoe UI titles and Arial body text and generous whitespace.
References: Apple 2025 Environmental Progress Report and OpenAI public brand guidance;
see the scoped profile exception in ../DESIGN.md and swipe-file entry D18.

Rebuild with `./clients/oceanides/company-profile/build-profile.ps1 -Revision <name>`.
For the meeting deck, add `-Format Widescreen`; the default format remains A4.
Each PDF and PPTX receives that revision suffix. Review the generated pages before
using a rebuilt document; the presentation builder checks package and geometry.

The widescreen layout uses larger presentation text and a dedicated actual
before/after slide. Coordination, scope and process details are retained in
speaker notes. The print profile keeps its full A4 layout.

Content comes from `profile-content.json`. Four generated illustrations are visibly
labeled in the document; their exact prompts and provenance are recorded in
`assets/generated-sources.json`. They do not represent Oceanides employees,
completed projects, owned equipment or an engineering plan. The actual same-site before/after pair retains its separate source record.
Older cover and vehicle assets remain recorded but are not used in this revision.

The PDF embeds its typography. The PPTX uses native Segoe UI titles, Arial body text and editable shapes. Microsoft PowerPoint rendering
has not been tested. Use the PDF for consistent printing.

Logo: user-requested transparent outer-background derivative in assets/logo-transparent.png.
Its alpha is preserved in both exports; the supplied canonical JPG remains intact.

Ocean accent revision: colored headings and subtle native wave ribbons in the
upper-right margin; subtitles/body retain neutral colors.
