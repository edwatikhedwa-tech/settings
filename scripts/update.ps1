[CmdletBinding()]
param(
    [switch] $Plan,
    [switch] $DryRun,
    [switch] $Apply,
    [switch] $Pull
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
Import-Module (Join-Path $PSScriptRoot "modules\AgentControlPlane.psm1") -Force

if (-not $Plan -and -not $DryRun -and -not $Apply) { $Plan = $true }

Write-AcpStatus -Level "INFO" -Message "Update mode: $(if ($Apply) { 'Apply' } elseif ($DryRun) { 'DryRun' } else { 'Plan' })"
if ($Plan -or $DryRun) {
    Write-AcpStatus -Level "INFO" -Message "Plan: $(if ($Pull) { 'pull fast-forward changes, ' } else { '' })rebuild generated files, refresh global Codex guidance, then run doctor."
    exit 0
}

if ($Pull) {
    & git -C (Get-AcpRoot) pull --ff-only
    if ($LASTEXITCODE -ne 0) { throw "git pull --ff-only failed with exit code $LASTEXITCODE" }
}

$code = Invoke-AcpGenerator
if ($code -ne 0) { throw "Generator failed with exit code $code" }
& (Join-Path $PSScriptRoot "bootstrap.ps1") -Apply -Client codex
if ($LASTEXITCODE -ne 0) { throw "bootstrap failed with exit code $LASTEXITCODE" }
& (Join-Path $PSScriptRoot "doctor.ps1")
