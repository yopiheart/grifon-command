# Cafe Session Runbook

Ang SOP kapag nagre-rent ng PC sa computer shop. Binubura ng defreezer ang
`C:\Users\Administrator\` tuwing gabi, kaya ang GitHub repo lang ang nabubuhay.

Dalawang daan ang nandito. Simulan mo sa **Daan A**. Kapag nakabili ka na ng USB
SSD, lumipat ka sa **Daan B** at hindi ka na babalik sa A.

---

## ⚠️ Bakit hindi na gumagana ang lumang flow

Ang buong `git clone` ay **1.5 GB** na ngayon. Hunyo 2026 ay 134 MB pa lang sya.
Sa bilis ng cafe wifi (~30 KiB/s nung 2026-08-16), ang buong clone ay **mga 13
oras**, at walang resume ang `git clone` kaya balik-zero pag naputol.

Hindi code ang bumigat. Ang buong app ay 6 MB. Ang 1.5 GB ay video at PNG:

```
clients/oceanides                    1,131 MB   513 files
assets/wallpapers                      145 MB    58 files
lahat ng .md .yml .json .sh .ps1         4.7 MB   322 files
```

Kaya **hindi na tayo kumukuha ng buong repo.** Ang mga video ay nasa GitHub pa
rin at nahihila isa-isa kapag kailangan.

---

## DAAN A — Cafe PC, walang USB (~8 min)

### A1. Tools (~5 min)

| Tool | URL |
|---|---|
| Git for Windows | https://git-scm.com/download/win |
| Node.js LTS | https://nodejs.org |
| VS Code | https://code.visualstudio.com |

Default settings lahat, Next-Next-Install lang.

Pagkabukas ng VS Code: Extensions (ung apat na parisukat sa gilid) → hanapin ang
**Claude Code** → Install → mag-sign in gamit ang `neilmaglaya.business22@gmail.com`.

### A2. Clone (~2 min, HINDI 13 oras)

```powershell
cd $HOME\Desktop
git clone --filter=blob:none --no-checkout https://github.com/yopiheart/grifon-command.git
cd grifon-command
git sparse-checkout set --no-cone '/*' '!/clients' '!/assets' '!/baselines' '!/artifacts' '!/samples' '!/workflows/believability-samples' '!/workflows/concierge_poc' '!/workflows/assets' '!/tests/fixtures' '!/public/examples'
git checkout
```

Unang beses: may bubukas na browser para mag-sign in sa GitHub bilang `yopiheart`
→ Authorize → isara ang browser.

Anong nakuha mo: **68 MB**, buong 1,689 commits, lahat ng remote branch, lahat ng
30 skill, 8 hook, 2 agent, ang output style, ang apat na GitHub Action, at ang
100 workflow docs. Sinukat 2026-08-16: `npm run build` pumasa, `npm test` 1,214
passed / 0 failed.

Anong wala: ang mga video ng client at ang wallpapers. Basahin ang
[Paghila ng media](#paghila-ng-media) sa baba kapag kailangan mo sila.

### A3. Environment file (~2 min)

```powershell
notepad .env
```

Notepad: "Cannot find the file, create?" → **Yes**. Sa phone: Bitwarden → **GRIFON
env** Secure Note → Notes → Copy. Sa PC: `Ctrl+V`, `Ctrl+S`, isara.

### A4. Restore scripts

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\scripts\restore-git-identity.ps1
npm install
```

**Wag laktawan ang `restore-git-identity`.** Binubura ng defreezer ang
`~/.gitconfig`. Kapag wala kang identity, tatanggihan ng git ang `git commit` mo
sa dulo ng araw, pagkatapos mo nang magtrabaho buong araw.

Optional, patakbuhin lang kung gagamitin mo ngayong session:

```powershell
.\scripts\restore-gh.ps1              # gh CLI — kailangan ng PR at issue tools
.\scripts\restore-playwright-mcp.ps1  # kailangan ng smoke-tester subagent
.\scripts\restore-python.ps1          # kailangan ng tools/*.py
.\scripts\restore-codex.ps1           # Codex CLI executor lane
.\scripts\restore-vercel.ps1          # Vercel CLI + project link
.\scripts\restore-notebooklm.ps1      # NotebookLM MCP
```

### A5. Buksan

```powershell
code .
```

Basahin ng SessionStart hook ang `NOW.md` at ipipirint ang next action nang kusa.
**Hindi mo na kailangan ng orientation prompt.** Kung gusto mo pa rin ng buod:

> Basahin ang NOW.md, CLAUDE.md, agent_lessons.md, at ang huling 5 git log. Tapos
> sabihin mo kung nasaan ang proyekto at ano ang natapos kahapon.

---

## DAAN B — USB SSD (~1 min kada session)

Hindi hinahawakan ng defreezer ang USB drive. Dito nakatira ang buong rig.

### Isang beses na setup

Kailangan: **USB SSD**, hindi thumb drive. Ang `node_modules` ay 595 MB na
hinati sa 27,840 na maliliit na file, at nabubulunan dyan ang flash drive.

```
E:\
  tools\
    PortableGit\      PortableGit .7z.exe mula git-scm.com, i-extract dito
    node\             node-v22-x64.zip mula nodejs.org, i-extract dito
    VSCode\           VS Code "Windows x64 zip" + gumawa ng data\ folder
                      sa tabi mismo ng code.exe (yun ang portable mode)
  grifon-command\     ang lite clone mula sa A2, kasama node_modules
  cafe-start.ps1      kopyahin mula scripts/cafe-start.ps1
```

Ang `data\` folder ang buong dahilan kung bakit gumagana to. Dun napupunta ang
extensions at settings ng VS Code, kaya di na sila naaabot ng defreezer.

### Kada session

```powershell
E:\cafe-start.ps1
```

Yun lang. Sinesetup nya ang PATH, mag-fe-fetch, at magbubukas ng VS Code.

### Apat na dapat mong malaman

1. **USB SSD talaga.** Tingnan ang bilang ng file sa itaas.
2. **May shop na naka-block ang USB** o may antivirus na humaharang sa `.exe`
   mula sa removable drive. Sa shop mo lang to malalaman.
3. **May totoong API keys ang environment file.** Pag nawala ang USB, nawala ang
   keys. Lagyan ng BitLocker To Go, o iwan mo sa Bitwarden at i-paste kada session.
4. **Hindi pa nasusubukan** kung nananatili ang Claude Code sign-in sa portable
   mode. Malamang oo dahil sa `data\`, pero hindi pa napapatunayan sa Windows.
   Kung hindi, isang sign-in lang naman ang dagdag.

---

## Paghila ng media

Ang lite clone ay walang `clients/`, `assets/`, `samples/`. Nasa GitHub pa rin
sila. Isang folder lang ang hilahin, wag lahat:

```powershell
git sparse-checkout add clients/oceanides/kuya-marvin/ads/km-004
git sparse-checkout add assets/wallpapers
```

Balikan ang listahan ng kasalukuyang pattern:

```powershell
git sparse-checkout list
```

Kung talagang gusto mo ang buong 1.5 GB (mag-abang ka ng ilang oras):

```powershell
git sparse-checkout disable
```

---

## Dulo ng session

```powershell
git add .
git commit -m "feat: ilagay dito ang totoong ginawa mo"
git push -u origin <branch>
```

Kapag `main` ang branch mo, mag-branch ka muna. Auto-deploy sa app.grifon.ai
mga 2-3 minuto pagkatapos ng push.

**I-overwrite ang `NOW.md` bago umalis** kung nagbago ang state ng trabaho. Yun
ang unang babasahin ng susunod na session.

---

## Parallel worktrees (opsyonal)

Para sa dalawang Claude session na sabay tumatakbo sa magkaibang branch:

```powershell
.\scripts\spawn-worktrees.ps1 feat/una feat/pangalawa
```

Mura sya sa lite clone. Minamana ng worktree ang sparse pattern, kaya **42 MB**
lang ang bawat isa, hindi 1.5 GB (sinukat 2026-08-16).

Nung 2026-08-16 ay naka-hardcode ang script sa `feat/wizard-persist` at
`feat/camera-buckets`, na parehong merged at binura na sa origin, kaya
palaging nag-e-error. Naka-parameter na sya ngayon.

---

## ⚠ Bukas na desisyon: pigilan ang paglaki

Nakadagdag ang repo ng **~400 MB kada buwan** mula Hunyo. Kahit ang lite clone ay
tataba kasabay nito, kaya babalik at babalik ang problemang to.

Nagawa na (`.gitignore`): ang wallpapers at ang upscaled motion-test na
regenerable naman.

**Hindi pa nagagawa, kailangan ng desisyon mo:** ang `clients/*/ads/*/clips/`.
Yan ang pinakamabigat (25 MB kada isa) pero **bayad na Veo generation sila** at
hindi mababawi kung mawala. Hindi ko sila ini-ignore nang basta, dahil ang
i-ignore sila nang walang ibang bahay ay katumbas ng pagsigurong mabubura sila
ng defreezer.

Kailangan muna ng destinasyon: Google Drive, Cloudflare R2, o Git LFS. Pagkatapos
nyan pwede na ang `.gitignore` rule.

Isa pang usapan ang tunay na pagpapaliit ng repo: `git filter-repo` para alisin
ang 1.5 GB sa history. **Irreversible** yun at kailangan ng force push, at
maaapektuhan ang bawat kopya at branch. Wag gagawin nang wala ang sabi ni Neil.

---

*Sinulat 2026-08-16 pagkatapos ng 3 araw na hindi makapag-clone sa tatlong
magkaibang shop. Lahat ng numero dito ay sinukat sa araw na yun, hindi hula.*
