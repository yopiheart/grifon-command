# Independent material review

Date: 2026-10-08. Review axis: more believable material and lighting craft while preserving the already-approved Grifon identity. This is a visual review of actual PNGs, not a source or runtime review.

The critic read the Blender Studio skill and character track, then inspected the accepted v05 hero, front and detail anchors and the original atlas's neutral top-left character. The locked identity is a rounded graphite/cream/gold griffin with a swept two-tip crest, oval black eyes, compact hooked beak, folded wings, curled tail, and no feet or ears. Builder scripts, manifests and revision rationale were not used to form these findings. The tactile external reference was not supplied to this critic; a reference-match claim is therefore unverified.

## Reviewed images

- `assets/3d-lab/griffin-material-study/baseline-v05/griffin-baseline-v05-hero.png`
- `assets/3d-lab/griffin-material-study/candidate-v01/griffin-material-v01-hero.png`
- `assets/3d-lab/griffin-material-study/candidate-v02/griffin-material-v02-hero.png`

The initial supplied hero comparisons were 1000 x 1000 pixels.

## Candidate v01

The candidate preserves the approved silhouette, face and eyes, crest, wing inserts, and curled tail. Its clearest improvement is stronger face/beak volume: the beak reads more seated and the cream surface has a gentler rounded light falloff. Most coat changes are subtle. The result establishes a restrained shading refinement, not a major surface-quality jump.

The biggest remaining material gap is the coat's coherence. The crest and outer right contour retain a fairly uniform flyaway fringe over a mottled inner nap. That combination reads more like synthetic fleece than a deliberately groomed anatomical surface. More shine or a changed exposure would be a stylistic choice rather than a demonstrated correction to this gap.

No hard geometry or fiber blocker is visible in the hero: no obvious eye crossings, floating facial features, or broken attachments. This conclusion is limited to the supplied view; front, detail and profile checks remain pending.

## Candidate v02

The v01-to-v02 change is visually immaterial at the supplied size. Crest and right-edge flyaways and the mottled torso nap still read much the same. There is no clear hero-view improvement addressing the main material gap and no visual basis in this view to prefer v02 over v01. The restrained face/beak shading improvement over the baseline remains.

The biggest remaining gap is still coat coherence. No new hard geometry or fiber blocker is visible, and the identity remains intact.

## Final matched hero pair

The following actual renders were independently inspected at their original 1500 x 1500 resolution:

- `assets/3d-lab/griffin-material-study/baseline-final/griffin-baseline-final-hero.png`
- `assets/3d-lab/griffin-material-study/candidate-final/griffin-material-final-hero.png`

The final pair confirms the earlier restrained judgment. The comparison candidate gives the beak a more pronounced soft contact shadow and gives the cream face a slightly clearer rounded light falloff. That improves the local sense of seating and volume while preserving the character. The graphite coat and silhouette remain visually close to the baseline. Higher resolution does not establish a large increase in material quality or a target-reference match.

The biggest remaining material gap is still coat coherence: the mottled short nap across the crest and torso and the wispy contour fringe read as a synthetic fleece surface. The increased detail makes this limitation easier to inspect; it does not resolve it.

No hard geometry or fiber blocker is visible in this final hero. The eyes remain clear, the beak reads attached, and the folded wings and tail retain coherent silhouettes. The crest retains both approved gold tips. At this stage the finding was limited to the hero; the subsequent paired-view and small-size checks are recorded below.

## Final paired views and small display

The critic subsequently inspected both final front, detail and profile renders at their original 1100 x 1100 pixels and both transparent renders at their original 256 x 256 pixels. Paths follow the final hero roots above, with the view suffixes `front`, `detail`, `profile` and `transparent`.

The front and detail pairs confirm the restrained improvement in local face volume and feature seating. The candidate's eye and beak contact shadows make the cream face read slightly more sculpted. The detail view also confirms that the principal coat limitation remains: a mottled short nap across the crest/torso paired with a fairly uniform wispy edge fringe. The result is still a synthetic fleece read, rather than a demonstrated step toward a more deliberately groomed anatomical surface.

The supplied profile is an oblique view. It preserves the beak silhouette, face volume, folded wing and curled tail, with no new visible attachment break. No hard geometry or fiber blocker appears in any inspected final view: no visible fibers cross the glossy eye surfaces, no facial features float, and no obvious mesh cuts or broken joins are exposed. Hidden back geometry and a complete side/back turntable were not supplied, so those remain outside the visual finding.

The transparent pair preserves the same compact character at small render size. The actual comparison artifact, `artifacts/griffin-material-study.html`, was rendered with installed Playwright at a 1400 x 1000 viewport and device scale factor 1. Both small images loaded and measured exactly 64 x 64 CSS pixels from their 256-pixel transparent sources. The critic inspected the browser screenshot without resampling the small images.

At actual 64-pixel display size, both versions remain readable: the cream face, paired black eyes, gold beak, two-tip crest and curled tail still identify Grifon. The material and contact-shadow changes provide no clear visible small-size benefit. The fine coat differences largely disappear at this size, and there is no visible identity drift to offset the modest large-view shading improvement.

Saved visual evidence, relative to this report:

- `comparison-desktop.png`: actual rendered comparison page.
- `small-size-desktop.png`: browser screenshot strip preserving the actual 64-pixel images, approved at left and trial at right.

The final independent judgment is a restrained face/beak shading improvement, unchanged principal coat-coherence gap, and no hard visible blocker in the supplied views. It does not establish a large surface-quality jump, external-reference match, user preference or owner acceptance.

## Stopping assessment and limits

The visual evidence supports stopping these material trials. The completed front, detail and profile checks confirm the restrained result. The root agent selected v01 as the comparison candidate after two material trials. Neil has not reviewed either actual trial; owner approval remains pending. This candidate selection is separate from user acceptance or an externally proven reference match.

The supplied final multi-view and actual 64-pixel display checks are complete. Rig behavior, native hair geometry, browser export fidelity and production integration were outside this review.
