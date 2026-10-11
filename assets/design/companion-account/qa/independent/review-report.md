Independent review against `55ef2b2196c6958467cfd1c72c86290027f79f41`, performed with fresh browser profiles against the existing local Vite server. Report-only: this reviewer changed no application source, repository tests, Git state, running app configuration, or account data.

Final disposition: **correctness contract PASS; BRAND_PASS, 46/50, zero critical and zero remaining nits.** The final source hashes below match the builder's latest nine-file freeze. The only changes after the full behavior run were the scoped Settings font override and section icon rhythm repair, verified separately below.

The real `/app` run passed **49/49 independent assertions**, exit 0. The preserved pre-review hook probe failed **0/1**, exit 1, reproducing actual unsent Studio form loss. The preview font probe failed **6/8** before repair, exit 1, then passed **8/8** after repair, exit 0. The final App/preview × 375/1280 font/icon/fit/error probe passed **16/16**, exit 0. Evidence is in `all-observations.json`, `original-refresh-defect.json`, `original-preview-typography.json`, `preview-observations.json`, and `typography-observations.json` in this directory. Repeated assertions in the narrow runs are not counted as additional unique behavior cases.

Outstanding correctness or brand findings: **none**. Final preview finding resolved:

- **P2 / preview brand mismatch — `companion-chat-preview.html:5`, exposed by the new settings portal at `components/dashboard/SettingsModal.tsx:117`.** Open the default preview at 375×667, open conversations, then Account settings. Before repair, the preview's global heading rule forced every Settings section title to uppercase/900; the global button rule forced action rows to JetBrains Mono. The local `.companion-chat` override did not reach the portalled `.companion-settings`. `original-preview-settings-mobile.png` and the computed-style record in `original-preview-typography.json` show the failure. The scoped repair at `components/CompanionChat/companionChat.css:8` and `:13` now yields Inter, normal case, semibold Settings controls/headings in both real App and preview. The preview-only global boilerplate and production-wide typography remain unchanged.

Resolved findings verified independently:

- **P2 — same-account refresh discarded a paid Studio form.** The preserved `qa/builder/pre-review-useSubscription.ts:56` set loading true on every read, and `components/PlanGate.tsx:27` unmounted its children while loading. In real App, select Edit Bay in explicit Studio, enter an unsent script, hold the subscription read, emit same-user TOKEN_REFRESHED, then release. Before repair the field disappeared during the read and returned empty. The same oracle now preserves the field and exact text. Current repair: `hooks/useSubscription.ts:57` keeps a confirmed account's tool mounted during refresh. Original and repaired screenshots: `original-token-refresh-before/pending/after.png` and `token-refresh-before/pending/after.png`.
- **P2 — unconfirmed consent appeared off.** Preserved `qa/builder/pre-review-SettingsModal.tsx:126` rendered `aria-checked={marketingAds ?? false}` while the read was pending or had failed. Current `components/dashboard/SettingsModal.tsx:126` withholds the switch until confirmed. An independent held read of a granted server record exposes loading text and zero switches; a failed read exposes error/retry and zero switches; retry confirms true, withdrawal confirms false. No external record was written.
- **P2 — browser Forward lost an explicit intended tool.** Preserved `qa/builder/pre-history-App.tsx:516` restored only the default experience. Actual landing Research CTA → Recon → Back landing → Forward previously showed Chat; `original-history-defect.json` and `original-intent-history-before/forward.png` record that failure. The current run restores Recon. It also separately proves original Chat draft → Studio → select Edit Bay → Back restores Chat and its draft → Forward restores Edit Bay. Current validated per-entry module state is read at `App.tsx:173` and restored at `App.tsx:526`; the merged state preserves legal-return metadata.

Contract assessment:

| Contract | Result and evidence |
|---|---|
| `/app` starts Chat; explicit Studio remains available; intended tool and history retained | PASS. Independent real navigation/history probes; sibling checkout and return-to-ad precedence cases inspected. |
| Actual account identity and honest plan state, refreshed after auth | PASS. Independent metadata/email, Pro and account-switch Starter checks. Source rejects stale generations and requests. Sibling actual OTP invalid/retry, held-plan/read-error/retry oracles inspect rendered Settings and real wrapper calls. |
| Consent pending/error/retry and confirmed writes | PASS. Unknown has no off switch. Confirmed switch follows response, not optimism. Sibling held write and write failure cases inspect checked/disabled states and attempted actions. |
| Save latest account-scoped IndexedDB draft before leaving; failure keeps auth/chat/draft and retry | PASS. Independent actual IDB put failure, signOut error and successful retry; saved account-keyed book checked after logout. Shell saves the latest snapshot until stable before running an action. Sibling action matrix covers Studio, upgrade, help and legal exits. |
| Inspect signOut error and perform success-only cleanup | PASS. Failed signOut retains auth; successful signOut reaches real auth gateway and retains the chat draft. Sibling oracle records wizard deletion after successful signOut and absence on failure. |
| Named modal, trapped focus, restoration, inert background and mobile drawer | PASS at 1280×900 and 375×667. Both Tab wraps, initial focus, Escape restoration, restored operability and no horizontal overflow. All measured buttons are at least 44×44 CSS px. |
| Mascot continuity and per-chat isolation | PASS. Independent live iframe remains connected when Settings opens. No Avatar or renderer source changed; ProducerFlow and Surface retain per-chat keys. Sibling continuity/navigation/startup regressions pass. |
| Honest preview, debug opt-in, visible disclosure and real login access | PASS. Default fixture controls absent, mobile/collapsed disclosure inside viewport, no consent switch, simulated logout and real login link. Final typography passes in both viewports. |
| Neutral scrollbars, high contrast and contained material scope | PASS. Settings uses neutral thin scrollbar; increased-contrast thumb is zinc-400. Visuals retain PLATE content and only approved companion identity/composer CHROME. Sibling scrollbar oracle also checks contrast ≥3 and forced-colors auto. |
| No tuned, 3D, global-store or dependency changes | PASS by diff scope. Nine source files are account/routing/consent/local preview/material styling only. |

Test-oracle assessment: PASS. New account tests exercise the actual App, Settings, production email OTP helpers, and actual IndexedDB. Only SDK factory/public dummy config and explicit backend responses are mocked; storage delay passes through to the real save operation, and storage failure is injected into actual IDB put. Failures assert retained user data/session and absence/order of cleanup, rather than checking only implementation flags. Preserved original hook probes demonstrate the defect. The OAuth marker fixture's main-document guard prevents a companion iframe init script from re-seeding a consumed marker; it does not relax the consumption assertion. Route tests mock auth helpers independently and do not claim live OAuth coverage. The changed navigation focus oracle correctly includes the new Account settings entry as the drawer's last focus target. The two new output-directory environment options affect evidence paths only.

Sibling evidence is separate from this reviewer's run: 34 account cases, 54 companion regression cases, and 14 unique route cases passed. Build/full unit checks belong to the root verification run and are not represented here as independently executed.

In-app brand score:

| Axis | Score | Basis |
|---|---:|---|
| Philosophy coherence | 9/10 | Neutral ink, gold actions, readable PLATE settings; no extra blur or generic accent colors. |
| Visual hierarchy | 9/10 | Account → plan → privacy → support hierarchy; one clear switch state and restrained action emphasis. |
| Execution craft | 9/10 | Rendered text/icon pairs are complete and centered at 2×; final heading icons measure 20×20, gaps 12px, wrappers shrink-0. |
| Functionality | 10/10 | Measured mobile targets, responsive fit, focus states and recoverable account errors pass. |
| Innovation / brand distinctiveness | 9/10 | Approved mascot and bounded companion material language retained around the readable account surface. |
| Total | **46/50** | Exceeds the 35/50 in-app bar; zero critical flags. |

**BRAND_PASS — 0 critical, 0 nits.** The original nonblocking rhythm nit at `components/dashboard/SettingsModal.tsx:27` is repaired: `gap-3`, nonshrinking icon wrapper, 20px child SVGs. Four final contexts independently measure the prescribed 20px/12px rhythm. The scoped preview typography repair also passes. No further quick wins are necessary for this bounded change.

Visual evidence personally inspected: `chat-1280.png`, `chat-375.png`, `settings-1280.png`, `settings-375.png`, `settings-bottom-375.png`, `settings-mobile-high-contrast.png`, `collapsed-settings-1280.png`, `consent-pending-1280.png`, `consent-error-1280.png`, `default-preview-mobile.png`, `default-preview-collapsed.png`, and every `pair-mobile-2x-0.png` through `pair-mobile-2x-11.png` at original resolution. After repair, all 20 `final-{app,preview}-{375,1280}-heading-2x-{0..4}.png` crops and final App mobile/desktop and preview mobile top screenshots were inspected. Mobile Settings reaches all content by vertical scrolling; the fixed header/close remains available. The keyboard wrap screenshots intentionally show the scrolled lower section after focus reaches Sign out. The increased-contrast image captures the upper section. Preview screenshots were captured before waiting for mascot readiness; real App screenshots and mounted-player assertions waited for its ready attribute.

Safety/coverage boundary: each run uses an isolated headless Edge profile with service workers blocked. All external requests except read-only font GETs are blocked; local provider/billing/consent endpoints are fulfilled by offline fixtures. No real credentials, payment, auth-provider exchange, microphone, generation or production writes occurred. These results verify browser orchestration and mock transport behavior, not live provider availability.

Reviewed source SHA-256 values (also machine-checked in `final-source-reconciliation.json`):

| File | SHA-256 |
|---|---|
| App.tsx | cde012f82cf0537b8871b4ef369e044fee512a55deeff4477ee5cd2b7a30b620 |
| components/CompanionChat/CompanionChatShell.tsx | 92a05328cc718adad52782714f4b80abca8a7ecac80270fa1dc9f21ab9d73ef6 |
| components/CompanionChat/index.tsx | dea7e28fc207b075be26940a04e19cc6dd41c342650c95ff87d838a9ec944b6b |
| components/CompanionChat/CompanionChatSurface.tsx | 03da288e83ab84d9833be3ba3d44dec4e40e3ca10058eb9d342bd52b3ec3536f |
| components/CompanionChat/companionChat.css | 7b1fb135dd375404b7f4b7d390281736faa1eab30d6e658ce09f78ceb9a17bf3 |
| components/dashboard/SettingsModal.tsx | 4632a1ba3610c87998b6d3c23136294c71959057a031208c162aef90a34e1c58 |
| hooks/useSubscription.ts | cbe0b84aa12767685a12dd79ae7728b3256bd3e5fd60b0be49dd96d0540f79d3 |
| services/consentService.ts | 1ec151ab74767bcc099fe2b88d022f37bf519bfca19aa0d98e1e9b86ecb82a1f |
| dev/companionChatPreview.tsx | 4e2a132bf6b8fcb25ebcfbff6f19dd29377bbb28c487c702def0cd1f553950a5 |
