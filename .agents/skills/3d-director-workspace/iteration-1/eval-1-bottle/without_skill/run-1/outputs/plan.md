# 12-second vertical bottle commercial: 3D directing plan

The sequence is **push-in -> orbit -> side slide -> held hero shot**. The bottle stays upright and stationary; the camera performs the three requested moves. This is a proposed 3D blocking plan, not a rendered preview or a finished video.

## Inputs and assumptions

The only established product fact is that this is a reusable water bottle. No product photograph, geometry, dimensions, material, color, logo, label or brand identity was supplied.

Use a clearly provisional, unbranded gray bottle proxy: a simple cylinder with a rounded shoulder and plain cap. Its shape is a blocking stand-in, not a proposed product design or an accurate likeness. Do not infer features such as insulation, leak resistance, capacity, durability, recycled materials or environmental benefits. No voiceover, benefit copy, logo, liquid demonstration or performance claim is planned.

Proposed presentation: 9:16, 1080 x 1920, 30 fps, exactly 360 frames. A quiet light-gray studio floor and background keep the camera choreography readable. A large soft key at front-left, gentle fill at front-right and a narrow rear rim reveal the proxy silhouette. Use a subtle floor shadow; no condensation, ice, steam or other cues suggesting performance.

## Shot timeline

Frame ranges below are inclusive; each section occupies 90 frames.

| Time / frames | Direction | Composition and intent |
|---|---|---|
| 0.00-3.00 s / 0-89 | **Push-in.** Physically move the camera toward the stationary bottle with a fixed focal length. Ease into the move and settle at its end. | Start with breathing room around the entire bottle and finish with a larger full-bottle view. Keep the cap and base visible. The floor shadow makes the approach legible. |
| 3.00-6.00 s / 90-179 | **Orbit.** Travel through a 45-degree arc around the bottle at constant radius and height, always looking at its center. The bottle does not spin. | Maintain a full silhouette. Surface lighting and the relationship to the floor establish the changing viewpoint. Keep the arc modest for a three-second move. |
| 6.00-9.00 s / 180-269 | **Side slide.** Translate along the camera's local horizontal axis. Keep the camera orientation fixed during this segment, with no compensating pan, so the product visibly shifts across the frame. | Start at the orbit endpoint. Let the bottle drift slightly left in frame while keeping the whole silhouette visible. The movement should feel like a lateral pass, not another orbit. |
| 9.00-12.00 s / 270-359 | **Hero hold.** Cut to a centered frontal composition and hold the camera completely still. | Full bottle, cap and base visible, with generous clean space. No invented logo or slogan. The three-second still hold supplies the visual payoff. |

Use matching endpoints between push-in, orbit and slide; each move eases to rest before the next begins. The cut at 9 seconds is deliberate: it cleanly separates motion from the final hold. No additional camera movement follows the side slide.

## Editable 3D blocking specification

Use bottle height **H = 1 scene unit** as a temporary scale. Place its base at world origin; Z is up, its provisional front faces -Y. The look-at point is **T = (0, 0, 0.50H)**. All coordinates below are multiplied by H.

Create separate editable objects for the bottle proxy, floor, camera, camera target and lights. Put each camera segment on named timeline markers so its duration and path can be revised independently. A smooth cylinder provides a silhouette only; any temporary side seam used to judge orbit direction must be identified as a preview guide and excluded from a final product representation.

| Segment | Camera geometry |
|---|---|
| Push-in | Position moves from **(0, -3.50, 0.60)** to **(0, -2.40, 0.60)**; aim at T throughout. |
| Orbit | At constant Z = 0.60 and radius 2.40 around the vertical axis through the bottle, animate angle theta from 0 to 45 degrees: **C(theta) = (2.40 sin theta, -2.40 cos theta, 0.60)**. Aim at T. Endpoint is approximately **(1.697, -1.697, 0.60)**. |
| Side slide | From the orbit endpoint, move **0.55H** in direction **(0.707, 0.707, 0)**, ending near **(2.086, -1.308, 0.60)**. Freeze camera rotation at the orbit endpoint. Disable the look-at constraint during this move. |
| Hero hold | Separate static camera at **(0, -2.80, 0.65)**, aimed at T. Cut to it at frame 270. |

Start with a fixed 50 mm lens and set the camera's sensor fit explicitly for the portrait frame. These distances are initial blocking values, not verified framing. In a future preview, adjust sensor fit or all relevant distances together to keep the bottle fully visible and give the hero approximately 60% of frame height. Do not animate focal length to substitute for the push-in. Leave focus deep enough that the cap and base remain readable; avoid a focus pull competing with the requested camera moves.

The animation should use gentle acceleration and deceleration without overshoot. Verify curve handles at the segment boundaries so the camera does not swing beyond the orbit or slide limits. Keep the bottle transform locked across all four segments.

## Review criteria before further production

This plan passes its text-level timing check: 3 + 3 + 3 + 3 = 12 seconds, with the push-in, orbit and slide all preceding the hero. No generated media or visual verification has occurred.

A future 3D preview should be reviewed for:

- An unmistakable physical push-in, constant-radius orbit and straight lateral slide, in that order.
- A fully visible bottle with no cap/base clipping, floor penetration or distracting camera easing.
- A clear distinction between the orbit and slide; the slide must not secretly pan back toward the bottle.
- A stable hero from 9 to 12 seconds, in a readable portrait composition.
- No product claims or branding beyond what is actually supplied.

The current deliverable is this directing plan. Real product assets are needed to establish product fidelity before a branded final commercial; they are not needed to review this camera choreography. The next reviewable visual deliverable would be a labeled proxy 3D animatic using this timeline, with its assumptions still visible. Finished-video generation is outside this step.
