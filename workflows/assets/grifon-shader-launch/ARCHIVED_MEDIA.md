# Historical QA media archive

The launch film's root exports, editable source, product captures, fonts,
materials, licenses and finished offline player remain in the checkout.
`qa/landscape-poster.png` and `qa/portrait-poster.png` remain as inputs to that
player's builder. Historical JSON reports, reviews, logs and runners are intact.

[qa-media-archive.json](qa-media-archive.json) lists the archived binary QA
captures, contact sheets, movie copies and temporary runtime inputs for this
folder. Historical reports refer to their original archived media; restore
those inputs before rerunning old witnesses or comparison builders. They do
not describe a fresh review of this packaging change.

Every archived entry was checked against its original Git blob, size and
SHA-256 at commit `118a5e8aac30739b2705489077ad862b671dbfd4`. All 629 retained
PR166 files were unchanged immediately after pruning. The later `.gitignore`
additions prevent regenerated QA media being re-added. Git history is intact.

The verified archive is
`F:/GrifonLocalArchives/pr166-media-archive/118a5e8a-qa-media.tar` on this machine;
it is not an off-device backup. The manifest records its size and SHA-256.
See the recreation folder's [recovery instructions](../grifon-shader-recreation/ARCHIVED_MEDIA.md#recovery)
to restore all archived files, or restore only a needed path from this manifest:

A shallow checkout missing the pinned commit first needs
`git fetch origin 118a5e8aac30739b2705489077ad862b671dbfd4`.

```powershell
$mediaManifest = Get-Content workflows/assets/grifon-shader-launch/qa-media-archive.json -Raw | ConvertFrom-Json
$mediaPath = $mediaManifest.entries[0].path
git --literal-pathspecs restore --source=118a5e8aac30739b2705489077ad862b671dbfd4 --worktree -- "$mediaPath"
```

Recovery changes working files only and does not stage them. All three finished
offline players retain their required films and posters.
