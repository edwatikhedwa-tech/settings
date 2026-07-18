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
$targets = @(
    (Join-Path $root ".codex\config.toml")
)

foreach ($target in $targets) {
    if (Test-Path -LiteralPath $target) {
        if ($DryRun) {
            Write-AcpStatus -Level "INFO" -Message "DryRun: remove managed file $target"
        } elseif ($Apply) {
            $backup = New-AcpBackup -Path $target
            if ($backup) { Write-AcpStatus -Level "OK" -Message "Backup before removal: $backup" }
            Remove-Item -LiteralPath $target -Force
            Write-AcpStatus -Level "OK" -Message "Managed file removed: $target"
        }
    } else {
        Write-AcpStatus -Level "SKIP" -Message "Not found: $target"
    }
}
