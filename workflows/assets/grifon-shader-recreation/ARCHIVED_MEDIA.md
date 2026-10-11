# Historical QA media archive

PR166 keeps the accepted `grifon-recreation-landscape-sound-v1.mp4`, silent
picture, earlier root exports, editable compositions, fonts, product captures,
material assets, licenses, sound recipe and all three finished offline players.
`qa/full-poster.png` remains because the recreation and sound player builders
read it. No film, source, historical JSON report, review, log or runner changed.

The binary QA captures, contact sheets, downloaded movie copies and temporary
runtime inputs listed in [qa-media-archive.json](qa-media-archive.json) are
archived. Across this folder and `grifon-shader-launch`, that removes 762 files
and 917,501,853 bytes from the active PR. The retained original PR166 files total
229,437,541 Git-blob bytes before these packaging documents. This reduces the
current file tree; ordinary Git history still contains the archived media.

Historical reports still describe their original runs. Their relative image,
movie and witness-input paths refer to the archived files, not files available
in a lean checkout. Historical QA comparison and witness runners that read
the listed paths need those inputs restored before rerunning. The current finished-player builders retain
their required films and posters. This packaging change does not establish a
new visual or audio review.

## Recovery

The manifest binds every archived path to its original Git blob, size and
SHA-256 at commit `118a5e8aac30739b2705489077ad862b671dbfd4`.
Every archive entry was verified against those original blob bytes before
removal; all 629 retained PR166 files were unchanged immediately after pruning.
The later `.gitignore` additions prevent regenerated QA media being re-added.

A verified local archive also exists at
`F:/GrifonLocalArchives/pr166-media-archive/118a5e8a-qa-media.tar`.
It is on this machine, not an off-device backup. Its size and SHA-256 are in
the manifest. From the repository root, restore all 762 archived QA files with:

```powershell
tar.exe -xf F:/GrifonLocalArchives/pr166-media-archive/118a5e8a-qa-media.tar -C .
```

On another checkout, restore only the exact paths needed from the pinned Git
revision. A shallow checkout missing that commit first needs
`git fetch origin 118a5e8aac30739b2705489077ad862b671dbfd4`; full-history checkouts
already containing it need no fetch. This restores the first manifest path:

```powershell
$mediaManifest = Get-Content workflows/assets/grifon-shader-recreation/qa-media-archive.json -Raw | ConvertFrom-Json
$mediaPath = $mediaManifest.entries[0].path
git --literal-pathspecs restore --source=118a5e8aac30739b2705489077ad862b671dbfd4 --worktree -- "$mediaPath"
```

Recovery changes working files only; it does not stage them. Keep restored
historical QA binaries ignored unless a new review explicitly needs them in Git.
