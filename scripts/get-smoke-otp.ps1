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

# Key preference (verified 2026-07-02 on this project): the NEW sb_secret_* key IS
# accepted by the GoTrue admin API; the legacy service_role JWT is NOT (legacy keys are
# disabled project-wide). Use SUPABASE_SERVICE_ROLE_KEY first; JWT only as fallback.
$key = Get-EnvValue 'SUPABASE_SERVICE_ROLE_KEY'
$fallback = Get-EnvValue 'SUPABASE_SERVICE_ROLE_JWT'
$url = Get-EnvValue 'VITE_SUPABASE_URL'
if (-not $key -and -not $fallback) { Write-Error 'SUPABASE_SERVICE_ROLE_KEY missing from .env'; exit 1 }
if (-not $key) { $key = $fallback; $fallback = $null }
$keyType = if ($key.StartsWith('sb_secret')) { 'sb_secret' } elseif ($key.StartsWith('eyJ')) { 'legacy JWT' } else { 'unknown format' }
Write-Host ("  using key type: " + $keyType + " (length " + $key.Length + ")")
if (-not $url) { Write-Error 'VITE_SUPABASE_URL missing from .env'; exit 1 }

# PS 5.1: force TLS 1.2 (older default can be rejected upstream with an opaque error).
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

function Invoke-GenerateLink([string]$k) {
  $body = (@{ type = 'magiclink'; email = $EmailAddr } | ConvertTo-Json)
  return Invoke-RestMethod -Method Post -Uri ($url.TrimEnd('/') + '/auth/v1/admin/generate_link') `
    -Headers @{ apikey = $k; Authorization = ('Bearer ' + $k) } `
    -ContentType 'application/json' -Body $body
}

try {
  $resp = Invoke-GenerateLink $key
} catch {
  $status = $null
  try { $status = [int]$_.Exception.Response.StatusCode } catch {}
  if ($fallback) {
    Write-Warning ("generate_link with " + $keyType + " failed (HTTP " + $status + ") - retrying with the other key from .env...")
    try { $resp = Invoke-GenerateLink $fallback } catch {
      Write-Error ("generate_link failed with BOTH keys: " + $_.Exception.Message + " - fallback: read the code from the Resend dashboard Emails log instead (see workflows/smoke_test_setup.md)."); exit 1
    }
  } else {
    Write-Error ("generate_link failed (HTTP " + $status + "): " + $_.Exception.Message); exit 1
  }
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
