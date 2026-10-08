# Preferred Grifon finish - Material Trial v01

Neil preferred this look on 2026-10-08 and requested saving it for future work.
Use it as the current visual anchor for Grifon soft characters. Preserve the
approved face, silhouette, soft graphite coat and restrained gold accents.

Inspect the bundled [hero](../assets/griffin-neutral-v01/griffin-material-final-hero.png),
[front](../assets/griffin-neutral-v01/griffin-material-final-front.png),
[detail](../assets/griffin-neutral-v01/griffin-material-final-detail.png),
[oblique profile](../assets/griffin-neutral-v01/griffin-material-final-profile.png),
and [transparent avatar source](../assets/griffin-neutral-v01/griffin-material-final-transparent.png).
[The package manifest](../assets/griffin-neutral-v01/manifest.json) binds the exact
source, renders, original render evidence and owner acceptance by SHA-256.

## Carry forward the actual improvement

The cream face looks more neutral under the revised studio lighting. Its pigment
was not recolored: cream mesh RGB (0.82, 0.69, 0.49), cream fiber base RGB
(0.82, 0.67, 0.44), and the existing 70-118% cream random ramp were retained.
Use the full material/light relationship, not a whiter face color guessed from
the screenshot. This study preserved all v05 mesh and hair buffers, transforms,
bindings and 404,000 native curves. The existing groom was not improved here.

| Setting | Selected v01 value |
| --- | --- |
| Graphite hair | Base RGB (0.017, 0.019, 0.023); roughness 0.47; radial roughness 0.62 |
| Graphite random color | Ramp endpoints 0.62 and 1.36 times the base RGB; existing gold-mask blend retained |
| Cream hair | Roughness 0.68; radial roughness 0.70; pigment and ramp retained |
| Obsidian eyes | Roughness 0.075; coat weight 0.36; coat roughness 0.08 |
| Gold beak / tips | Roughness 0.32; coat weight 0.12; coat roughness 0.28 |
| Large window key | 520 W; size 3.4; RGB (1.0, 0.975, 0.94) |
| Gentle camera fill | 60 W; size 3.0; RGB (0.94, 0.97, 1.0) |
| Soft feather rim | 380 W; size 2.7; RGB (1.0, 0.96, 0.89) |
| World | Strength 0.19; existing background color retained |
| Color management | AgX / Medium High Contrast; exposure +0.25 |
| Cycles | CPU; seed 0; denoising; adaptive threshold 0.008 |
| Final views | Hero 1500 px / 160 samples; front/detail/profile 1100 px / 96; transparent 256 px / 96 |

These RGB values are Blender node/light values, not CSS colors. Principal
surface base colors and metallic 0 remain from the v05 character. Light power,
size and material response are calibrated to this scene's scale and cameras;
they are starting references, not universal settings for unrelated subjects.

## Replay without altering the approved master

The bundled [refinement source](../assets/griffin-neutral-v01/refine-griffin.py)
is the exact script used for the selected final study. Its source SHA-256 is
`2adad6a2d9acf398b81a573c8a0813356c9df66c3bfd1ac7f529d51423102c60`.
It accepts only the exact saved original v05 master:
`1f5469d46972ec14490f78a33d17a8b611e8b86810d7aec35820cd1cfacd34e7`.
It creates a fresh output directory and changes material/light and review render
settings, leaving the input file untouched. Run it in a separate background
Blender process with `--python-exit-code 1`; do not run it in an open user scene.

After locating the installed Blender and assigning `$characterMaster` to a
SHA-verified v05 file, this PowerShell example runs from the skill directory:

```powershell
$blenderExe = 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe'
$neutralSourceDir = Join-Path $env:TEMP ('griffin-neutral-source-' + [guid]::NewGuid().ToString('N'))
$neutralOut = Join-Path $env:TEMP ('griffin-neutral-render-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $neutralSourceDir -ErrorAction Stop
Copy-Item -LiteralPath './assets/griffin-neutral-v01/refine-griffin.py' -Destination $neutralSourceDir
& $blenderExe --background --python-exit-code 1 --python (Join-Path $neutralSourceDir 'refine-griffin.py') -- --input $characterMaster --output $neutralOut --version material-final --look v01 --size 1500 --samples 160 --secondary-size 1100 --secondary-samples 96 --transparent-size 256 --transparent-samples 96 --views hero front detail profile transparent
if ($LASTEXITCODE -ne 0) { throw 'Neutral material render failed' }
```

Use a moderate budget for new iterations, then final matched views after visible
improvement. Do not rerender merely to load this saved skill. v02 was declined
as visually immaterial; keep `--look v01` for this preferred specimen.

The original v05 master and selected final `.blend` persist in the originating
task's local asset storage; their recorded paths in the package manifest are
provenance, not portable dependencies. The final scene SHA-256 is
`bb2e9a8a197608006c71d1929798ee37fbae5cb7696153b9e9ed209de0d9a499`.
Sources and visual anchors are Git-backed; these binaries are local only.
If the exact v05 master is unavailable, use the bundled v05 build recipe in a
new output folder, then adapt the settings above in new task-owned source.
A rebuilt `.blend` can have a different byte hash. Do not disable the frozen
refinement script's identity guard or claim an adapted rebuild is an exact replay.
Record its own hashes and visually compare it to these anchors.

## Quality process and evidence limits

Use moderate renders, one visible defect per iteration, an independent critic,
matched final hero/front/detail views, and owner review. Check the actual intended
display size and preserve the full-quality master before optimizing delivery.
The prior saved-scene verifier checked buffers, attributes, palette and bindings;
it rejected a one-vertex negative control. Both final render processes exited 0.

Independent review found restrained face/beak depth and eye seating improvements
in larger views, with no obvious material advantage at 64 px. Uniform wispy fringe
over mottled nap remains a coat-coherence limitation. The profile is oblique;
hidden back surfaces were not reviewed. Owner preference is recorded separately
from these independent findings. Do not turn acceptance into a flawless-quality,
animation, browser performance or new-subject benchmark claim.

Apply the production discipline to products, architecture and game assets,
using their own subject tracks, references, physical materials and output checks.
Do not apply the graphite/cream/gold palette, fur or nonmetallic rule universally.
This acceptance covers a still finish. Rigging and live companion integration
must preserve it and earn their own quality and performance checks.
