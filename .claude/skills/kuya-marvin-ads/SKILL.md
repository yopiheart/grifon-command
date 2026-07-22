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
  8s clip. Ang 7-12 word line sa 8s ≈ 1.4 words/sec (natural Taglish ≈ 2.5 wps).
- **Fix 1 — word budget:** sa 8s clip, **16-20 words ang linya** (hindi 7-12; ang 7-12/line
  ay app rule para sa VARIABLE duration na hindi natin magagamit — lite@1080p ay 8s lang).
  Puwedeng 2 pinagdugtong na formula-lines sa isang clip.
- **Fix 2 — delivery direction sa Veo prompt:** palitan ang "calm and direct" ng
  "speaks with warm, upbeat, confident energy at a brisk natural pace — parang excited
  kuya na may sasabihing importante, never announcer-hype" + panatilihin ang EXPRESSION
  LOCK (ang emosyon ay DALA NG BOSES, hindi ng mukha — hindi nasisira ang identity).
- **Fix 3 — STS stability:** `natural` (0.50/0.75) sa halip na `robust` para hindi
  flat ang prosody. Robust = pinaka-consistent timbre pero pinapatay ang energy.
- **Fix 4 — edit speedup:** 1.05–1.12x global (setpts + atempo) kapag kulang pa rin
  ang bilis; MrBeast-standard trick, invisible sa viewer.
- **Tone guardrail (CMO):** mabilis OO, pero kuya-next-door confidence pa rin ang tono —
  hindi MrBeast shout. Ang believability ang differentiator vs malabanan swarm.

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
