# Independent review of the provisional clean music candidate

**TECHNICAL PASS / SONIC UNVERIFIED.** The current private outputs reproduce
the declared continuous clean-C excerpt, two authored fades and constant
normalization gain. This review does not establish the reference's exact
soundtrack, heard tempo, vocals, SFX, perceived quality or sonic fidelity. No
audio was heard, no provider was called, and no output/source was rerendered
or changed during this review.

## Source, recipe and actual PCM

I read `../audio.json`, `../audio-mix.mjs`, the normalization/verification and
negative-control receipts, `../qa/audio-readme.md`, and the private fixture
runner. I independently checked current hashes/byte counts, parsed the WAV
chunks, decoded the clean source at48kHz stereo, compared every premaster
sample with the specified excerpt/fades, compared master/preview PCM, and
metered/decoded AAC using the already-installed FFmpeg. All review commands
exited0. No broad build/test suites or mutation-based fixtures were repeated.

| Property | Independently checked result |
|---|---|
| Input | Registered Digital Clouds/C only; 3,232,566 bytes; SHA-256 `71cd4ea39edcc7532672bd97311abadfd318d00e7a828310a88b4f57fad9cd48`. |
| Continuous placement | Source sample1,387,440 through2,882,479 after resampling; **28.905–60.051666667s**, original1x rate, no splice. |
| Full PCM | Premaster and master each have **1,495,040 stereo frames at48kHz**, exactly31.146666667s. |
| Authored envelope | Linear0–2,880-frame opening taper; quadratic ending taper from1,335,734 to1,495,040. Maximum every-sample premaster error **2.9792e-8**. |
| Opening PCM | **355,555 frames**, exactly the raw24-bit data prefix of the full master;7.407395833s,4.17microseconds short of222 native video frames. |
| Master gain | Least-squares constant gain **-3.780000009dB**. Maximum residual **1.1963e-7**, below four24-bit steps (`4.7684e-7`). Broad music dynamics are preserved after the authored fades. |
| Master metering | **-16.45LUFS / -3.04dBTP /9.30LU LRA**. |
| Full AAC | Strict decode exit0; **1,495,040 decoded stereo frames**; **-16.50LUFS / -3.15dBTP /9.20LU LRA**. |
| Opening AAC | Strict decode exit0; **356,352 decoded frames**, including797 padding frames beyond the PCM excerpt. It is not described as sample-exact AAC. |

The code reads one exact clean source and applies volume, sample trim, two
fades, normalization and encoding. It rejects a nonempty cue list or a rate
change. There is no reference-audio input, authored VO, added SFX, network or
provider generation in this recipe. “No authored VO” does not independently
prove that the source music contains no vocal sounds.

All five current output files match their receipt hashes and byte counts.
Decoded AAC is strongly correlated with its own intended PCM at the same
sample positions: full0.998501 and opening0.998478. This supports encoded
sequence provenance; it is not a listening or perceptual quality test.

The loudnorm diagnostic's `input_*` fields meter the actual file. Its
`output_*`/`normalization_type` fields describe the filter's hypothetical
processed null output, not a mutation of the candidate file. The final master
is independently proven linear by PCM comparison, regardless of those
meter-only dynamic-output fields. The11LU allowance avoided the initial
9LU-target compression; actual final LRA is9.30LU PCM/9.20LU AAC, not11LU.

## Negative controls and privacy correction

The saved fixture runner actually alters a recipe hash and a preview PCM byte,
then restores the original bytes in `finally`. It also renders the original
dynamic-normalization defect and substitutes its full/preview pair before
verification. The receipts record all three expected rejections and a
restored final verification. I did not replay those mutations. I independently
read the preserved original-compression WAV: its best constant-gain residual
is **0.027227**, decisively above the verifier's four24-bit-step bound. The
gain check therefore rejects the real original defect, rather than relying
only on a status flag.

I found that the initial `assets/audio/` ignore did not cover the incidental
preserved audio files under `qa/pilot-failed-review-2/assets/audio/`. Root
corrected it to `**/assets/audio/`, preserving bytes. `git check-ignore -v`
now confirms both active and preserved master paths are ignored. The private
paired-reference MP4 is separately ignored under `.tmp/`. No outstanding
private-audio staging issue remains in those checked paths.

## Acceptance limit

The selection evidence remains provisional: C's28.905s opening had the
stronger measured slow-energy score, and C's **whole-track** periodicity was
closer to A. Those do not establish the selected excerpt's musical BPM,
melody/texture resemblance or full-film fitness. The exact-C reference claim
was not established by the earlier fingerprint review. Two authored fades
do not recreate the source's unknown effects or vocals.

The existing source register's historical Mixkit provenance is retained; no
fresh license or legal clearance was performed. Raw sources, standalone
mixes and controls stay private. This review approves the present candidate's
declared technical recipe only. Root's mix decision and any future mux need
their own actual-file evidence; no film/audio fidelity PASS follows here.

## Hash binding

| Reviewed file | SHA-256 |
|---|---|
| `../audio.json` | `7a1e2d4ba455d609d62403fafbf90eb98ade8c4bfe3c0c8dad8ccac46b4aa689` |
| `../audio-mix.mjs` | `de7e4b6becd986b99112396a7e60f96eeb8c030c03bb50ac3a9ed274085156cb` |
| `../qa/audio-verification.json` | `7869b51136b5aabd785301e39507883cc46f7737c970834a078424a98f82bc42` |
| `../qa/audio-negative-fixtures.json` | `585912c099cbc45f5bb48d25370120ea0af1810ed906284f833a9679b32e1cd5` |
| Private `mix-master.wav` | `cefa2112751c5c6181f8cef3b10af1a139721dfde94d5d8edcb1c12f99a6f296` |
| Private `mix-master.m4a` | `0358a2223f2bfe2c5a73aa60e07d99a8ca7b97746507f967c08d18edaa44b523` |
| Private `opening-preview.wav` | `3114ba6ad2e9bf379d9f2f0d1f92b8ed5f3fd2c63b8f18b3187fe32371c694ae` |
| Private `opening-preview.m4a` | `d6a694e3dfd600af37eb75938622b0242ba94e7a4128c7f72ab2b153e8763347` |

Independent additional spend: **US$0**.
