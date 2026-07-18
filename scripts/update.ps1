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

Write-AcpStatus -Level "INFO" -Message "Update mode: $(if ($Apply) { 'Apply' } elseif ($DryRun) { 'DryRun' } else { 'Plan' })"
if ($Plan -or $DryRun) {
    Write-AcpStatus -Level "INFO" -Message "Plan: rebuild generated files, then run doctor."
    exit 0
}

$code = Invoke-AcpGenerator
if ($code -ne 0) { throw "Generator failed with exit code $code" }
& (Join-Path $PSScriptRoot "doctor.ps1")
