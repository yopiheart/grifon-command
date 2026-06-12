$input_data = $input | Out-String
$json = $input_data | ConvertFrom-Json

# --- Extract fields ---
$used = $null
if ($json.context_window.used_percentage -ne $null) {
    $used = [int][math]::Round($json.context_window.used_percentage)
}

$model = ""
if ($json.model.display_name) { $model = $json.model.display_name }

$cwd = ""
if ($json.workspace.current_dir) {
    $cwd = [System.IO.Path]::GetFileName($json.workspace.current_dir.TrimEnd('/\'))
    if (-not $cwd) { $cwd = $json.workspace.current_dir }
}

# --- Git branch (best-effort, skip if not in a repo or git unavailable) ---
$branch = ""
try {
    $gitOut = & git -C $json.workspace.current_dir --no-optional-locks rev-parse --abbrev-ref HEAD 2>$null
    if ($LASTEXITCODE -eq 0 -and $gitOut) { $branch = $gitOut.Trim() }
} catch { }

# --- ANSI color helpers ---
$ESC = [char]27
$reset  = "$ESC[0m"
$dim    = "$ESC[2m"
$green  = "$ESC[32m"
$yellow = "$ESC[33m"
$red    = "$ESC[31m"
$cyan   = "$ESC[36m"
$white  = "$ESC[37m"

# --- Context budget segment ---
$ctxSegment = ""
if ($used -ne $null) {
    $hint = ""
    if ($used -lt 40) {
        $ctxColor = $green
        $icon = "o"
    } elseif ($used -lt 65) {
        $ctxColor = $yellow
        $icon = "!"
    } else {
        $ctxColor = $red
        $icon = "X"
        $hint = " ${dim}/clear?${reset}"
    }
    $ctxSegment = "${ctxColor}[$icon ctx:${used}%]${reset}${hint}"
} else {
    $ctxSegment = "${dim}[ctx:-]${reset}"
}

# --- Model segment ---
$modelSegment = ""
if ($model) {
    $modelSegment = "${dim}${model}${reset}"
}

# --- Branch segment ---
$branchSegment = ""
if ($branch) {
    $branchSegment = "${cyan}${branch}${reset}"
}

# --- Dir segment ---
$dirSegment = ""
if ($cwd) {
    $dirSegment = "${white}${cwd}${reset}"
}

# --- Assemble line ---
$parts = @()
if ($modelSegment)  { $parts += $modelSegment }
if ($dirSegment)    { $parts += $dirSegment }
if ($branchSegment) { $parts += $branchSegment }
if ($ctxSegment)    { $parts += $ctxSegment }

$line = $parts -join "  "
Write-Host $line
