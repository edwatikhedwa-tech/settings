[CmdletBinding()]
param(
    [switch] $DryRun,
    [switch] $Apply
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
Import-Module (Join-Path $PSScriptRoot "modules\AgentControlPlane.psm1") -Force

if (-not $DryRun -and -not $Apply) { $DryRun = $true }

$root = Get-AcpRoot
$globalAgents = Join-Path $env:USERPROFILE ".codex\AGENTS.md"
$skillsRoot = Join-Path $env:USERPROFILE ".agents\skills"
$startMarker = "<!-- agent-control-plane:start -->"
$endMarker = "<!-- agent-control-plane:end -->"

if (Test-Path -LiteralPath $globalAgents) {
    $current = Get-Content -LiteralPath $globalAgents -Raw -Encoding UTF8
    $pattern = [regex]::Escape($startMarker) + ".*?" + [regex]::Escape($endMarker) + "\s*"
    $managedRegex = New-Object System.Text.RegularExpressions.Regex($pattern, [System.Text.RegularExpressions.RegexOptions]::Singleline)
    if ($managedRegex.IsMatch($current)) {
        if ($DryRun) {
            Write-AcpStatus -Level "INFO" -Message "DryRun: remove only the managed block in $globalAgents"
        } else {
            $backup = New-AcpBackup -Path $globalAgents
            if ($backup) { Write-AcpStatus -Level "OK" -Message "Backup before update: $backup" }
            Set-AcpFileAtomic -Path $globalAgents -Content ($managedRegex.Replace($current, "").TrimEnd())
            Write-AcpStatus -Level "OK" -Message "Managed global guidance removed."
        }
    } else {
        Write-AcpStatus -Level "SKIP" -Message "No managed block found in $globalAgents"
    }
} else {
    Write-AcpStatus -Level "SKIP" -Message "Not found: $globalAgents"
}

Get-ChildItem -LiteralPath (Join-Path $root "skills") -Directory | ForEach-Object {
    $target = Join-Path $skillsRoot $_.Name
    if (-not (Test-Path -LiteralPath $target)) { return }
    $item = Get-Item -LiteralPath $target -Force
    if (-not $item.LinkType -or [string]$item.Target -ne $_.FullName) {
        Write-AcpStatus -Level "SKIP" -Message "Not a managed skill link: $target"
    } elseif ($DryRun) {
        Write-AcpStatus -Level "INFO" -Message "DryRun: remove managed skill link $target"
    } else {
        Remove-Item -LiteralPath $target -Force
        Write-AcpStatus -Level "OK" -Message "Managed skill link removed: $target"
    }
}
