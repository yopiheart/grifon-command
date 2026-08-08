# set-wallpaper.ps1 — sets a Grifon Noir wallpaper as the Windows desktop background.
# Idempotent re-arm script (defreezer wipes the wallpaper setting on reboot).
# Usage (from repo root):
#   powershell -ExecutionPolicy Bypass -File scripts\set-wallpaper.ps1 -Variant v6-prism-mk2
#   powershell -ExecutionPolicy Bypass -File scripts\set-wallpaper.ps1 -Image C:\path\to\any.png
# Variants: v6-prism-mk2 (default, won the 2026-08-08 PRESENCE gauntlet at 72)
#           v5a-slate-quiet | v5a-slate | v5b-prism-quiet | v5c-monolith-quiet | v5d-lens-quiet
#           v4a-plate | v4b-aperture | v1 | v2 | v3   (superseded; all scored 42-48)
# Browse them with scores + reasoning: assets\wallpapers\gallery.html
# -Variant is interpolated straight into the filename, so any rendered
# wallpaper-noir-<variant>-3840x2160.png works without touching this script.
param(
    [string]$Variant = 'v6-prism-mk2',
    [string]$Image = ''
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot

if (-not $Image) {
    # Prefer 4K; Windows 'Fill' scales it to any display.
    $Image = Join-Path $repoRoot "assets\wallpapers\wallpaper-noir-$Variant-3840x2160.png"
}
if (-not (Test-Path $Image)) {
    Write-Error "Wallpaper not found: $Image  (render first: node tools/render-wallpaper.mjs)"
}
$Image = (Resolve-Path $Image).Path

# WallpaperStyle 10 = Fill, TileWallpaper 0
Set-ItemProperty -Path 'HKCU:\Control Panel\Desktop' -Name WallpaperStyle -Value '10'
Set-ItemProperty -Path 'HKCU:\Control Panel\Desktop' -Name TileWallpaper -Value '0'

if (-not ('GrifonWallpaper' -as [type])) {
    Add-Type @'
using System.Runtime.InteropServices;
public class GrifonWallpaper {
    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    public static extern int SystemParametersInfo(int uAction, int uParam, string lpvParam, int fuWinIni);
}
'@
}
# SPI_SETDESKWALLPAPER = 20; SPIF_UPDATEINIFILE (1) | SPIF_SENDCHANGE (2) = 3
[GrifonWallpaper]::SystemParametersInfo(20, 0, $Image, 3) | Out-Null
Write-Host "Wallpaper set: $Image"
