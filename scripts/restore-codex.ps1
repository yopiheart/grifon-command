# Re-arm the OpenAI Codex CLI after the cafe defreezer wipes ~/ overnight.
# The `.claude/skills/codex-image` skill bridges Claude Code -> Codex's built-in
# image generator (gpt-image-2), billed against your ChatGPT plan (no API key).
# The skill FILES live in the repo and survive the wipe; the Codex install +
# login do NOT, so run this once per session to restore them.
#
# Usage (from the grifon-command folder):
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass   # if not already set this session
#   .\scripts\restore-codex.ps1
#
# After this finishes, Claude Code can generate images via:
#   node .claude/skills/codex-image/generate.mjs --prompt "..." --out hero.png

$ErrorActionPreference = "Stop"

# --- 1. Ensure the Codex CLI is installed ---
$codex = Get-Command codex -ErrorAction SilentlyContinue
if (-not $codex) {
    Write-Host "Codex CLI not found - installing @openai/codex globally..." -ForegroundColor Yellow
    npm install -g @openai/codex
    $codex = Get-Command codex -ErrorAction SilentlyContinue
    if (-not $codex) {
        Write-Host "ERROR: install finished but 'codex' is still not on PATH." -ForegroundColor Red
        Write-Host "Open a new terminal (so PATH refreshes) and re-run this script."
        exit 1
    }
} else {
    Write-Host "OK: Codex CLI present ($(codex --version))." -ForegroundColor Green
}

# --- 2. Ensure you are logged in (OAuth token on disk, no API key) ---
$authPath = "$env:USERPROFILE\.codex\auth.json"
if (-not (Test-Path $authPath)) {
    Write-Host ""
    Write-Host "Not logged in - launching 'codex login'..." -ForegroundColor Yellow
    Write-Host "Sign in with your ChatGPT account in the browser window that opens." -ForegroundColor Cyan
    codex login
    if (-not (Test-Path $authPath)) {
        Write-Host "ERROR: login did not create $authPath. Re-run 'codex login' manually." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "OK: already logged in ($authPath)." -ForegroundColor Green
}

Write-Host ""
Write-Host "Codex image bridge is ready." -ForegroundColor Green
Write-Host "Test it:" -ForegroundColor Cyan
Write-Host '  node .claude/skills/codex-image/generate.mjs --prompt "a husky in snow" --out .tmp/test.png'
Write-Host ""
