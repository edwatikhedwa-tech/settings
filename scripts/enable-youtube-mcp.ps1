[CmdletBinding()]
param(
    [switch] $Plan,
    [switch] $DryRun,
    [switch] $Apply
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
Import-Module (Join-Path $PSScriptRoot "modules\AgentControlPlane.psm1") -Force

if (-not $Plan -and -not $DryRun -and -not $Apply) { $Plan = $true }

$root = Get-AcpRoot
$key = $env:YOUTUBE_API_KEY
if (-not $key) { $key = [Environment]::GetEnvironmentVariable("YOUTUBE_API_KEY", "User") }
$configPath = Join-Path $env:USERPROFILE ".codex\config.toml"
$serverPath = (Join-Path $root "tools\youtube-research-mcp\index.mjs") -replace "\\", "/"
$startMarker = "# agent-control-plane:youtube-research-mcp:start"
$endMarker = "# agent-control-plane:youtube-research-mcp:end"
$block = @"
$startMarker
[mcp_servers.youtube_research]
enabled = true
command = "node"
args = ["$serverPath"]
env_vars = ["YOUTUBE_API_KEY"]
$endMarker
"@

Write-AcpStatus -Level "INFO" -Message "YouTube MCP mode: $(if ($Apply) { 'Apply' } elseif ($DryRun) { 'DryRun' } else { 'Plan' })"
if (-not (Test-Path -LiteralPath (Join-Path $root "tools\youtube-research-mcp\node_modules"))) {
    $level = if ($Apply) { "ERROR" } else { "WARN" }
    Write-AcpStatus -Level $level -Message "Dependencies are missing. Run npm install in tools\youtube-research-mcp before applying this configuration."
    if ($Apply) { exit 1 }
}
if (-not $key) {
    Write-AcpStatus -Level "WARN" -Message "YOUTUBE_API_KEY is not set. Create a restricted key before applying this configuration."
    if ($Apply) { exit 1 }
}

if ($Plan -or $DryRun) {
    Write-AcpStatus -Level "INFO" -Message "Plan: add or refresh the managed YouTube MCP block in $configPath after backup."
    exit 0
}

$current = if (Test-Path -LiteralPath $configPath) { Get-Content -LiteralPath $configPath -Raw -Encoding UTF8 } else { "" }
$pattern = [regex]::Escape($startMarker) + ".*?" + [regex]::Escape($endMarker) + "\s*"
$managedRegex = New-Object System.Text.RegularExpressions.Regex($pattern, [System.Text.RegularExpressions.RegexOptions]::Singleline)
$withoutManaged = $managedRegex.Replace($current, "").TrimEnd()
$next = if ([string]::IsNullOrWhiteSpace($withoutManaged)) { $block } else { $withoutManaged + "`n`n" + $block }

if (($next -replace "`r`n", "`n").TrimEnd() -eq ($current -replace "`r`n", "`n").TrimEnd()) {
    Write-AcpStatus -Level "OK" -Message "YouTube MCP configuration is already current."
    exit 0
}

$backup = New-AcpBackup -Path $configPath
if ($backup) { Write-AcpStatus -Level "OK" -Message "Backup created: $backup" }
Set-AcpFileAtomic -Path $configPath -Content $next
Write-AcpStatus -Level "OK" -Message "YouTube MCP configuration enabled. Restart Codex to load it."
