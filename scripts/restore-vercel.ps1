# Restore Vercel CLI + project link after the cafe defreezer wipes
# C:\Users\Administrator\ overnight. Mirrors the pattern of
# restore-notebooklm.ps1 — idempotent, safe to re-run.
#
# Usage (from the grifon-command folder):
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass   # if not already
#   .\scripts\restore-vercel.ps1
#
# ── TWO AUTH MODES ────────────────────────────────────────────────────────────
#
# A) TOKEN (non-interactive — lets an AGENT run Vercel ops for you)
#    Set a token before running this script and every `vercel` call below works
#    with no browser. Get one at https://vercel.com/account/tokens (scope it to
#    the grifon-command project; give it the shortest expiry you can live with).
#
#      $env:VERCEL_TOKEN = 'xxxxxxxx'          # this session only
#      .\scripts\restore-vercel.ps1
#
#    The defreezer wipes C:\Users\Administrator\ INCLUDING this repo clone, so a
#    token file inside the repo would not survive either. Keep the token off this
#    machine (password manager / phone) and either paste it as above, or park it
#    on a drive the defreezer does not touch and point at it:
#
#      $env:VERCEL_TOKEN_FILE = 'D:\keys\vercel.txt'
#      .\scripts\restore-vercel.ps1
#
#    NEVER commit the token and never write it into this repo. projectId/orgId in
#    scripts/vercel-project.json are public identifiers and ARE safe to commit;
#    the token is not.
#
# B) INTERACTIVE (`vercel login`) — browser auth, once per session. Fine when
#    you are driving by hand, but an agent cannot complete it.
#
# ── First-time setup (one-shot, then forget) ──────────────────────────────────
#   1. Run `npm i -g vercel` and `vercel login`
#   2. From the repo root, run `vercel link` and pick the grifon-command project
#   3. Copy the generated .vercel/project.json into scripts/vercel-project.json
#      (`Copy-Item .vercel\project.json scripts\vercel-project.json`)
#   4. Commit scripts/vercel-project.json — projectId/orgId are public identifiers,
#      NOT secrets. The auth token lives elsewhere (~\AppData\Roaming\com.vercel.cli\)
#      and must NEVER be committed.
#
# Once scripts/vercel-project.json is in the repo, this script handles every
# future reboot: re-installs the CLI and re-creates .vercel/project.json so
# `vercel deploy` and `vercel inspect` work without re-linking.

param(
    # Explicit token wins over $env:VERCEL_TOKEN / $env:VERCEL_TOKEN_FILE.
    # Prefer the env var — a parameter can land in your shell history.
    [string]$Token
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$savedProjectJson = Join-Path $PSScriptRoot "vercel-project.json"
$liveProjectDir = Join-Path $repoRoot ".vercel"
$liveProjectJson = Join-Path $liveProjectDir "project.json"

# 1) Ensure Vercel CLI is installed
$vercel = Get-Command vercel -ErrorAction SilentlyContinue
if (-not $vercel) {
    Write-Host "Vercel CLI not found. Installing globally via npm..." -ForegroundColor Yellow
    # Windows PowerShell 5.1 turns ANY native-command stderr line into an ErrorRecord,
    # and with $ErrorActionPreference='Stop' that aborts the script. npm routinely writes
    # deprecation warnings to stderr on a perfectly successful install, so drop to
    # 'Continue' for this call and judge success by $LASTEXITCODE instead.
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    npm install -g vercel
    $npmExit = $LASTEXITCODE
    $ErrorActionPreference = $prevEap
    if ($npmExit -ne 0) {
        Write-Host "ERROR: npm install -g vercel failed (exit $npmExit)." -ForegroundColor Red
        exit 1
    }
    # Re-resolve: the shim lands in the npm global bin, which may not be on PATH in
    # THIS session even though the install succeeded.
    $vercel = Get-Command vercel -ErrorAction SilentlyContinue
    if (-not $vercel) {
        $npmBin = (npm prefix -g).Trim()
        if ($npmBin -and (Test-Path (Join-Path $npmBin 'vercel.cmd'))) {
            $env:PATH = "$npmBin;$env:PATH"
            $vercel = Get-Command vercel -ErrorAction SilentlyContinue
        }
    }
    if (-not $vercel) {
        Write-Host "ERROR: vercel installed but not resolvable on PATH. Open a new shell and re-run." -ForegroundColor Red
        exit 1
    }
    Write-Host "OK: Vercel CLI installed at $($vercel.Source)" -ForegroundColor Green
} else {
    Write-Host "OK: Vercel CLI already installed at $($vercel.Source)" -ForegroundColor Green
}

# 2) Restore .vercel/project.json from the committed copy
if (Test-Path $savedProjectJson) {
    if (-not (Test-Path $liveProjectDir)) {
        New-Item -ItemType Directory -Path $liveProjectDir | Out-Null
    }
    Copy-Item -Path $savedProjectJson -Destination $liveProjectJson -Force
    Write-Host "OK: .vercel/project.json restored from scripts/vercel-project.json" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "WARN: scripts/vercel-project.json does not exist." -ForegroundColor Yellow
    Write-Host "First-time setup needed:" -ForegroundColor Cyan
    Write-Host "  1. vercel login"
    Write-Host "  2. vercel link    # pick the grifon-command project"
    Write-Host "  3. Copy-Item .vercel\project.json scripts\vercel-project.json"
    Write-Host "  4. git add scripts/vercel-project.json; git commit; git push"
    Write-Host ""
    Write-Host "After that, this script will handle every future reboot." -ForegroundColor Cyan
    exit 0
}

# 3) Resolve a token, if one was supplied (parameter > env var > token file)
$resolvedToken = $null
$tokenSource = $null

if ($Token) {
    $resolvedToken = $Token
    $tokenSource = "-Token parameter"
} elseif ($env:VERCEL_TOKEN) {
    $resolvedToken = $env:VERCEL_TOKEN
    $tokenSource = '$env:VERCEL_TOKEN'
} elseif ($env:VERCEL_TOKEN_FILE) {
    if (Test-Path $env:VERCEL_TOKEN_FILE) {
        $resolvedToken = (Get-Content $env:VERCEL_TOKEN_FILE -Raw).Trim()
        $tokenSource = "file $($env:VERCEL_TOKEN_FILE)"
    } else {
        Write-Host "WARN: VERCEL_TOKEN_FILE is set but '$($env:VERCEL_TOKEN_FILE)' does not exist." -ForegroundColor Yellow
    }
}

# Guard: a token must never end up inside the repo, where a later `git add -A`
# could commit it. Refuse rather than silently accept an unsafe location.
if ($tokenSource -and $env:VERCEL_TOKEN_FILE -and (Test-Path $env:VERCEL_TOKEN_FILE)) {
    $tokenFull = (Resolve-Path $env:VERCEL_TOKEN_FILE).Path
    $repoFull = (Resolve-Path $repoRoot).Path
    if ($tokenFull.StartsWith($repoFull, [System.StringComparison]::OrdinalIgnoreCase)) {
        Write-Host ""
        Write-Host "ERROR: the token file lives INSIDE the repo ($tokenFull)." -ForegroundColor Red
        Write-Host "That is one 'git add -A' away from a committed secret. Move it to a" -ForegroundColor Red
        Write-Host "drive the defreezer does not wipe (e.g. D:\keys\vercel.txt) and re-run." -ForegroundColor Red
        exit 1
    }
}

# 4) Verify the token, or fall back to the interactive path
if ($resolvedToken) {
    # Export so every later `vercel` call in THIS session is authenticated without
    # repeating --token (and without the token landing in shell history).
    $env:VERCEL_TOKEN = $resolvedToken

    $who = vercel whoami --token $resolvedToken
    if ($LASTEXITCODE -eq 0) {
        Write-Host "OK: authenticated via $tokenSource as '$($who | Select-Object -Last 1)'." -ForegroundColor Green
        Write-Host "     `$env:VERCEL_TOKEN is set for this session — no 'vercel login' needed." -ForegroundColor Green
        Write-Host ""
        Write-Host "Non-interactive commands now available (agent-runnable):" -ForegroundColor Cyan
        Write-Host "  vercel env ls preview                       # list env vars"
        Write-Host "  vercel env add   NAME preview               # add    (value via stdin)"
        Write-Host "  vercel env rm    NAME preview --yes         # remove"
        Write-Host "  vercel deploy                               # preview deploy"
        Write-Host "  vercel deploy --prod                        # production deploy"
        Write-Host "  vercel inspect <url>                        # deployment detail"
        Write-Host ""
        Write-Host "Note: 'vercel env add' reads the VALUE from stdin, so it stays out of" -ForegroundColor DarkGray
        Write-Host "history:  'true' | vercel env add VITE_IMAGE_GATE_ENABLED preview" -ForegroundColor DarkGray
        Write-Host ""
        exit 0
    }

    Write-Host ""
    Write-Host "ERROR: 'vercel whoami' rejected the token from $tokenSource." -ForegroundColor Red
    Write-Host "The token is probably expired, revoked, or scoped to another team." -ForegroundColor Red
    Write-Host "Mint a new one at https://vercel.com/account/tokens and re-run." -ForegroundColor Red
    Write-Host ""
    exit 1
}

# 5) No token — interactive login is the only remaining path
Write-Host ""
Write-Host "No token found (checked -Token, `$env:VERCEL_TOKEN, `$env:VERCEL_TOKEN_FILE)." -ForegroundColor Yellow
Write-Host "Next step:" -ForegroundColor Cyan
Write-Host "  vercel login   # one-time per session, browser auth"
Write-Host ""
Write-Host "To skip this (and let an agent run Vercel ops for you), set a token first:" -ForegroundColor Cyan
Write-Host "  `$env:VERCEL_TOKEN = 'xxxxxxxx'   # https://vercel.com/account/tokens"
Write-Host "  .\scripts\restore-vercel.ps1"
Write-Host ""
Write-Host "Then deploy with:" -ForegroundColor Cyan
Write-Host "  vercel deploy             # preview"
Write-Host "  vercel deploy --prod      # production"
Write-Host ""
