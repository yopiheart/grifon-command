# Codex desktop starter. Default and -CheckOnly are read-only.
# Open this saved project in Codex yourself; account and hook trust stay in its UI.
[CmdletBinding()]
param(
    [switch]$CheckOnly,
    [switch]$InstallDependencies
)

$ErrorActionPreference = 'Stop'
if ($CheckOnly -and $InstallDependencies) {
    Write-Host '-CheckOnly cannot be combined with -InstallDependencies.' -ForegroundColor Red
    exit 2
}
$repoPath = Split-Path -Parent $PSScriptRoot
foreach ($command in @('git', 'node', 'npm.cmd')) {
    if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
        Write-Error "Missing $command. Install Git for Windows and Node 24/npm 11, then reopen the terminal."
        exit 1
    }
}

Push-Location -LiteralPath $repoPath
try {
    # Native failures must work equally in Windows PowerShell 5.1 and PowerShell 7.
    $PSNativeCommandUseErrorActionPreference = $false
    $nodeVersion = & node --version
    $nodeExit = $LASTEXITCODE
    $npmVersion = & npm.cmd --version
    $npmExit = $LASTEXITCODE
    if ($nodeExit -ne 0 -or $npmExit -ne 0 -or $nodeVersion -notmatch '^v24\.' -or $npmVersion -notmatch '^11\.') {
        Write-Error 'This checkout requires Node 24 and npm 11. No dependencies were installed.'
        exit 1
    }
    if ($InstallDependencies) {
        & npm.cmd ci
        $installExit = $LASTEXITCODE
        if ($installExit -ne 0) {
            Write-Host "npm.cmd ci failed (exit $installExit). Resolve the install error before continuing." -ForegroundColor Red
            exit $installExit
        }
    }
    & node tools/codex-readiness.mjs
    $checkExit = $LASTEXITCODE
    Write-Host ''
    Write-Host 'Continue in the saved Codex desktop project. Read NOW.md and inspect git status before edits.'
    Write-Host 'After a fresh clone: .\scripts\codex-cafe-start.ps1 -InstallDependencies'
    Write-Host 'Verification: npm.cmd run build; npm.cmd run test; npm.cmd run dev'
    Write-Host 'Account login and review/trust of project hooks require your action in Codex.'
    exit $checkExit
} finally {
    Pop-Location
}
