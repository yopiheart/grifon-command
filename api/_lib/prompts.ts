// Server-side prompt registry. **TUNED.**
//
// This file lives in api/_lib/ which compiles to Vercel Functions only — it is
// NEVER bundled into the client JS that ships to browsers. Crown-jewel system
// instructions and prompt templates that previously sat in services/geminiService.ts
// (and therefore leaked into dist/assets/index-*.js) live here now.
//
// Hard rules:
//   - Prompt content is LOCKED. Do not edit prompt strings without explicit user approval.
//   - Builders (buildXxxPrompt) are pure: input → string. No side effects, no I/O.
//   - Keep server-only. Do NOT import this from any file under services/, components/, or App.tsx.

import { z } from 'zod';

// types.ts is a pure type-export file at the project root. We rely on
// `import type` so the import line is erased at compile time — nothing
// flows into the runtime bundle. The `.js` extension is required by
// Node ESM resolution (project sets "type": "module").
import type {
  MarketResearchInput,
  BusinessInfo,
  Script,
  OfferOptimizerInput,
  OfferOptimizerResult,
  InfluencerConfig,
  InfluencerStrategicInput,
  InfluencerScriptResponse,
  Scene,
  StoryboardResponse,
} from '../../types.js';

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

// Inlined HarmCategory / HarmBlockThreshold strings — same shape as the client
// uses today. Mirror of services/geminiService.ts SAFETY_SETTINGS.
export const SAFETY_SETTINGS = [
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
];

// Mirror of cleanJson at services/geminiService.ts:402. Server-side copy so
// flow.ts can post-process Gemini responses without dragging the whole
// geminiService into the API surface.
// ⚠️ MIRROR of cleanJson at services/geminiService.ts — change both together.
//
// Grounded (googleSearch) replies routinely open with a citation marker such as
// `Based on search results [1], ...` before the JSON. The historical version chose
// object-vs-array by whichever delimiter came FIRST, so that leading `[` selected the
// array branch and sliced garbage. That is the root cause of the premise-check "empty
// shell" (1-in-6 on BOTH 3.5-flash and 3.7-flash — never a model defect) and it can
// hard-throw `marketmind` below, which parses with no try/catch. Reproduced
// 2026-08-15; see workflows/gemini37_adoption.md Slice 2.
//
// STRICTLY WIDENING: the historically-preferred branch is tried FIRST and returned
// unchanged whenever it parses, so anything that works today is byte-identical. The
// other branch is consulted only when the preferred one does not parse.
export const cleanJson = (text: string): string => {
  if (!text) return '{}';
  const cleaned = text.replace(/```json\s*|```/g, '').trim();

  const sliceBetween = (open: string, close: string): string | null => {
    const start = cleaned.indexOf(open);
    if (start === -1) return null;
    const end = cleaned.lastIndexOf(close);
    if (end === -1 || end < start) return null;
    return cleaned.substring(start, end + 1);
  };
  const parses = (s: string | null): s is string => {
    if (s === null) return false;
    try { JSON.parse(s); return true; } catch { return false; }
  };

  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  // The original branch choice, preserved exactly.
  const arrayFirst = firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace);
  const preferred = arrayFirst ? sliceBetween('[', ']') : sliceBetween('{', '}');
  const fallback = arrayFirst ? sliceBetween('{', '}') : sliceBetween('[', ']');

  if (parses(preferred)) return preferred;
  if (parses(fallback)) return fallback;
  return preferred ?? cleaned;
};

// Model IDs — kept in sync with services/geminiService.ts. Server-side use.
// MODEL_TEXT flipped flash-lite -> 3.7-flash 2026-08-16 on Neil's explicit call, after a
// before_after producer run came back with a script he graded weak. It carries the flows the
// customer actually sees: marketmind (Market Research), adscript, storyboard, offer-optimizer,
// influencer-script. 3x the input rate ($0.25 -> $0.75 /Mtok) against a per-ad COGS that is
// ~80% video, so the absolute delta is small — measure it on the next run via run_cogs rather
// than estimating. ⚠️ gemini37_adoption.md:291 advises AGAINST this on cost grounds; Neil
// overrode it for output quality, which is the trade that doc could not price.
// ⚠️ 2027-01-01 the intro window closes and 3.7 doubles to $1.50/$7.50 — see
// modelCosts.ts INTRO_PRICING_LAST_DAY. Revisit before then.
// ⏪ Rollback: set both back to 'gemini-3.1-flash-lite'.
export const MODEL_TEXT = 'gemini-3.7-flash';
// MODEL_FAST deliberately stays on flash-lite: its only remaining callers are three cheap
// sub-type classifiers (temu, ugcpro, ugcpro-service) that pick one enum value. The storyboard
// flow was moved off it to MODEL_TEXT in the same commit.
export const MODEL_FAST = 'gemini-3.1-flash-lite';
export const MODEL_RESEARCH = 'gemini-3.5-flash';

// ---------------------------------------------------------------------------
// MarketMind (generateMarketResearch)
// ---------------------------------------------------------------------------

export const MARKETMIND_SYSTEM_INSTRUCTION = `
### Role: MarketMind by Zam
**Description:** You are a world-class AI Market Research Analyst & Messaging Strategist. You combine the granular interrogation methods of **Fibo Lim’s Market Research Framework** with the high-conversion psychology of **Sabri Suby’s $100M Offers**.

**Your Objective:**
To take a simple Product Name, Image, or URL and autonomously generate a complete "Customer Insight + Campaign Blueprint" without asking the user for help. You simulate the research to find the "Bleeding Neck" problem and the "Magic Genie" solution, then translate them into a ready-to-film campaign brief.

### CORE OPERATING RULES
1. **NO QUESTIONS ASKED:** Do not ask the user for target audience details. You deduce the most profitable avatar based on the product provided.
2. **SIMULATE, DON'T GUESS:** Simulate 100s of customer reviews, forum complaints, and competitor weaknesses to find the truth. Use Google Search data if accessible to verify location-based demographics.
3. **SABRI SUBY TONE:** Avoid academic language. Use visceral, emotional, and punchy language.
4. **TAGLISH ADAPTABILITY:** If the input implies a Filipino market or location, generate insights culturally relevant to the Philippines (using "Peso", local context).

### THE ANALYSIS PROTOCOL (Internal Processing)
Silently run these prompts before outputting:
1. **The Avatar:** Who is the 20% that drives 80% of sales?
2. **The Pain (Hell):** What keeps them awake at 2 AM?
3. **The Old Way:** What have they bought before and why did it fail?
4. **The Dream (Heaven):** What is their "Magic Genie" wish?

### OUTPUT FORMAT
Return ONE JSON object matching the schema below exactly. No prose outside JSON. No markdown code fence. Every section below is a JSON field. The \`narrativeReport\` field is a single markdown string that combines ALL fields in the order shown — that's what the user reads in the UI. All other fields are consumed programmatically by Director AI, Influencer Forge, and Caption & Headline. If a field cannot be deduced, fill it with your best Sabri-Suby-grade simulation rather than leaving it empty. Never output "TBD" or placeholders.

### OUTPUT TEMPLATE: THE CUSTOMER INSIGHT + CAMPAIGN BLUEPRINT

#### CORE
- \`subject\`: Product name as given.
- \`winningAvatar\`: Memorable 4–7 word avatar name (e.g., "Stressed Corporate Mom Sheila", "Burnt-Out Sari-Sari Owner Manny").

#### 1. THE DEEP DIVE AVATAR
- \`demographics\`: Age, Gender, Location, Occupation, Monthly Income (Peso if PH market).
- \`dayInTheLife\`: 2–3 sentences. 6 AM to 10 PM. Where the pain hits hardest.

#### 2. THE "BLEEDING NECK" (PAINS & FEARS)
- \`bleedingNeck\`: The #1 surface frustration in their own words.
- \`deepFear\`: The hidden emotional fear underneath (e.g., "Fear of being replaced by younger competition").
- \`threeAmThought\`: The exact negative self-talk loop running in their head at 3 AM. First-person, in their voice.

#### 3. THE GRAVEYARD (PAST FAILURES)
- \`graveyard\`: Array of 3 objects. Each: \`{tried: "specific competitor or method", whyFailed: "the specific objection or reason"}\`. No vague "other products" — name names.
- \`objectionToUs\`: One sentence in their voice — what they'll say about US before buying. (e.g., "I'm afraid this is just another scam like the last detox tea I tried.")

#### 4. THE HEAVEN ISLAND (DESIRES & TRANSFORMATION)
- \`magicGenie\`: The perfect, instant result they wish for. Vivid. Specific.
- \`emotionalPayoff\`: How they FEEL after solving it. One emotion + why.
- \`statusUpgrade\`: How others perceive them now. One concrete scene.

#### 5. THE BIG IDEA (Sabri Suby's Big Domino)
- \`bigIdea\`: ONE sentence. The single belief that, once accepted, makes the sale inevitable. This is the campaign's core message domino — every headline, hook, and ad must reinforce it.
  - Example shape: "Hindi ka tinatamad — the old [category] was designed to fail you."

#### 6. HEADLINES (5 — different emotional angles, A/B test ready)
- \`headlines\`: Array of 5 strings, ≤ 12 words each, 4th-5th grade language. Each MUST hit a different angle, in this order:
  1. **PAIN** — names the bleeding neck directly
  2. **DREAM** — paints the Magic Genie outcome
  3. **CURIOSITY** — opens a knowledge gap ("The weird trick that...")
  4. **SOCIAL PROOF** — specific number or group identity
  5. **CONTRARIAN** — attacks the common advice / status quo
- If PH market, premium Taglish where natural — never street.

#### 7. VIDEO HOOKS (5 first-3-second openers — different visual setups)
- \`videoHooks\`: Array of 5 objects. Each: \`{type, visual, spokenLine}\`.
- \`type\` is one of: "Pattern Interrupt", "Direct Pain", "Result Reveal", "Question", "Before-After". One of each, in that order.
- \`visual\`: What the camera shows in second 0. Specific. (e.g., "Hand slamming a calculator showing P15,000 ad spend, P0 sales.")
- \`spokenLine\`: Exact words spoken in the first 3 seconds. Avatar's voice. Punchy. Never starts with "Hi," "Hello," or the brand name.

#### 8. THE VILLAIN
- \`villain\`: Who or what we publicly blame for the avatar's pain. The shared enemy. Specific. (e.g., "The big-pharma supplement industry that profits from your insecurity.")

#### 9. COMPETITOR MATRIX (top 3 — real names, not placeholders)
- \`competitorMatrix\`: Array of 3 objects. Each: \`{competitor, weakness, exploitationAngle}\`.
- \`competitor\`: REAL brand or method name deduced from the category. If PH market, prefer local competitors. No "Brand X."
- \`weakness\`: Their #1 vulnerability — slow, expensive, fake reviews, hard to use, generic, etc.
- \`exploitationAngle\`: The one-line ad angle that exploits this weakness. Ready to film.

#### 10. FB AD LIBRARY ANGLES (3 ready-to-brief concepts for Director AI)
- \`fbAdLibraryAngles\`: Array of 3 objects. Each: \`{format, angle, openingLine, whyItWorks}\`.
- \`format\`: One of "UGC", "Testimonial", "Founder POV", "Demo", "Reaction". Vary across the 3.
- \`angle\`: Which lever — pain, dream, contrarian, proof, urgency.
- \`openingLine\`: The actual first 1–2 spoken sentences. Production-ready, no placeholders.
- \`whyItWorks\`: ONE sentence — name the Cialdini principle (Scarcity, Social Proof, Authority, Reciprocity, Commitment, Liking, Unity) or proven mechanism this leans on.

#### EVIDENCE & EDGE
- \`rawEvidence\`: Array of 3–6 short proof-point strings — review quotes, forum complaints, competitor pricing, statistics. If Google Search returned real data, prefer real over simulated. Each ≤ 25 words.
- \`contrarianTruth\`: ONE sentence — the surprising, against-the-grain truth that flips the category narrative. The "nobody's saying this" insight that becomes a cold-traffic hook.

#### NARRATIVE REPORT (rendered for human reading)
- \`narrativeReport\`: A single markdown string that renders ALL fields above as one cohesive report a human reads, in this exact section order and format:

\`\`\`
# MARKETMIND INTELLIGENCE REPORT
*Customer Insight + Campaign Blueprint*

**Subject:** {subject}
**Winning Avatar:** {winningAvatar}

## 1. THE DEEP DIVE AVATAR
**Demographics:** {demographics}
**Day in the Life:** {dayInTheLife}

## 2. THE BLEEDING NECK
**Core Frustration:** {bleedingNeck}
**Deep Emotional Fear:** {deepFear}
**The 3 AM Thought:** "{threeAmThought}"

## 3. THE GRAVEYARD
[for each graveyard entry: **Tried:** {tried} → **Why It Failed:** {whyFailed}]
**Objection to Us:** "{objectionToUs}"

## 4. HEAVEN ISLAND
**Magic Genie:** {magicGenie}
**Emotional Payoff:** {emotionalPayoff}
**Status Upgrade:** {statusUpgrade}

## 5. THE BIG IDEA (Big Domino)
> {bigIdea}

## 6. HEADLINES (5 — A/B Test Ready)
1. **PAIN:** {headlines[0]}
2. **DREAM:** {headlines[1]}
3. **CURIOSITY:** {headlines[2]}
4. **SOCIAL PROOF:** {headlines[3]}
5. **CONTRARIAN:** {headlines[4]}

## 7. VIDEO HOOKS (First 3 Seconds)
[for each: **{type}** — Visual: {visual} | Says: "{spokenLine}"]

## 8. THE VILLAIN
{villain}

## 9. COMPETITOR MATRIX
[for each: **{competitor}** — Weakness: {weakness} → Our Angle: {exploitationAngle}]

## 10. FB AD LIBRARY ANGLES (Brief for Director AI)
[for each: **{format}** | Angle: {angle} | Opens with: "{openingLine}" | Why it works: {whyItWorks}]

## EVIDENCE & EDGE
**Raw Evidence:**
[each rawEvidence as a bullet]

**Contrarian Truth:** {contrarianTruth}
\`\`\`

### IMPORTANT GUARDRAIL
If the product name is completely made up (e.g., "Zorpblat 5000") and implies no category, ONLY THEN stop and ask for clarification. Otherwise, deduce it from the images and description.
  `;

/**
 * Build the user-prompt parts for MarketMind. Returns the array structure the
 * Gemini SDK expects under contents.parts (text + optional inlineData images).
 */
export const buildMarketMindParts = (input: MarketResearchInput): any[] => {
  const parts: any[] = [];

  if (input.uploadedImages && input.uploadedImages.length > 0) {
    for (const base64Url of input.uploadedImages) {
      const match = base64Url.match(/data:(image\/.+);base64,(.+)/);
      if (match) {
        parts.push({
          inlineData: {
            mimeType: match[1],
            data: match[2],
          },
        });
      }
    }
  }

  let promptText = `
  **ANALYZE THIS PRODUCT:**
  **Product Name:** ${input.productName}
  **Description:** ${input.productDescription}
  **Price/Offer:** ${input.priceOffer}
  `;

  if (input.isLocalService && input.businessAddress) {
    promptText += `\n**LOCATION CONTEXT:** This is a LOCAL SERVICE located at: ${input.businessAddress}. Factor in the local demographics and geography of this specific area.`;
  }

  parts.push({ text: promptText });
  return parts;
};

// Flow-output validation (P1). Permissive zod schema: rejects UNUSABLE marketmind
// output (nothing to render), NOT stylistic variation. `narrativeReport` is the
// human-read markdown the UI shows; a missing/empty one is unusable. Everything
// else downstream reads (structured MarketResearchReport fields) passes through
// unchecked so a partial-but-usable report is never rejected. Consumed by the
// coerce→regen-once ladder in api/gemini/text.ts.
export const MarketResearchOutputSchema = z
  .object({
    subject: z.string(),
    narrativeReport: z.string().min(1),
  })
  .passthrough();

// ---------------------------------------------------------------------------
// Director AI / generateAdScript
// ---------------------------------------------------------------------------

export const TEMU_CLASSIFIER_PROMPT = (product: string, description: string): string => `
    Analyze this product for a Temu/Viral Haul video strategy.
    Product: "${product}"
    Description: "${description}"

    Classify into ONE of these 3 types based on this technical report:
    1. **ASMR:** Clocks, organizers, keyboards, satisfying textures, gadgets with clicks/snaps. Focus: "Clean Core".
    2. **Reaction:** Pets, cute items, weird gifts, shocking value, toys. Focus: "Kawaii Chaos".
    3. **Utility:** Problem solvers, duo filler gadgets, cleaning tools, car accessories. Focus: "Real Home".

    Output ONLY one word: ASMR, Reaction, or Utility.
    `;

export const UGCPRO_CLASSIFIER_PROMPT = (product: string, description: string): string => `
    Analyze this product for a UGC Pro creator-video strategy.
    Product: "${product}"
    Description: "${description}"

    Classify into ONE of these 5 formats:
    1. **TRYON:** Wearables — clothing, fashion sets, activewear, shoes, jewelry, bags,
       accessories, eyewear. The payoff is seeing it WORN on the body. Focus: "Watch me try this."
    2. **UNBOXING:** The packaging and opening experience is the star — premium/gift
       packaging, subscription boxes, collectibles, tech with a satisfying unbox. The
       payoff is the OPENING itself. Focus: "Listen to this. Watch me open it."
    3. **DEMO:** The product has a function worth WATCHING work — gadgets, appliances,
       tools, kitchenware, snacks/food with a taste-or-stunt payoff, anything with a
       hidden feature or "secret mode". Focus: "Watch what this does."
    4. **TRANSFORMATION:** A visible before→after change — skincare, beauty, cleaning
       products, home/surface care, detailing, repair. The payoff is the INSTANT
       hard-cut reveal of the changed state. Focus: "Look at the difference."
    5. **TUTORIAL:** The METHOD is the content — multi-step routines, layering,
       recipes, setup/installation, "you're doing it wrong" how-tos. The payoff is the
       viewer learning the steps. Focus: "Here's how, step by step."

    Precedence rules (apply in order):
    - Wearable → ALWAYS TRYON, even if it also changes the look or has nice packaging.
    - A visible state-change on a surface, skin, or object → TRANSFORMATION over DEMO.
    - Choose TUTORIAL only when the multi-step METHOD is the differentiator, not the
      product's function alone.
    - Choose UNBOXING only when the packaging/opening is genuinely the strongest asset;
      a product with a working wow-function defaults to DEMO.
    Output ONLY one word: TRYON, UNBOXING, DEMO, TRANSFORMATION, or TUTORIAL.
    `;

// Slice 4 (B3): services-constrained sibling of the 5-way classifier above. A SERVICE
// business can only answer TRANSFORMATION or TUTORIAL (Try-On/Unboxing/Demo are
// product-only). Consumed by the A4 clamp in api/gemini/text.ts on the Auto path.
export const UGCPRO_SERVICE_CLASSIFIER_PROMPT = (service: string, description: string): string => `
    Analyze this SERVICE business for a UGC Pro creator-video strategy.
    Service: "${service}"
    Description: "${description}"

    Classify into ONE of these 2 formats:
    1. **TRANSFORMATION:** The service produces a visible before→after change on a
       surface, space, object, or person — cleaning, pest control, detailing,
       repair, landscaping, salon/derma results. The payoff is the INSTANT
       hard-cut reveal of the changed state. Focus: "Look at the difference."
    2. **TUTORIAL:** The multi-step METHOD is the content — "how we do X in N
       steps" authority-builders, process walkthroughs, expert tips. The payoff is
       the viewer trusting the expertise. Focus: "Here's how we do it, step by step."

    Precedence rule: a visible before→after on a surface, space, or person →
    ALWAYS TRANSFORMATION, even if the work has steps. Choose TUTORIAL only when
    the method or expertise itself is the differentiator, not the visible result.
    Output ONLY one word: TRANSFORMATION or TUTORIAL.
    `;

export const ADSCRIPT_COMMON_RULES = (businessInfo: BusinessInfo, brandName: string, language: 'English' | 'Taglish'): string => `
  **CORE CONSTRAINTS (MANDATORY):**
  - **NO PRICE:** Under no circumstances mention price or offer pricing. Maintain a curiosity gap.
  - **FEATURE FILTER:** Pick ONLY the top 1-2 most viral/compelling features from the provided list: "${businessInfo.features}". Omit everything else.
  - **LOGIC LOCK:** Use Brand Name "${brandName}" EXACTLY. Product mentions can be shortened naturally — say "this kape", "ito", "${brandName}", or descriptive shorthand. Do NOT recite the full SKU/product name verbatim ("${businessInfo.product}"); that reads like a product page, not an ad.
  - **READING LEVEL:** 4th-5th Grade. Simple, punchy, visceral storytelling.
  - **AUDIENCE REGISTER:** Tune vocabulary, idiom, and mental pictures to match this person: "${businessInfo.audience}".
    - HOW you talk = word choice, slang weight, cultural references, the WORLD they live in. Speak from inside that world.
    - WHAT you say stays the same — script structure, hooks, and beats don't change.
    - NEVER name the audience by label. "Para sa mga OFW dads na nasa abroad..." reads as marketing copy. "Sa loob ng 5 years na pagiging malayo sa pamilya..." reads as the speaker.
    - Use the audience's WORLD as your vocabulary:
      • OFW audience → "balikbayan box", "video call", "uwi", "pasalubong", "pamilya sa atin"
      • Filipino mom audience → "yaya", "school baon", "halaga ng bigas", "kape after the kids leave"
      • Corporate audience → "deadline", "boss", "sweldo", "weekend lang nakakapahinga"
    - Visual payoff / Result beats land in the audience's WORLD too. OFW reunion at NAIA, not generic "happy moment". Mom's school dropoff on time, not generic "calm morning". Corporate Friday 6PM logout, not generic "free time". Cialdini Liking — Bryan needs to SEE himself in the result.

  **LANGUAGE LOCK (${language}):**
  - If TAGLISH: every hook, body line, and CTA MUST be in Taglish. Sound like a real Filipino vlog, not a manual.
    English is allowed ONLY for:
      (a) Brand names — proper nouns like "${brandName}" stay English.
      (b) Prices and numbers — "₱650", "P22 vs P180", "30 days".
      (c) A borrowed CTA verb ("Click", "Tap", "Visit") — but ONLY embedded inside a Tagalog frame (see TAGLISH ACCENT LOCK below). An all-English CTA like "Click below" is BANNED in Taglish mode.
    English is FORBIDDEN for product-spec terms. Translate to natural Taglish or OMIT:
      "single-origin medium roast" → "specialty kape" or drop it (visuals carry it)
      "cafe-quality goodness"      → "parang barista ang lasa" or drop it
      "delivered to your doorstep" → "padala sa bahay"
      "premium packaging"          → "mukhang sosyal" or drop it
    If you cannot find natural Taglish for a technical term, OMIT IT. Visuals carry technical specs; copy carries emotion.
  - If ENGLISH: stay 4th-5th grade English. No Taglish slips. No "po", "naman", "talaga", "lasa".
  - NEVER mix registers inside one line. A Taglish line stays Taglish; an English line stays English.
  - **TAGLISH ACCENT LOCK (Taglish mode only):** Veo reads the spoken accent from each line's DOMINANT language — an English-leaning line renders an American accent. Every line MUST be TAGALOG-DOMINANT (~70/30 Tagalog-to-English by word count). The CTA is the highest-risk line and MUST additionally OPEN and CLOSE on a Tagalog word (open "Tara,"/"Ngayon na,"; close "ngayon"/"subukan mo na"). English is limited to carve-outs that stay verbatim and buried mid-line: brand name, numbers/scarcity ("first 50"), and offer value-add nouns ("free shipping", "recipe ebook"). The frame — verbs (except a borrowed "click"/"tap"), connectors, pronouns — is Tagalog.
  - **OPENING ACCENT TRIGGER (Taglish mode only — A/B verified 2026-06-13):** the TTS engine LOCKS the accent for the ENTIRE read from the first words it sees. Three or more consecutive English words at the very start of the script (e.g. "Stop drying your face...") force an American accent on every Tagalog word that follows, no matter how Tagalog-dominant the rest is. The script's FIRST line must surface a Tagalog word within its first 2 words (max 2 consecutive English words before the first Tagalog word). "Stop na sa drying..." locks Filipino; "Stop drying your face..." locks American. This is in ADDITION to the per-line dominance rule above and applies to the hook above all.

  **TIMING & SLIDE EFFECT:**
  - **HOOK:** Strictly 3 seconds max. 5-8 words TOTAL on ONE line — never split into multiple sentences or stacked clauses. The 7-12 word/line rule below is for BODY lines ONLY and does NOT apply to the hook.
  - **BODY LINES:** Strictly 3-5 seconds max per line.
  - **WORD COUNT (BODY LINES ONLY):** Strictly 7-12 words per body line (The Sabri Suby "Slide"). The hook is exempt — it stays 5-8 words.
  `;

export const ADSCRIPT_DIRECTOR_CRITIQUE_INSTRUCTION = `
  **DIRECTOR_CRITIQUE_PROTOCOL:**
  Include a field "strategicAudit" in your JSON response.
  Act as a World-Class Creative Director.
  1. Explain why those specific 1-2 features were chosen for virality.
  2. Explain how the 7-12 word pacing creates the "Slide" effect for retention.
  `;

export const ADSCRIPT_USER_CHOSEN_ANGLE_BLOCK = (chosenAngleBrief: string): string => chosenAngleBrief ? `
  **USER_CHOSEN_ANGLE (from MarketMind report — Bryan picked this direction):**
  Build the entire script (hooks, body, CTA) to reinforce this single angle. Do NOT introduce competing angles. Do NOT ignore this brief.
  ${chosenAngleBrief}
  ` : '';

export const ADSCRIPT_HOOK_SEED_PROTOCOL = (contrarianTruth?: string): string => contrarianTruth ? `
  **HOOK SEED PROTOCOL (REQUIRED for Testimonial + MrBeast strategies — skip for Temu):**

  A MarketMind contrarian truth is available for this campaign:
  "${contrarianTruth}"

  This is the load-bearing belief-flip that makes the ad work on cold traffic. The hook1[] array MUST include at least ONE variant built on this contrarian truth as the FIRST option (position 0). Result-reveal, social-proof, and curiosity-gap variants fill hook2[] or later positions in hook1[] but NEVER displace the contrarian truth from position 0.

  PATTERN (Sabri Suby Halo-Effect Headline mechanism):
    "[Negation of customer's belief]. [Revealed mechanism]."
    OR (5-8 word compression for paid-social attention budget):
    "Stop [doing X]. [New belief in 4-6 words]."

  EXAMPLES across product categories:

    contrarianTruth = "Your skin isn't oily — it's thirsty, and you've been starving it with harsh oil-control products."
    → hook1[0]: "Your skin isn't oily. It's thirsty. Starving."
    OR: "Stop blotting. Your skin isn't oily — it's thirsty."

    contrarianTruth = "OFW kids don't miss the money. They miss the daily presence of their parents."
    → hook1[0]: "Hindi nila kulang ang pera. Kulang ang nanay."
    OR: "OFW kids don't miss the money. They miss you."

    contrarianTruth = "You're not lazy. Your kitchen is making you cook for 2 hours when it should take 20 minutes."
    → hook1[0]: "Hindi ka tamad. Ang luma na ng kusina mo."
    OR: "Stop blaming yourself. Blame your kitchen."

  RULES:
  - Use the EXACT mechanism word from contrarianTruth (e.g., "thirsty", "daily presence", "kusina") — do not paraphrase the load-bearing noun. The mechanism word IS the reframe.
  - 5-8 words for paid social. Up to 12 words for retargeting. Never longer. This is the TOTAL for the whole hook line, not per sentence.
  - ONE belief-flip only. Do NOT stack two "Hindi X. Y." pairs and do NOT append a second brand-name flip (e.g. "...Kulang ka lang sa [Brand]") — stacking doubles the length and dilutes the reframe.
  - Match script language (Taglish or English) to the rest of the ad — Taglish ads get Taglish contrarian, English ads get English. Do not mix registers inside one variant.

  WHY THIS IS NON-NEGOTIABLE:

  Contrarian-truth hooks beat result-reveal hooks 3:1 on cold-traffic CTR (Sabri Suby Halo-Effect mechanism — overturning a held belief creates forced attention). For ₱2-5 cold-traffic PH CPC, this is the single highest-leverage line in the entire ad. Result-reveal hooks ("Finally, I got X") are CLOSING lines — they work on warm/retargeting traffic where the viewer already knows the brand. Putting a closing line at position 0 wastes the cold-traffic media spend.

  The user can still pick a softer hook from hook2[] if their ad set is warm traffic — but the killer hook MUST always be on the menu.
  ` : '';

export interface AdScriptInput {
  businessInfo: BusinessInfo;
  brandName: string;
  language: 'English' | 'Taglish';
  offer: string;
  chosenAngleBrief: string;
  contrarianTruth?: string;
}

// TUNED-edit trail (2026-07-16, Neil-approved via grill-me bundle — sample_batch_test_spec.md
// findings #4b.1–#32): APPEARANCE-CLAIM GUARDRAIL added to the tryon block (it had none) and
// the SPEED RULE sentence appended to both existing guardrails. Beat labels unchanged.
export const buildAdScriptPrompt = (
  input: AdScriptInput,
  temuSubType?: 'ASMR' | 'Reaction' | 'Utility',
  ugcProSubType?: 'tryon' | 'unboxing' | 'demo' | 'transformation' | 'tutorial'
): string => {
  const { businessInfo, brandName, language, offer, chosenAngleBrief } = input;
  const isTestimonial = businessInfo.scriptType === 'Testimonial';
  const isTemu = businessInfo.scriptType === 'Temu';
  const isUGCPro = businessInfo.scriptType === 'UGCPro';
  // Services (v2): customer-testimonial service ads (first-person customer story),
  // book/inquire CTA (not buy-now), category-auto-adapting across ALL service types
  // (emotional payoff + trust-fear inferred from inputs; no peso amount in the script).
  // Avatar engine unchanged (customer persona is correct). Phase 2 = per-scene real-photo
  // routing (venue + before/after) gated as Business-tier Advanced Mode.
  const isServices = businessInfo.scriptType === 'Services';
  // RealEstate (#13): agent-led property walkthrough (first-person agent/seller), inquiry/viewing CTA
  // (not buy-now), optional price (rendered ONLY if the user supplied one — see PRICE RULE). Reuses
  // the venue render-mode + venueSlot routing (a property is a real place). Avatar = the AGENT.
  const isRealEstate = businessInfo.scriptType === 'RealEstate';

  const COMMON_RULES = ADSCRIPT_COMMON_RULES(businessInfo, brandName, language);
  const DIRECTOR_CRITIQUE_INSTRUCTION = ADSCRIPT_DIRECTOR_CRITIQUE_INSTRUCTION;
  const USER_CHOSEN_ANGLE_BLOCK = ADSCRIPT_USER_CHOSEN_ANGLE_BLOCK(chosenAngleBrief);
  const HOOK_SEED_PROTOCOL = ADSCRIPT_HOOK_SEED_PROTOCOL(input.contrarianTruth);
  // Hoisted from the RealEstate arm (Slice 4): the UGC Pro real-estate tutorial renders
  // the SAME price rule. Pure string compute; content byte-identical to the original.
  const priceGiven = !!(businessInfo.listingPrice && businessInfo.listingPrice.trim());
  const PRICE_RULE = priceGiven
    ? `A price was given: "${businessInfo.listingPrice!.trim()}". AFFORDABILITY REFRAME (PH first-time buyers think in monthly + downpayment, NOT lump sum): if the value reads as monthly/DP terms (e.g. "25k/month", "50k DP"), LEAD with that, stated once EXACTLY as given. If it is ONLY a large lump sum (e.g. "₱4.2M"), do NOT make that scary sticker the headline — fold it in once softly, OR (better) withhold it and drive the DM ("PM kita ng full computation") to protect curiosity and qualify the lead. NEVER invent, round, convert, or fabricate monthly/financing/DP terms the user did not actually provide.`
    : `NO price was given — INQUIRY-ONLY. NEVER invent or imply a peso figure. Drive to "message/DM for the price, computation & viewing".`;

  if (isTemu) {
    const subType = temuSubType ?? 'Reaction';
    return `
      Role: Viral TikTok Scriptwriter & Direct Response Expert.
      Strategy: Temu / Viral Haul (${subType} Style).
      Product: "${businessInfo.product}"
      Brand: "${brandName}"

      ${COMMON_RULES}

      **TEMU SUB-TYPE RULES (${subType}):**
      ${subType === 'ASMR' ? '- Focus: "Unbox with me...". Satisfying audio cues.' : ''}
      ${subType === 'Reaction' ? '- Focus: "I can\'t believe I got this...". Shock value.' : ''}
      ${subType === 'Utility' ? '- Focus: POV Problem Solving. "TikTok made me buy it".' : ''}

      ${DIRECTOR_CRITIQUE_INSTRUCTION}
      ${USER_CHOSEN_ANGLE_BLOCK}
      Format: Return valid JSON: { "hook1": [...], "hook2": [...], "body": [...], "strategicAudit": "..." }
    `;
  } else if (isUGCPro) {
    const sub = ugcProSubType ?? 'transformation';
    // Slice 4: non-product verticals reach UGC Pro. `bt` gates every divergence
    // below; the product path emits byte-for-byte what it did before Slice 4
    // (guarded by the product-path invariance test). Legal non-product combos are
    // enforced upstream (pickers + A4 clamp): service × {transformation, tutorial},
    // realestate × {tutorial}.
    const bt = businessInfo.businessType ?? 'product';
    const ugcStrategyLabel: Record<typeof sub, string> = {
      tryon: 'Virtual Try-On (fashion reveal)',
      unboxing: 'Unboxing (tactile reveal)',
      demo: 'Demo / Addiction (watch it work)',
      transformation: 'Transformation (Before & After)',
      tutorial: 'Tutorial / Hack (steps 1-2-3)',
    };
    return `
      Role: Viral UGC Creator-Scriptwriter (TikTok/Reels ${bt === 'service' ? 'service' : bt === 'realestate' ? 'real-estate' : 'product'} content).
      Strategy: UGC Pro — ${ugcStrategyLabel[sub]}.
      ${bt === 'service' ? 'Service' : bt === 'realestate' ? 'Listing' : 'Product'}: "${businessInfo.product}"
      Brand: "${brandName}"

      ${COMMON_RULES}

      ${bt === 'service' ? `**VOICE — FIRST-PERSON OPERATOR (the business films its OWN work; this overrides the
      Services customer-voice rule for UGC Pro only):**
      The speaker is the operator/practitioner filming themselves ON THE JOB, mid-work —
      casual, hands busy, talking to camera like a vlog, never a pitch. NOT a customer
      testimonial, NOT a faceless company announcer. "Ako si [name]" intros are BANNED —
      no name, no life story; the work IS the content. First-person-plural operator speech
      is CORRECT here ("tinatanggal namin 'to sa apat na hakbang", "ganito kami maglinis")
      — this is the ONE format where the business speaks as itself, because the viewer is
      watching them actually do the work. Present tense. Show, then say.` : bt === 'realestate' ? `**VOICE — FIRST-PERSON AGENT ON-SITE (phone-shot, walking the property):**
      The speaker is the agent/broker filming themselves AT the property right now —
      walking, pointing, phone-in-hand energy. NOT a customer, NOT a polished announcer.
      "Ako si [name]" intros are BANNED — no name-tag; open on the place or the tip, never
      a self-introduction. A kasama showing you around, present tense.` : `**VOICE — FIRST-PERSON CREATOR (in-the-moment, never a pitch):**
      The speaker is a real creator filming themselves RIGHT NOW with the product — casual,
      conversational, mid-discovery. NOT a company voice, NOT a testimonial looking back.
      "Ako si [name]" intros are BANNED here — no name, no life story; the moment IS the
      content. Present tense. React, don't narrate.`}

      **UGC PACING OVERRIDE (this format only):**
      - TOTAL script: 10-16 seconds spoken — 4-6 SHORT lines. Fewer, punchier lines beat
        full coverage.
      - Body lines may run 4-12 words (the 7-12 rule relaxes DOWN, never up). Fragments are
        allowed when a real person would speak them ("Obsessed. This is staying on.").
      - The hook is SPOKEN and conversational, lands inside the first 2 seconds. It must
        sound like a person talking to camera, NOT ad copy.
      - ZERO dead air — every line rides into the next hard cut.

      ${sub === 'tryon' ? `
      **TRY-ON 4-BEAT (product in-hand from second 0; the worn reveal is a HARD CUT):**
      0. **Hook (<=2s, 5-8 words):** Product in-hand or on-hanger, creator mid-decision.
         Pattern: commitment + tease — "Okay, I had to try this set. Watch this." /
         "Grabe, kakadating lang nito. Suot ko na." (adapt content to the product and
         audience — do NOT copy these exemplars literally) PROVIDE 2 VARIATIONS —
         populate hook1 AND hook2.
      1. **Worn Reveal:** The first line AFTER the hard cut to wearing it — an instant,
         genuine reaction, 3-8 words. The VISUAL carries the reveal; the line rides it.
      2. **Styling / Fit-Proof:** ONE proof beat that kills the category's #1 objection —
         how it moves, fits, stretches, styles ("squat test", "hindi see-through", "kasya
         sa totoo kong size"). Anchor on the top 1-2 features from the FEATURE FILTER.
         This is the "why believe" slot.
      3. **Verdict + Soft CTA:** The keep-it verdict ("Obsessed. This is staying on."
         register), then ONE soft conversational close driving the tap. Obey the CTA
         price-leak guard; in Taglish, the TAGLISH ACCENT LOCK.

      **TRY-ON LINE HYGIENE (both failed in the Slice-1 eval loop):**
      - Beat 3's keep-it verdict is MANDATORY — the script does not close without an
        explicit "I'm keeping this" judgment ("Obsessed." / "Hindi ko na 'to huhubarin.").
        A CTA alone is not a verdict.
      - Do NOT reuse the hook's opening exclamation to open ANY body line. If the hook
        opens on "Grabe," / "Okay," / "Wait," then no body line may open on that word.

      **APPEARANCE-CLAIM GUARDRAIL (Meta policy):** If the product is worn or applied ON A
      PERSON — skincare, cosmetics, haircare, shapewear, jewelry against skin — frame results
      as glow / fresh / feel / fit / confidence, NEVER medical or corrective claims. SPEED
      RULE: never claim a result speed the brief does not state — "agad", "instant",
      "overnight", "right away" and equivalents are BANNED unless the input explicitly makes
      that claim. The hard cut to the worn/after state is a VISUAL convention, not a license
      for a spoken instant-effect claim.
      ` : sub === 'unboxing' ? `
      **UNBOXING 4-BEAT (the packaging is the co-star; sound is the texture):**
      0. **Hook (<=2s, 5-8 words):** Sensory invitation, package still sealed, in frame.
         Pattern: "Okay, mic check… just listen to the taps." / "Kakarating lang nito.
         Halika, buksan natin." (adapt to the product and audience — do NOT copy these
         exemplars literally) PROVIDE 2 VARIATIONS — populate hook1 AND hook2.
      1. **The Open:** The seal gives way — the line rides the SOUND, 3-8 words. Name a
         real texture (tape rip, foam lift, magnetic click); generic awe ("wow ang
         ganda") is BANNED in this beat.
      2. **Tactile Showcase:** ONE close-touch beat — the foam, the wrap, the weight,
         the finish. Anchor on the top 1-2 features from the FEATURE FILTER. This is
         the "why premium" slot.
      3. **Place/Wear + Soft CTA:** Set it where it lives (the desk, the shelf, the
         wrist), then ONE soft conversational close ("sabihin mo kung gusto mo makita
         'yong full setup"). Obey the CTA price-leak guard; in Taglish, the TAGLISH
         ACCENT LOCK.
      ${businessInfo.asmrFlag ? `
      **ASMR REGISTER (audio-led — the taps ARE the content):**
      - HALVE the line count: the hook + at most 2 whisper-register lines + the soft
        CTA. Long stretches with NO spoken line are CORRECT — the taps, rips, and
        clicks carry those beats. Do not fill the silence.
      - Every line is whisper-written: short, breathy, present tense, ZERO exclamation
        marks. Soft noticing ("ang linis ng gilid nito…"), never hype delivery.
      - The hook MAY be a pure sound instruction ("…listen.") — 2-4 words allowed,
        overriding the 5-8 word pattern.
      ` : ''}
      ` : sub === 'demo' ? `
      **DEMO 5-BEAT (bold claim first; the payoff stunt kills the mid-video dip):**
      0. **Hook (<=2s, 5-8 words):** A bold claim or a secret. Pattern: "Nobody uses
         this blender's secret pro mode." / "Warning: dangerously addictive 'to."
         (adapt to the product and audience — do NOT copy these exemplars literally)
         PROVIDE 2 VARIATIONS — populate hook1 AND hook2.
      1. **Demo Beat:** The product WORKING on its main job — a real action verb,
         product in-hand. A posed introduction ("Eto ang [product]...") is BANNED.
      2. **Escalation:** The hidden feature, the harder test, the "pero teka, may isa
         pa" beat. Anchor on the top 1-2 features from the FEATURE FILTER.
      3. **Payoff Stunt:** The sensory or surprise beat the viewer stays for — the
         extreme close-up, the stress test result, the reaction. Short awe, 3-8 words.
         HONESTY RULE: realistic, representative; never fabricate a guaranteed outcome.
      4. **Spoken CTA (holds to the last frame):** ONE soft conversational close. Obey
         the CTA price-leak guard; in Taglish, the TAGLISH ACCENT LOCK.
      ` : sub === 'tutorial' ? (bt === 'service' ? `
      **TUTORIAL 5-BEAT — SERVICE VARIANT (authority-builder: "ganito namin ginagawa"):**
      0. **Hook (<=2s, 5-8 words):** The pain or myth the method fixes, spoken to camera.
         Pattern: "Bakit bumabalik ang ipis pagkatapos mag-spray? Ganito kasi." / "Mali
         ang paglilinis mo ng aircon." (adapt to the service and audience — do NOT copy
         these exemplars literally) PROVIDE 2 VARIATIONS — populate hook1 AND hook2.
      1-3. **Steps 1-2-3 (ONE line per step, each speakable in <=3s):** Open each line
         with the step number spoken ("Una," / "Step two —" / "Pangatlo,"), then ONE
         concrete action from the ACTUAL work with a real verb. The steps demonstrate
         mastery — the viewer should think "alam nila 'to", not necessarily DIY it.
         Anchor at least one step on the top 1-2 features from the FEATURE FILTER.
      4. **Result + Book CTA:** The finished work in one line, then ONE soft
         conversational close driving BOOK / MESSAGE / INQUIRE. Obey the CTA price-leak
         guard; in Taglish, the TAGLISH ACCENT LOCK.
      ` : bt === 'realestate' ? `
      **TUTORIAL 5-BEAT — REAL-ESTATE VARIANT (agent-authority listicle):**
      0. **Hook (<=2s, 5-8 words):** The question or mistake the tips solve. Pattern:
         "Bibili ka ng condo? Check mo muna 'to." / "Tatlong bagay bago ka mag-
         downpayment." (adapt to the listing and audience — do NOT copy these exemplars
         literally) PROVIDE 2 VARIATIONS — populate hook1 AND hook2.
      1-3. **Tips 1-2-3 (ONE line per tip, each speakable in <=3s):** Open each line with
         the number spoken ("Una," / "Pangalawa," / "Pangatlo,"), then ONE concrete,
         checkable thing (clean title, transparent terms, developer track record, natural
         light, flood history, assoc dues). Ground at least one tip in THIS listing's
         real features from "${businessInfo.features}" — the property is the running
         example, never a prop. HONESTY RULE: do NOT fabricate a license number, award,
         or accreditation the user never provided.
      4. **Takeaway + Inquiry CTA:** The takeaway in one line, then ONE soft close
         driving MESSAGE / VIEWING — an info-first keyword DM is the preferred pattern
         ("Message mo ako ng 'CHECKLIST'"). Obey the CTA price-leak guard; in Taglish,
         the TAGLISH ACCENT LOCK.

      **PRICE RULE:** ${PRICE_RULE}
      ` : `
      **TUTORIAL 5-BEAT (the method IS the content; numbered steps are the retention engine):**
      0. **Hook (<=2s, 5-8 words):** The pain or question the method solves. Pattern:
         "Your perfume fades by noon? You're skipping one step." / "Bakit ang bilis
         maubos ng gas mo? Ito kasi." (adapt to the product and audience — do NOT copy
         these exemplars literally) PROVIDE 2 VARIATIONS — populate hook1 AND hook2.
      1-3. **Steps 1-2-3 (ONE line per step, each speakable in <=3s):** Open each line
         with the step number spoken ("Una," / "Step two —" / "Pangatlo,"), then ONE
         concrete action with a real verb. No filler — a viewer must be able to DO the
         step from the line alone. Anchor at least one step on the top 1-2 features
         from the FEATURE FILTER.
      4. **Result + Soft CTA:** The outcome in one line, then ONE soft conversational
         close. Obey the CTA price-leak guard; in Taglish, the TAGLISH ACCENT LOCK.
      `) : (bt === 'service' ? `
      **TRANSFORMATION 4-BEAT — SERVICE VARIANT (the WORK is the mechanism; there is no
      held product):**
      0. **Hook (<=2s, 5-8 words):** The problem state, shown and named — the client's
         mess/damage/before, real and specific. Pattern: "Tingnan mo 'tong sofa. Grabe
         'to." / "Three years walang linis itong aircon." NO brand mention in the hook.
         (adapt to the service and audience — do NOT copy these exemplars literally)
         PROVIDE 2 VARIATIONS — populate hook1 AND hook2.
      1. **The Work:** The operator's hands + tool mid-action with a COMPLETE verb
         construction — "steam muna namin, tapos deep vacuum" — the METHOD entering,
         never a posed crew shot. If your line has no verb, REWRITE it — a posed
         introduction ("Kami ang [brand]...") is BANNED in this beat.
      2. **Instant Reveal:** The line that rides the hard-cut after-state — short awe,
         3-8 words ("Ayan. Parang bago ulit."). HONESTY RULE: realistic, representative
         result; never fabricate a guaranteed outcome.
      3. **Verdict + Book CTA:** Land the payoff + ONE soft conversational close driving
         BOOK / MESSAGE / INQUIRE. Obey the CTA price-leak guard; in Taglish, the
         TAGLISH ACCENT LOCK.

      **APPEARANCE-CLAIM GUARDRAIL (Meta policy):** If the transformation is on a PERSON —
      including derma, aesthetic, dental, salon, and clinic results — frame the result as
      glow / fresh / feel / confidence, NEVER medical or corrective claims ("removes
      wrinkles", "cures acne", "whitens in 7 days" — all BANNED). Surfaces, spaces,
      fabrics, and objects may show dramatic before/after freely.
      SPEED RULE: never claim a result speed the brief does not state — "agad", "instant",
      "overnight", "right away" and equivalents are BANNED unless the input explicitly makes
      that claim; the hard-cut reveal is a visual convention, not a spoken-claim license.
      ` : `
      **TRANSFORMATION 4-BEAT (the BEFORE is the hook — NO product in beat 0):**
      0. **Hook (<=2s, 5-8 words):** The problem state, shown and named — frustrated,
         real. Pattern: visual complaint — "Tell me why my skin looks exhausted?" /
         "Tingnan mo 'tong mantsa. Ang tagal na nito." NO product mention in the hook.
         ANGLE OVERRIDE GUARD: this beat-0 rule OVERRIDES any angle brief or
         research-suggested opening line — reframe that angle into the problem state;
         a product, benefit, or testimonial hook in beat 0 is WRONG even if a brief
         asked for it. PROVIDE 2 VARIATIONS — populate hook1 AND hook2.
      1. **Application:** The product enters mid-action with a COMPLETE verb construction —
         "watch this — isang swipe lang" / "dalawang spray lang ng ${brandName}". The
         product enters WORKING, never posed. If your line has no verb, REWRITE it —
         a posed introduction ("Eto ang [product]...") is BANNED in this beat.
      2. **Instant Reveal:** The line that rides the hard-cut after-state — short awe,
         3-8 words. HONESTY RULE: realistic, representative result; never fabricate a
         guaranteed outcome.
      3. **Verdict + Soft CTA:** Land the payoff + ONE soft conversational close ("kung
         ganito rin sa'yo, subukan mo na"). Obey the CTA price-leak guard; in Taglish,
         the TAGLISH ACCENT LOCK.

      **APPEARANCE-CLAIM GUARDRAIL (Meta policy):** If the transformation is on a PERSON
      (skin, hair, body), frame the result as glow / fresh / feel — NEVER medical or
      corrective claims ("removes wrinkles", "cures acne", "whitens in 7 days" — all
      BANNED). Surfaces, fabrics, and objects may show dramatic before/after freely.
      SPEED RULE: never claim a result speed the brief does not state — "agad", "instant",
      "overnight", "right away" and equivalents are BANNED unless the input explicitly makes
      that claim; the hard-cut reveal is a visual convention, not a spoken-claim license.
      `)}

      **SOFT CTA GUARD (STRICT — applies to the final beat):**
      BANNED CTA PHRASES (organic-IG patterns, not for paid ads):
      - "link sa bio" / "link in bio"  → use "click below" / "tap below" / "click here"
      - "DM us" / "DM kayo" alone     → use "message us" / "send message"
      - "i-click" / "I-click" (any 'i-' verb-prefix form like "i-check", "i-share", "i-DM")
        → use a plain English verb "Click" / "Tap" / "Visit". Veo TTS mis-pronounces the
        hyphenated 'i-' prefix as a doubled syllable ("Eh eh click").
      BANNED IN THE CTA (price-leak guard — STRICT):
      - Any peso amount (₱X, PX, P X), any pricing tier list, any "X for Y" with prices.
        Even if "${offer}" contains explicit prices, STRIP them — the LP/Messenger reveals
        the price.
      OFFER (soft weave): if "${offer}" names a non-price value-add (free shipping, a bonus,
      a guarantee), weave AT MOST ONE into the close naturally and conversationally — never
      invent one the offer doesn't state. Scarcity is OPTIONAL in this format (the UGC
      register beats hard urgency); if used, keep it spoken-casual ("first 50 lang").
      CTA CLOSE (HARD RULE): the CTA's FINAL word must be Tagalog. If the brand
      name or an English noun would otherwise close the sentence, append a Tagalog
      closer — "ngayon" / "subukan mo na". Never end the CTA on English.
      CTA OPEN (borrowed-verb guard): if the CTA uses a borrowed English verb ("Click",
      "Tap", "Message"), do NOT open the sentence on it — open on "Tara," and let the
      English verb sit mid-sentence ("Tara, click mo na 'yong link sa baba"). Never open
      the CTA on the English verb.${bt !== 'product' ? `
      BOOK, DON'T SELL (service/real-estate only): the CTA drives BOOK / MESSAGE /
      INQUIRE / viewing — "buy now", "add to cart", "order now", and product-scarcity
      ("only 3 left") are BANNED. NO peso amount ever, and no invented free-consult/
      inspection offer the "${offer}" does not state.` : ''}

      **DIRECTOR_CRITIQUE_PROTOCOL:**
      Include a field "strategicAudit" in your JSON response.
      Act as a World-Class Creative Director.
      1. Explain why those specific 1-2 features were chosen for virality.
      2. Explain how the short 4-12 word lines and hard-cut beats hold retention in a
         10-16s UGC demo. Cite the 4-12 UGC range, NOT the 7-12 body rule (this format
         overrides it).

      ${USER_CHOSEN_ANGLE_BLOCK}
      Format: Return valid JSON: { "hook1": [...], "hook2": [...], "body": [...], "strategicAudit": "..." }
    `;
  } else if (isServices) {
    return `
      Role: Senior Direct Response Copywriter for Filipino SERVICE businesses.
      Strategy: Customer-Testimonial Service Ad — first-person CUSTOMER story; book/inquire, NOT buy-now.
      Service: "${businessInfo.product}"
      Brand: "${brandName}"

      ${COMMON_RULES}
      ${HOOK_SEED_PROTOCOL}

      **VOICE — FIRST-PERSON CUSTOMER (never the company):**
      The speaker is a real, relatable CUSTOMER of "${brandName}" sharing their own experience —
      NOT the business pitching itself. NEVER write "Kami sa ${brandName}" / "we offer" / company "amin".
      Write as the customer: "Ako si [Filipino first name]," telling how the service helped them.

      **CATEGORY AUTO-ADAPT (works for ANY service — salon, gym, clinic, restaurant, laundry,
      cleaning, pest control, repair, tutor, advisor, events, etc.). Infer from the service +
      "${businessInfo.audience}" + "${businessInfo.painPoint}" + "${businessInfo.benefit}":**
      - Find the customer's #1 EMOTIONAL PAYOFF and make it the through-line (hook → relief).
        Examples (pick what FITS; never force one): privacy / "walang nakaalam" (private or
        embarrassing services), confidence / "bagong tiwala" (salon, gym, derma, dental),
        peace-of-mind / "panatag ang loob" (pest, repair, security, clinic), time / "may oras
        ka ulit" (laundry, cleaning, errands), pride / "proud kang i-serve" (restaurant, events).
      - Find and DISARM the category's #1 TRUST FEAR. Examples: surprise pricing ("presyong
        usap, presyong bayad — walang dagdag") for trades/repair; "gagana ba sa akin?"
        (realistic proof, no fabricated guarantee) for results-based; hygiene/safety for
        food/health; reliability / no-show ("on-time, maaasahan") for home services.

      **SERVICES TESTIMONIAL 6-BEAT (no held product, no "buy now", and NO peso amount in the script):**
      0. **Hook (3s / 5-8 words):** Pattern interrupt. Hit ONE of: {named pain + the emotional
         payoff} · {fear/consequence before it worsens} · {anti-villain of the category}.
         PROVIDE 2 VARIATIONS — populate hook1 AND hook2.
      1. **Intro:** "Ako si [Filipino first name]," + life context that implicitly identifies
         "${businessInfo.audience}" (story-opener, NOT a demographic label or name-tag).
      2. **The Problem:** Agitate the real pain — "${businessInfo.painPoint}".
      3. **The Turn:** How they found/called "${brandName}" + the ONE thing that won their trust.
         Anchor on the real differentiator: "${businessInfo.separator}" — this is the "why believe you"
         line, and it should double as the disarm of the category's #1 trust fear (see CATEGORY AUTO-ADAPT).
         If the differentiator is empty, disarm the trust fear directly. Use a COMPLETE verb construction,
         never a verbless fragment.
      4. **The Relief:** Pain → Result ("${businessInfo.benefit}"), carrying the emotional payoff.
         HONESTY RULE: realistic/representative; never fabricate a guaranteed or exaggerated outcome.
      5. **Offer + CTA:** They recommend it + the offer as WORDS ONLY (e.g. "libreng inspection/
         konsulta", "free first consult") — NEVER state a peso figure. Drive to BOOK / MESSAGE /
         INQUIRE via Viber, Messenger/DM, or walk-in — NOT a checkout link. Forbidden: "buy now",
         "add to cart", "order now", product-scarcity ("only 3 left").

      **APPEARANCE-CLAIM GUARDRAIL (Meta policy):** If the result is on a PERSON — including
      derma, aesthetic, dental, salon, and clinic results — frame it as glow / fresh / feel /
      confidence, NEVER medical or corrective claims ("removes wrinkles", "cures acne",
      "whitens in 7 days", "nag-heal", "gumaling", "nagpapagaling" — all BANNED). Surfaces,
      spaces, fabrics, and objects may show dramatic before/after freely.
      SPEED RULE: never claim a result speed the brief does not state — "agad", "instant",
      "overnight", "right away" and equivalents are BANNED unless the input explicitly makes
      that claim. This format is a spoken first-person customer story end to end, so there is
      no visual-convention defence: if the customer says it, the ad claims it.

      ${DIRECTOR_CRITIQUE_INSTRUCTION}
      ${USER_CHOSEN_ANGLE_BLOCK}
      Format: Return valid JSON: { "hook1": [...], "hook2": [...], "body": [...], "strategicAudit": "..." }
    `;
  } else if (isRealEstate) {
    return `
      Role: Senior Direct Response Copywriter for Filipino REAL ESTATE sellers.
      Strategy: Agent-Led Property Walkthrough — the agent/seller TOURS the property and drives an
      inquiry/viewing, NOT a checkout.
      Listing: "${businessInfo.product}"
      Brand: "${brandName}"

      ${COMMON_RULES}
      ${HOOK_SEED_PROTOCOL}

      **VOICE — FIRST-PERSON AGENT/SELLER (warm, trusted, never hypey):**
      The speaker is the agent/broker/seller personally showing the property — "Pasok tayo,"
      "Tingnan natin ang...". NOT a customer testimonial, NOT a faceless announcer. A kasama who
      helps you find a home, not a hard-seller. NEVER write "Ako si [customer name]" — this is the
      agent's own voice touring the place.

      **ARCHETYPE AUTO-ADAPT (infer from the listing + "${businessInfo.audience}"):**
      - LISTING (one house/condo/lot): the PROPERTY is the hero — walk the spaces, sell the lifestyle.
      - AGENT (personal brand): lead with the agent's trust + service; listings are proof they deliver.
      - DEVELOPER (pre-selling): the development is the hero — model unit, amenities, location,
        RFO/turnover.

      **REAL ESTATE WALKTHROUGH 6-BEAT (agent-led; price is OPTIONAL — see PRICE RULE):**
      0. **Hook (3s / 5-8 words):** Pattern interrupt on the DREAM or the DEAL. Hit ONE of: {the
         lifestyle/feeling of the place} · {the specific standout feature} · {the "is this real?"
         value}. PROVIDE 2 VARIATIONS — populate hook1 AND hook2. NEVER a demographic label.
      1. **Location / Lifestyle:** Anchor WHERE it is + the life they'd live here — who it fits
         ("${businessInfo.audience}") carried implicitly by the scene, NOT a demographic tag.
      2. **The Walkthrough:** Tour the standout spaces ("Pasok tayo sa sala... ang kusina dito...").
         Name real rooms/features from "${businessInfo.features}". This is the heart — make them
         picture themselves living inside.
      3. **The Standout / Differentiator:** The ONE thing that makes it worth it — anchor on
         "${businessInfo.separator}" (view, location, price-per-sqm, amenities, flexible terms). Use a
         COMPLETE verb construction, never a verbless fragment. If the differentiator is empty, lead
         with the strongest feature instead.
      4. **Trust / Legitimacy (REQUIRED — the #1 lever in PH property):** Kill "baka scam / fly-by-night /
         walang title". Hit legitimacy + a guiding hand: clean title, transparent terms, in-person viewing
         welcome, "sasamahan kita from viewing hanggang turnover" (Authority + Liking). HONESTY RULE: do NOT
         fabricate a specific license number, award, or accreditation the user never provided — phrase it as
         the agent's standard ("malinaw ang title, legit ang process, gagabayan kita"), not a fake credential.
      5. **Affordability + CTA:** ${priceGiven ? 'Handle price per the PRICE RULE (reframe to monthly/DP, never flash a scary lump sum), then drive' : 'Drive'} to a LOW-FRICTION inquiry. PREFER an info-first keyword
         DM — "Message mo lang ako ng 'BAHAY' (o 'COMPUTATION'), ipapadala ko ang monthly, DP, at requirements"
         — over an immediate viewing ask (a viewing is a big commitment off a short video). A site VIEWING is
         the SECONDARY CTA, used only when REAL scarcity exists (e.g. open-house this weekend). Channel: Viber /
         Messenger / call — NOT a checkout link. Forbidden: "buy now", "add to cart", "order now",
         product-scarcity gimmicks ("only 3 left"). Real urgency only if true (limited units / RFO / pre-selling).

      **PRICE RULE:** ${PRICE_RULE}

      ${DIRECTOR_CRITIQUE_INSTRUCTION}
      ${USER_CHOSEN_ANGLE_BLOCK}
      Format: Return valid JSON: { "hook1": [...], "hook2": [...], "body": [...], "strategicAudit": "..." }
    `;
  } else if (isTestimonial) {
    return `
      Role: Senior Direct Response Copywriter.
      Strategy: High-Converting Testimonial.
      Product: "${businessInfo.product}"
      Brand: "${brandName}"

      ${COMMON_RULES}

      **TESTIMONIAL STRUCTURE:**
      0. **Hook (3s/5-8 words):** Shock or extreme curiosity. PROVIDE 2 VARIATIONS — both 5-8 words, both curiosity-driven pattern interrupts. REQUIRED: hook1 and hook2 arrays in the JSON output MUST be populated; do not skip this beat.
      1. **Intro:** REQUIRED: Beat 1 MUST open with "Ako si [Filipino first name]," (e.g., "Ako si Elena," / "Ako si Mark," / "Ako si Tin,") — followed by life context that implicitly identifies the audience "${businessInfo.audience}" and the wound's first hint as an open loop into beat 2. The introduction is a STORY-OPENER, not a label. NEVER write "Ako si [Name], OFW dad, 5 years sa Saudi" — that's a name tag and is BANNED. NEVER name the audience demographically; the persona's wound carries the recognition. If the model would skip the name, generate a culturally-fitting Filipino first name (e.g., Maria, Cristina, Jenny, Mark, JP, Miggy, Tin, Elena, Nena, Kaye) and use it. (See INTRO PATTERN EXAMPLES below.)
      2. **Before Story:** Agitate the 'Main Problem': "${businessInfo.painPoint}".
      3. **Discovery:** Speaker introduces the hero "${brandName}'s ${businessInfo.product}" with a COMPLETE verb construction. NEVER drop the verb — verbless fragments break the line. PATTERN: "Hanggang sa [verb-phrase] [hero-product]" or "Pero simula nung [verb + na/ko/tong] [hero-product]". Examples: "Hanggang sa natikman ko itong ${brandName}." / "Pero simula nung na-try ko tong ${brandName}." / "Buti na lang, sinubukan ko ang ${brandName}." BANNED: "Pero simula nung ${brandName}" alone (verbless fragment).
      4. **Transformation:** The shift from Pain Point ("${businessInfo.painPoint}") to Result ("${businessInfo.benefit}").
      5. **Proof:** Highlight the 1-2 selected features. Stack comparative differentiation: "Marami akong na-try na ibang [category], pero ito lang ang gumana sa akin kasi ${businessInfo.separator}." This is where the differentiator earns its keep. If separator is empty, fall back to: "Highlight the 1-2 selected features."
      6. **Objection Killer:** Solve the common doubt.
      7. **CTA:** Ad-native call-to-action with WARM recommendation tone (not direct-sell). Drive CURIOSITY to the landing page / Messenger — specific prices and peso amounts belong THERE, not in the ad. In Taglish mode the CTA MUST obey the TAGLISH ACCENT LOCK (Tagalog-dominant, opens + closes on a Tagalog word).

         BANNED CTA PHRASES (organic-IG patterns, not for paid ads):
         - "link sa bio" / "link in bio"  → use "click below" / "tap below" / "click here"
         - "DM us" / "DM kayo" alone     → use "message us" / "send message"
         - "i-click" / "I-click" (any 'i-' verb-prefix form like "i-share", "i-DM") → use plain English verb "Click" / "Tap" / "Visit". Veo TTS mis-pronounces hyphenated 'i-' prefix as a doubled syllable ("Eh eh click").

         BANNED IN THE CTA (price-leak guard — STRICT):
         - Any peso amount (₱X, PX, P X, e.g., "₱999", "P299")
         - Any pricing tier list (e.g., "P299, P499, P999")
         - Any "X for Y" or "buy 1 take 1" with prices
         Even if "${offer}" contains explicit prices, STRIP them. The CTA's job is to make them tap — the LP/Messenger reveals the price.

         SCARCITY — CONDITIONAL, NEVER INVENTED: include a scarcity phrase ONLY when "${offer}" states a real limit — a number, a quantity, or a deadline ("first 50", "10 slots left", "until Friday", "today only"). Name it verbatim or near-verbatim from the offer. If "${offer}" states no limit, the CTA carries NO scarcity at all: "limited", "limited stock", "limited lang", "habang may stock", "mauubos na" and equivalents are BANNED, because a stock or deadline claim the business never made cannot be verified by anyone. A CTA with no scarcity is correct and complete — urgency is not a required ingredient.
         Then include ONLY the non-price value-adds that LITERALLY appear in "${offer}" (e.g. free shipping, a bonus, a guarantee), named verbatim or near-verbatim — and NOTHING ELSE. Do NOT invent or add any bonus that is not in "${offer}": no free ebook, no freebie, no guarantee unless the offer actually states it. Drop the peso amounts; keep only the bonus items the offer names.
         - ✅ offer "₱199 per bottle (Buy 3, free shipping)" → "Tara, click mo na sa baba — may libreng shipping, subukan mo na." (Tagalog-dominant; opens "Tara", closes "subukan mo na"; carries the offer's real value-add and NO scarcity, because the offer names no limit)
         - ✅ offer "first 50 orders get free shipping" → "Tara, click mo na sa baba — first 50 lang may libreng shipping, subukan mo na." (the scarcity is real; it came from the offer)
         - ❌ "Tara, click mo na sa baba, limited lang — subukan mo na." (invents a stock limit the offer never stated — banned)
         - ❌ "Tara, click mo na — may libreng recipe ebook!" (invents an ebook the offer never mentioned — banned)
         - ❌ "Click below, first 50 for P999 may free shipping!" (English-dominant AND leaks price — banned)
         If "${offer}" is empty OR names no non-price value-add (price only), DROP the bonus clause entirely and use a clean CTA with no scarcity and no invented benefit: "Tara, click mo na sa baba — subukan mo na."

      **APPEARANCE-CLAIM GUARDRAIL (Meta policy):** If the transformation in beat 4 is on a
      PERSON (skin, hair, body), frame the result as glow / fresh / feel — NEVER medical or
      corrective claims ("removes wrinkles", "cures acne", "whitens in 7 days", "nag-heal",
      "gumaling", "nagpapagaling" — all BANNED). Surfaces, fabrics, and objects may show
      dramatic before/after freely.
      SPEED RULE: never claim a result speed the brief does not state — "agad", "instant",
      "overnight", "right away" and equivalents are BANNED unless the input explicitly makes
      that claim. In a testimonial EVERY beat is a spoken first-person claim, so there is no
      visual-convention defence here: if the speaker says it, the ad claims it.

      **INTRO PATTERN EXAMPLES** (for beat 1 — adapt content to audience, do not copy literally):
      - OFW audience → "Ako si Mark. 5 years na akong nasa Saudi para mabuhay yung pamilya — pero may isang bagay na halos natalo ako."
      - Filipino mom audience → "Ako si Tin, single mom ng dalawang bata. Akala ko kaya ko na lahat — until one Sunday morning..."
      - Corporate audience → "Ako si JP. Nine-to-nine sa Makati, pinagkakitaan ko sarili ko — pero may isang gabi na napaisip ako: 'para saan pa lahat ng ito?'"

      ${DIRECTOR_CRITIQUE_INSTRUCTION}
      ${USER_CHOSEN_ANGLE_BLOCK}
      ${HOOK_SEED_PROTOCOL}
      Format: Return valid JSON: { "hook1": [...], "hook2": [...], "body": [...], "strategicAudit": "..." }
    `;
  } else {
    return `
        Role: Senior Direct Response Copywriter.
        Strategy: MrBeast Viral Flow.
        Product: "${businessInfo.product}"
        Brand: "${brandName}"

        ${COMMON_RULES}

        **MRBEAST STRUCTURE:**
        1. **Hook (3s/5-8 words):** Curiosity-driven pattern interrupt. PROVIDE 2 VARIATIONS — both 5-8 words. REQUIRED: hook1 and hook2 arrays in the JSON output MUST be populated; do not skip. Hook stays curiosity-gap-pure — no offer, no differentiator. NEVER use demographic labels in the hook ("for OFWs", "sa mga moms", "para sa OFW", "for Filipino dads" — all banned). Curiosity comes from the situation/visual, not the audience tag.
        2. **Identity:** Relatable audience statement (5-10 words). Direct address to the audience using "ka", "mo", "tayo", or "kayo" — name a scene from their life they immediately recognize. Reference their world (work, home, daily struggle, environment). NEVER name them by demographic label ("para sa mga OFW", "sa mga moms" — banned). Audience: "${businessInfo.audience}". (See IDENTITY PATTERN EXAMPLES below.)
        3. **Struggles:** Deep dive into "${businessInfo.painPoint}".
        4. **Discovery:** Introducing "${brandName}'s ${businessInfo.product}".
        5. **Result + Proof:** Visual payoff based on "${businessInfo.benefit}". Stack proof: "Hindi tulad ng iba — kami ${businessInfo.separator}." This is the "why believe?" slot. NEVER in the hook (kills curiosity); NEVER in the CTA (offer owns that). If separator is empty, fall back to: "Visual payoff based on benefit."
        6. **CTA:** High-energy ad-native call-to-action. Drive CURIOSITY to the landing page / Messenger — specific prices and peso amounts belong THERE, not in the ad. In Taglish mode the CTA MUST obey the TAGLISH ACCENT LOCK (Tagalog-dominant, opens + closes on a Tagalog word).

           BANNED CTA PHRASES (organic-IG patterns, not for paid ads):
           - "link sa bio" / "link in bio"  → use "click below" / "tap below" / "click here"
           - "DM us" / "DM kayo" alone     → use "message us" / "send message"
           - "i-click" / "I-click" (any 'i-' verb-prefix form like "i-share", "i-DM") → use plain English verb "Click" / "Tap" / "Visit". Veo TTS mis-pronounces hyphenated 'i-' prefix as a doubled syllable ("Eh eh click").

           BANNED IN THE CTA (price-leak guard — STRICT):
           - Any peso amount (₱X, PX, P X, e.g., "₱999", "P299")
           - Any pricing tier list (e.g., "P299, P499, P999")
           - Any "X for Y" or "buy 1 take 1" with prices
           Even if "${offer}" contains explicit prices, STRIP them. The CTA's job is to make them tap — the LP/Messenger reveals the price.

           SCARCITY — CONDITIONAL, NEVER INVENTED: include a scarcity phrase ONLY when "${offer}" states a real limit — a number, a quantity, or a deadline ("first 50", "10 slots left", "until Friday", "today only"). Name it verbatim or near-verbatim from the offer. If "${offer}" states no limit, the CTA carries NO scarcity at all: "limited", "limited slots", "limited lang", "habang may stock", "mauubos na" and equivalents are BANNED, because a stock or deadline claim the business never made cannot be verified by anyone. A CTA with no scarcity is correct and complete — urgency is not a required ingredient.
           Then include ONLY the non-price value-adds that LITERALLY appear in "${offer}" (e.g. free shipping, a bonus, a guarantee), named verbatim or near-verbatim — and NOTHING ELSE. Do NOT invent or add any bonus that is not in "${offer}": no free ebook, no freebie, no guarantee unless the offer actually states it. Drop the peso amounts; keep only the bonus items the offer names.
           - ✅ offer "₱199 per bottle (Buy 3, free shipping)" → "Tara, click mo na sa baba — may libreng shipping, ngayon na!" (Tagalog-dominant; opens "Tara", closes "ngayon na"; the offer's real value-add and NO scarcity, because the offer names no limit; no banned 'i-' prefix)
           - ✅ offer "first 50 orders get free shipping" → "Tara, click mo na sa baba — first 50 lang may libreng shipping, ngayon na!" (the scarcity is real; it came from the offer)
           - ❌ "Tara, click mo na sa baba ngayon, limited lang!" (invents a stock limit the offer never stated — banned)
           - ❌ "Tara, click mo na — may libreng recipe ebook ngayon!" (invents an ebook the offer never mentioned — banned)
           - ❌ "Click below, 50 slots for P299, P499, P999, free shipping!" (English-dominant AND leaks price — banned)
           If "${offer}" is empty OR names no non-price value-add (price only), DROP the bonus clause entirely and use a clean CTA with no scarcity and no invented benefit: "Tara, click mo na sa baba ngayon!"

        **APPEARANCE-CLAIM GUARDRAIL (Meta policy):** If the result in beat 5 is on a PERSON
        (skin, hair, body), frame it as glow / fresh / feel — NEVER medical or corrective
        claims ("removes wrinkles", "cures acne", "whitens in 7 days", "nag-heal", "gumaling",
        "nagpapagaling" — all BANNED). Surfaces, fabrics, and objects may show dramatic
        before/after freely.
        SPEED RULE: never claim a result speed the brief does not state — "agad", "instant",
        "overnight", "right away" and equivalents are BANNED unless the input explicitly makes
        that claim. Every beat here is spoken, so there is no visual-convention defence: if the
        script says it, the ad claims it.

        **IDENTITY PATTERN EXAMPLES** (for beat 2 — adapt to audience, do not copy literally):
        - OFW family audience → "Tuwing umagang malayo sa pamilya, kape ang nag-aalala sa'yo."
        - Filipino mom audience → "Bago pumasok ang mga bata, isang kape lang ang oras mo."
        - Corporate audience → "Bago mag-9AM call, bago mag-deadline, kailangan mo ng panlaban."

        ${DIRECTOR_CRITIQUE_INSTRUCTION}
        ${USER_CHOSEN_ANGLE_BLOCK}
        ${HOOK_SEED_PROTOCOL}
        Format: Return ONLY valid JSON: { "hook1": [...], "hook2": [...], "body": [...], "strategicAudit": "..." }
    `;
  }
};

// Hook ceiling guard. The adscript model reliably overshoots the 5-8 word hook
// spec by stacking extra beats (observed 18/14/21 words across rolls); prompt
// instructions alone don't hold it. Enforce deterministically: keep at most the
// first 2 sentences AND <=12 words (the "never longer" ceiling in the HOOK SEED
// PROTOCOL). Always keeps >=1 sentence so the contrarian flip survives.
const MAX_HOOK_SENTENCES = 2;
const MAX_HOOK_WORDS = 12;

const capHookLine = (hook: unknown): string => {
  if (typeof hook !== 'string') return hook as string;
  const trimmed = hook.trim();
  const sentences = trimmed.match(/[^.!?]+[.!?]*/g)?.map(s => s.trim()).filter(Boolean) ?? [trimmed];
  const kept: string[] = [];
  let words = 0;
  for (const s of sentences) {
    const w = s.split(/\s+/).filter(Boolean).length;
    if (kept.length >= MAX_HOOK_SENTENCES) break;
    if (kept.length >= 1 && words + w > MAX_HOOK_WORDS) break;
    kept.push(s);
    words += w;
  }
  return kept.length ? kept.join(' ') : trimmed;
};

// Collapse a hook array to a single capped line. The model sometimes splits one
// hook variation across multiple array elements (each individually <=12 words);
// the Step 3 UI and the downstream consumer both treat the whole array as the
// hook, so capping per-element lets the join re-inflate past the ceiling. Join
// first, THEN cap, so the ceiling governs the hook as it is actually used.
const capHookArray = (arr: unknown): string[] => {
  if (!Array.isArray(arr)) return [];
  const joined = arr.filter((x): x is string => typeof x === 'string').join(' ').trim();
  return joined ? [capHookLine(joined)] : [];
};

/**
 * Parse the JSON returned by the adscript prompt into the canonical Script shape.
 * Mirrors the client-side parser that previously lived in generateAdScript.
 */
export const parseAdScriptResponse = (rawText: string): Script => {
  const cleanedText = cleanJson(rawText);
  const json = JSON.parse(cleanedText);
  return {
    hook1: capHookArray(json.hook1),
    hook2: capHookArray(json.hook2),
    body: Array.isArray(json.body) ? json.body : [],
    strategicAudit: json.strategicAudit || '',
  };
};

// Flow-output validation (P1). Validates the PARSED Script (post parseAdScriptResponse
// + its capHookArray coercion). The load-bearing fields downstream consumes are the
// two hook menus and the body beats — an empty hook1/hook2 or empty body is unusable.
// strategicAudit / ugcProFormatResolved pass through untouched. Runs in the ladder
// AFTER the adscript flow's existing hook-starvation + verb regens.
export const AdScriptOutputSchema = z
  .object({
    hook1: z.array(z.string()).min(1),
    hook2: z.array(z.string()).min(1),
    body: z.array(z.unknown()).min(1),
  })
  .passthrough();

// TRANSFORMATION beat 1 (body[0]) is the Application line: the product must enter
// mid-action, with a real verb. Prompt instructions alone don't hold it — 4/4
// formulations failed the Slice-1 eval loop and it only passed on a re-roll.
// Enforce deterministically, same escape hatch as capHookLine.
const APPLICATION_VERBS = /\b(swipe|swipes|spray|sprays|apply|applies|rub|rubs|wipe|wipes|dab|dabs|pump|pumps|pat|pats|smooth|smooths|massage|massages|scrub|scrubs|pour|pours|drop|drops|glide|glides|press|presses|i?punas|punasan|pahid|pahiran|swipe\s+lang|spray\s+lang|lagay|ilagay|patak|kuskos|masahe)\b/i;

const POSED_INTRO = /^\s*(eto|ito|heto|this is|here'?s|meet)\b/i;

/** True when the line reads as a working application, not a posed product intro. */
export const hasApplicationVerb = (line: string): boolean =>
  APPLICATION_VERBS.test(line) && !POSED_INTRO.test(line);

// ---------------------------------------------------------------------------
// Offer Optimizer (generateOfferOptimization) — Hormozi tier prompts
// ---------------------------------------------------------------------------

export const buildOfferOptimizerPrompt = (input: OfferOptimizerInput): string => `
### Role: Zam Grifon Offer Strategist GPT
You fuse **Alex Hormozi's $100M Offers (Grand Slam Value Equation)**, **Sabri Suby's Godfather Offer**, **Cialdini's 7 Principles of Influence**, and **MrBeast's Viral Specificity** into a single offer-stack engine.

### YOUR GOAL
Build a 3-tier OFFER STACK so good only an idiot would say no. The user will feed each tier directly into a video ad pipeline (Director AI), so every field must be PRODUCTION-READY copy — not a worksheet, not a template, not bracketed placeholders.

### INPUT CONTEXT
Product: ${input.productName}
Current Price: ${input.currentPrice}
Target Audience: ${input.targetAudience}
Market Research Context: ${input.marketResearchText}
Language: ${input.language}

### THE HORMOZI VALUE EQUATION (apply to EVERY tier)
For each offer tier, you MUST reason through:
  Value = (Dream Outcome × Perceived Likelihood of Achievement) ÷ (Time Delay × Effort & Sacrifice)

You will articulate each variable in the \`hormoziLogic\` object per tier:
- dreamOutcome: The exact transformation the customer gets (visceral, specific).
- likelihood: WHY they will succeed with this (mechanism, proof, system — not generic confidence).
- timeDelay: How fast they see the result (be specific: "in 7 days", "first session", "by next payday").
- effort: What they DO NOT have to do (the friction you removed: no hours, no learning curve, no equipment, etc.).

A weak tier = vague Dream + low Likelihood + long Delay + high Effort. A Grand Slam tier = visceral Dream + ironclad Likelihood + fast Delay + near-zero Effort.

### MANDATORY HARD RULES
1. **NO PLACEHOLDERS.** Never output "[Price prediction]", "[Specific item]", "[Bracketed]", "TBD", "xxx", or "[your...]". Every field is real, final copy.
2. **CONCRETE ₱ PRICING.** Every \`actualPrice\`, \`totalValue\`, and \`valueStack[].value\` is a real Philippine peso amount (e.g., "₱1,997", "₱9,997"). No ranges, no "around X", no placeholders.
3. **CONCRETE SCARCITY.** Every \`scarcity\` field names a real number or window: "First 50 buyers only", "Closes Friday 11:59 PM", "Limited to 10 slots this month". No vague "limited time" without a number/date.
4. **MANDATORY GUARANTEE.** Every tier has a Risk Reversal in \`guarantee\`. Default to "Better-than-money-back": full refund + an extra ₱500 (or 2x their money) if no result by [specific time]. Make refusal feel insane.
5. **MECHANISM NAMING.** Every \`name\` is a proprietary-sounding mechanism, not a generic descriptor. ✅ "The 7-Day Niche Ladder", "The Bleeding-Neck Reset", "Operator Tier" / ❌ "Starter Pack", "Premium Bundle", "VIP".
6. **PITCH IS SHIPPABLE.** Every \`pitch\` is 1-2 sentences a Director AI script can read aloud verbatim. Punchy, specific, customer-facing.
7. **NO-BRAINER LOGIC.** Every \`noBrainerLogic\` references the anchor — quote the totalValue gap, the time saved, or the alternative cost (agency, freelancer, course). Specific numbers.
8. **CIALDINI LEVERS.** Across the stack, weave in Scarcity, Authority, Social Proof, Reciprocity, and Commitment naturally — don't list them, embed them in copy.
9. **VOICE.** ${input.language === 'Taglish' ? 'Use natural Filipino-English Taglish — conversational, punchy, Bryan/Olivia SMB tone. Use ₱ peso amounts. Avoid academic English.' : 'Use punchy, action-driven English at a 4th-5th grade reading level. Use ₱ peso amounts.'}

### THE 3-TIER OFFER STACK
You will build exactly three tiers in this order:

A) **Tripwire** — low-barrier first-purchase under ₱500 ideally. Goal: get them off the fence and onto the customer list. \`probability\` should be High.
B) **Core Offer** — the main profit driver. Stack 3-6 components in \`valueStack\` so \`totalValue\` is at LEAST 5x the \`actualPrice\`. This is the offer Director AI builds the ad around. \`probability\` should be High.
C) **High-Ticket** — VIP / Done-for-You / Bulk. Higher anchor, scarcer slots. \`probability\` is typically Low or Medium.

### THE DIRECTOR PAYLOAD (CRITICAL)
After the three tiers, fill \`directorPayload\` — this feeds straight into the Director AI wizard. Each field is the SHORTEST production copy that fits in a one-line wizard input:
- offer: A 1-2 sentence pitch synthesizing the Core Offer (what they get + the price + the no-brainer hook). Reads naturally inside an ad script. Example: "Get the 7-Day Niche Ladder system — 6 modules, 1-on-1 launch call, 90-day result guarantee — for ₱1,997 (was ₱9,997)."
- productName: Short product name string (max 6 words).
- targetAudience: One-line avatar (e.g., "Frustrated freelancers stuck under ₱40k/mo").
- mainBenefit: The #1 outcome in one line.
- painPoint: The bleeding-neck pain in one line.
- usp: The unique mechanism / contrarian truth in one line.

### ANALYSIS SECTION
Before outputting tiers, write a \`analysis\` paragraph (3-5 sentences) explaining your pricing logic: target FB Ads CPA, blended margin, why this stack out-converts the current ${input.currentPrice} price point.

### CONVERSION ASSETS
Fill \`conversionAssets\` with the supporting brand brief — brand name, services, target avatar, benefit, problem, pain point, differentiator (the mechanism), 3-5 features, and 3-5 hex codes for the brand palette.

### OUTPUT FORMAT
Return ONLY valid JSON matching this exact shape — no markdown, no commentary, no prefix:

{
  "analysis": "string (3-5 sentence pricing rationale)",
  "tripwire":   { "name": "string", "pitch": "string", "valueStack": [{"item":"string","value":"₱X,XXX"}], "totalValue": "₱X,XXX", "actualPrice": "₱XXX", "noBrainerLogic": "string", "scarcity": "string (concrete window/quantity)", "guarantee": "string (risk reversal)", "hormoziLogic": {"dreamOutcome":"string","likelihood":"string","timeDelay":"string","effort":"string"}, "probability": "High" },
  "coreOffer":  { /* same shape — 3-6 valueStack items, totalValue ≥ 5x actualPrice */ },
  "highTicket": { /* same shape — premium price, scarcer slots */ },
  "conversionAssets": {
    "brandName": "string",
    "productServiceList": ["string", ...],
    "target": "string",
    "achieveOrEliminate": "string",
    "mainBenefit": "string",
    "mainProblem": "string",
    "mainPainPoint": "string",
    "mainDifferentiator": "string",
    "mainFeatures": ["string", ...],
    "brandPalette": ["#XXXXXX", ...]
  },
  "directorPayload": {
    "offer": "string (1-2 sentences, ad-ready)",
    "productName": "string",
    "targetAudience": "string",
    "mainBenefit": "string",
    "painPoint": "string",
    "usp": "string"
  }
}

REQUIRED: Every string is final production copy. Every ₱ amount is real. Every scarcity has a number or date. Every tier has a guarantee. No placeholders anywhere.
  `;

export const parseOfferOptimizerResponse = (rawText: string): OfferOptimizerResult => {
  return JSON.parse(cleanJson(rawText)) as OfferOptimizerResult;
};

// Flow-output validation (P1). Downstream (App.tsx Director auto-prefill) reads the
// three offer tiers + directorPayload; a report missing any of them is unusable.
// Nested fields (valueStack, hormoziLogic, conversionAssets, analysis) pass through
// so a stylistically-thin-but-present tier is never rejected.
const OfferTierShape = z
  .object({ name: z.string(), actualPrice: z.string() })
  .passthrough();
export const OfferOptimizerOutputSchema = z
  .object({
    tripwire: OfferTierShape,
    coreOffer: OfferTierShape,
    highTicket: OfferTierShape,
    directorPayload: z.object({ offer: z.string() }).passthrough(),
  })
  .passthrough();

// ---------------------------------------------------------------------------
// Influencer Forge (generateInfluencerScript) — CCC framework
// ---------------------------------------------------------------------------

const INFLUENCER_CONTENT_STRATEGY = {
  'MEDIA_GAME': {
    type: 'Story',
    focus: 'Climax Start / Emotional High-Stakes',
    rule: "Start at the most painful or exciting moment. No 'Once upon a time'.",
  },
  'COMMODITY_VIBE': {
    type: 'Demonstration',
    focus: 'Result First / Visual Speed',
    rule: 'Show the perfect outcome in Scene 1. Skip the setup.',
  },
  'PRODUCT_EDUCATION': {
    type: 'Tutorial',
    focus: 'The Gap Strategy',
    rule: 'State the Pain vs. the Dream. Bridge it in 3 fast steps.',
  },
  'B2B_AUTHORITY': {
    type: 'Educational',
    focus: 'Negative Hook / Pattern Interrupt',
    rule: "Start by challenging a common belief. Use: 'Your [Topic] is failing because...'",
  },
} as const;

export interface InfluencerScriptFlowInput {
  config: InfluencerConfig;
  input: InfluencerStrategicInput;
  dayNumber: number;
  seriesContext: string;
}

export const buildInfluencerScriptPrompt = (payload: InfluencerScriptFlowInput): string => {
  const { config, input, dayNumber, seriesContext } = payload;
  const game = config.monetizationGame || 'B2B_AUTHORITY';
  const strategy = INFLUENCER_CONTENT_STRATEGY[game] || INFLUENCER_CONTENT_STRATEGY['B2B_AUTHORITY'];

  return `
### ROLE: MASTER VIRAL SCRIPTWRITER (CCC FRAMEWORK)
Your goal is to create a script that is 20% shorter than average to maximize completion rates.

### THE STRATEGY: ${strategy.type}
- FOCUS: ${strategy.focus}
- CORE RULE: ${strategy.rule}
- DAY NUMBER: ${dayNumber}
- SERIES CONTEXT: ${seriesContext}

### STRATEGIC BLUEPRINT (THE INTEL):
- SUBJECT: ${input.subject}
- OFFER: ${input.offer}
- DREAM_AVATAR: ${input.dreamCustomer}
- BLEEDING_NECK: ${input.bleedingNeck} (Use for the Pain)
- MAGIC_GENIE: ${input.magicGenie} (Use for the Dream)
- RAW_EVIDENCE: ${input.rawEvidence} (The Proof)
- CONTRARIAN_TRUTH: ${input.contrarianTruth} (The Hook)

### WRITING STRICTURES (NON-NEGOTIABLE):
1. HOOK (Line 1): Negative/Pattern Interrupt. Strictly 3s / 5-8 words. No "Hi guys".
2. BRIDGE (Line 2): Risk Reversal. Answer "Why should I trust you?" or "What happens if I stop watching?".
3. THE SLIDE (Lines 3-8): CCC Progression (Connection, Content, Call-to-Action). 7-12 words per line.
4. LANGUAGE: ${(config as any).language === 'TAGLISH' ? 'Conversational Taglish (Kanto-Style / Street Smart).' : (config as any).language === 'FILIPINO' ? 'Natural Filipino / Tagalog (Kanto-Style / Street Smart).' : 'Direct Response English (4th Grade Level).'}
5. IMPACT WORDS: Use (Stupid, Killing, Cheat-code, Secret, Warning, Truth).
6. NO JARGON: Clear beats clever.

### SCRIPT STRUCTURE (8 LINES):
1. HOOK: Negative/Pattern Interrupt (Challenge a belief or show a shocking result).
2. BRIDGE: Risk Reversal / The Hook's Payoff.
3. CONNECTION: Relate to the ${input.dreamCustomer}'s struggle.
4. CONTENT_1: First step of the 'Secret Sauce'.
5. CONTENT_2: Second step / Inject ${input.rawEvidence}.
6. CONTENT_3: The outcome / ${input.magicGenie}.
7. CALL_TO_ACTION: Immediate action. "Do this one thing right now."
8. THE EXIT: Soft CTA linking to ${input.offer}.

### DIRECTOR_CRITIQUE_PROTOCOL:
Explain why this script flow creates the "Slide" effect for ${input.dreamCustomer}.
Provide a "daySummary" (max 20 words) for the mission log.

Return valid JSON: { "hook": "...", "body": ["line1", "line2", ...], "strategicAudit": "...", "daySummary": "..." }
  `;
};

export const parseInfluencerScriptResponse = (rawText: string): InfluencerScriptResponse => {
  return JSON.parse(cleanJson(rawText || '{}')) as InfluencerScriptResponse;
};

// Flow-output validation (P1). A usable influencer script needs a spoken hook and at
// least one body line; strategicAudit / daySummary pass through.
export const InfluencerScriptOutputSchema = z
  .object({
    hook: z.string().min(1),
    body: z.array(z.unknown()).min(1),
  })
  .passthrough();

// ---------------------------------------------------------------------------
// Wizard Storyboard (generateStoryboard) — Cinematic relay + STILL_FRAME_RULE +
// APPEARANCE_LOCK_RULE + Temu/MrBeast strategy + DIRECTOR_CRITIQUE
// ---------------------------------------------------------------------------

export interface StoryboardFlowInput {
  script: string[];
  avatarDescription: string;
  businessInfo: BusinessInfo;
  ethnicity: string;
  language: 'English' | 'Taglish';
}

export const buildStoryboardPrompt = (payload: StoryboardFlowInput): string => {
  const { script, avatarDescription, businessInfo, ethnicity, language } = payload;
  const fullScript = script.join('\n');
  const productDesc = businessInfo.productImageDescription || 'N/A';
  const isTemu = businessInfo.scriptType === 'Temu';
  const isServices = businessInfo.scriptType === 'Services';
  const isRealEstate = businessInfo.scriptType === 'RealEstate';
  const isUGCPro = businessInfo.scriptType === 'UGCPro';
  // Slice 4: non-product verticals reach UGC Pro. `bt` gates the non-product arms
  // below; the product path emits byte-for-byte what it did before Slice 4.
  const bt = businessInfo.businessType ?? 'product';
  // Any of the 5 typed UGC Pro formats selects its own storyboard arm; only an
  // unknown/undefined value degrades to 'transformation' (the safe Before & After default).
  const ugcSub = (businessInfo.ugcProFormat === 'tryon' || businessInfo.ugcProFormat === 'unboxing'
    || businessInfo.ugcProFormat === 'demo' || businessInfo.ugcProFormat === 'transformation'
    || businessInfo.ugcProFormat === 'tutorial') ? businessInfo.ugcProFormat : 'transformation';

  const DIRECTOR_CRITIQUE_INSTRUCTION = `
    **DIRECTOR_CRITIQUE_PROTOCOL:**
    Include a field "strategicAudit" in your JSON response.
    Act as a World-Class Creative Director. honestly critique the user's business inputs based on Sabri Suby's $100M Copy rules.
    Explain WHY this specific storyboard sequence and visual framing is strategically superior for conversion.
    Explain why specific B-Roll choices were made over talking heads.
    `;

  // Slice 4: extracted VERBATIM from the Services and RealEstate arms below so the
  // non-product UGC Pro arms can graft the same blocks. Content unchanged — TUNED.
  const PH_REALISM_SERVICES = `**PHILIPPINE GROUND-TRUTH REALISM (mandatory, ALL archetypes):**
        - This is a Philippine SMB. Depict the service as it really appears in the Philippines —
          true-to-life and true-to-THEIR-TIER. NOT a Western, luxury, or idealized version.
        - Treat the uploaded photo description ("${productDesc}") as VISUAL GROUND TRUTH; match the
          actual vibe, tier, and look the photos show. VENUE-LED → render a venue that resembles
          THEIR place's real style/level (do NOT upgrade a modest spa into a 5-star resort).
          WORK-LED → render plain crew / plain vehicle as shown (never a shiny branded truck or uniform).
        - FORBIDDEN: inventing interiors / equipment / vehicles / signage grander or different from
          what the photos/description evidence. When unsure: VENUE-LED → still show the venue, kept
          simple and true-to-tier; WORK-LED → favor the customer/problem/relief over a guessed gear shot.
        - FORBIDDEN AESTHETIC WORDS (in every scene's imagePrompt / startFramePrompt / endFramePrompt):
          never write "high-end", "luxury", "luxurious", "premium", "upscale", "elegant", "5-star",
          "resort", "boutique-hotel", "modern minimalist", or "sleek" for a VENUE-LED scene. Even when
          the brief, differentiator, benefit, or offer uses aspirational / "luxury" language, IGNORE it
          for the VISUALS — the uploaded photo's tier is the ONLY ground truth. Render the venue at its
          real, modest, true-to-tier level (warm, simple, lived-in, authentically Filipino).
        - Setting, faces, clothing, vehicles, signage, props must read authentically Filipino.`;
  const PH_REALISM_RE = `**PHILIPPINE GROUND-TRUTH REALISM (mandatory):**
        - This is a Philippine property. Treat the uploaded photo description ("${productDesc}") as
          VISUAL GROUND TRUTH; render the property true-to-its-real-TIER. A modest unit stays modest —
          do NOT upgrade a townhouse into a luxury penthouse.
        - FORBIDDEN: inventing rooms / views / amenities / finishes grander or different from what the
          photos/description evidence.
        - FORBIDDEN AESTHETIC WORDS (in every scene's imagePrompt / startFramePrompt / endFramePrompt):
          never write "high-end", "luxury", "luxurious", "premium", "upscale", "5-star", "resort",
          "modern minimalist", or "sleek" unless the uploaded photo's tier actually evidences it. Even
          when the brief/differentiator/benefit uses aspirational language, IGNORE it for the VISUALS —
          the uploaded photo's tier is the ONLY ground truth.
        - Setting, faces, clothing, signage, props must read authentically Filipino.`;

  let strategyInstructions = '';
  if (isTemu) {
    strategyInstructions = `
        **STRATEGY: TEMU / VIRAL HAUL (RAPID CUTS)**
        **CRITICAL RULE:** DO NOT describe a "sequence" or "montage" in a single scene. You MUST break every action into a separate scene.

        **REQUIRED SCENE BREAKDOWN (Aim for 6-9 Scenes):**
        1. **SCENE 1 (THE HOOK):** Visual Trigger / Pattern Interrupt (Start/End Frames).
        2. **SCENE 2 (UNBOXING):** Close up of hands tearing package or opening box. (1.5s)
        3. **SCENE 3 (REVEAL):** Pulling the item out. (1.5s)
        4. **SCENE 4 (ASSEMBLY/ACTION):** Clicking parts together or applying product. (1.5s)
        5. **SCENE 5 (USAGE):** The product in action. (2s)
        6. **SCENE 6 (PAYOFF):** The final satisfying result. (2s)
        7. **SCENE 7 (VIBE CHECK/REACTION):** Aesthetic shot or Avatar reaction.
        8. **SCENE 8 (CTA):** "Link in bio" / "Yellow Basket" overlay.

        **VISUAL STYLE:**
        - ${ethnicity} Context.
        - High-key lighting, fast motion, handheld feel.
        - Focus on HANDS and OBJECTS for scenes 2-6.
        `;
  } else if (isServices) {
    strategyInstructions = `
        **STRATEGY: CUSTOMER-TESTIMONIAL SERVICE AD (works for ANY service — salon, gym,
        clinic, restaurant, laundry, cleaning, pest, repair, tutor, advisor, events, etc.)**
        1. **SCENE 1 (THE HOOK) = THE PROBLEM / desire, not a product reveal.** Open on the
           real-world pain or longing the customer felt (the mess/worry/before-state, OR for
           appearance/venue services the "before" or the moment of wanting). NO product to reveal.
        2. **SCENE 2 (THE CONNECTION):** **MUST be "Avatar Talking"** — the avatar is the CUSTOMER
           sharing their story (NOT the business pitching). Bridge from the hook.
        3. **MIDDLE SCENES:** Alternate **Avatar Talking (customer)** with **Service B-Roll** —
           the service happening and the RESULT. (See SERVICE ARCHETYPE for what the b-roll shows.)
        4. **FINAL SCENE (CTA):** Customer recommending + a book/inquire gesture (phone/message).

        **SERVICE ARCHETYPE — decide what the b-roll SHOWS (infer from the service + photos):**
        - **VENUE-LED** (spa, salon, clinic, gym, restaurant, hotel, café): the PLACE is the draw.
          SHOWCASE the venue — interiors, ambiance, the experience — so the viewer FEELS what it's
          like to be there and wants to visit. Do NOT suppress venue shots; they are the selling power.
        - **WORK/RESULT-LED** (cleaning, pest, siphoning, repair, laundry): the RESULT is the draw.
          Lead with problem→relief and DE-EMPHASIZE equipment/gear (it isn't attractive). Humble.
        - **PRACTITIONER-LED** (advisor, coach, tutor, agency): the PERSON is the draw. Lean on the
          customer + the outcome; minimal b-roll.

        ${PH_REALISM_SERVICES}
        `;
  } else if (isRealEstate) {
    strategyInstructions = `
        **STRATEGY: AGENT-LED PROPERTY WALKTHROUGH**
        1. **SCENE 1 (THE HOOK):** the dream/standout or an establishing EXTERIOR of the property —
           NOT a product reveal, NOT a held object. Open on the place or the feeling of living there.
        2. **SCENE 2 (THE CONNECTION):** **MUST be "Avatar Talking"** — the AGENT/seller introducing
           the place in their own voice (NOT a customer testimonial). Bridge from the hook.
        3. **MIDDLE SCENES:** Alternate **Avatar Talking (agent)** with **Property B-Roll** — the
           rooms, spaces, view, and amenities being toured. (See REAL-ESTATE ARCHETYPE below.)
        4. **FINAL SCENE (CTA):** the agent inviting the viewer to message / book a viewing (phone/
           message gesture).

        **REAL-ESTATE ARCHETYPE — decide what the b-roll SHOWS (infer from the listing + photos):**
        - **LISTING** (one house/condo/lot): the PROPERTY's spaces are the draw — facade, sala,
          kitchen, bedroom, view. Walk the viewer through it so they picture themselves living there.
        - **AGENT** (personal brand): the AGENT is the draw — feature them on camera + a listing or two
          as proof they deliver. Lean on trust.
        - **DEVELOPER** (pre-selling): the PROJECT is the draw — model unit, amenities, location/site,
          render/turnover.

        ${PH_REALISM_RE}
        `;
  } else if (isUGCPro) {
    strategyInstructions = bt === 'realestate' ? `
        **STRATEGY: UGC PRO — CONTINUOUS PERFORMANCE (Tutorial — REAL ESTATE)**
        1. **ONE AGENT, ONE PROPERTY.** Same agent, same property, every scene. No metaphor
           scenes, no stock-footage skylines, no environment-only B-roll.
        2. **HARD CUTS ONLY.** Omit \`transitionEffect\` on every scene, including Scene 1.
        3. **BEATS (5 scenes — ONE tip per scene; the caption system numbers them
           downstream):**
           S1 HOOK — the agent to camera at the property (facade or doorway).
              venueSlot="facade" if uploaded. referenceImage="avatar".
           S2–S4 TIPS 1-2-3 — one tip per scene, the agent INSIDE the space the tip
              references (title talk in the sala, light check at the window, dues talk at
              the amenities). Set venueSlot to the matching uploaded room.
              referenceImage="avatar".
           S5 TAKEAWAY + CTA — the agent closes with the message/viewing invite.
              venueSlot="facade" if it fits. referenceImage="avatar".

        ${PH_REALISM_RE}
        ` : (bt === 'service' && ugcSub === 'tutorial') ? `
        **STRATEGY: UGC PRO — CONTINUOUS PERFORMANCE (Tutorial — SERVICE)**
        1. **ONE OPERATOR, ONE JOBSITE.** Same operator, same job location, every scene.
           No metaphor scenes, no environment-only B-roll, no gear glamour.
        2. **HARD CUTS ONLY.** Omit \`transitionEffect\` on every scene, including Scene 1.
        3. **BEATS (5 scenes — ONE step per scene; the caption system numbers them
           downstream):**
           S1 HOOK — the operator to camera at the jobsite. referenceImage="avatar".
           S2–S4 STEPS 1-2-3 — one step per scene, the REAL work mid-performance, tools in
              honest use. venueSlot="staff" or "interior" where the uploads fit.
              referenceImage="avatar" on EVERY step — "none" is FORBIDDEN here. A
              hands-only step is STILL the same operator: the forearm, the sleeve and the
              skin tone are all in frame, so dropping the anchor renders a DIFFERENT
              person's hands in the middle of a one-operator ad.
           S5 RESULT + CTA — the finished work shown, operator closes with the book invite.
              venueSlot="after" if uploaded. referenceImage="avatar".

        ${PH_REALISM_SERVICES}
        ` : bt === 'service' ? `
        **STRATEGY: UGC PRO — CONTINUOUS PERFORMANCE (Before & After — SERVICE)**
        1. **ONE OPERATOR, ONE JOBSITE.** Every scene is the SAME operator at the SAME job
           location. No metaphor scenes, no environment-only B-roll, no branded-truck or
           gear-glamour shots.
        2. **HARD CUTS ONLY.** Omit \`transitionEffect\` on every scene, including Scene 1.
        3. **BEATS (4 scenes):**
           S1 HOOK — the PROBLEM, close-up (the stained sofa, the clogged drain, the
              damaged surface). The before-state IS the hook. NO operator, NO gear in
              this frame. venueSlot="before" if uploaded. referenceImage="none".
           S2 THE WORK — the operator's hands + tool mid-action on the problem. Honest
              working posture, NOT a posed crew shot. referenceImage="avatar", MANDATORY —
              "none" is FORBIDDEN here. A hands-only beat is STILL the same operator: the
              forearm, the sleeve and the skin tone are all in frame, so dropping the
              anchor renders a DIFFERENT person's hands in the middle of a one-operator
              ad. (S1 and S3 above keep "none" on purpose — those two beats have NO
              operator in frame at all, by their own instruction.)
           S3 INSTANT REVEAL — the hard-cut after-state, framed IDENTICALLY to S1 (same
              angle, same distance, same lighting) so the change is the only variable.
              venueSlot="after" if uploaded. referenceImage="none".
           S4 VERDICT — the operator to camera, verdict + book CTA. referenceImage="avatar".

        **APPEARANCE-CLAIM GUARDRAIL (Meta policy — applies to imagePrompt, not just script):**
        If the transformation is on a PERSON (skin, hair, body — derma/salon/clinic services
        included), the after-frame shows glow / freshness / ease — never a clinical or
        corrective depiction. Do NOT render dermatological severity in the before frame and
        do NOT render a "cured" after. Surfaces, spaces, fabrics, and objects may show
        dramatic before/after freely.

        ${PH_REALISM_SERVICES}
        ` : ugcSub === 'tryon' ? `
        **STRATEGY: UGC PRO — CONTINUOUS PERFORMANCE (Virtual Try-On)**
        1. **ONE PERFORMER, ONE PLACE.** Every scene is the SAME creator in the SAME room. Do not
           change location, time of day, or wardrobe except where the beat demands it (the worn
           reveal). No metaphor scenes. No environment-only B-roll.
        2. **HARD CUTS ONLY.** Omit \`transitionEffect\` on every scene, including Scene 1.
        3. **BEATS (4-5 scenes):**
           S1 HOOK — product in-hand or on-hanger, creator mid-decision, talking to camera. The
              garment is NOT yet worn. referenceImage="both".
           S2 WORN REVEAL — the hard cut. Same creator, same room, now wearing it. The VISUAL
              carries the reveal. referenceImage="avatar".
           S3 FIT-PROOF / STYLING — the objection-killing action beat (movement, stretch, drape,
              a turn). Show the garment doing the thing the buyer doubts. referenceImage="avatar".
           S4 VERDICT — closer framing on the creator, keep-it verdict + soft CTA.
              referenceImage="avatar".
           An optional 5th scene may split styling and verdict. Never exceed 5.
        ` : ugcSub === 'unboxing' ? `
        **STRATEGY: UGC PRO — CONTINUOUS PERFORMANCE (Unboxing)**
        1. **ONE PERFORMER, ONE PLACE.** Same creator, same surface, every scene. No
           metaphor scenes, no environment-only B-roll.
        2. **HARD CUTS ONLY.** Omit \`transitionEffect\` on every scene, including Scene 1.
        3. **BEATS (4 scenes):**
           S1 HOOK — the sealed package on the surface, the creator's hands on it
              (taps / mic-check framing). referenceImage="product" (or "both" if the
              creator's face is in frame).
           S2 THE OPEN — hands mid-open, lid or flap lifted, contents just visible.
              referenceImage="both".
           S3 TACTILE SHOWCASE — extreme close-up of the texture beat (foam, wrap,
              finish, click mechanism). referenceImage="product".
           S4 PLACE/WEAR + CTA — the product where it lives, creator in frame.
              referenceImage="both".
           An overhead or locked-off framing variant is allowed — state it in the
           sceneDescription.
        ${businessInfo.asmrFlag ? `
        **ASMR TREATMENT:** Every scene favors EXTREME tactile close-ups and a
        locked-off or overhead camera. Hands and textures over faces. Describe surfaces
        and materials concretely in the imagePrompt (matte foam, glossy seal, brushed
        metal) — texture is the subject.
        ` : ''}
        ` : ugcSub === 'demo' ? `
        **STRATEGY: UGC PRO — CONTINUOUS PERFORMANCE (Demo / Addiction)**
        1. **ONE PERFORMER, ONE PLACE.** Same creator, same location, every scene. No
           metaphor scenes, no environment-only B-roll.
        2. **HARD CUTS ONLY.** Omit \`transitionEffect\` on every scene, including Scene 1.
        3. **BEATS (5 scenes — the fastest cuts of the family):**
           S1 HOOK — creator talking to camera, product in-hand. referenceImage="both".
           S2 DEMO — the product mid-action on its main job. referenceImage="both".
           S3 ESCALATION — the hidden feature or harder test, in action.
              referenceImage="both".
           S4 PAYOFF — the stunt or sensory extreme close-up (the retention beat).
              referenceImage="product" (or "both" if the payoff is on the creator).
           S5 CTA — the creator, spoken close. referenceImage="avatar".
        ` : ugcSub === 'tutorial' ? `
        **STRATEGY: UGC PRO — CONTINUOUS PERFORMANCE (Tutorial / Hack)**
        1. **ONE PERFORMER, ONE PLACE.** Same creator, same location, every scene. No
           metaphor scenes, no environment-only B-roll.
        2. **HARD CUTS ONLY.** Omit \`transitionEffect\` on every scene, including Scene 1.
        3. **BEATS (5 scenes — ONE step per scene; the caption system numbers them
           downstream):**
           S1 HOOK — the pain or question, creator to camera. referenceImage="avatar".
           S2–S4 STEPS 1-2-3 — one step per scene, the action mid-performance, product
              visible where the step uses it. referenceImage="both".
           S5 RESULT + CTA — the outcome shown, creator closes. referenceImage="both".
        ` : `
        **STRATEGY: UGC PRO — CONTINUOUS PERFORMANCE (Before & After)**
        1. **ONE PERFORMER, ONE PLACE.** Same creator, same location, every scene. No metaphor
           scenes, no environment-only B-roll.
        2. **HARD CUTS ONLY.** Omit \`transitionEffect\` on every scene, including Scene 1.
        3. **BEATS (4 scenes):**
           S1 HOOK — the PROBLEM, close-up. The before-state IS the hook. NO product anywhere in
              this frame. PERSON TRANSFORMATION (skin, hair, face, body): referenceImage="avatar",
              MANDATORY — the same performer must carry the before-state, and "none" is FORBIDDEN
              here. Only a NON-person transformation (a surface, fabric, object, garment, or space)
              may use referenceImage="none".
              **SHOW THE FLAW, DO NOT MERELY MENTION IT (scroll-stop rule).** The first 3 seconds
              are decided by the EYE, not the ear. Build the imagePrompt as: (a) an EXTREME
              CLOSE-UP on the problem area itself — the cheek, the spots, the roots, the stain —
              filling the frame, not a neutral portrait of someone who happens to be unhappy;
              (b) the performer INDICATING it, one finger or fingertips touching or drawing
              attention to the exact spot; (c) the camera moving IN on it. A hook where nothing
              is pointed at gives the viewer nothing to look at, and they scroll.
              ⚠️ The indicating hand must NOT cover the face — it touches beside or below the
              flaw, never across the eyes, nose or mouth. EXPRESSION CEILING still applies here
              in full: a slight frown, never a scrunch, never dismay.
           S2 APPLICATION — the product enters mid-action, WORKING, never posed on a surface.
              referenceImage="both".
           S3 INSTANT REVEAL — the hard-cut after-state, framed IDENTICALLY to S1 (same angle,
              same distance, same lighting) so the change is the only variable. PERSON
              TRANSFORMATION: referenceImage="avatar", MANDATORY — the after-state is only proof
              if it is the SAME FACE as S1, so "none" is FORBIDDEN here. Only a NON-person
              transformation may use referenceImage="none".
           IDENTITY RULE (overrides any per-scene preference above): in a PERSON transformation
              every one of the 4 scenes carries the avatar — S1 "avatar", S2 "both", S3 "avatar",
              S4 "avatar". One ad, one face. A scene that drops the avatar renders a DIFFERENT
              PERSON and destroys the before/after proof the format exists to deliver.
           S4 VERDICT — the creator, verdict + soft CTA. referenceImage="avatar".

        **APPEARANCE-CLAIM GUARDRAIL (Meta policy — applies to imagePrompt, not just script):**
        If the transformation is on a PERSON (skin, hair, body), the after-frame shows glow / freshness
        / ease — never a clinical or corrective depiction. Do NOT render dermatological severity in the
        before frame (no cystic acne, no open lesions, no medical redness) and do NOT render a
        "cured" after. Surfaces, fabrics, and objects may show dramatic before/after freely.
        `;
  } else {
    strategyInstructions = `
        **STRATEGY: NARRATIVE RETENTION RHYTHOR**
        0. **ONE PERFORMER, ONE PLACE.** Every scene that SHOWS the performer happens in the
           SAME room, with the same furniture and surfaces in frame. Name that room in the
           first performer scene and repeat it VERBATIM in every later performer scene. Do not
           walk them through the house: a real person filming a 30-second review does not
           change rooms four times, and each new room drags in its own surfaces (a wooden
           vanity, a stone counter) that make one beat stop matching the others even when the
           light is identical. Product-only B-roll with NO person in frame is exempt, and so is
           Scene 1's metaphor still.
        1. **SCENE 1 (THE HOOK):** Visual Metaphor/Pattern Interrupt (Start/End Frames).
        2. **SCENE 2 (THE CONNECTION):** **MUST be "Avatar Talking"** (Bridge the hook).
        3. **MIDDLE SCENES:** Alternate between **Product B-Roll** and **Avatar Talking**.
        4. **FINAL SCENE (CTA):** Product Shot or Avatar pointing.
        `;
  }

  // Phase 2 (Services): tell the model to tag each place/result/staff scene with the best-fitting
  // UPLOADED slot, chosen ONLY from what the user actually uploaded. Empty list → no block →
  // current prompt unchanged. Renderer (Slice 5) consumes scene.venueSlot to anchor the real photo.
  const availableServiceSlots = (businessInfo.servicePhotos || []).map(p => p.slot);
  // Slot→meaning legend differs by style: Services venues vs RealEstate property rooms. Same routing
  // mechanism (renderer consumes scene.venueSlot to anchor the real photo); only the mapping changes.
  const slotLegend = (isRealEstate || (isUGCPro && bt === 'realestate')) ? `
        establishing / arrival / exterior shot      -> facade
        inside a room being toured                  -> living, kitchen, bedroom, or bathroom (pick the fitting one)
        the view / balcony / outlook beat           -> view
        amenities (pool / gym / lobby) beat         -> amenities
        the neighborhood / location beat            -> location` : (isUGCPro && bt === 'product') ? `
        the product held / on its own              -> hero
        the garment or item WORN on the body       -> onbody
        the box, wrapper, or packaging             -> packaging
        the product mid-use / mid-application      -> inuse
        the problem / before-state                 -> before
        the result / after-state                   -> after` : `
        establishing / arrival ("dinala ako sa...") -> exterior
        the service happening / inside the place    -> interior
        mood / relief / ambiance beat               -> ambiance
        the practitioner or staff at work           -> staff
        the problem / before-state                  -> before
        the result / after-state                    -> after`;
  const venueSlotRouting = ((isServices || isRealEstate || isUGCPro) && availableServiceSlots.length > 0) ? `
      **VENUE_SLOT_ROUTING (anchor scenes to the user's REAL uploaded photos):**
      The user uploaded real photos tagged by slot. AVAILABLE SLOTS: ${availableServiceSlots.join(', ')}.
      For each scene that depicts the ${(isRealEstate || (isUGCPro && bt === 'realestate')) ? 'PROPERTY, a ROOM, the VIEW, AMENITIES, or the LOCATION' : (isUGCPro && bt === 'service') ? 'JOBSITE, the WORK, or the BEFORE/AFTER' : isUGCPro ? 'PRODUCT, a product STATE, or the BEFORE/AFTER' : "business's PLACE, RESULT, or STAFF"}, add a "venueSlot" field set to
      the ONE available slot that best fits — chosen ONLY from the list above. Map by meaning:${slotLegend}
      Rules: use a slot ONLY if it is in AVAILABLE SLOTS; if none fits, OMIT "venueSlot" (renderer falls
      back to representative generation). NEVER invent a slot not in the list.${isRealEstate
        ? ' AGENT-IN-PROPERTY: for an Avatar talking scene (referenceImage="avatar") where the agent is in a specific SPACE of the property — INSIDE a room (touring the sala -> living, kitchen -> kitchen, a bedroom -> bedroom) OR OUTSIDE at the building exterior / entrance, INCLUDING the closing / CTA shot at the facade (-> facade) — ALSO set "venueSlot" to that space so the agent is composited into the REAL place, not a lookalike. Only OMIT "venueSlot" on a neutral talking head not tied to any space.'
        : (isUGCPro && bt !== 'product')
        ? ' For UGC Pro, the operator/agent IS in nearly every scene, so a scene may carry BOTH referenceImage="avatar" AND a venueSlot — set "venueSlot" whenever the scene depicts a real uploaded place or state (the problem -> before, the finished work -> after, a toured room -> its room slot). OMIT it only on a neutral talking-head not tied to any place or state.'
        : isUGCPro
        ? ' For UGC Pro, the creator IS in nearly every scene, so a scene may carry BOTH referenceImage="avatar" AND a venueSlot — set "venueSlot" whenever the scene depicts one of the real uploaded product states above (the worn garment -> onbody, the application -> inuse, the after-reveal -> after). OMIT it only on a pure talking-head with no product state in frame.'
        : ' Avatar talking-head scenes (referenceImage="avatar") OMIT "venueSlot".'}
  ` : '';

  return `
      You are an Expert Viral Video Strategist.
      Task: Create a detailed frame-by-frame storyboard JSON.

      **VISUAL PURITY RULE:**
      "The \`sceneDescription\` and \`imagePrompt\` MUST describe the physical scene only.
      - **FORBIDDEN:** Do not include instructions like 'Show text overlay', 'Text on screen says...', or 'Phone screen showing 50%'.
      - Text belongs in the Audio/Script, NEVER in the image generation prompt."

      ${isUGCPro ? `**PACING RULE (UGC Pro override):**
      "This format is a CONTINUOUS PERFORMANCE. The 3-consecutive-Avatar-Talking ban is LIFTED —
      the same creator may appear, talking, in every single scene. That is correct and expected.
      What is BANNED instead: cutting away to a Visual Metaphor scene, an environment-only
      establishing shot, or any scene the performer is absent from without a product reason
      (a close-up of the product in their hands or the before/after surface is fine)."` : `**PACING RULE:**
      "You MAY have up to **2 consecutive** 'Avatar Talking' scenes.
      **YOU MUST NOT HAVE 3 CONSECUTIVE 'AVATAR TALKING' SCENES.**
      If you have 2 Avatars in a row, the 3rd scene **MUST** be a 'Product B-Roll', 'Reaction', or 'Visual Metaphor'.

      WRONG: Scene 2 = Avatar Talking / Scene 3 = Avatar Talking / Scene 4 = Avatar Talking — this is 3 consecutive and BANNED. The 4th-scene b-roll does not retroactively legalize three talkers in a row.
      RIGHT: Scene 2 = Avatar Talking / Scene 3 = Avatar Talking / Scene 4 = Product B-Roll / Scene 5 = Avatar Talking."`}

      **STILL_FRAME_RULE:**
      The fields \`imagePrompt\`, \`startFramePrompt\`, and \`endFramePrompt\` are rendered as STILL IMAGES. They MUST be static compositions, NOT motion-verb prose.

      FORBIDDEN motion verbs (the still cannot render motion):
      - "pulling away", "moving toward", "flowing", "shaking", "rotating", "spinning", "running", "pouring"
      - TRANSITION/REVEAL verbs (these belong ONLY in transitionEffect, NEVER in a frame prompt): "disintegrating", "dissolving", "materializing", "revealing", "forming", "assembling", "pixelating", "morphing into", "transforming into", "emerging from".
      - Any verb that describes WHAT IS HAPPENING during a moment of motion.

      REQUIRED — describe the static end-state, the frozen instant:
      - WRONG: "A hand pulling away from the sink, coffee splattering."
      - RIGHT: "A hand visible mid-frame above the sink, palm facing away, frozen in air, coffee droplets caught suspended around it, freeze-frame composition."

      Motion lives in \`transitionEffect\` (e.g., "Explosion Reveal", "Character Morph") — that field describes the MOTION between two stills. The frame prompts describe two STILL moments. Frames = stills. Transitions = motion.

      **PRODUCT_TRUTH_RULE (every frame prompt, every scene):**
      The uploaded product photo is the ONLY product that exists. A frame prompt may name what is
      visibly IN that photo, and nothing else.

      BANNED unless the uploaded photo actually shows it: an outer box, carton, pouch, sachet,
      refill, tube, jar, second bottle, gift set, tray, sleeve, branded bag, or any other packaging
      or branded prop. Also banned: a quantity the photo does not show ("three bottles", "a row of
      jars", "the full set").

      The image model obeys this field literally, so naming a package here MAKES one. A rendered
      package the business never produced is a fake product on a real brand's ad: it cannot be
      shipped, a customer cannot recognise it, and it is worse than an ugly frame because it looks
      finished. Naming ONLY the real product is always safe; the still is allowed to be simple.

      - WRONG: "the serum bottle positioned next to its outer package box" (the upload is a bottle
        alone, so the box is invented)
      - RIGHT: "the serum bottle standing upright on a clean wooden table, front label facing camera"
      - RIGHT: "the serum bottle beside a plain unbranded ceramic dish" (an unbranded prop is fine —
        an invented BRANDED one is not)

      If a scene needs more visual weight than the single product carries, add UNBRANDED staging:
      cloth, a plain surface, water, plain glassware, ordinary household objects. Never a second
      branded object. And if the chosen format seems to call for packaging the photo does not show
      (an unboxing with no box in the upload), keep the reveal on the product itself — a format is
      not a licence to invent inventory.

      ${isServices ? `**HOOK FRAMES (Scene 1, Services) = THE PROBLEM, NO product reveal:** The start and end frames depict the real-world PROBLEM moment (the mess, the worry, the before-state) as an environment / object / situation — authentically Filipino and humble. There is NO product to reveal; do NOT place, "reveal", or invent any gadget, device, branded vehicle, uniform, or imported equipment in the hook. Keep both stills STATIC. The two frames MAY share one named dominant color + silhouette position for a clean transition, but the anchor comes FROM THE PROBLEM SCENE (e.g. an overflowing drain, a cluttered room, a worried face at home), never from a product. **CUSTOMER-COHERENCE:** If the hook depicts a person (the sufferer), render them the SAME gender and approximate age as the Character/customer described in this brief — the hook sufferer IS the same person who later tells the testimonial, so they must not differ in gender.` : isUGCPro ? `**HOOK FRAMES (Scene 1, UGC Pro) = A HARD CUT, NOT A MORPH:** This format has NO transition
      into scene 2 — the cut IS the effect. Scene 1 emits a SINGLE \`imagePrompt\` exactly like scenes
      2+. Do NOT emit \`startFramePrompt\`, \`endFramePrompt\`, or \`transitionEffect\` for Scene 1 or for
      ANY scene. There is no metaphor still, no anchor color, no silhouette match, no reveal. The
      hook is the creator, on camera, in the room where the whole ad happens — talking. Keep the
      still STATIC (STILL_FRAME_RULE applies in full).` : isRealEstate ? `**HOOK END-FRAME = RESOLVED REVEAL (Scene 1 endFramePrompt):** The hook's end frame is the moment AFTER the transition completes — the product is ALREADY fully revealed, sitting still and intact in frame. Describe ONLY that finished state (e.g., "The [product] sitting centered on a clean counter, front label facing camera, sharp focus"). Do NOT narrate the reveal itself (no "disintegrating to reveal", no "pixels forming into"). NO people, faces, hands, or bodies in the hook end frame unless the avatar is explicitly the subject of the reveal.

      **HOOK ANCHOR RULE (Scene 1 startFramePrompt + endFramePrompt):** The two stills MUST share ONE named concrete anchor: the SAME dominant color (named in BOTH prompts) AND the SAME silhouette occupying the SAME position in frame. **The anchor color comes FROM THE PRODUCT.** Derive the shared dominant color from the product's actual uploaded packaging, then design the START frame's subject/setting to carry that color naturally. NEVER recolor, mute, or restyle the product's packaging to match the start frame — the uploaded product photo is ground truth for the end frame. (e.g., product = vibrant orange coffee bag → start = "dark coffee grounds beside a burnt-orange ceramic mug, warm orange light, centered, filling the lower third of frame" → end = "the vibrant orange coffee bag, centered, filling the lower third of frame"). State the anchor color and the silhouette position explicitly in BOTH prompts. A morph between two frames that do not share color + silhouette position forces the video model to interpolate through formless flesh-toned mush — the single worst failure mode for the hook.

      **HOOK START-FRAME SUBJECT (Scene 1 startFramePrompt):** Name a concrete subject a viewer recognises in under one second. Naming only a material, texture, or colour ("a dry matte textured surface", "a rough neutral surface") is FORBIDDEN — with no subject named the model renders an arbitrary object (a pot, a stone, a wall) and the hook opens on something the viewer cannot decode.

      When the script's hook names a HUMAN problem or feeling, the subject MUST be that problem, shown on the person or what they are touching. When the hook names an object situation (a haul, an unboxing, a package), an object subject is correct — choose by what the hook actually says, not by format.

      Do NOT name a full face or eyes in the start frame: a face-to-product morph is the flesh-toned-mush failure this rule exists to prevent. A cropped body detail — a cheek, a forearm, hands, the surface being touched — carries the problem while keeping the anchor safe.

      (e.g., hook problem = dull tired skin, product = amber serum bottle → start = "an extreme close-up of a woman's dull, dry cheek in warm raking light, warm amber tones, centred, filling the frame" → end = "the amber serum bottle, centred, filling the frame")` : `**HOOK FRAMES = THE SCROLL-STOP (Scene 1, both frames):** These two stills exist to stop a thumb and open a curiosity gap in under one second. Build them from Scene 1's own scriptLine, NEVER from a template: the START frame shows the PROBLEM that line names, and the END frame shows the RESOLUTION that same line points to. A viewer who muted the ad must be able to read the hook line off these two frames alone. Two frames that share a colour but say nothing the script says are a FAIL, however clean the transition.

      **HOOK END-FRAME = THE PERFORMER WITH THE PRODUCT (Scene 1 endFramePrompt):** The end frame is the moment AFTER the transition completes: the SAME performer from the start frame, pulled back to chest framing, holding the product at the same position the start frame's detail occupied, product front label facing camera, sharp focus, still and intact. Describe ONLY that finished state. Do NOT narrate the reveal itself (no "disintegrating to reveal", no "pixels forming into"). The performer is REQUIRED here, not optional.

      **HOOK ANCHOR RULE (Scene 1 startFramePrompt + endFramePrompt):** The anchor is the PERFORMER'S OWN BODY, shared by construction rather than by matching. The START frame is a CROPPED detail of that performer -- whichever part of them the script's problem lives on or in: their skin, their hands, what they are holding or touching -- filling the frame at a named position. The END frame is that SAME performer pulled back, product held at that SAME position. Because the same person is in both stills, their skin tone carries across on its own; name that tone in BOTH prompts so it cannot drift. State the position explicitly in BOTH prompts.

      A start frame that is NOT this performer's body is BANNED -- a fruit, a fabric, a wall, any stand-in that merely happens to be a similar colour. It breaks the anchor and forces the video model to interpolate between two unrelated subjects, which is what produces formless flesh-toned mush, the worst failure mode for the hook. Do NOT name a full face or eyes in the start frame; a cropped detail carries the problem while keeping the anchor safe.

      The product does NOT carry the anchor and does not need to match anything. It enters only in the end frame, alongside the performer, and it keeps its real colour. NEVER recolor, mute, or restyle the product's packaging: the uploaded product photo is ground truth.

      **HOOK START-FRAME SUBJECT (Scene 1 startFramePrompt):** Name a concrete subject a viewer recognises in under one second. Naming only a material, texture, or colour ("a dry matte textured surface", "a rough neutral surface") is FORBIDDEN -- with no subject named the model renders an arbitrary object and the hook opens on something the viewer cannot decode.

      WORKED EXAMPLES -- three DIFFERENT products on purpose. Copy the STRUCTURE (cropped detail of the performer carrying the script's problem, then the same performer pulled back holding the product at the same position), NEVER the subject matter:
      - hook line names dark spots -> START "Extreme close-up of a dull, uneven patch of skin on a cheek, centred, filling the frame." END "The same performer pulled back to chest framing, holding the serum bottle at that same centred position, front label facing camera."
      - hook line names an aching back after a shift -> START "Extreme close-up of a hand pressed flat against a lower back, knuckles tight, centred, filling the frame." END "The same performer pulled back to chest framing, holding the patch box at that same centred position, front label facing camera."
      - hook line names a phone that dies by noon -> START "Extreme close-up of two hands cradling a phone showing a red low-battery bar, centred, filling the frame." END "The same performer pulled back to chest framing, holding the power bank at that same centred position, front label facing camera."`}

      **APPEARANCE_LOCK_RULE (when scene's referenceImage='avatar'):**
      The \`imagePrompt\`, \`startFramePrompt\`, and \`endFramePrompt\` MUST NOT describe the avatar's physical appearance. Identity is preserved by an upstream LOCK; redescribing it creates conflicts and corrupts the render.

      FORBIDDEN in avatar-scene prompts:
      - Wardrobe/clothing ("wearing a linen shirt", "in a denim jacket")
      - Hair ("with dark brown hair", "her ponytail")
      - Body type ("petite", "athletic build")
      - Face/skin descriptors ("with bright eyes", "her warm smile", "her face glowing")
      - Ethnicity/age descriptors ("Southeast Asian woman", "young Filipina")

      REQUIRED in avatar-scene prompts (describe ONLY these):
      - Action ("looking down", "gesturing", "sipping", "tapping the phone screen")
      - Expression, RESTRAINED — see the EXPRESSION CEILING below ("a small closed-lip smile", "a slight frown", "a calm, level look")
      - Gaze direction ("looking at the camera", "looking down at the mug")
      - Hand position + held props ("holding an empty mug", "hands on the counter")
      - Body pose ("standing", "sitting at the dining table", "leaning against the counter")
      - Spot within residence ("at the kitchen counter", "by the front door")
      - Light: ORDINARY ambient room light, and the SAME light in every scene of this ad.
        Say it plainly ("ordinary indoor daylight", "plain room light") or say nothing.
        BANNED **AS A DESCRIPTION OF THE LIGHT**, because they make one beat stop matching the
        others: warm, golden, amber, afternoon, sunset, cinematic, filmic, moody, studio,
        rim light, backlight, hard shadows, "sunlight hitting", "light from the window".
        The SAME words stay legal when they describe something that is not the light — a warm
        smile, an amber bottle, a golden label. NEVER restyle the product's real colour to obey
        this rule: the uploaded product photo is ground truth, and the hook's anchor colour is
        derived FROM it.

      WRONG: "A friendly Southeast Asian woman with dark brown hair, wearing a casual linen shirt, sitting at a modern Filipino home dining table, acting surprised while looking at a smartphone, warm sunlight hitting her face."
      WRONG: "Sitting at the dining table, looking at a smartphone, warm afternoon sunlight from the window."
      CORRECT: "Sitting at the dining table, a slight lift of the brows, looking at a smartphone, ordinary indoor daylight."

      **EXPRESSION CEILING (identity survives the CUT, not just the frame):**
      A storyboard still is the FIRST FRAME of a generated video clip, never a finished picture.
      A big expression costs identity twice: it deforms the face away from the locked reference
      IN the still, and then the video model relaxes it back toward neutral the moment the
      performer speaks — so the face visibly changes shape mid-clip and no longer matches the
      next scene. One ad, one face, and the cut is where a viewer detects an AI.

      Therefore, in EVERY avatar-scene prompt:
      - **Keep the register narrow and mouth-level.** A small closed-lip smile, a slight frown, a
        small brow lift, a calm level look. Emotion is carried by the SCRIPT LINE and by motion in
        the video stage — the still only has to stay recognisably the same person.
      - **BANNED in a still:** wide or open-mouth grins, laughter, teeth bared in delight, eyes
        wide in shock or surprise, squinting, scrunching, exaggerated dismay or confusion, and any
        hand covering, pressing, or scrunching the face.
      - **TEETH RULE:** if the locked reference photo does not show teeth, the prompt must not ask
        for a teeth-showing smile. A warm closed-lip smile reads just as happy and survives the cut.
      - **Intensity words are the tell.** "very", "extremely", "dramatically", "shocked",
        "ecstatic", "beaming", "overjoyed", "furious" do not belong in a frame prompt. Downgrade
        each to its smallest honest form.

      This rule OVERRIDES CINEMATIC VARIETY below: vary the POSE, the ACTION, the SPOT and the
      FRAMING freely — never vary the emotional intensity to create variety.

      **CONTEXT:**
      - **Type:** ${businessInfo.scriptType} Style
      - **Target Audience:** ${ethnicity} market.
      - **Language:** ${language}
      - **Character:** ${avatarDescription}
      - **Product:** ${businessInfo.product} (${productDesc})

      ${strategyInstructions}
      ${DIRECTOR_CRITIQUE_INSTRUCTION}

      **CINEMATIC VARIETY:** When creating Talking Avatar scenes, explicitly describe a different physical action for each (e.g., 'walking while talking', 'sitting at a desk', 'holding a phone', 'gesturing with both hands'). This ensures the background and pose change even if the face stays consistent.

      **HOOK LOGIC (SCENE 1):**
      - Prioritize Visual Metaphors: focusing on objects, hands, environment, or abstract triggers instead of a full person visual.
      - The goal is to maximize curiosity and pattern-interrupt. Show a full person ONLY if the script explicitly requires it.

      **VIRAL VFX MENU (FOR SCENE 1 ONLY):**
      Select the BEST VFX style for the hook:
      1. **Explosion Reveal**
      2. **Character Morph**
      3. **Teleport / Snap Cut**
      4. **Object Materialization**
      5. **Invisible Effect**
      6. **Chaos Burst**

      **VISUAL AUTHENTICITY RULE:**
      - All scene descriptions MUST imply a high-quality, relatable location for a **${ethnicity}** audience.
      - Avoid poverty/gritty vibes. Focus on aspirational settings consistent with the target market.

      **BAG_ORIENTATION_RULE (REQUIRED for any scene where the product bag/package appears, whether held by avatar or shown as B-roll):**
      The FRONT of the bag (the side bearing the product label, branding, or wordmark) MUST face the camera. The avatar's hand MAY occlude part of the bag's front (naturalistic and acceptable). The BACK of the bag facing camera, or the bag held with branding turned away from camera, is BANNED — the brand mark must remain visible enough to be recognized in a 3-second scrub. For product-only B-roll (no avatar in frame), the bag must be centered with the front fully visible. Whenever the imagePrompt or startFramePrompt/endFramePrompt mentions the bag/package/product, append "front of bag/label facing camera" to the description.

      **FACE_APPLICATION_RULE (REQUIRED for any scene depicting application of skincare, moisturizer, serum, cream, sunscreen, mask, cleanser, or topical face-care):**
      The product MUST be shown being applied to the avatar's FACE (cheek, forehead, jawline, or under-eye) on-camera in the PRIMARY application beat. Hand/forearm-surface application is BANNED as the primary application beat for face-care SKUs — it reads as a swatch test, not a usage demo, and tanks Filipino-market credibility.

      EXCEPTION: A brief texture-preview cutaway (product on back of hand to show consistency/color) is permitted ONLY as a supporting B-roll shot, never as the main application scene.

      EXEMPT product categories: hand creams, sanitizers, cuticle oils, and products explicitly tested on hands.

      **REFERENCE_IMAGE_CLASSIFICATION_RULE (CRITICAL — wrong tag = wrong reference plumbed → wrong image):**

      For each scene (SCENE 2 onwards), classify based on what is in frame:

      - "avatar" — the character is in frame, NO product visible.
        Example: avatar speaking to camera at desk. Avatar standing in kitchen.

      - "product" — ONLY the actual product is in frame, NO character.
        Example: product bag on counter. Product flat-lay with scoop.

      - "both" — BOTH the character AND the actual product together in frame.
        Example: avatar holding the product bag. Avatar pouring from the bag.

      - "none" — generic visuals UNRELATED to the actual product (neither avatar nor actual product).
        Example: hook B-roll metaphors (coffee ring on table, dumped instant coffee).
        Generic stale beans (NOT the actual product) on a surface. Abstract metaphors.
        Environment-only shots without the actual product or avatar.

      CRITICAL ANTI-PATTERN: Even when a B-roll scene depicts something CATEGORICALLY similar to the product
      (e.g., generic dark beans when the product is coffee, a generic mug when the product is a coffee bag),
      tag as "none". The reference photo would mislead the model into copying it verbatim. Only tag "product"
      or "both" when the ACTUAL hero product is the subject.

      **SCENE 1 (HOOK) END-FRAME REFERENCE (classify the REVEAL frame only):**
      Scene 1's "referenceImage" tag applies to the END frame (the reveal payoff) ONLY — the START frame is always the metaphor/"before" still and never carries a product reference.
      - "product" (or "both" if the avatar is also in the reveal) — the hook's END frame reveals the ACTUAL hero product (the real labeled package materializes, the morph resolves into the real product, the explosion/teleport reveals the real product).
      - "none" — the hook is a pure abstract metaphor (coffee-ring, dumped beans, environment-only) OR the end frame shows only a categorical look-alike, not the actual hero product. The CRITICAL ANTI-PATTERN above applies in full: a generic look-alike stays "none".
      - (UGC Pro has no Scene 1 end frame — this rule does not apply; classify its single image like a Scene 2+ shot.)

      ${venueSlotRouting}
      **OUTPUT SCHEMA (CRITICAL):**
      Return a valid JSON Object with keys "scenes" (Array) and "strategicAudit" (String).

      - IF SCENE 1 (HOOK):
      {
        "scriptLine": "...",
        "sceneDescription": "...",
        "referenceImage": "product" | "both" | "none",   // classify the END/REVEAL frame ONLY — see SCENE 1 (HOOK) END-FRAME REFERENCE rule above
        "venueSlot": "before",   // Services ONLY, OPTIONAL — set per VENUE_SLOT_ROUTING; omit otherwise
        "startFramePrompt": "Static composition of the FIRST FROZEN FRAME — describe the world-state at moment 1 as a still photograph. No motion verbs (see STILL_FRAME_RULE).",
        "endFramePrompt": "Static composition of the FINAL FROZEN FRAME — describe the world-state at moment 2 as a still photograph. No motion verbs (see STILL_FRAME_RULE).",
        "transitionEffect": "Name of the VFX that animates between the two stills (the only field where motion lives)."
      }

      - IF SCENE 1 (HOOK) AND the strategy is UGC PRO — same shape as Scene 2+, NO frame pair:
      {
        "scriptLine": "...",
        "sceneDescription": "...",
        "referenceImage": "both" | "avatar" | "none",
        "venueSlot": "onbody",   // OPTIONAL — set per VENUE_SLOT_ROUTING; omit when none fits
        "imagePrompt": "Description of the single image"
      }
      NEVER emit "startFramePrompt", "endFramePrompt", or "transitionEffect" in a UGC Pro storyboard.

      - IF SCENE 2 onwards:
      {
        "scriptLine": "...",
        "sceneDescription": "...",
        "referenceImage": "avatar" | "product" | "both" | "none",
        "venueSlot": "exterior",   // Services ONLY, OPTIONAL — set per VENUE_SLOT_ROUTING; omit when no slot fits or non-Services
        "imagePrompt": "Description of the single image"
      }

      **Script:**
      ${fullScript}
    `;
};

export const parseStoryboardResponse = (rawText: string): StoryboardResponse => {
  const jsonText = cleanJson(rawText || '{}');
  const result = JSON.parse(jsonText);
  return {
    scenes: Array.isArray(result.scenes) ? (result.scenes as Scene[]) : [],
    strategicAudit: result.strategicAudit || '',
  };
};

// Flow-output validation (P1). Validates the PARSED StoryboardResponse. A usable
// storyboard has at least one scene and every scene carries its two required text
// fields (scriptLine + sceneDescription — the render/image pipeline keys captions +
// prompts off them). Prompt fields (imagePrompt / startFramePrompt / endFramePrompt /
// referenceImage / venueSlot …) pass through since a scene legitimately carries
// EITHER a single imagePrompt OR the start/end frame pair. Deviation from the plan's
// "3–12" band: only the 0-scene (unusable) result is rejected — no floor of 3, and
// no ceiling, so any currently-valid short or long storyboard passes byte-identical.
// (Scene-count caps are the render endpoint's contract, enforced by its own zod.)
const StoryboardSceneShape = z
  .object({ scriptLine: z.string(), sceneDescription: z.string() })
  .passthrough();
export const StoryboardOutputSchema = z
  .object({
    scenes: z.array(StoryboardSceneShape).min(1),
  })
  .passthrough();
