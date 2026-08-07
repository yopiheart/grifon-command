# The Taglish Model — a POSITIVE model of how Filipinos actually talk (2026)

> **Why this file exists.** Neil, session 9: *"its time for you to learn taglish na
> ginagamit ngayon 2026 na uso at popular na madaling intindihin… mag research at
> maghanap ng sources."*
>
> Everything we had was a **blacklist** — [`taglish-voice.md`](../.claude/skills/_shared/taglish-voice.md)
> prose plus `lint-voice.mjs` word rules — and **every entry in it was added after Neil
> caught it in live copy.** A blacklist is structurally always one incident behind: the
> next slop word is a word nobody has written yet. This file is the other half — the
> **generative** model that predicts a correct sentence instead of banning a wrong one.
>
> **Scope:** this file explains *how the language works*. `taglish-voice.md` remains the
> **voice spec** (Neil's register, tone, typography) and still wins on any conflict. ⛔ The
> TUNED prompts in `api/_lib/prompts.ts` / `services/geminiService.ts` are NOT in scope.

---

## 0. The one-paragraph version

Taglish is not "Tagalog and English mixed at some ratio." It is **Tagalog grammar with
English words dropped into it.** Tagalog supplies the frame — verbs, affixes, pronouns,
connectors, particles. English supplies content nouns and borrowed verb roots. Get the
frame right and the ratio takes care of itself, which is why chasing a percentage never
worked. Get the frame backwards — English sentence with Tagalog sprinkled in — and you
have written **Konyo**, which Filipinos hear as a class joke.

---

## 1. THE GENERATIVE RULE — Matrix Language Frame

The finding that makes this a model instead of a list. Linguistics calls it the **Matrix
Language Frame**: in code-switching, one language supplies the grammatical structure (the
*matrix*), the other supplies inserted items (the *embedded* language).

For Taglish, Wikipedia states it plainly: Tagalog/Filipino is the **substratum** and
English the **superstratum** — Taglish "follow[s] the rules of Tagalog grammar with
Tagalog syntax and morphology, but … occasionally employs English nouns and verbs in
place of their Tagalog counterparts."

**This is Neil's LANGUAGE LOCK rule #1 ("Tagalog ang FRAME"), independently confirmed.**
He derived it from ear; the literature derives it from structure. Same rule.

### The inverse has a name, and it is the failure mode

Flip the matrix — English frame, Tagalog inserted — and you get **Konyo English**
("Coño English"): *"English is the substratum and Tagalog/Filipino is the superstratum."*
Its signature constructions are `make` + Tagalog verb root (*make kulit*, *make tusok-tusok*),
`like so` + Tagalog adjective, and Tagalog interjections bolted onto English clauses.

Now re-read the **"Bad"** examples already sitting in `taglish-voice.md`:

| Flagged as "Bad" (2026-07-20) | What it structurally is |
|---|---|
| "Bro, the concept ay maganda pero the execution ay medyo safe." | English matrix + Tagalog `ay`/`pero` inserted = **Konyo** |
| "Mas better kung we use a mas direct na approach." | English clause wearing Tagalog `mas`/`na` = **Konyo** |
| "Ang recommendation ko is to change yung headline." | Tagalog opens, English verb phrase takes the frame = **Konyo** |

Neil's ear had already isolated the exact category. It just had no name, so it could only
be caught one sentence at a time.

### 🔍 THE TEST — use this before any word-level judgment

> **Which language is holding the sentence together?**
>
> Strip out every English word. If a Tagalog sentence skeleton remains (verb + affix +
> pronoun + particle), the frame is correct. If what remains is rubble — stray `ay`, `na`,
> `mas`, `yung` with no Tagalog verb — the frame is English and the line is Konyo.
> **Rewrite the frame, do not swap words.**

This catches sentences nobody has written yet. That is the whole point.

---

## 2. THE AFFIX MACHINE — why `i-confirm` beats `kumpirmahin`

The productive engine of Taglish: **any English verb root can be borrowed by attaching
Tagalog verbal morphology.** Documented pattern — prefixes/infixes plus reduplication of
the root's first sound, with English spelling retained: `drive` → `magda-drive`,
`sweat` → `nagse-sweat ako`, `Internet` → `nag-Internet`.

| Affix | Sense | Live examples |
|---|---|---|
| `i-` | do it to the thing (imperative/goal-focus) | i-check, i-confirm, i-save, i-book, i-cancel |
| `mag-` / `nag-` | actor does / did | mag-book, mag-apply, nag-message, nag-order |
| `na-` | happened / got done (often unplanned) | na-service, na-approve, na-cancel, na-book |
| `ma-` | able to / will manage to | ma-check, ma-deliver, ma-schedule |
| `-in` (suffix) | act on the object | i-check natin → checkin *(rare in copy; prefer `i-`)* |
| CV- reduplication | ongoing / future | che-check, ni-nego-negotiate, magbu-book |

**The consequence is the important part.** Because this machine exists, **you never need
a deep-Tagalog verb.** Every one of the "manual-Tagalog" offenders Neil has caught is a
case of someone reaching for a dictionary verb when the affix machine was right there:

| Manual-Tagalog reached for | The machine's answer | Already in the blacklist? |
|---|---|---|
| kumpirmahin | **i-confirm** | yes — caught 2026-08-02 |
| naserbisyuhan | **na-service** | yes — caught 2026-08-02 |
| ipatama | **i-correct** | yes — caught 2026-08-02 |
| naitatala | **naka-save** | yes — caught 2026-08-02 |
| isinasagawa | **ginagawa** *(plain Tagalog also fine)* | yes |

**Five separate incidents, one mechanism.** The blacklist recorded five words; the model
explains why there will always be a sixth, and how to not write it.

⚠️ **The machine has a limit — don't over-fire it.** `i-` + an English word Filipinos
*don't* actually borrow sounds as artificial as deep Tagalog (`i-utilize`, `i-facilitate`).
Rule of thumb: if you have not *heard* the borrowed verb, use plain Tagalog instead. The
question is never "which language" — it is **"which word does a person say out loud."**

---

## 3. THE PARTICLE LAYER — the difference between spoken and written-by-a-machine

This is the half the blacklist never modelled at all, and probably the single biggest
lever on "sounds like a real person."

Tagalog carries a set of **enclitic particles** that do pragmatic work English does with
intonation: softening, hedging, signalling shared knowledge, marking surprise, mitigating
a criticism or a request. Reference inventory: *na, pa, man, nga, din/rin, lang, naman,
daw/raw, po/ho, ba, pala, kaya, muna, tuloy, kasi, yata, sana*.

| Particle | Pragmatic work | Copy example |
|---|---|---|
| `naman` | softens, mildly contrasts, takes the edge off | "Okay naman yung price." |
| `lang` | minimises, makes a thing feel small/easy | "One call lang, sagot na namin." |
| `na` | already / by now — signals progress | "Ayos na yan." |
| `pa` | still / yet — signals incompleteness | "Hindi pa late." |
| `muna` | first, for now — softens a delay or a step | "I-check muna namin." |
| `kasi` | because — explains, sounds conversational | "Kasi madalas, hindi yan barado." |
| `pala` | realisation / new information | "Ay, malapit ka pala." |
| `nga` | confirms, gently insists | "Tama nga sya." |
| `daw/raw` | reported speech — distances the claim | "Mabilis daw kayo." |
| `sana` | wish/hope — softens a request | "Sana bukas pwede." |
| `ba` | question marker — makes a question sound spoken | "Barado ba talaga?" |
| `po` | respect — the politeness dial (see §6) | "Opo, meron po." |

### The diagnostic worth remembering

**Manual-Tagalog is often a *missing-particle* problem, not a wrong-word problem.**
Machine-written Filipino strips particles because they translate to nothing in English —
so the output is grammatically correct and audibly dead. Adding one particle usually does
more than swapping three words.

> "Hindi barado ang inyong tangke." → dead, correct, manual
> "**Hindi naman** barado yung tank nyo." → a person said that

Compare the KM-003 hook that `taglish-voice.md` holds up as the standard —
*"Kapag nagbubuhos ka **na** ng timba para **lang** bumaba, hindi **na** yan barado."*
Pure Tagalog, zero English, **98.5% retention at 0:03**. It works because it is *dense
with particles* (`na`, `lang`, `na`) — spoken rhythm, not vocabulary. This model explains
why that line passes while a "more English" line can still fail.

---

## 4. THE CORE — the frame's actual vocabulary

The words that must be **Tagalog** because they *are* the frame.

**Function words.** The highest-frequency items in the language — `ang`, `ng`, `sa`,
`ako`, `hindi`, `at`, `na`, `si` — appear in roughly **half of all spoken sentences**, and
the 100 most common words cover about half of all speech.

**Connectors** (the frame's joints — never English these):
`pero` · `kasi` · `kaya` · `kung` · `tapos` · `para` · `pag` · `habang` · `kahit` · `basta`

**Pronouns / demonstratives:**
`ako` · `ikaw/ka` · `sya` · `kami` · `tayo` · `kayo` · `sila` · `yung` · `yan` · `to` · `dito` · `doon`

**Everyday verbs & modals:**
`gusto` · `kailangan` · `pwede` · `meron/may` · `wala` · `alam` · `gawin` · `kunin` · `tingnan` · `sabihin`

**Everyday adjectives:**
`maganda` · `okay` · `mali` · `tama` · `mabilis` · `mura` · `mahal` · `malaki` · `maliit` · `bago` · `luma`

> Spelling follows Neil's typography rule — how Filipinos actually type: `yung`, `sya`,
> `nyo`, `yan`, `to`, `wag`, `di`, `sayo`. No apostrophes.

---

## 5. THE ENGLISH SIDE — what genuinely stays English

Borrowing is "a particularly productive means of lexical innovation" in Philippine English
because English is in constant contact with the vernaculars. These are not lapses; they
are the language.

- **Tech / business:** online, order, book, schedule, budget, price, discount, promo, receipt, delivery, load, data, message, update, form, page, website, link
- **Household / trade objects:** aircon, freezer, truck, septic tank, tank, mall, driver, cellphone, sim, generator
- **Time & measure:** 15 days, 48 hours, 3 months, 8AM, ₱4,900 *(carve-out (b) — the **whole phrase** is English, not just the numeral)*
- **Institutions & brands:** SEC, BIR, DENR, Meta, GCash, Oceanides, Grifon

**Test:** would a tricycle driver say the English word without thinking? Then it is
English. `tangke ng dumi` fails this test; `septic tank` passes it.

---

## 6. REGISTER BY SURFACE — and the market data behind it

Neil's STEP 0a table said register is decided per surface. The market data agrees:

- Ads using **appropriate Taglish** reportedly showed **27% higher engagement** than pure
  English or pure Filipino (2023 Nielsen Digital Consumer Survey, as cited by a marketing
  blog). ⚠️ **Second-hand citation — we could not reach the primary Nielsen source.
  Treat the direction as supported and the number as unverified.**
- **Platform shifts the mix:** TikTok skews more Tagalog; LinkedIn and B2B skew English.
- Pure English "risks sounding too formal or detached"; pure/deep Tagalog "might lose
  younger, urban audiences."

That is Neil's table, arrived at independently. It stands — this is corroboration, not a
change.

**`po` / `opo` — the politeness dial.** Not in the old spec, and it matters for Oceanides:
`po` marks respect to elders/customers. For Kuya Marvin (tradesman → homeowner) light `po`
reads respectful; stacked `po` in every clause reads call-center, which the tone rules
already ban. **One `po` per few lines, not per sentence.**

---

## 7. ⚠️ THE SLANG TRAP — "modern" is not "Gen Z"

The obvious way to answer "modern Taglish 2026" is to import current slang: `petmalu`
(reversed *malupit*), `lodi` (reversed *idol*), `sana all`, `bet`, `slay`, `sheesh`,
`aura`. Syllable reversal plus English fusion is genuinely how new Filipino slang forms,
and TikTok/Twitter drive it.

**Do not put it in Grifon or Oceanides copy.** Three reasons:

1. **Wrong audience.** The avatars are Bryan/Olivia — SMB owners, and Oceanides homeowners
   with septic tanks. Not teenagers. Slang aimed past your buyer reads as pandering.
2. **Slang dates fastest of anything in the language** — it is the one layer guaranteed to
   be wrong by the time a landing page has been up a year. The frame, the affixes and the
   particles are stable; the slang is not.
3. **It collides with the standing tone rule** — "kalmadong eksperto, hindi masiglang
   salesman." In categories with shame or scam-risk (septic, debt, health), youth slang
   destroys authority.

**What "modern" actually means here:** contemporary *spelling* (`nyo`, `yung`, `sya`),
contemporary *borrowings* (`online`, `book`, `budget`, `message`), and the *absence* of
textbook Tagalog. Modern = **not dated**, not **young**.

Neil's own already-approved list is the correct casual register and needs no slang
injection: *goods, swak, sablay, medyo, parang, mukhang, mas okay, gets, kaso, pero.*

---

## 8. HOW TO USE THIS

Writing order — frame first, words last. This inverts how the agent kept failing.

1. **STEP 0** (`taglish-voice.md`) — is this surface Taglish at all? English → write full English, stop.
2. **Set the frame.** Tagalog verb + affix + pronoun + connector. Say the sentence out loud in your head *before* choosing any noun.
3. **Insert English content words** — the §5 inventory. Never English connectors, never English pronouns.
4. **Borrow verbs with the affix machine** (§2) instead of reaching for a dictionary Tagalog verb.
5. **Add particles** (§3). If a line reads flat and correct, it is missing a particle.
6. **Run the Konyo test** (§1). Strip the English — is there a Tagalog skeleton left?
7. **Final ear test** (unchanged): *"Sound like a real Filipino vlog, not a manual."*

### Proposed follow-up — class-based lint rules (NOT yet built)

`lint-voice.mjs` is a word blacklist by design ("deliberately DUMB"). This model enables
**class** rules, which is the shape its own 2026-08-06 comment already asked for. Candidates:

- **Konyo detector:** `ang \w+ (is|are|was|will)`, `(the|my|your) \w+ ay\b`, `mas better`, `make + Tagalog root`.
- **Missing-particle warning:** customer-facing Tagalog sentence over ~8 words containing zero particles from the §3 inventory — a *warning*, not a failure, since it is heuristic.
- **Deep-verb heuristic:** ≥4-syllable Tagalog verb with `-in`/`-han`/`-an` where an affix-machine form exists.

⚠️ Each of these can false-positive, and a noisy gate gets ignored — the same reader
failure as `loops.md` Tier 0b. **Ship them as warnings first, promote to failures only
after they have fired correctly on real copy.** Neil's ear stays the gate.

---

## Sources

**Structure & code-switching**
- [Taglish — Wikipedia](https://en.wikipedia.org/wiki/Taglish) — matrix/substratum, verb affixation, Coño English
- Bautista, *Tagalog-English Code Switching as a Mode of Discourse*, Asia Pacific Education Review (2004) — [ERIC EJ720543](https://eric.ed.gov/?id=EJ720543) · [PDF](https://files.eric.ed.gov/fulltext/EJ720543.pdf) · [Springer](https://link.springer.com/article/10.1007/BF03024960)
- [Conyo talk in the Philippines — Kahibalo Foundation](https://kahibalo.com/conyo-talk-philippines/) — Konyo prioritises English; `make` + Tagalog verb
- [Why Taglish Challenges Filipino-to-English Localization — VEQTA](https://veqta.com/the-code-switching-paradox-why-taglish-isnt-broken-english-but-a-localization-minefield/)

**Frequency & core vocabulary**
- [Top 1,000](https://www.tagalog.com/flashcards/top_one_thousand_words.php) / [Top 2,000 Tagalog Words](https://www.tagalog.com/flashcards/top_two_thousand_words.php) — frequency-ranked from 100+ hours of transcribed audio
- [Wiktionary: Frequency lists/Tagalog](https://en.wiktionary.org/wiki/Wiktionary:Frequency_lists/Tagalog)
- [100 Most Common Filipino Words You'll Hear Daily (2026) — Kaiwa](https://trykaiwa.com/blog/filipino-100-most-common-words-daily-2026)

**Particles**
- [Meanings of Tagalog Enclitic Particles — Learning Tagalog](https://learningtagalog.com/grammar/enclitic_words/meanings_of_enclitic_particles.html) (De Vos, *Essential Tagalog Grammar*, 2nd ed.) — particle inventory
- [Understanding the Role of Filipino Particles — Fluent Filipino](https://fluentfilipino.com/understanding-the-role-of-filipino-particles-adding-meaning-and-emphasis/)
- *A Pragmatic Analysis of Discourse Particles in Filipino* — [ERIC ED573079](https://files.eric.ed.gov/fulltext/ED573079.pdf) ⚠️ host unreachable at time of writing; listed for a later session

**Philippine English borrowing**
- [Introduction to Philippine English — OED](https://www.oed.com/discover/introduction-to-philippine-english/)
- [Philippine English vocabulary — Wikipedia](https://en.wikipedia.org/wiki/Philippine_English_vocabulary)

**Market / register**
- [Why Taglish Marketing Performs Better for Filipino Audiences — Thinkable Box](https://thinkablebox.com/why-taglish-marketing-performs-better-for-filipino-audiences/) — ⚠️ source of the second-hand Nielsen 27% figure
- [Taglish: The Linguistic Blend Shaping Modern Filipino Identity — GPI](https://www.globalizationpartners.com/2024/11/27/taglish-linguistic-blend-filipino-identity/)

**Slang (documented, then deliberately NOT adopted — §7)**
- [Filipino Gen Z Slang: Sana All and 19 More (2026) — Kaiwa](https://trykaiwa.com/blog/filipino-gen-z-slang-phrases-2026)
- [14 Filipino Gen Z Slang Words — Woke Waves](https://www.wokewaves.com/posts/filipino-gen-z-slang-phrases-guide)
- [Gen Z Slang in Tagalog — Talkpal](https://talkpal.ai/vocabulary/gen-z-slang-in-tagalog-language/)
