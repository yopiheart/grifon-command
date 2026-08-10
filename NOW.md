# NOW — the resume doc

**Stamped: 2026-08-10** (session 16)

## ▶ SARADO NA ANG PINTUAN NG `grifon.ai`. BUHAY ANG LOCK.

Live 08-08. Codes: **`FOUNDER-01`, `FOUNDER-02`, `BETA-01`** — ipadala bilang link
(`grifon.ai/i/FOUNDER-01`), kusang bumubukas at binubura sa address bar. **Isa kada tao**:
`select ts,event,meta->>'code' from events where module='launch_gate' order by ts desc;`
(waitlist: `funnel_leads`). Bawi: alisin sa `LAUNCH_INVITE_CODES`. Patay: alisin ang
`VITE_LAUNCH_LOCK`. **Walang epekto kung walang redeploy.** Pintuan lang. **Incognito** kung
titingnan ulit — may 6-buwang pass ka na.

## ▶ NEXT ACTION — ANG SAMPLE BATCH

🔴 **[`format_sample_readiness.md`](workflows/format_sample_readiness.md)** — 11 quality gate + 12
recipe, wala pang laman ang `SAMPLES`. **Gate 5-11 muna bago ang batch**, kasi bawat butas dun ay
bibilhin mo ng 12 beses. Unang tatlo: `real_talk`, `before_after`, `unboxing_asmr`. Dun din galing
ang landing hero. (✅ 08-09: lead-in trim TTS · STS video cut · hook hold 1.0→0.5 · dobleng linya.
Patay na oras `3.44s → 1.73s`.)

💰 **Itinama 08-10. HINDI ₱6,600.** Ang lumang ₱550 ay galing sa **9-scene** admin smoke, pero **4
lang ang `SCENE_CAP`** ng Starter/Pro (6 sa Business). Totoo: **~₱273 kada ad, ~₱3,280 ang 12.**
**`npm run cost:estimate`** ang numero — binabasa nito ang buhay na `routeModel`/`SCENE_CAP`, kaya
kusang gumagalaw. Nakasabit: (1) **ilang scene ang sample?** 4 = kamukha ng bibilhin ng customer.
(2) **Hindi verified ang presyo ng Kling**, calibrated lang sa iisang bayad na render.
⚠️ Nag-drift ang `pricing_unit_economics.md` §2 (Veo Fast @1080p ang assume, 720p + Kling ang
totoo) — may warning na. At **pina-round up ng `pickSceneDuration()` ang cinematic sa 10s**
(humihingi ng 6, `[5,10]` ang alok ng Kling) — doble ang bayad sa puputuling footage. Tanong sa
yo, katabi ng tuned routing.

🔴 **BAGONG BARA — magkasalungat ang "FIRST AD FREE".** Sabi ng landing
(`components/landing/sections/Hero.tsx:75`) `CREATE MY FIRST AD — FREE`, pero `free.video_ads = 0`
sa `utils/planGate.ts:19` — **walang video ang Free tier.** Totoo na to ngayon, nasa live site.
**Ayusin kung alin ang totoo bago ang kahit anong bayad na ad.**

**Di pa merged:** **PR #103** `fix/voice-lint-particle-surface` (34 babala → 0, ERROR tier ang
KONYO/PARTICLE/MAHABA) · **PR #102** `feat/script-audit-domain-lint` (`npm run check:domain`, 7 hit).
**Dalawang desisyon mo:** (1) papalitan ba ang `generateInfluencerAvatar`? Export yun ng
`geminiService`, 6 sa 7 hit ng domain lint. (2) ⚠️ Nasa `_template` ang ERROR tier, **ganun na rin
ang susunod na funnel.** ⚠️ Wala pang live eyeball ang Step 3 `SCRIPT_AUDIT` panel.

🎬 **Canvas promo: tapos + merged 08-10** (`workflows/assets/grifon-promo-canvas/`, 20s, ₱0).
**Hyperframes pa rin ang production lane**; fallback lang to kapag di ma-restore yun. Aral at copy
decisions: nasa README nya.

## 🅿 PAOLO — itayo, wag buksan   ← dito ang totoong pera

Pangako pa lang: **walang load na dumaan, walang certificate na hawak.** Nakatayo ang page
(`funnels/oceanides-paolo/`), green ang build, **hindi naka-deploy, patay ang pixel**, 2 `⟦PENDING⟧`.

1. 🔴 **TAWAGAN ANG SUPERVISOR NG FACILITY** — sya ang bara sa lahat
   ([`facility-call-script.md`](clients/oceanides/facility-call-script.md)). **Sa parehong
   message:** sino ang na-issuehan na ni Boss Jay ng DENR certificate? Yun ang tanging totoong
   listahan ng bumibiling Paolo, at libre sya.
2. Punan ang `⟦PENDING⟧`, deploy → env var (kamay ni Neil) → **redeploy**, kundi walang epekto.
3. Dalawang alok, naka-preselect ang mas mahal. Presyo muna sa facility.
4. Checkout: ⏳ PayMongo keys ng Oceanides. ⛔ Hindi ang key ng Grifon.
5. Bagong creative at targeting. ⏳ Aling siyudad ang una, isa lang.

**Nagawa na, wag ulitin:** avatar, value stack, grill, pixel-leak, copy, page, trust card
(`paolo-trust-a/b`, di pa nai-publish, 82 ang critic).

## 🔴 Huwag kalimutan

1. **Route density ang lever, hindi presyo.** Isang siyudad muna.
2. **Bawal ang CASH refund** sa tripwire. Credit, isang taon ang bisa.
3. **Patay na ang ₱900 break-even.** Kay Paolo: **₱4,900 kada 1-load na trabaho**.
4. **Coordinate radius ang geo**, lat `14.54` lng `121.02`.
5. ⚠️ **Enterprise ang malalaking pangalan sa client list** — procurement at referral, **hindi FB ad.**
6. ⛔ **Bawal ang CTA sa organic cards** — puro bayad na ad ang 78 sa `assets/ad-swipe/`.

## 🅿 PARKED

**Oceanides:** Week 02 pack · GB-001 · hook2 ng KM-004 · Kling b-roll · watermark ni Gabriel ·
SEC Reg. No. · FB About · reviews · **AEM di pa verified**. ⏸ Pause ang daily.
**Grifon:** #94.2/#94.3 · #92+#89/#90 ride Slice B · #93 ⛔ TUNED · **#104+#59 hook starvation** ·
`artifact-noir` Steps 1-4 · 0 pa ang codex-sol lane · `@v5` bump · **sarado ang Rauch brief** ·
`/viral-autopsy` sa 3 Savic. **Remotion: sarado, 2× (roadmap §10 + hyperframes_decision).**

## ⛔ Gated · 🔧 Arm before starting

🔴 **UBOS ANG GEMINI API BUDGET** para sa video. Manwal sa Flow. Gated: Kling.
`.\scripts\restore-git-identity.ps1` · `restore-gh.ps1` · `restore-codex.ps1`
⚠️ Wala sa PATH ang `gh`: `C:\Users\Administrator\AppData\Local\Programs\GitHubCLI\bin\gh.exe`
⚠️ `npx playwright install chromium` kada session · sariling `node_modules` kada funnel · **wag
i-pipe ang build output** · **sandboxed sa network ang Bash tool, PowerShell ang gamitin.**

### Maintain: **overwrite, never append.** Huling hakbang ng session na nagbago ng estado. Max 90.
