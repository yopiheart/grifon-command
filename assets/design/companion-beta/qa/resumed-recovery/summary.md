# Final mocked recovery verification

PASS: 18/18 cases across 9 flows at 375px and 1280px. No retries, skips, flaky cases, coverage errors, or infrastructure errors.

Command: npm.cmd run verify:recovery. Playwright exit: 0. Wrapper exit: 0.
Run: 2026-10-10T03-11-22-465Z-r39eRj. Duration: 89197 ms.
All 27 captured source/harness SHA-256 values matched before and after this final run.

[Run log](final-run.log) | [Actual exit](final-exit.json) | [Structured result](summary.json) | [Before SHA](source-final-before.json) | [After SHA](source-final-after.json)

| Flow | 375px | 1280px |
| --- | --- | --- |
| Draft and uploaded asset recovery | [PASS](screens/draft-375.png) | [PASS](screens/draft-1280.png) |
| Interrupted default-engine plan | [PASS](screens/partial-plan-375.png) | [PASS](screens/partial-plan-1280.png) |
| Saved plan from Dashboard | [PASS](screens/saved-plan-375.png) | [PASS](screens/saved-plan-1280.png) |
| Storyboard approval gate | [PASS](screens/storyboard-375.png) | [PASS](screens/storyboard-1280.png) |
| First Cut approval gate | [PASS](screens/first-cut-375.png) | [PASS](screens/first-cut-1280.png) |
| Recorded job resumes polling | [PASS](screens/recorded-job-375.png) | [PASS](screens/recorded-job-1280.png) |
| Saved-run load error and Retry | [PASS](screens/saved-run-error-375.png) | [PASS](screens/saved-run-error-1280.png) |
| Final-render polling error and Retry | [PASS](screens/polling-error-375.png) | [PASS](screens/polling-error-1280.png) |
| Missing saved run | [PASS](screens/missing-run-375.png) | [PASS](screens/missing-run-1280.png) |

Earlier diagnostics were deliberately interrupted after confirmed stale harness failures. They are not full 18-case failures: the first had 8 completed failures; the second had 7 completed passes and 7 completed failures. Their logs, exact exits, and diagnostic records are retained here. Raw traces and original screenshots remain local only under the .tmp directories recorded in summary.json.

Harness repairs select the existing Studio route, provide the existing required MarketMind fields, accept a restored Producer module after reload, and require an explicit Retry before a second final-render submission. Existing data, same-run/same-handle, call-count, parked-gate, and unexpected-request assertions remain.

Limitations:
- Auth, account data, provider responses, persistence endpoints and render responses are simulated; no live generation, billing or production database writes are verified.
- Real application UI, browser storage and client adapters execute. Browser reopen/reload is exercised; work continuing while the browser remains closed is not proven.
- Seeded checkpoints prove restoration only, not the upstream generation that produced them. Request counts do not prove live billing, database concurrency or media quality.
