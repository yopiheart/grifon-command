# NOW — the resume doc

**Stamped: 2026-08-09** (session 15)

## ▶ SARADO NA ANG PINTUAN NG `grifon.ai`. BUHAY ANG LOCK.

Live 08-08. Tatlong code: **`FOUNDER-01`, `FOUNDER-02`, `BETA-01`**, ipadala bilang link
(`grifon.ai/i/FOUNDER-01`), kusang bumubukas at binubura ang code sa address bar. **Isa kada tao**
para may tala: `select ts, event, meta->>'code' from events where module='launch_gate' order by
ts desc;` (waitlist: `funnel_leads`, `funnel_id='grifon-launch-waitlist'`). Pang-bawi ng code:
alisin sa `LAUNCH_INVITE_CODES`. Pang-patay: alisin ang `VITE_LAUNCH_LOCK`. **Walang epekto ang
pag-save kung walang redeploy.** Sa **pintuan lang** (`login`/`app`/`checkout`). May 6-buwang pass
ka na (`grifon_launch_pass_v1`), **incognito** kung titingnan ulit.

## ▶ NEXT ACTION — ANG DEAD AIR

✅ **Ayos na pala ang Vercel** (verified 08-09 sa API: `nodeVersion: 24.x`, sinusunod ng build ang
`engines >=24`). 🟡 **FREE ang Supabase pero sinadya yun** (Pro→free 06-25, kinuha ng R2 ang media).
Auth + database na lang ang nandun. Tingnan ang usage page minsan; wag nang ituring 🔴.

**Tapos 08-09:** lead-in trim (`_lib/voiceLeadIn.ts`, **TTS lang**, sinisira nya ang lip sync sa
STS) · hook hold 1.0 → **0.5** · ₱0 restitch (`build-restitch-spec`→`resign`→`fill-alignment`).

🔴 **SUNOD: sabay putulin ang boses AT ang video sa STS scenes** (`2.29s` sa `2.95s` na natitirang
patay). Sa talking scene ang mp3 ay audio mismo ng video, kaya ang lead-in nya ay ang tao bago
magsalita: boses lang ang putulin at mauuna sya sa labi (napatunayan 08-09). Kailangan ng `-ss` sa
video input + iusog ang `sfxCues`; tapos na ang mp3 at ang `voiceWords`.

**Di pa merged:** **PR #103** `fix/voice-lint-particle-surface` (34 babala → 0, ERROR tier na ang
KONYO/PARTICLE/MAHABA) · **PR #102** `feat/script-audit-domain-lint` (`utils/scriptAudit.ts` +
`npm run check:domain`, 7 hit). Merged na ang wallpaper branch (08-09).
**Dalawang desisyon mo:** (1) papalitan ba ang pangalan ng `generateInfluencerAvatar`? Export yun
ng `geminiService`, 6 sa 7 hit ng domain lint. (2) ⚠️ Nasa `_template` ang ERROR tier, **ganun na
rin ang lahat ng susunod na funnel.**

⚠️ **Wala pang live eyeball ang Step 3 `SCRIPT_AUDIT` panel.** Kailangan ng totoong script gen.

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
