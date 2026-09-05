# Component instructions

These rules apply to `components/` in addition to the repository root
instructions.

- Wizard and shared module state belongs in `App.tsx` and is passed as props.
  Do not add Context, Redux, Zustand, or another global store without approval.
- Step components stay presentational; service calls belong in `App.tsx`
  handlers. Preserve the Step 6 thumbnail/video-prompts fork.
- Dashboard modules are selected by the `activeModule` string in `App.tsx`.
- Follow `DESIGN.md`: zinc-950 canvas, Grifon Gold `#FFCC00`, adequate contrast,
  and existing `components/ui` primitives such as `GlassPanel` and `GoldButton`.
- Use only `lucide-react` icons through the project's icon exports; do not use
  text glyphs as icons or recreate existing primitives inline.
- Preserve domain distinctions from `UBIQUITOUS_LANGUAGE.md`: Avatar is not
  Influencer, wizard Script is not Influencer Script, and Storyboard is not
  Cinematic Relay.
- For perceptible UI changes, build, run applicable tests, and smoke-check the
  affected flow and a 390x844 viewport.
