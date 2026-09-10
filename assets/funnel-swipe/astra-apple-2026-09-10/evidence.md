# Astra and iPhone 18 Pro: launch-journey evidence

Observed 2026-09-10, public unauthenticated browser sessions. This is a bounded product-launch review, not a completed lead-generation funnel autopsy. No forms, account creation, purchase, opt-in, messaging, or paid AI calls were performed. No conversion performance or campaign attribution was available.

## Sources and coverage

- [Astra launch page](https://openai.com/index/gpt-6-astra/): canonical URL verified in DOM.
- [Apple Philippines product page](https://www.apple.com/ph/iphone-18-pro/): canonical URL verified in DOM.
- [Apple Philippines configuration destination](https://www.apple.com/ph/shop/buy-iphone/iphone-18-pro): reached through the public pricing destination; stopped before selecting or continuing.
- Browser: configured Playwright MCP; CUA inventory was empty. Both pages loaded. Desktop 1440x900 and mobile 390x844 captures preserve their original CSS viewport dimensions. The 13 JPEG files and dimensions/byte sizes are enumerated in [screenshots.json](screenshots.json); every image is below 400 KiB.
- Hero, film placement, and selected decision/proof sections were visually inspected. The complete section order below was DOM-observed; this packet does not claim that every intervening section was screenshot-verified. Screenshots are selected viewports, not full-page captures.

## OpenAI: observations

The desktop hero is an expansive dark spiral/star field, with product-name text separated across its width. Mobile keeps the full-height spectacle and places the name over the central field. The film follows the hero. Sampled film frames show a person at home facing a large projected computer interface; they do not establish the whole film's edit or sound design.

DOM sequence, paraphrased: model introduction and comparative benchmarks; computer interaction; professional output; software engineering; scientific work; cybersecurity; deployment safeguards; access/pricing information; detailed benchmark tables and citations. The selected computer-use capture confirms a narrow reading column and tabbed chart proof. The availability capture confirms staged access across plans and distribution channels; its statements are publisher claims, not an independently verified entitlement check. Enterprise access is described as requiring administrator enablement at launch.

Evidence: [desktop hero](astra-hero-desktop.jpg), [mobile hero](astra-hero-mobile.jpg), [desktop film sample](astra-film-sample-desktop.jpg), [mobile film placement](astra-film-mobile.jpg), [computer-use proof](astra-computer-desktop.jpg), [availability](astra-availability-desktop.jpg).

### CTA census and inputs

Counts distinguish editorial links, player controls, and product conversion. DOM counts are a snapshot, not simultaneous visible impressions.

| Area | Count and behavior |
|---|---|
| Global desktop header | One **Try ChatGPT** link to https://chatgpt.com/ (referral query omitted); one **Log in** button. The mobile hero header collapses to logo/search/menu controls. Login was not opened. |
| Article conversion | Zero direct signup, purchase, or lead-submit CTAs observed in the article. Its 92 anchor elements comprise editorial destinations, citations and return anchors. These are not 92 conversion prompts. |
| Article video controls | Five video modules: ten **Play video** buttons in DOM, comprising two controls per module, plus five fullscreen and five settings controls. Only one of these modules is the hero launch film. |
| Inputs | No lead-capture form observed. The inspected article input inventory contains an optional chart dataset selector. No name/email/phone or opt-in consent fields were found in the inspected scope. |

## Apple Philippines: observations

The hero pairs the burgundy device with large metallic lettering on black. Desktop uses a broad horizontal composition; mobile stacks it vertically and places pricing/action in a bottom bar. The promise is **Pro further.** The starting price shown is PHP 94,990. The page explicitly says **Check back later for availability.** This is a Philippines availability state, not evidence that global ordering is unavailable.

DOM sequence, paraphrased: highlights and product film; upgrade case with comparison; design viewer; camera capability; video capability; battery; performance; comparison against the visitor's existing model; connectivity; accessories; shopping support; alternative models; environmental/privacy/accessibility positioning. A hidden alternate switching section also exists in DOM; it is not counted as another visible section.

The highlights section uses oversized rounded product imagery, short benefit copy, a carousel and four topic tabs. The upgrade section offers a device dropdown (default observed: iPhone 15 Pro) with comparison cards. A compact local navigation bar retains pricing access after scrolling. The destination groups configuration into model, finish, and storage, with help at decision points and a save-for-later option. Checkout and transaction behavior were not exercised.

Evidence: [desktop hero](apple-hero-desktop.jpg), [mobile hero](apple-hero-mobile.jpg), [desktop highlights](apple-highlights-desktop.jpg), [mobile highlights](apple-highlights-mobile.jpg), [upgrade comparison](apple-upgrade-desktop.jpg), [pricing destination](apple-pricing-desktop.jpg), [film sample](apple-film-sample-desktop.jpg).

### CTA census and inputs

| Area | Count and behavior |
|---|---|
| Main product pricing | Two **View pricing** anchors: hero and lower product comparison. Both point to https://www.apple.com/ph/shop/goto/buy_iphone/iphone_18_pro, which redirects to the configuration destination cited above. |
| Local product navigation | Two additional pricing anchors in DOM, belonging to compact navigation and its expanded panel. They are separate navigation states, not two simultaneous purchase prompts. |
| Film | One **Watch the film** anchor in the highlights section opens the product-video modal; its accessible role is a button. |
| Adjacent commerce | Main contains one accessories-shopping link and one iPhone Air purchase link. Three iPhone-shopping anchors exist in main DOM: one shopping-benefits CTA, one hidden alternate section duplicate, and one bottom category-navigation link. Thus only one is the visible shopping-benefits CTA. |
| Global/category navigation | Excluded from the product conversion census. Global navigation contains 164 anchors across menus, including closed menus. Main has 94 anchors in total, including references, disclosure links, duplicates and bottom category navigation. Neither raw total measures visible CTA exposure. |
| Inputs | Main contains zero form elements. Three optional unnamed comparison selects and four optional color radios were observed. No lead name/email/phone fields or opt-in consent UI were observed. No fictitious post-opt-in map is inferred. |

## Public films and caption provenance

- Astra: public [Vimeo player](https://player.vimeo.com/video/1222553704?h=ee86f55524), video ID 1222553704, editorial title **Launch film**, configuration duration 163 seconds. The canonical OpenAI page opens this embed. The public player advertises caption track ID 323071089, language en-x-autogen, English auto-generated subtitles, provenance ai_generated. An unauthenticated VTT request returned HTTP 200 on this date. It contains 42 cues from 3.860 to 151.240 seconds. No full transcript or expiring signed caption URL is retained here; re-open the canonical player for a fresh public track URL. Captions support a provisional spoken sequence, not authoritative wording or auditory analysis. Similarity of duration to another distribution copy does not prove edit identity.
- Apple: the public [product-film HLS manifest](https://www.apple.com/105/media/my/iphone-18-pro/2026/591df885-5ee2-4173-86e6-401021249f7c/films/product/iphone-18-pro-product-tpl-my-2026_16x9.m3u8) was exposed by the PH page's film link. The regional path includes `my`; this is the link actually served, not a guessed PH filename. The modal loaded with duration 169.755 seconds. A sampled frame shows exploded device components and an on-screen sound caption. A downloadable Apple caption track and its provenance were not inspected.
- Both players loaded, but this website packet includes only sampled frames. Audio was not heard and neither complete film was watched during this browser pass. Full film analysis belongs to the separately identified video evidence.

## Interpretations and limits

**Hypotheses for Grifon:** OpenAI's sequence suggests spectacle followed by visible work and credibility. Apple's sequence suggests a strong visual promise, compact benefit previews, relevant comparison, and persistent access to the next decision. Grifon could test one concrete user task that develops into useful finished work, paired with evidence and a clear next action. These are design hypotheses, not proven conversion lifts or an implementation approval.

Two operators do not satisfy the funnel skill's three-independent-corroboration threshold. No winning-pattern promotion is justified by these pages alone. The PH availability statement must not become invented scarcity. Ad-to-page mapping, release-event calendar, paid-media sequencing, retargeting, email follow-up, account gates, and checkout completion remain unverified in this packet.
