# Component instructions

These rules apply to `components/` in addition to the repository root
instructions.

- Shared wizard/module selection state lives in `App.tsx` and is passed as
  props. Step components also own local UI state and some existing generation
  calls; preserve the surrounding ownership pattern unless the task explicitly
  changes it. Do not add Context, Redux, Zustand, or another global store
  without approval. Preserve the Step 6 thumbnail/video-prompts fork.
- Dashboard modules are selected by the `activeModule` string in `App.tsx`.
- Follow `DESIGN.md`: zinc-950 canvas, Grifon Gold `#FFCC00`, adequate contrast,
  and existing `components/ui` primitives such as `GlassPanel` and `GoldButton`.
- Use `lucide-react` icons, following the surrounding file's established direct
  import or local wrapper pattern; do not use text glyphs as icons or recreate
  existing primitives inline.
- Preserve domain distinctions from `UBIQUITOUS_LANGUAGE.md`: Avatar is not
  Influencer, wizard Script is not Influencer Script, and Storyboard is not
  Cinematic Relay.
- For perceptible UI changes, build, run applicable tests, and smoke-check the
  affected flow and a 390x844 viewport.
