param(
    [string]$Revision = (Get-Date -Format 'yyyyMMdd-HHmmss'),
    [ValidateSet('A4', 'Widescreen')][string]$Format = 'A4'
)

# Rebuild from profile-content.json with the existing bundled Codex runtime.
# Each PDF and editable deck gets a new revision filename.
$ErrorActionPreference = 'Stop'
$taskRoot = (Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
$taskRuntime = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies'
$taskPython = Join-Path $taskRuntime 'python/python.exe'
$taskNode = Join-Path $taskRuntime 'node/bin/node.exe'
$taskModules = Join-Path $taskRuntime 'node/node_modules'
$taskTmpName = if ($Format -eq 'Widescreen') { '.tmp/oceanides-widescreen' } else { '.tmp/oceanides-profile' }
$taskTmp = Join-Path $taskRoot $taskTmpName
$previousModules = $env:RUNTIME_NODE_MODULES
$previousNode = $env:RUNTIME_NODE

Push-Location $taskRoot
try {
    & $taskPython (Join-Path $PSScriptRoot 'build-profile.py') $Revision $Format
    if ($LASTEXITCODE -ne 0) { throw 'PDF build failed.' }
    $taskJunction = Join-Path $taskTmp 'node_modules'
    if (-not (Test-Path -LiteralPath $taskJunction)) {
        New-Item -ItemType Junction -Path $taskJunction -Target $taskModules | Out-Null
    }
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'build-presentation.mjs') -Destination $taskTmp
    $env:RUNTIME_NODE_MODULES = $taskModules
    $env:RUNTIME_NODE = $taskNode
    & $taskNode (Join-Path $taskTmp 'build-presentation.mjs') $Revision $Format
    if ($LASTEXITCODE -ne 0) { throw 'Presentation build or validation failed.' }
}
finally {
    $env:RUNTIME_NODE_MODULES = $previousModules
    $env:RUNTIME_NODE = $previousNode
    Pop-Location
}
