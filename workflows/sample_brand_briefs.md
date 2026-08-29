# Sample Brand Briefs — the exact composer input for the nine gallery samples

**Status:** Offer lines APPROVED by Neil 2026-08-29. Runs not yet fired.

**What this is:** the missing half of the sample batch. `c2fa9d6` (2026-08-27) committed
thirteen product photos for nine invented brands, but nothing anywhere in the repo says what
each brand *sells for* or *promises*. `NOW.md` carries the brand names and nothing more, so
every run so far would have had its offer improvised at the keyboard, which is the one thing
`director-smoke` exists to stop.

**What supersedes what.** [`sample_batch_test_spec.md`](sample_batch_test_spec.md) locks a
single brand (Hiraya Glow) across all runs. That is **dead** as of `c2fa9d6`: one product
across twelve tiles makes the eye read the PRODUCT, and the gallery exists to show what
separates the FORMATS. Its stated reason (that Higgsfield does the same) did not survive
checking. The per-brand plan in `NOW.md` is the live one. Everything else in the spec still
stands, including the rule below.

> **The agent never fires the paid runs.** Neil drives the producer; the agent grades.
> (`sample_batch_test_spec.md` §0, standing.)

---

## The composer fields

Three inputs, from [`LaunchScreen.tsx:697-711`](../components/OneShotAd/LaunchScreen.tsx#L697-L711):

| Field | Control |
|---|---|
| `// Your offer` | 3-row textarea, free text |
| `Brand name` | `MiniInput`, feeds Market Research |
| `Price` | `MiniInput`, feeds Market Research |

Vertical is `product` for all nine. Presenter is **Auto** for all seven runnable today: every
one of their uploads is hands-and-product only, so there is no face to mismatch against an
auto-cast avatar. (The two blocked runs are the opposite case — see the bottom section.)

### Run every one of them on `?osaEngine=producer`

Not just Pure Hype, which is the only reason `NOW.md` gives.

⚠ **An earlier version of this section said the producer flow is the ONLY path that stops
before spending. That was wrong** (corrected 2026-08-29 after Neil asked where the plan
screen went). The legacy path stops too, at
[`ReviewScreen`](../components/OneShotAd/ReviewScreen.tsx) — and shows *more*: script,
scene stills, spokesperson, cover frame, plus a Download Assets zip. The render starts only
when the user clicks Generate Video. So a free look before spending was never the
differentiator, and nobody should pick an engine for that reason.

The two real reasons to stay on producer for this batch:

1. **Per-scene REGENERATE at the storyboard gate** — image-only, and
   [`ProducerFlow.tsx:308`](../components/OneShotAd/ProducerFlow.tsx#L308) notes it is cheap
   because *"the cost gate hasn't fired yet"*. Fixing one bad scene without redoing the run
   is worth a lot across nine samples.
2. **`pure_hype` is invisible anywhere else.**

Running six on legacy and one on producer would also mix two orchestrators inside one
gallery. One engine, all seven, no switch mid-batch. The choice persists to `localStorage`.

**The two paths are different screens, not one screen with a lean variant.** Producer goes
LaunchScreen → Running → StoryboardGateScreen (181 lines: scene cards + approve) →
FirstCutScreen. Legacy goes LaunchScreen → research → the generation chain → ReviewScreen
(296 lines) → GenerateVideo. The sample MP4s are identical either way — the pre-video screen
does not touch the render — but **whoever produces the batch is not looking at the screen
real users get.** Walk the legacy path (drop `?osaEngine=producer`, or force it with
`?osaEngine=steps`) at least once per session to confirm ReviewScreen still works; that is
the surface Free sees before it is asked to upgrade.

Tier behaviour there, for reference — same screen, same button, label only
([`ReviewScreen.tsx:266-274`](../components/OneShotAd/ReviewScreen.tsx#L266-L274)): Free
without a credit reads `I-RENDER ANG VIDEO — STARTER ₱997`, Free holding a paid credit reads
`GAMIT ANG CREDIT MO`, and paid tiers read `GENERATE VIDEO NOW >`. Free additionally gets the
`1/1 FREE WORKFLOW USED · EXPORTS WATERMARKED` bridge panel above it.

Offer lines are **ad copy**, so they are Taglish per the language lock. No em dash, no
apostrophes in contractions, calm rather than salesy. Prices are ordinary Philippine SMB
prices, and each line carries one concrete, checkable detail (burn hours, glasses per pack,
battery life) rather than an adjective.

---

## The seven runnable today

| # | Format | `recipe id` | Brand | Price | Uploads |
|---|---|---|---|---|---|
| 1 | Unboxing | `unboxing` | Bukid Coffee | ₱280 | `bukid-hero.jpg` · `bukid-packaging.jpg` |
| 2 | Unboxing ASMR | `unboxing_asmr` | Silid Home | ₱390 | `silid-hero.jpg` · `silid-packaging.jpg` |
| 3 | Watch It Work | `demo` | Kislap | ₱185 | `kislap-hero.jpg` · `kislap-inuse.jpg` |
| 4 | Steps 1-2-3 | `tutorial` | Timpla | ₱320 | `timpla-hero.jpg` · `timpla-inuse.jpg` |
| 5 | Hype Drop | `hype_drop` | Tunog Audio | ₱1,290 | `tunog-hero.jpg` |
| 6 | Rapid Fire | `rapid_fire` | Lola Bising | ₱180 | `lolabising-hero.jpg` |
| 7 | Pure Hype | `pure_hype` | Hangin | ₱899 | `hangin-hero.jpg` |

The `recipe id` column is the key in `SAMPLES` and the basename the two output files must
carry, so run 3 produces `demo.mp4` and `demo-full.mp4`, not `watch-it-work.mp4`.

**Runs 1-4 and runs 5-7 do not look the same in the composer, and that is not a bug.**
Guided upload slots only render when `format === 'ugc_pro'`
([`LaunchScreen.tsx:360-364`](../components/OneShotAd/LaunchScreen.tsx#L360-L364)). The first
four recipes are `ugc_pro`, so each shows its own named slots — and `unboxing` marks
**Packaging required**, calling it "the co-star". The last three are `ugc` / `product_ugc`,
so they show no guided slots at all, just the one generic PRODUCT/ASSETS tile. Expect the
slot strip to disappear from run 5 onward.

All uploads live in `tests/fixtures/sample-batch/`, which a fresh lite clone does **not**
check out. Re-add it with the pattern below before any run.

### 1 · Bukid Coffee — Unboxing

- **Brand:** `Bukid Coffee` · **Price:** `₱280`
- **Offer:**
  > Barako na galing mismo sa bukid, 250g medium roast. ₱249 ngayong launch week, dating ₱280. Libreng padala sa unang 50.

### 2 · Silid Home — Unboxing ASMR

- **Brand:** `Silid Home` · **Price:** `₱390`
- **Offer:**
  > Sampaguita soy candle, 45 oras na sindi kada garapon. ₱390 ang isa, ₱690 kapag dalawa.

### 3 · Kislap — Watch It Work

- **Brand:** `Kislap` · **Price:** `₱185`
- **Offer:**
  > Mantsa sa uniform ng bata, alis sa isang spray. 500ml, ₱149 ngayong linggo, dating ₱185.

### 4 · Timpla — Steps 1-2-3

- **Brand:** `Timpla` · **Price:** `₱320`
- **Offer:**
  > Wintermelon milk tea sa bahay, 20 baso kada supot. ₱279 ang 500g, may kasamang panukat.

### 5 · Tunog Audio — Hype Drop

- **Brand:** `Tunog Audio` · **Price:** `₱1,290`
- **Offer:**
  > Earbuds na 30 oras bago mag-charge ulit. ₱990 sa launch, dating ₱1,290. May isang taong warranty.

### 6 · Lola Bising — Rapid Fire

- **Brand:** `Lola Bising` · **Price:** `₱180`
- **Offer:**
  > Chili garlic na luto sa maliit na batch, 220g. ₱180 ang garapon, ₱480 kapag tatlo.

### 7 · Hangin — Pure Hype

- **Brand:** `Hangin` · **Price:** `₱899`
- **Offer:**
  > Neck fan na tatlong oras sa isang charge. ₱749, pwedeng cash on delivery.

**Run this one last.** `pure_hype` is `producerOnly`, so the default legacy path hides it and
it needs `?osaEngine=producer` ([`OneShotAd/index.tsx:19-24`](../components/OneShotAd/index.tsx#L19-L24),
which also persists the choice to `localStorage`, so it survives a reload mid-run).
It is also the only `sfx_only` recipe, so it carries no voiceover and its offer copy reaches
the viewer as burned text rather than speech.

---

## The two still blocked

Neither can run today, and neither is blocked on a brief.

| Format | Brand | Price | Missing |
|---|---|---|---|
| Before & After | Buhok Lab | ₱450 | `buhok-before`, `buhok-after` |
| Try-On Reveal | Araw Wear | ₱1,150 | `arawwear-onbody` |

Both owe generated assets that must be chained with `codex-image --edit` off one base, or the
face drifts between the before and the after. Both also **upload the presenter by hand**
rather than running Auto: their storyboards put `referenceImage="avatar"` and the
before/after slot on the same scene, so an auto-cast face renders two different people inside
one ad. Neil rejected the current `before_after` sample outright — that cut is a placeholder
and gets re-shot, not patched.

---

## Before any run

```powershell
# BOTH of these are excluded from the lite clone's sparse checkout, and the
# config lives in .git/, which the defreezer eats — so this is per-machine.
# NOTE: from Git Bash, prefix MSYS_NO_PATHCONV=1 or the leading slash is
# rewritten to C:/Program Files/Git/... and the add silently does nothing.
git sparse-checkout add /tests/fixtures/sample-batch   # the hero photos
git sparse-checkout add /public/examples               # the upload guide images

.\scripts\restore-ffmpeg.ps1              # cutting the tile clips afterwards
.\scripts\enable-dev-unmetered-video.ps1  # then RESTART the dev server
```

⚠ **`public/examples` reads as a code bug and is not one.** Those 23 images are the
good/bad reference tiles beside every upload slot — the thing that tells a user what to
photograph. Missing locally, the modals render empty placeholder icons and look broken.
Nothing is wrong: Vercel builds from the full repo, so production has always had them.
Neil hit this on 2026-08-29 and reasonably read it as a regression.

**Restart the dev server after either pull.** Vite does not serve a file dropped into
`public/` after it started — it returns the SPA fallback `index.html`, so the image still
does not appear and the restart looks unnecessary. Verify with the content type, not the
status code: `curl -s -o /dev/null -w "%{content_type}" http://localhost:5173/examples/ex-product-handheld.png`
must print `image/png`. A `text/html` there is the fallback, i.e. still broken.

The unmeter flag matters more than it looks. Seven runs is seven video renders against an
**hourly limit of 5**, so renders 6 and 7 hit a 429 and a ~50 minute lockout; and seven
storyboards is 42+ scene images against the monthly image quota, which has been exhausted
mid-batch before (2026-06-21). The flag is local-only and never reaches Vercel.

**Each of the nine owes TWO files**, not one: the short muted tile loop `<recipe>.mp4` and the
full ad with audio `<recipe>-full.mp4`. A sample with no `full` shows no expand control at all.
Cut settings are printed by `restore-ffmpeg.ps1`.
