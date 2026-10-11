# Independent semantic-autopsy cross-check

2026-10-08. Verdict: **the one-run receipts reconcile, but the semantic response cannot establish reproduction timing, material choreography, sound identity or precise synchronization.** Keep it as a failed, hypothesis-grade autopsy. The independently decoded source map remains the visual authority. No raw result, canonical analyzer, production source, paid configuration or provider state was changed by this reviewer; no additional paid call or retry was made. Only this report is added.

Input binding: `reference/source-x.mp4`, SHA-256 `47c8bbc8e3d06953dd850500e4c7702ce690b3a4bc6708c4fc6a1f3d392df089`. Visual authority: [independent-shot-map.md](independent-shot-map.md), based on decoded exact source frames. Reference is synthetic authored motion/interface footage with no human subject; no popularity, conversion or winner evidence was supplied. This report neither claims direct hearing nor converts machine sound hypotheses into facts.

## Raw result, validation and cost

Independent read-only checks established:

- Raw response candidate text equals `raw-analysis.txt` after trimming; parsing that text produces exactly the `analysis` payload in `analysis.json`. There is no edited semantic payload presented as the raw result.
- Executing the actual JS canonical `validateSpecificity` in an isolated VM reproduces the recorded single failure: `why_it_works[1] evidence has no measured value`. Its synchronization evidence contains no numeric measurement, although the claim has a timestamp. The canonical analyzer and extracted validator hashes match the run receipt. This was an offline validator call, not another provider run. The existing JS validator accepts the `NO_VO` sentinel structurally; that acceptance does not establish the absence of speech.
- Raw provider usage equals the usage receipt. 4,339 input + 1,695 candidate + 1,985 thought = 8,019 total tokens. The 3,680 combined generated tokens match total minus input and candidate plus thought.
- Applying the **recorded** US$1.50/million input and US$9/million generated-token rates gives `(4339*1.5 + 3680*9)/1e6 = US$0.0396285`, equal to the receipt and below US$0.25. This is the documented token estimate, not an independently inspected invoice or a new pricing lookup.
- Recorded preflight input count 4,711 with maximum generated tokens 16,384 gives US$0.1545225. The broader 60,000-input cap plus 16,384-generated cap gives US$0.237456. Both arithmetic bounds match the receipts. Preflight and completed input counts differ; completed usage is correctly used for the reported completed estimate.
- Attempt ledger records one reserved/completed generation attempt, no retry, and failure status `COMPLETED_GENERIC_OUTPUT`; the request config records transport attempts 1. These records and inspected adapter bounds support the documented single-attempt scope. They do not independently inspect account-wide/provider billing history.
- The source's native AAC stream was supplied intact according to the request/upload bindings. Prompt usage details list TEXT 1,518 and VIDEO 2,821, totaling 4,339; there is no separate AUDIO entry. This neither proves that audio was ignored nor independently confirms that the model decoded it accurately. Sound confidence cannot be upgraded from that receipt.

The specificity gate failing is itself preserved evidence. Even a specificity pass would only check structure/numeric presence, not factual correctness or perfect audiovisual synchronization.

## Claims compared with the source

| Raw claim | Independent disposition |
|---|---|
| Duration30.7s | Incorrect. Video is932 frames at30000/1001 fps, extent31.097733s; native AAC/container31.146667s. Do not fit a recreation to30.7. |
| Text on frame1 = true; first text is `SHADERS IS NOW` | Frame1 claim is contradicted. First decoded frame is near-black; opening dot/character field is not readable hero copy. That phrase is the first readable hero, settling during the sphere reveal around1.2s. Keep the identity of the phrase; discard its frame1 timing. |
| Hook0.8-1.5 bubble, rotating blue-to-orange1.5-3.0 | Broad subject/order is shared. Exact phases are different: deformation into blue sphere begins frame26 /0.867533s; orange substitution frame57 /1.9019s; title/sphere pitch reverses into a hemisphere before ring cut frame82 /2.736067s. The generic description omits the reversal and cannot direct motion. |
| Reveal at1.0s by hard cut | Rough visibility estimate is plausible; `hard cut` does not describe the observed blurred pitch/zoom deformation into the blue sphere. Use the exact source phases. |
| Shot count24, median1s, shortest0.5s, longest8s | Shortest0.5s is contradicted by verified3-frame0.1001s geometric palette cuts and other0.2-0.3s substitutions. Count/median/longest have no timestamped segmentation convention and cannot be adopted. Palette changes, continuous effects and genuine cuts must be classified first. The sustained visible end lockup is roughly6s before its exit, followed by a black tail; a generic8s longest-shot statistic does not describe that sequence. |
| One-to-two cuts per second throughout | Not an adequate timing contract. Ring replacements occur at frames82,91,97,104,111,119,126,132; four later geometry palettes change every3-4 frames. Tempo/cut density varies substantially, followed by the long end hold. |
| Perfect synchronization with120 BPM; all hard cuts on beat | Unsupported; the response has no beat times, phase, residuals or measured tolerance. A free PCM periodicity check below supplies contrary evidence to simply fixing120 BPM, without authorizing another BPM as final. Do not warp the visual source timing to this statement. |
| Captions: plain, instant swap, height50%, swap interval1s | Contradicted or ambiguous. These are marketing headlines/component labels and interface text, not demonstrated speech captions. Source title pitches/foreshortens, `open source` has raised/glossy relief and constant placement across material changes, and the count uses a pastel lens/gradient. Approximate visible glyph heights are6-16% of frame height, not50%; if50% meant vertical location, it is mislabeled and still fails for the lower sphere title. There is no uniform1s copy-swap rule. Mixed case and broadly listed colors are shared observations only. |
| Glitches at0.0,0.06,0.11,0.20s; zoom/pan0.17s | Do not use these as exact cues. The response's units literally mean60,110,200 and170 milliseconds. Source is near-black through roughly0.2s; later obvious transition anchors include4.605-4.838 flare,8.509-8.609 overlap,18.051-18.252 spin,20.287 brief tearing and21.221-21.355 horizontal erase. The decimals may be notation errors, but silently converting0.06 to6s or0.17 to17s would manufacture corrected evidence. |
| `200+ COMPONENTS` at10.0s and within the first10s | The phrase is real, but the within10s assertion is wrong. It first becomes readable in the growing lens near frame306 /10.2102s, with full-field count composition from frame307 /10.243567s. |
| UI demo at17.0s | Shared approximate observation. Exact desktop editor starts frame496 /16.549867s, responsive reflow17.150-17.284, mobile preview until18.051, spin transition then alternative particle hero18.252-18.919, and binary editor from18.919. Generic `UI demo` misses this sequence. |
| CTA begins22s and holds to final frame | Approximate end-logo timing is shared; final-frame hold is false. It is a small brand lockup, with no visible explicit action/URL in that end field. It recedes/fades from27.828 to28.462, followed by black through the video end. Do not remove the exit/black tail or invent a CTA from this label. |
| Storytelling: feature showcase; abstract motion then editor then logo | Valid coarse classification/order, not an approved storyboard or beat schedule. Its3-9s interval blends fixed-ring montage, relief-copy hold, abstract micro-cuts and component grid; its21-30s outro blends glitch, black pause, logo fade/hold/exit and black tail. Those distinctions are necessary for close recreation. |
| High novelty maintains engagement; perfect sensory loop; explanatory weakness | Unsupported causal/audience judgments. No retention, conversion, viewer comprehension or listening evidence is provided. Visible material variety alone can be retained as description. |
| Realism verdict `real-human` because graphics are professional | Inapplicable and unsafe for pattern counting. There is no human performance. Professionally authored graphics do not establish real-human source authenticity, and their synthetic appearance also does not prove generative AI. Treat human believability as N/A and this source as authored synthetic motion/interface imagery, without editing the raw enum/schema. No human-believability corroboration count is earned. |

Usable shared visual observations are limited to the abstract/digital showcase register, dot/glitch opener, blue/orange glass-like sphere, repeated diverse material surfaces, component catalog/count, editor demonstrations and final logo field. Their exact geometry, relief, chronology, framing, motion and cuts must come from the source map. Sound hypotheses are assessed separately below.

## Sound fields: LOW confidence / PENDING

`NO_VO`, electronic house,120 BPM, static buzz, shutter click, vinyl scratch/beat drop, zero silences and perfect sync are machine-only hypotheses. No independently heard transcript exists. Silence cannot be inferred from a black frame, nor can audio identity be inferred from a visible glitch/cursor/sphere. A low-level transient near a time would not prove that the event is a shutter, scratch or deliberate SFX rather than percussion/music.

The suspicious labels include shutter0.8s, static0.06s and scratch/drop0.10s. Preserve their literal values in the failed raw response. Ask an eventual narrow audio analysis or direct listener to resolve units and actual event onset/duration, rather than interpreting them as6/10s.

### Free measurement performed

One offline FFmpeg decode of the source audio to mono float PCM at22,050Hz succeeded, producing686,784 samples /31.1466667s. No playback or semantic classifier was used. At hop220 samples (~9.98ms),512-sample windows measured RMS and first-difference RMS; its positive envelope difference supplied a coarse high-frequency onset proxy. Normalized autocorrelation used the0.2-21.2s visual-active range, avoiding a large end-tail change.

Strongest local periodicity peak in the tested0.25-1.25s range was lag46 /0.458957s, equivalent to130.73 cycles/minute, correlation0.553. Related peaks appeared at0.688435s (0.493) and0.927891s (0.446). Near120 BPM, lag50 /0.498866s had correlation-0.056; neighboring lags49 and51 were likewise weak/negative. **This contradicts using120 BPM as an established measurement. It is not a final130.73 BPM beat verdict.** Hop quantization, harmonic/subdivision ambiguity, SFX, rhythm accents and the simple energy proxy require refinement. Selected strong proxy events include11.903,12.601,13.060,14.896,16.512,16.742,18.129,18.588 and20.434s; these are measured envelope changes, not named SFX or proven beat contacts.

The measurement JSON is scratch evidence at `.tmp/grifon-reference-review/audio-onset-proxy.json`; its parameters and key values are preserved here. This measurement does not show absence of speech, genre, musical meter, or perfect cut alignment.

### What a free follow-up can establish

Use decoded PCM with its actual sample timeline to compute a multiband STFT spectral-flux onset envelope (low/mid/high bands), with a declared window/hop and threshold. Refine periodicity by autocorrelation and fitting beat-phase candidates across several intervals; retain half/double-tempo alternatives. Save sample-indexed onsets and the estimated grid with uncertainty. Then compare the **independently measured** visual cut/reveal contacts against that grid, reporting each offset and aggregate distribution. This can support `periodic accents around X`, `these contacts are within Y ms` and structural loudness/fade/silence findings at stated thresholds. It cannot establish genre/SFX identity/meaning or blanket perfect synchronization, and it must not call all onset peaks beats.

For silence, use explicit full-band RMS/peak thresholds and duration (rather than visual black), distinguishing below-threshold intervals from semantic quiet. For suspected SFX, inspect spectrogram and envelope changes at the proposed times and surrounding context; energy/spectrum can narrow candidates but cannot independently name a sound. Speech absence still requires hearing or an explicitly qualified audio-semantic result. Original AAC/PCM remains analysis input only; this report authorizes no soundtrack reuse or rights transfer.

### Narrow unresolved audio questions

If the owner obtains a separately approved audio-only analysis, request only: speech present/absent with uncertainty and any verbatim speech spans; music tempo candidates with beat timestamps/phase and half/double alternatives; each confidently audible discrete event with onset and duration expressed in literal decimal seconds; whether events are added SFX or indistinguishable from track percussion; intro/drop/outro/fade/quiet spans; confidence and unresolved items. Supply the unchanged exact native audio and measured duration, and explicitly flag the earlier0.06/0.10 notation and120 BPM claim as hypotheses to test. Do not request another broad marketing autopsy or accept visual events as evidence for sonic labels. No such call is authorized or executed by this report.

## Snapshot bindings

| Inspected input/evidence | SHA-256 |
|---|---|
| `reference/source-x.mp4` | `47c8bbc8e3d06953dd850500e4c7702ce690b3a4bc6708c4fc6a1f3d392df089` |
| `reference/autopsy/raw-response.json` | `006fe89249c6e1b0f5507cc27961a94b59cfc10c9815cd41b7c8c7a2e8421e82` |
| `reference/autopsy/raw-analysis.txt` | `8633e46bb2170917bc535953e1dc5d33eafc1f10e424539bc1f60ff38a73c4fa` |
| `reference/autopsy/analysis.json` | `90d88f8cc448473a203a13f98ef3b4533030c2b315f358c6d812d1f7d069c60a` |
| `reference/autopsy/specificity-result.json` | `cc89153f5e7865b6b1adcfe86b2397575a1c02f5da58b55c948845d652313032` |
| `reference/autopsy/usage-cost-receipt.json` | `50bc531ac694609c4773f7fc4ff85c6adb34ed78b3e80fdb82c02bfa6c3101f2` |
| `reference/autopsy/attempt-ledger.json` | `303435e082039aaa7bb0c54bbb35f0d0ec4550b1f5a585a92d1c515e1300ef71` |
| `reference/autopsy/request-receipt.json` | `0ac90a323936a78b8bb477e29e274a2ce06024f03e45f380b31f8934488837e1` |
| `reference/autopsy/upload-receipt.json` | `f621b0340dd3aa7ccda6c88f932c7ff7913aa78e1d6000cce7a83857b4542aea` |
| Canonical `tools/analyze_video.mjs` | `04e3002f3583071de59b0050e5d83111b6f1a6acf176d2be0700fa0a51d93d30` |
| Exact extracted JS specificity-function source slice | `c1c3b775069688396a63238b695993673d38c801fa049dc7594eb4b8b4672261` |

No recreation pilot is reviewed here. Use source timings/material choreography for production; retain unsupported audio fields as LOW/PENDING until actual audio evidence addresses them. This failed single-reference result does not increment patterns or propose tuned changes.
