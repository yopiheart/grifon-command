# Restore the notebooklm MCP server registration after the cafe defreezer
# wipes ~/.claude.json overnight. Run this AFTER you have installed the
# Claude Code VSCode extension and signed in (which creates the file).
#
# Usage (from the grifon-command folder):
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass   # if not already set this session
#   .\scripts\restore-notebooklm.ps1
#
# (Phase 4 of the cafe ritual already runs the Bypass line, so if you've
# done `npm install` in this PowerShell window you can skip it.)
#
# After this finishes:
#   1. Run `npx -y notebooklm-mcp@latest` in a separate terminal,
#      sign into Google in the Chrome window that opens, then close it.
#   2. Restart VS Code so Claude Code reloads MCP servers.

$ErrorActionPreference = "Stop"

$path = "$env:USERPROFILE\.claude.json"

if (-not (Test-Path $path)) {
    Write-Host "ERROR: $path does not exist." -ForegroundColor Red
    Write-Host "Install the Claude Code VSCode extension and sign in first, then re-run this script."
    exit 1
}

$json = Get-Content $path -Raw | ConvertFrom-Json

$entry = [pscustomobject]@{
    command = "cmd"
    args    = @("/c", "npx", "-y", "notebooklm-mcp@latest")
}
$mcp = [pscustomobject]@{ notebooklm = $entry }

if ($json.PSObject.Properties.Name -contains "mcpServers") {
    $json.mcpServers = $mcp
} else {
    $json | Add-Member -NotePropertyName "mcpServers" -NotePropertyValue $mcp
}

$out = $json | ConvertTo-Json -Depth 100
[System.IO.File]::WriteAllText($path, $out, [System.Text.UTF8Encoding]::new($false))

Write-Host ""
Write-Host "OK: notebooklm MCP entry written to $path" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. In a separate PowerShell window, run:"
Write-Host "       npx -y notebooklm-mcp@latest"
Write-Host "     Sign into Google in the Chrome window that opens, then close it."
Write-Host "  2. Restart VS Code so Claude Code reloads MCP servers."
Write-Host ""
