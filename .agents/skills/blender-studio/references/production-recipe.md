# Production recipe

## Replay the accepted griffin

The two bundled Python files are exact copies of the source used for accepted
v05. They require only Blender and its built-in Python modules. Copy them into a
fresh output folder; never execute them in this skill's frozen asset folder.
The following PowerShell example runs from the skill directory. Supply a new
output path and the installed Blender executable; do not reuse an existing master
folder. The mkdir call fails if the destination already exists.

```powershell
$characterOut = Join-Path $env:TEMP ('griffin-replay-' + [guid]::NewGuid().ToString('N'))
$blenderExe = 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe'
New-Item -ItemType Directory -Path $characterOut -ErrorAction Stop
Copy-Item -LiteralPath './assets/griffin-v05/build-griffin-master.py' -Destination $characterOut
Copy-Item -LiteralPath './assets/griffin-v05/render-griffin-views.py' -Destination $characterOut
& $blenderExe --background --python-exit-code 1 --python (Join-Path $characterOut 'build-griffin-master.py') -- v05 1500 160 hero
if ($LASTEXITCODE -ne 0) { throw 'Blender master build failed' }
& $blenderExe --background --python-exit-code 1 --python (Join-Path $characterOut 'render-griffin-views.py') -- (Join-Path $characterOut 'griffin-master-v05.blend') v05 1100 96 front detail
if ($LASTEXITCODE -ne 0) { throw 'Blender review render failed' }
```

Build positional arguments: `version size samples angle`. Defaults reproduce the
v05 hero settings. Named views are hero/front/detail; the secondary renderer also
supports profile and transparent. Profile and transparent were not part of the
accepted v05 review. The renderer loads a saved master and changes camera/render
settings without regenerating geometry or overwriting that master.

For a portability check, use a new version label with `256 8 hero`; this checks
construction and rendering, not visual parity. Replaying across Blender versions,
devices, or denoisers need not be pixel-identical. Check dimensions, artifact
existence, source integrity, and visually inspect full-quality outputs.

## Geometry and identity

The specimen uses an egg body, two joined swept crest masses, a cream facial
surface conforming to the body with added cheek volume, inset elliptical eyes,
a compact forward-projecting hooked beak, folded wings, and a curled tube tail.
The authoring coordinates are `(x, up, forward)` mapped to Blender `(x, -forward, up)`.
Do not apply that helper twice when adding Blender-native coordinates.

Body and crest use a 0.015-unit voxel union, smooth relaxation, and subdivision.
This removes seams; it is not a promise of animation-ready topology. Facial
geometry has a softly tapered perimeter, not a floating flat badge. The upper
beak wraps a small lower mandible, and the tail begins inside the body.

For a new species, replace these forms and landmarks intentionally. Preserve the
technique and quality bar, not the griffin's coordinates, palette, or fur count.

## Native curve groom

The approved scene contains 404,000 curves, five control points per strand:

| Region | Count | Base length | Base radius |
| --- | ---: | ---: | ---: |
| Body and crest | 240,000 | 0.046 | 0.00040 |
| Cream facial down | 110,000 | 0.023 | 0.00034 |
| Folded wings, each | 13,000 | 0.019 | 0.00045 |
| Tail | 28,000 | 0.018 | 0.00030 |

These are scene units for a roughly three-unit-tall specimen. Scale length and
radius with the character; blindly copying density or length can hide the form.

Sample mesh triangles by area, barycentrically interpolate roots and normals,
and taper the radius toward each tip. Combine a tangent groom with bounded
lognormal length variation, spatial patches, side sweep, and individual curl.
Near eyes, shorten facial strands so the glossy surface remains clean. Shorten
the gold tail nap. Interpolate the color mask for mesh and curves so gold tips
do not look like separately glued caps.

Blender 5.2 API used successfully:

```python
curves = bpy.data.hair_curves.new(name)
curves.add_curves([5] * count)
curves.attributes['position'].data.foreach_set('vector', positions)
radius = curves.attributes.new('radius', 'FLOAT', 'POINT')
radius.data.foreach_set('value', radii)
```

`ShaderNodeBsdfHairPrincipled` uses `parametrization='COLOR'`. Use Hair Info
Random through a Color Ramp for variation; this Blender version has no
`Random Color` input on that shader. Per-point `crest_gold` attributes blend
the gold across the body crest and tail. Material-use-nodes deprecation warnings
occur on 5.2; they did not prevent output. Revalidate APIs on version upgrades.

## Materials and lighting

- Body, cream, and gold use metallic 0; body/cream roughness 0.65, gold 0.37.
- Graphite hair uses dark RGB (0.017, 0.019, 0.023), roughness 0.65, radial 0.65.
  Random hair color scales roughly 70-118% of the base.
- Eyes use almost-black, roughness 0.10, coat weight 0.27, coat roughness 0.10.
  Catchlights come from the lights; no flat white highlight stickers.
- Body/cream low subsurface weights and subtle bump support the shape. Bump
  distance 0.006 and strength 0.10 are secondary to actual geometry and fibers.
- Broad area lights: warm key 430 W / size 4; cooler fill 110 W / size 3;
  warm rim 430 W / size 3. Light powers depend on scene scale and exposure.
- Dark studio floor and low world illumination provide soft grounding shadows.
- AgX, Medium High Contrast, exposure +0.25. Orthographic hero camera;
  actual saved camera positions are in the replay source.
- Cycles, denoising, eight total bounces. Hero: 1500 square / 160 samples /
  adaptive threshold 0.015. Front/detail: 1100 square / 96 samples / 0.008.

## Verification and runtime limits

The original local CPU hero took about 211 seconds including construction on
Ryzen 5 PRO 4650G; this is an observed run, not an ETA for other machines.
No add-on, paid renderer, Gaussian training, or external image texture was used.
Source replay reconstructs the mesh and fibers; a still render is not a motion
test. Rigging must address eyelids, eye sockets, separate gaze, deformation, and
groom attachment. Real-time delivery needs its own measured quality/performance
budget. Preserve the master before simplifying anything for the browser.
