# NOW — the resume doc

**Stamped: 2026-08-10** (session 16)

## ▶ SARADO NA ANG PINTUAN NG `grifon.ai`. BUHAY ANG LOCK.

Live 08-08. Tatlong code: **`FOUNDER-01`, `FOUNDER-02`, `BETA-01`**, ipadala bilang link
(`grifon.ai/i/FOUNDER-01`), kusang bumubukas at binubura ang code sa address bar. **Isa kada tao**
para may tala: `select ts, event, meta->>'code' from events where module='launch_gate' order by
ts desc;` (waitlist: `funnel_leads`, `funnel_id='grifon-launch-waitlist'`). Pang-bawi ng code:
alisin sa `LAUNCH_INVITE_CODES`. Pang-patay: alisin ang `VITE_LAUNCH_LOCK`. **Walang epekto ang
pag-save kung walang redeploy.** Sa **pintuan lang** (`login`/`app`/`checkout`). May 6-buwang pass
ka na (`grifon_launch_pass_v1`), **incognito** kung titingnan ulit.

## ▶ NEXT ACTION — ANG SAMPLE BATCH

🔴 **[`format_sample_readiness.md`](workflows/format_sample_readiness.md)** — 11 quality gate + 12
recipe, wala pang laman ang `SAMPLES`. **Gate 5-11 muna bago ang batch**, kasi bawat butas dun ay
bibilhin mo ng 12 beses. Unang tatlo: `real_talk`, `before_after`, `unboxing_asmr`. Dun din galing
ang landing hero.

💰 **Itinama ang gastos 08-10. HINDI ₱6,600.** Ang lumang ₱550 ay galing sa **9-scene** admin smoke,
pero **4 lang ang `SCENE_CAP`** ng Starter at Pro (6 sa Business). Ang totoo: **~₱273 kada ad,
~₱3,280 ang buong 12.** Patakbuhin ang **`npm run cost:estimate`** para sa kasalukuyang numero —
binabasa nito ang buhay na `routeModel`/`pickSceneDuration`/`SCENE_CAP`, kaya kusang gumagalaw.
Dalawang bagay na nakasabit: (1) **ilang scene ang sample?** 4 = kamukha ng bibilhin ng customer at
mas mura. (2) **Hindi verified ang presyo ng Kling**, naka-calibrate lang sa iisang bayad na render;
isa pang render sa **ibang** scene count ang magpapatino.
⚠️ Nag-drift ang `pricing_unit_economics.md` §2 (Veo Fast @1080p ang assume nya, 720p + Kling na
ang totoo). May drift warning na sya. At **pina-round up ng `pickSceneDuration()` ang cinematic sa
10s** (humihingi ng 6, `[5,10]` lang ang alok ng Kling) — doble ang bayad sa footage na puputulin.
Tanong sa yo, hindi ko ginalaw, katabi ng tuned routing.

🔴 **BAGONG BARA — magkasalungat ang "FIRST AD FREE".** Sinasabi ng landing page
(`components/landing/sections/Hero.tsx:75`) na `CREATE MY FIRST AD — FREE`, pero `free.video_ads = 0`
sa `utils/planGate.ts:19` — **walang video na nirerender ang Free tier.** Totoo na to ngayon pa lang,
nasa live site. **Ayusin kung alin ang totoo bago tumakbo ang kahit anong bayad na ad.**

✅ **08-09, apat na ayos, LAHAT ng format:** lead-in trim (TTS) · STS video cut (buhay ang labi) ·
hook hold 1.0→0.5 · dobleng linya. Patay na oras `3.44s → 1.73s`.

**Di pa merged:** **PR #103** `fix/voice-lint-particle-surface` (34 babala → 0, ERROR tier na ang
KONYO/PARTICLE/MAHABA) · **PR #102** `feat/script-audit-domain-lint` (`utils/scriptAudit.ts` +
`npm run check:domain`, 7 hit).
**Dalawang desisyon mo:** (1) papalitan ba ang pangalan ng `generateInfluencerAvatar`? Export yun
ng `geminiService`, 6 sa 7 hit ng domain lint. (2) ⚠️ Nasa `_template` ang ERROR tier, **ganun na
rin ang susunod na funnel.** ⚠️ Wala pang live eyeball ang Step 3 `SCRIPT_AUDIT` panel.

## 🎬 CANVAS PROMO LANE — tapos, naka-merge 08-10

`workflows/assets/grifon-promo-canvas/` — 20s Grifon promo, **₱0**, canvas engine (`motion-promo`
skill, nasa `workflows/assets/motion-promo-skill/`). **Hindi nagbabago ang verdict: Hyperframes pa
rin ang production lane** (`hyperframes_decision.md`) — walang video-in-video ang canvas, at yun ang
pinakamalakas na beat. Ang canvas ang **fallback kapag hindi ma-restore ang Hyperframes**, at sya
lang ang may buhay na scrubbable page na kasya sa artifact. Tatlong aral, nasa README: **walang `₱`
ang Inter Black** (tofu box, may `drawPeso()` na) · **isang font weight lang = tahimik na mali ang
lahat** · **JetBrains Mono pala ang `label-caps`** ng DESIGN.md, LAW yun sa `index.html`.
Copy: **isang register** (Taglish, ad ito para sa malamig na Bryan; ibang asset ang landing hero at
English yun) · **English ang `DESCRIBE/BUILD/LAUNCH`, desisyon ni Neil** — label yun, hindi
pangungusap · **bawal ang presyo natin sa video**, kaya wala ang `₱997`, nanatili ang `₱30K`/`₱5,000`
kasi presyo yun ng kalaban.

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

## 🔴 IBANG REGISTER ANG CHAT KAY NEIL

Sa **customer copy**, iwasan ang English jargon. Sa **chat kay Neil, English ang technical terms**
— hook, retention, frame, syllable, build, lint. Mas mataas ang English, magaan ang Tagalog
(pandikit lang: yung, kaso, pero, kasi). **Walang formulang naglo-lock** sa ads (ledger **A6**).

## 🔴 Huwag kalimutan

1. **Route density ang lever, hindi presyo.** Isang siyudad muna.
2. **Bawal ang CASH refund** sa tripwire. Credit, isang taon ang bisa.
3. **Patay na ang ₱900 break-even.** Kay Paolo: **₱4,900 kada 1-load na trabaho**.
4. **Coordinate radius ang geo**, lat `14.54` lng `121.02`.
5. ⚠️ **Enterprise ang malalaking pangalan sa client list** — procurement at referral, **hindi FB ad.**
6. ⛔ **Bawal ang CTA sa organic cards** — puro bayad na ad ang 78 sa `assets/ad-swipe/`.
7. 🔧 **Tingnan ang EXIT CODE, wag lang i-grep ang output.**
8. 🔧 **Wag `git add -A` habang may smoke agent** — nasama ang throwaway script nya (08-08).
9. 🔒 **Bantay na ang hook sa `.env` (DENY) at sa tuned files (ASK).** `tools/hook_gate_test.sh`
10. ⛔ **Wag maghulog ng file sa `public/`** — kinokopya yun ng Vite papuntang `dist/`, bukas sa
    `grifon.ai`. Nangyari 08-10 sa `motion-promo.skill`, inilipat sa `workflows/assets/`.

## 🅿 PARKED

**Oceanides:** Week 02 pack · GB-001 · hook2 ng KM-004 · Kling b-roll · watermark ni Gabriel ·
SEC Reg. No. · FB About · reviews · **AEM di pa verified**. ⏸ Pause ang daily.
**Grifon:** #94.2/#94.3 · #92+#89/#90 ride Slice B · #93 ⛔ TUNED · **#104+#59 hook starvation
(kulang ang isang regen)** · `artifact-noir` Steps 1-4 · 0 pa ang codex-sol lane · `@v5` bump ·
**sarado ang Rauch brief** (roadmap #27) · `/viral-autopsy` sa 3 Savic + sa labas natin.

## ⛔ Gated · 🔧 Arm before starting

🔴 **UBOS ANG GEMINI API BUDGET** para sa video. Manwal sa Flow. Gated: Kling.
`.\scripts\restore-git-identity.ps1` · `restore-gh.ps1` · `restore-codex.ps1`
⚠️ Wala sa PATH ang `gh`: `C:\Users\Administrator\AppData\Local\Programs\GitHubCLI\bin\gh.exe`
⚠️ `npx playwright install chromium` kada session · sariling `node_modules` kada funnel · **wag
i-pipe ang build output** · **sandboxed sa network ang Bash tool, PowerShell ang gamitin.**

### Maintain: **overwrite, never append.** Huling hakbang ng session na nagbago ng estado. Max 90.
