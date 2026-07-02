# get-smoke-otp.ps1 — mint a fresh sign-in OTP for the smoke-test account.
#
# The app's email auth is OTP-only (passwordless), so browser smokes can't use a
# password and the test inbox isn't reachable from the cafe PC. This mints a valid
# code via the Supabase admin API (same admin path that created the account) using
# the service-role key already in .env. Run it YOURSELF in a terminal, then type the
# 6-digit code into the app's // VERIFICATION CODE field (or hand it to the
# smoke-tester agent). Codes are single-use and short-lived; re-run for a fresh one.
#
# NOTE: the code minted here REPLACES any code the app just emailed — after running
# this, use THIS code, not the emailed one.
#
# Usage:  .\scripts\get-smoke-otp.ps1            # default smoke account
#         .\scripts\get-smoke-otp.ps1 -EmailAddr you@example.com
param([string]$EmailAddr = 'smoketest-dc@grifon.dev')

$envPath = Join-Path (Split-Path $PSScriptRoot -Parent) '.env'
if (-not (Test-Path $envPath)) { Write-Error ".env not found at $envPath (defreezer wipe? restore keys first)"; exit 1 }

function Get-EnvValue([string]$name) {
  $line = Select-String -Path $envPath -Pattern ('^' + $name + '=(.+)$') | Select-Object -First 1
  if ($line) { return $line.Matches[0].Groups[1].Value.Trim().Trim('"') }
  return $null
}

# The GoTrue ADMIN API (generate_link) 401s on the new sb_secret_* key format (observed
# 2026-07-02); it wants the LEGACY service_role JWT. Prefer a dedicated var for it:
# Supabase dashboard -> Settings -> API -> "legacy API keys" -> service_role (reveal),
# then add to .env:  SUPABASE_SERVICE_ROLE_JWT=eyJ...
$key = Get-EnvValue 'SUPABASE_SERVICE_ROLE_JWT'
if (-not $key) { $key = Get-EnvValue 'SUPABASE_SERVICE_ROLE_KEY' }
$url = Get-EnvValue 'VITE_SUPABASE_URL'
if (-not $key) { Write-Error 'SUPABASE_SERVICE_ROLE_JWT / _KEY missing from .env'; exit 1 }
if ($key.StartsWith('sb_secret')) {
  Write-Warning 'Only the new sb_secret key is in .env — the auth admin API may 401 on it. If it does, add SUPABASE_SERVICE_ROLE_JWT (legacy service_role JWT from the dashboard) to .env and re-run.'
}
if (-not $url) { Write-Error 'VITE_SUPABASE_URL missing from .env'; exit 1 }

$body = (@{ type = 'magiclink'; email = $EmailAddr } | ConvertTo-Json)
try {
  $resp = Invoke-RestMethod -Method Post -Uri ($url.TrimEnd('/') + '/auth/v1/admin/generate_link') `
    -Headers @{ apikey = $key; Authorization = ('Bearer ' + $key) } `
    -ContentType 'application/json' -Body $body
} catch {
  Write-Error ("generate_link failed: " + $_.Exception.Message); exit 1
}

if ($resp.email_otp) {
  Write-Host ''
  Write-Host ("  OTP for " + $EmailAddr + ":  " + $resp.email_otp) -ForegroundColor Yellow
  Write-Host '  (single-use; type it into the app sign-in code field now)'
  Write-Host ''
} else {
  Write-Error 'No email_otp in response — check the account exists (see workflows/smoke_test_setup.md).'
  exit 1
}
