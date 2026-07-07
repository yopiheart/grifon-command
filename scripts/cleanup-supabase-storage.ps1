# cleanup-supabase-storage.ps1 - sweep stale objects from a Supabase Storage bucket.
#
# Since the R2 cutover (MEDIA_STORE=r2, 2026-06-17) the app serves all media from
# Cloudflare R2, so objects left in the Supabase `gemini-videos` bucket are dead
# weight: nothing reads them, and any signed URL that ever pointed at them expired
# at 24-48h. The hourly cleanup cron (api/cron/cleanup-gemini-videos.ts) did NOT
# reap all of them (objects back to 2026-04 survived), and on the FREE tier the
# project goes read-only past 1 GB of Storage -- so this is the manual sweep that
# keeps the bucket small. See workflows/r2_media_migration.md Phase 5.
#
# Deletes via the Storage API (removes the actual bytes) -- NOT a raw
# storage.objects SQL delete, which would orphan the blobs and desync the bucket.
#
# Usage (from anywhere; the script finds .env at the repo root itself):
#   # dry run - lists what WOULD be deleted, deletes nothing:
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/cleanup-supabase-storage.ps1
#   # execute the delete:
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/cleanup-supabase-storage.ps1 -Execute
#   # tune the age cutoff or target bucket:
#   ... -Days 30            # only delete objects older than 30 days
#   ... -Bucket gemini-videos
#
# First run 2026-07-07 reclaimed 320 objects / 553.7 MB (561 MB -> 7 MB), sparing
# 4 objects newer than 48h. Reads SUPABASE_SERVICE_ROLE_KEY from .env -- never
# commit that key; this script only reads it at runtime.
#
# ASCII-ONLY ON PURPOSE: Windows PowerShell 5.1 reads a UTF-8-without-BOM .ps1 as
# Windows-1252, so any non-ASCII char (em-dash, arrow, checkmark) corrupts parsing.
# Keep every character in this file ASCII (same rule as scripts/restore-gh.ps1).

param(
  [int]$Days = 7,
  [string]$Bucket = 'gemini-videos',
  [switch]$Execute
)

$ErrorActionPreference = 'Stop'

# Find .env at the repo root (parent of this scripts/ folder), so the script works
# regardless of the caller's current directory.
$repoRoot = Split-Path $PSScriptRoot -Parent
$envFile = Join-Path $repoRoot '.env'
if (-not (Test-Path $envFile)) { throw "Cannot find .env at $envFile" }

$envMap = @{}
Get-Content $envFile | ForEach-Object {
  if ($_ -match '^\s*([^#=]+)=(.*)$') { $envMap[$Matches[1].Trim()] = $Matches[2].Trim() }
}
$base = $envMap['VITE_SUPABASE_URL']
$key  = $envMap['SUPABASE_SERVICE_ROLE_KEY']
if (-not $base -or -not $key) { throw "VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing from .env" }

$H = @{ Authorization = "Bearer $key"; apikey = $key; 'Content-Type' = 'application/json' }
$cutoff = (Get-Date).ToUniversalTime().AddDays(-$Days)

# Recursively list a prefix. The Storage list API returns one level; folder entries
# have id=null (recurse into them), file entries carry id + metadata.size.
function Get-Objects($prefix) {
  $out = @()
  $offset = 0
  while ($true) {
    $body = @{ prefix = $prefix; limit = 100; offset = $offset; sortBy = @{ column = 'name'; order = 'asc' } } | ConvertTo-Json
    $page = Invoke-RestMethod -Method Post -Uri "$base/storage/v1/object/list/$Bucket" -Headers $H -Body $body
    if (-not $page -or $page.Count -eq 0) { break }
    foreach ($e in $page) {
      $full = if ($prefix) { "$prefix$($e.name)" } else { $e.name }
      if ($null -eq $e.id) {
        $out += Get-Objects "$full/"
      } else {
        $out += [pscustomobject]@{ path = $full; created = [datetime]$e.created_at; size = [int64]($e.metadata.size) }
      }
    }
    if ($page.Count -lt 100) { break }
    $offset += 100
  }
  return $out
}

Write-Host "Listing bucket '$Bucket' (cutoff: older than $Days days) ..."
$objs   = Get-Objects ""
$stale  = $objs | Where-Object { $_.created -lt $cutoff }
$spared = $objs | Where-Object { $_.created -ge $cutoff }
$staleMB  = [math]::Round((($stale  | Measure-Object size -Sum).Sum / 1MB), 1)
$sparedMB = [math]::Round((($spared | Measure-Object size -Sum).Sum / 1MB), 1)

Write-Host "Total objects: $($objs.Count)"
Write-Host "STALE  (older than $Days d, would delete): $($stale.Count) objects, $staleMB MB"
Write-Host "SPARED (newer): $($spared.Count) objects, $sparedMB MB"

if (-not $Execute) {
  Write-Host ""
  Write-Host "[DRY RUN] No deletions. Re-run with -Execute to delete the stale set."
  return
}

if ($stale.Count -eq 0) { Write-Host "Nothing to delete."; return }

Write-Host ""
Write-Host "[EXECUTE] Deleting $($stale.Count) stale objects in batches of 100..."
$paths = @($stale.path)
$deleted = 0
for ($i = 0; $i -lt $paths.Count; $i += 100) {
  $batch = $paths[$i..([math]::Min($i + 99, $paths.Count - 1))]
  $body = @{ prefixes = $batch } | ConvertTo-Json
  Invoke-RestMethod -Method Delete -Uri "$base/storage/v1/object/$Bucket" -Headers $H -Body $body | Out-Null
  $deleted += $batch.Count
  Write-Host "  deleted $deleted / $($paths.Count)"
}
Write-Host "Done. Deleted $deleted objects (~$staleMB MB reclaimed)."
