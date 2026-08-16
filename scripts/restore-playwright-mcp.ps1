# Restore the Playwright MCP server registration after the cafe defreezer
# wipes ~/.claude.json. This MCP gives the agent a real browser (headless
# or headed) so it can navigate localhost:5173, screenshot UI states,
# click through the wizard, etc. - the "drag/drop screenshots replacement"
# workflow Boris Cherny demos in his Claude Code talks.
#
# Usage (from the grifon-command folder):
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass   # if not already this session
#   .\scripts\restore-playwright-mcp.ps1
#
# After this finishes, restart VS Code so Claude Code reloads MCP servers.
#
# Idempotent - safe to run on every cafe-PC reboot. Merge-aware: preserves
# any other MCP entries already in ~/.claude.json (e.g., notebooklm).

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
    args    = @("/c", "npx", "-y", "@playwright/mcp@latest")
}

if ($json.PSObject.Properties.Name -notcontains "mcpServers" -or $null -eq $json.mcpServers) {
    $json | Add-Member -NotePropertyName "mcpServers" -NotePropertyValue ([pscustomobject]@{}) -Force
}

if ($json.mcpServers.PSObject.Properties.Name -contains "playwright") {
    $json.mcpServers.playwright = $entry
} else {
    $json.mcpServers | Add-Member -NotePropertyName "playwright" -NotePropertyValue $entry
}

$out = $json | ConvertTo-Json -Depth 100
[System.IO.File]::WriteAllText($path, $out, [System.Text.UTF8Encoding]::new($false))

Write-Host ""
Write-Host "OK: playwright MCP entry written to $path" -ForegroundColor Green
Write-Host ""
Write-Host "Existing mcpServers entries:" -ForegroundColor Cyan
($json.mcpServers.PSObject.Properties | ForEach-Object { "  - $($_.Name)" }) -join "`n" | Write-Host
Write-Host ""
Write-Host "Next step:" -ForegroundColor Cyan
Write-Host "  Restart VS Code (or just the Claude Code panel) so the MCP loads."
Write-Host "  First navigate call will auto-download Chromium (~150MB, one-time per fresh PC)."
Write-Host ""
