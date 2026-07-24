---
name: kuya-marvin-ads
description: End-to-end production ng Kuya Marvin (Oceanides) AI video ads — script brief hanggang published creative. Use kapag gagawa/magre-render/mag-e-edit ng Marvin ad o Lane A batch video, o kapag may pipeline question (plates, Veo clips, STS voice, captions, overlays, edit, QA). Encodes lahat ng KM-002 pilot lessons (2026-07-22/23) para hindi na maulit. NOT for stills lang (marvin-avatar) o organic non-ad posts.
---

# Kuya Marvin Ads — Production Pipeline

Ang buong recipe na pinatunayan ng KM-002 pilot (approved ni Neil 2026-07-23, v4).
Reference build: `clients/oceanides/kuya-marvin/ads/km-002-pilot/` (shot plan, rigs,
compositions, generator). Sister skills: `marvin-avatar` (plates), `ai-editor` (lab),
`grifon-cmo` (brief), `grifon-ad-strategist` (paid distribution).

## Ang division of labor (FINAL, Neil 2026-07-23)

| Piraso | Sino/Ano | Bakit |
|---|---|---|
| Script/copy | **GPT 5.6 Sol nagsusulat**; Claude nagbi-brief + nag-QA vs tuned formula | Claude Tagalog = "bulol" (Neil); builder ≠ reviewer |
| Formula | `api/_lib/prompts.ts` (UGC Pro structures, hook 5-8 words pattern interrupt, body 7-12 words/line, TAGLISH ACCENT LOCK, CTA walang peso) | Ang ad grammar ay ang app's tuned rules KAHIT agency lane |
| Plates | gpt-image-2 via `marvin-avatar` skill — ONE JOBSITE lahat ng scene | Gate 1: tanging 100% identity lane |
| Talking clips | `test-rigs/veo-produce.mjs` (veo-3.1-lite, 1080p, 8s, expression lock) | Gate 1 proven |
| Voice | ElevenLabs clone `jL41fXY8JXGEarmJ5g3f` via `test-rigs/audio-post.mjs` — STS sa clips, TTS sa VO-over-still/end card | Totoong boses ni Marvin ang lumalabas |
| **Overlay text** (hook, callouts, end card) | **Hyperframes HTML** (transparent MOV → ffmpeg composite; compositions committed sa ads folder) | Per-move ownership sa `workflows/hyperframes_decision.md`; letter-perfect, $0, may GSAP animation |
| **Live captions** | **FFmpeg IMPACT grammar** via `build-captions.mjs` (Anton chunk-pop, exact drawPlan constants) | Product-caliber look, deterministic |
| Music + SFX + loudnorm | FFmpeg (app assets: `api/_lib/assets/music|sfx`), amix + loudnorm −14 LUFS | Same bank ng one-shot |
| Final verdict | **Neil eyeball bawat gate** — machine QA ay triage lang | Batas ng bahay |

## Pipeline (bawat ad)

1. **Brief → Sol:** format (UGC Pro Tutorial/etc.), awareness stage, hook rules,
   word budget (see PACING), typography rules (walang apostrophe/em dash), never-Malabanan,
   TAGLISH ACCENT LOCK, CTA rules. Sol drafts → Claude QA vs formula → Neil approves.
   Ad scripts live sa `script-pool.json` `ads` section LANG.
2. **Plates:** marvin-avatar recipe, close-up neutral (talking), iisang jobsite, varied
   angles within close-up; hands-only work shots = malayang framing (walang mukha).
   Eyeball gate bago mag-Veo.
3. **Clips:** `veo-produce.mjs` per scene (~$1/clip 8s). Delivery direction sa prompt
   (see ENERGY). Agent triage (identity/expression/letterbox) → Neil eyeball.
4. **Audio:** STS bawat clip + TTS ng VO lines. Speech map via
   `silencedetect=noise=-30dB:d=0.3` — ito ang batayan ng trims at caption timings.
5. **Overlays:** Hyperframes composition per overlay (hook stack etc.), speech-synced
   sa map, `--format mov` (transparent) → composite.
6. **Edit:** segments (trim sa speech end +0.25s) → captions via generator → concat
   FILTER (never demuxer copy) → music/SFX/loudnorm pass.
7. **QA:** dead-air scan + caption-sync + cropdetect + text audit (see VERIFIER) → Neil.
8. **Publish:** AI label ON sa Meta (lagi), organic muna, tapos ad. Log sa
   `workflows/ad_performance_ledger.md` (awareness + format tags).

## PACING & ENERGY (Neil feedback, 2026-07-23 — apply sa bawat susunod na ad)

- **Bakit mabagal si Marvin sa pilot:** ini-stretch ni Veo ang dialogue para punuin ang
  8s clip, AT walang frame-0 discipline ang prompt (may pre-speech beat + resolve tail).
- **PRIMARY FIX — ang Director AI Option B formula mismo** (`services/geminiService.ts`
  ~L2394, ang app's tuned talking-scene video prompt — HUWAG mag-imbento, ito na ang solved):
  - **FRAME 0 RULE:** "The avatar is ALREADY mid-syllable when the clip opens — mouth in
    motion, first word actively forming, eyes engaged with the lens. NO establishing pose,
    NO pre-speech beat, NO settling in. The clip ends on the next breath, NOT a post-speech
    resolve-state with closed mouth."
  - **Dialogue in quotes FIRST** sa prompt; ONE gentle camera move na nagsisimula sa unang
    pantig (slow push-in), walang handheld/rack focus; **END-CLEAN RULE** (walang fade/
    ghost sa huling segundo — ang cut ay sa editor).
  - Marvin delta: panatilihin ang EXPRESSION LOCK (mas mahigpit kaysa app "micro-expressions"
    — identity ang batas natin; ang emosyon ay DALA NG BOSES).
- **Fix 2 — word budget:** 16-20 words kada 8s clip (2 formula-lines pinagdugtong OK) para
  hindi na kailangan mag-stretch ni Veo.
- **Fix 3 — delivery direction:** "warm, upbeat, confident energy at a brisk natural pace,
  parang excited kuya na may sasabihing importante, never announcer-hype".
- **Fix 4 — STS stability:** `natural` (0.50) sa halip na `robust` para buhay ang prosody.
- **Fix 5 — edit speedup:** 1.05–1.12x (setpts+atempo) kapag kulang pa rin.
- **Tone guardrail (CMO):** mabilis OO, pero kuya-next-door confidence — hindi MrBeast
  shout. Ang believability ang differentiator vs malabanan swarm.

## FACE-SAFE TEXT ZONES (Neil, 2026-07-23)

Walang overlay text o caption na tatakip sa mukha ni Marvin — kailanman. Bago i-final
ang overlay/caption positions sa isang scene: i-frame-strip ang clip, tingnan kung saan
ang mukha sa buong duration (gumagalaw ang ulo), at ilagay ang text sa malinaw na safe
zone (default: captions y≈1267–1560 sa ilalim ng chest line ng close-up; hook stack sa
taas y≈170–540 kapag ang mukha ay nasa gitna/baba). Kapag close-up na halos puno ang
frame ang mukha, ILIPAT ang text kung saan readable — ang readability ng viewer ang
panalo, hindi ang template position. Idagdag sa VERIFIER: face-occlusion check sa
frame strips (`covers_face: false` ang standard, same sa render_audit).

## PRE-IMAGE QUALITY GATE (CMO + CD verify, bago ang plates)

Pagkatapos ng script + shot plan/storyboard at BAGO mag-generate ng kahit isang plate:
i-load ang `grifon-cmo` (offer/hook/awareness/tone check) at `grifon-creative-director`
(visual grammar, consistency locks, safe zones, format) para i-verify ang plano. Mas
mura ang paper fix kaysa regenerated plates/clips. Tapos Neil approval, saka plates.

## CAMERA ANGLES (expansion, gated)

- Proven: eye-level / slight-low / slight-high close-up (KM-002).
- **Side-angle talking = pwedeng subukan** gamit ang app FACE_TO_CAMERA rule: side BODY
  angle OK basta nakaharap sa camera ang mukha — BOTH eyes + mouth clearly visible
  (kailangan ng lip-sync). Full side profile na nakatalikod ang mukha = BANNED sa talking.
  Gate: ISANG test clip muna + Neil eyeball bago isama sa batch (camera-distance rule
  pa rin: close-up lagi).

## B-ROLL MOTION LANE — Kling 3.0 Omni (gated experiment)

Ang hands-only/work/truck b-roll (walang mukha = walang identity risk) ay pwedeng
pagalawin via **Kling O1 (`kling-video-o1`)** sa halip na still+push-in:
- **Lakas ng Omni:** multi-shot continuity (hanggang 6 camera cuts mula sa ISANG start
  image, stable ang environment) + **dual-frame interpolation** (start frame + end frame
  = kontrolado ang motion path).
- **Prompt grammar = ang app's tuned Kling formulas** (`geminiService.ts` ~L2376-2392):
  - Regular b-roll: buksan sa camera physics prose ("slow macro push-in" / "smooth slow
    lateral tracking"), walang handheld/jitter, negative tail ("Avoid low quality...
    morphing, melting... final second holds the shot clean").
  - Start→End frame morph (2 plates + transition, MrBeast/testimonial pattern): anchor
    transformation grammar — pangalanan ang shared anchor (kulay + silhouette), decisive
    physics verbs ("compresses into", "crystallizes into"), NEVER slow blend o amorphous
    intermediate; isalin ang transition effect sa anchor-bridge prose (Omni CANNOT do
    instant cuts — huwag isulat ang "snap/teleport/hard cut").
- **Talking scenes ay VEO PA RIN** (app routing: talking→Veo; Kling ang b-roll/cinematic).
- Gate: unang Omni b-roll test = 1 clip (5s std, Kling balance ni Neil) + eyeball bago
  maging regular lane. Ang mukha ni Marvin ay HINDI dadaan sa Kling hangga't walang
  hiwalay na identity test na pasado.

## COHERENCE QA (Neil, 2026-07-25 — script ↔ storyboard ↔ edit dapat magkakumplemento)

**North star ng bawat check: scroll-stop → curiosity → panoorin hanggang DULO.**
Hindi sapat na "tama" ang bawat piraso — dapat nag-uusap sila para sa retention.

**Stage 1 — PAPER QA (pagkatapos ng script + storyboard, BAGO ang plates):**
Bawat scene, sagutin:
1. **Line ↔ visual:** ang sinasabi ba ay pinapalakas ng nakikita? (hal. timba
   micro-scene VO = timba footage, hindi generic na tank shot)
2. **Line ↔ text layer:** ang overlay/word-card ba ay kumukumplemento (hindi
   inuulit verbatim, hindi kumokontra, hindi tumatakip sa mukha)?
3. **Angle ↔ beat intent:** tama ba ang camera angle sa emosyon ng beat (hal.
   slight-low = awtoridad sa epiphany; eye-level = kapwa-tao sa hook)?
4. **Open loop bawat beat:** may tanong bang iniiwan ang beat na sinasagot ng
   susunod? Kung sarado ang loop bago ang CTA, may exit point ang viewer — ayusin.
5. **Beat escalation:** may bago bang stimulus bawat 2-4s (cut, card, punch-in,
   SFX, location)? Puwang na walang bagong stimulus ≥4s = flag.

**Stage 2 — EDIT QA (sa assembled cut, dagdag sa VERIFIER sa ibaba):**
6. **Text timing:** bawat overlay/card lumalabas sa loob ng ±0.2s ng kaukulang
   salita sa speech map; animation duration hindi lumalagpas sa beat window.
7. **Music ↔ beat:** may audio event (SFX hit, music swell/drop, silence break)
   sa bawat beat transition; flash transitions may kasabay na whoosh/pop.
8. **SFX puwesto:** SFX sa transition/reveal/slam LANG — hindi random; walang
   SFX na tumatakip sa unang salita ng linya.
9. **Dead-air + pace:** VERIFIER dead-air scan PLUS: walang beat na lumalagpas
   sa storyboard target duration nang >15% (kung lumagpas, trim o speedup).
10. **Watch-to-end test (agent watch):** panoorin ang buong cut via
    render_audit/frame-strip at itanong: saan ako titigil mag-scroll? Bawat
    sagot na hindi "hindi ako titigil" = findings para kay Neil.

Ang Stage 1 ay gate bago ang PRE-IMAGE QUALITY GATE; ang Stage 2 ay kasama ng
VERIFIER run. Parehong machine-triage lang — si Neil pa rin ang final na mata.

## B-ROLL ROUTING (Neil, 2026-07-25 — galing sa inspiration, pero tamang lane ang recreation)

Kapag may b-roll ang inspiration ad na gusto nating i-recreate, itala muna sa
autopsy KUNG ANO ito per beat (see viral-autopsy camera/b-roll capture), tapos
i-route ang paggawa:

| Klase ng b-roll sa inspiration | Recreation lane | Gastos |
|---|---|---|
| UGC/live-action feel (kamay, produkto, lugar, aksyon) | **codex-image still** (CD nagdi-design pasok sa script + brand/niche) + FFmpeg motion (push-in/punch-in) | ~$0 |
| Motion graphics: text animation, UI cards, charts, count-ups, logo pops | **Hyperframes HTML** — HUWAG mag-generate ng image/video kung kaya ng HTML; deterministic pa | $0 |
| Combo (image na kailangang gumalaw lampas sa push-in, image-in-graphic, phone-frame) | **codex-image still + Hyperframes composite** (image slot sa HTML composition) | ~$0 |
| Totoong generative motion lang ang kaya (physics, morph, subject motion) | Kling O1 / Omni — GATED, huling opsyon, Neil approval + budget cap | $$ |

Ang CD (grifon-creative-director) ang tumitingin kung ang na-design na b-roll ay
pasok sa script line, brand, at niche ng gagamitan — hindi generic stock feel.

## VERIFIER (machine QA gates bago kay Neil)

Bawat assembled cut, bago i-present:
1. **Dead-air scan:** silencedetect sa final mix; FLAG bawat ≥0.45s na patlang sa loob/
   dulo ng talking segments (liban sa sadyang beat pagkatapos ng hook).
2. **Caption-sync check:** bawat caption chunk window vs speech intervals ng map —
   FLAG ang chunk na nagsisimula/tumatagal sa loob ng silence interval.
3. **Letterbox check:** `cropdetect` — dapat full-bleed 1080×1920 (see LESSONS #2).
4. **Text integrity:** frame-strip extraction + eyeball ng agent sa bawat overlay/caption
   text (letter-perfect, walang clipping); `tools/render_audit.mjs` para sa Gemini pass
   kapag may numbers/presyo.
5. Machine pass ≠ approval — si Neil pa rin ang huling gate (test-3 lesson: pumasa sa
   machine, bagsak sa mata).

## LESSONS (huwag nang ulitin — pinagdanasan lahat sa KM-002)

1. **RAI name filter:** BAWAL ang pangalan ("Kuya Marvin") sa Veo-spoken dialogue —
   hinaharang ng real-person filter. Attribution line = end-card VO (clone TTS) + nakasulat.
2. **Letterbox:** 2:3 plates (1024×1536) → nile-letterbox ni Veo sa 9:16. Edit fix:
   `crop=908:1614:86:153,scale=1080:1920`. O i-pre-crop ang plate sa 864×1536 (9:16)
   bago i-Veo (ilagay ang mahalagang background malapit sa gitna).
3. **Concat:** laging concat FILTER na may isang re-encode; ang demuxer `-c copy` ay
   nagpuputol ng DTS → black frames.
4. **Hook scene = overlay text LANG, walang karaoke captions** (attention war).
   Captions magsisimula sa scene 2.
5. **Hyperframes width:** huwag mag-estimate ng per-word x positions — per-LINE/group
   na naka-center, o hayaan ang browser mag-layout. (Sa drawtext: `x=(w-text_w)/2`.)
6. **Hyperframes lint:** alisin ang mga font fallback na walang @font-face
   (Arial Narrow/Impact); `data-layout-allow-overlap` sa sinadyang tight leading.
7. **Transitions:** flash transition (0.07s, impact spec) pagkatapos ng hook + every
   2nd cut max 3 — KULANG ito sa pilot, idagdag sa batch.
8. **A/B na mura:** hook2 variant = re-render lang ng s1 (isang clip, ~$1), reuse
   s2–s6 → pangalawang creative para sa ad set.
9. **Re-arm sa bagong PC:** `scripts/restore-hyperframes.ps1` (kung 503 ang gyan.dev,
   BtbN GitHub build → `.tools/ffmpeg/`), `scripts/restore-codex.ps1`,
   `npx playwright install chromium`. Veo/ElevenLabs rigs: `.env` keys lang.
10. **Bash var scoping:** sa `A=x && cmd1 & cmd2 &` ang vars ay HINDI umaabot sa
    cmd2+ — ihiwalay ng `;` ang assignments bago mag-background ng jobs.
11. **Voice ID + costs:** clone `jL41fXY8JXGEarmJ5g3f`; buong ad ≈ $5–7 (Veo ~$1/clip
    + retries, ElevenLabs cents, plates/overlays/end card $0).
