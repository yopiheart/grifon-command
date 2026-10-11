# Companion account interface — builder report

## Source scope

- `App.tsx`: defaults an ordinary `/app` entry to Companion; preserves explicit Studio, queued tool/billing/return-to-ad intent precedence; restores validated selected-module metadata per browser-history entry; forwards actual account and plan state; signs out before success-only route/session cleanup.
- `components/CompanionChat/CompanionChatShell.tsx`: adds the compact account-settings entry in expanded, collapsed, and mobile navigation; retains the persistent avatar owner; exposes one latest-snapshot save barrier for chat exits and account actions; reports recoverable save/action failures.
- `components/CompanionChat/index.tsx`: forwards account/plan/loading/error/retry callbacks and protects existing Studio/upgrade exits through the save barrier without removing conversation isolation keys.
- `components/dashboard/SettingsModal.tsx`: exposes profile, confirmed plan and retry, confirmed server consent and retry, dark appearance information, existing help/legal destinations, and asynchronous sign-out. The portal manages focus, inert background, restoration, and 44px controls. Unknown consent does not expose a false unchecked switch. Unused local notification controls are omitted; their stored keys/data are retained. The root's final section-icon adjustment is preserved: 20px icons, 12px gap, and no icon shrink.
- `components/CompanionChat/companionChat.css`: scopes thin neutral scrollbars to chat, sidebar, output viewer, and settings; preserves native forced-colors preferences and adds settings focus/consent-thumb guards. Existing control-font overrides now also cover the portalled `.companion-settings`; headings there explicitly inherit Inter, use weight 600, normal case, and restrained tracking. This repairs the confirmed preview-only legacy CSS cascade without altering global or preview HTML rules.
- `dev/companionChatPreview.tsx`: limits fixture controls to `?debug=1`, retains `window.companionFixture`, labels the simulated account and sign-in/out, and supplies the existing footer with a persistent preview disclosure.
- `components/CompanionChat/CompanionChatSurface.tsx`: removes the unused top fixture banner and appends the supplied fixture label in the existing save-status footer; retains the existing production confirmation note when no fixture label is supplied.
- `services/consentService.ts`: adds an optional strict read that distinguishes a valid missing consent row from auth/session/query failure while retaining legacy default behavior.
- `hooks/useSubscription.ts`: tracks account/auth/request generations, rejects stale responses, defers SDK queries outside auth callbacks, cleans up channels/listeners, and exposes read-error/retry state. Confirmed same-account plans remain usable during background refresh, so PlanGate does not unmount Studio drafts.

No dependency, Context/global store, prompt, model, schema, generation knob, renderer, asset, or avatar-startup change is included. No Git mutations or provider/paid calls were made by the builder.

## Verification

Confirmed by builder commands:

- Prior-freeze `npx.cmd tsc --noEmit`: exit 0; native output and timestamps are in `typecheck-round6-output.txt` and `typecheck-round6-result.json`. The latest changes are the scoped CSS repair and the root's section-icon classes; the root owns the final production typecheck/build and full unit run.
- Owned-source `git diff --check`: exit 0.
- Required executor ledger read: exit 0.
- All nine final frozen source SHA256 values are in `source-freeze-hashes.json`; the exact owned diff is in `source-diff.patch` (SHA256 `b96cd6c74a06ec7e776c73a1eafb920fffa0c7f6832abf11d43e6776307fb759`). Final CSS SHA256 is `7b1fb135dd375404b7f4b7d390281736faa1eab30d6e658ce09f78ceb9a17bf3`; final SettingsModal SHA256 is `4632a1ba3610c87998b6d3c23136294c71959057a031208c162aef90a34e1c58`.

The root reported 34 account browser cases passing against the previous frozen source. Tester and independent reviewer own browser evidence, including the original regression failure proofs. The reviewer also reproduced the preview-only Settings font defect (exit 1); its scoped CSS correction is awaiting the reviewer's fixed-source check. Preserved builder snapshots `pre-review-useSubscription.ts`, `pre-review-SettingsModal.tsx`, and `pre-history-App.tsx` support controlled original/fixed comparisons.

Final production build, full unit suite, existing companion regression suites, and independent review are coordinated by the root. Their final results were pending when this implementation report was written; this report does not claim the builder ran those checks.

## Deviations

Final broad build/unit command ownership moved from builder to root at the root's explicit direction, to avoid duplicate checks and contention with browser verification. The builder remains available for any concrete gate failure. No unapproved source or architecture deviation.

## Limits

Root completion note: the staged whitespace gate required normalization of the readable `source-diff.patch`, `source-round1-diff.patch`, and `pre-history-App.tsx` copies. Their original exact bytes and hashes remain in `../raw-whitespace-originals.json`; decode those entries for patch replay or the original hash claims in this report. `../whitespace-normalization.json` records both hashes. Production source and test files were not normalized.

Source implementation and narrow TypeScript verification are complete. Browser behavior is verified by the tester/reviewer rather than re-run by the builder. Live Supabase production behavior and physical-phone behavior have not been checked by the builder; no live-account or paid-operation claim is made.
