[CmdletBinding()]
param(
    [switch] $Plan,
    [switch] $DryRun,
    [switch] $Apply,
    [ValidateSet("codex","claude-code","chatgpt","all")] [string] $Client = "all",
    [string] $Profile = "default",
    [switch] $SkipProgramInstall,
    [switch] $NoModifyExisting
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
Import-Module (Join-Path $PSScriptRoot "modules\AgentControlPlane.psm1") -Force

if (-not $Plan -and -not $DryRun -and -not $Apply) {
    $Plan = $true
}

$root = Get-AcpRoot
Write-AcpStatus -Level "INFO" -Message "Agent Control Plane: $root"
Write-AcpStatus -Level "INFO" -Message "Mode: $(if ($Apply) { 'Apply' } elseif ($DryRun) { 'DryRun' } else { 'Plan' })"

$checks = @("powershell", "git", "gh", "codex", "claude", "node", "npx")
foreach ($check in $checks) {
    if (Test-AcpCommand $check) {
        Write-AcpStatus -Level "OK" -Message "$check found."
    } else {
        Write-AcpStatus -Level "SKIP" -Message "$check not found in PATH."
    }
}

Write-AcpStatus -Level "INFO" -Message "Generating client instructions."
if (-not $Plan) {
    $code = Invoke-AcpGenerator
    if ($code -ne 0) { throw "Generator failed with exit code $code" }
} else {
    Write-AcpStatus -Level "INFO" -Message "Plan: scripts/build-configs.py will run."
}

$codexTarget = Join-Path $root ".codex\config.toml"
$codexContent = @"
# Managed by agent-control-plane.
model_instructions_file = "../generated/codex/instructions.md"
"@

if ($Client -in @("codex", "all")) {
    if ($Plan -or $DryRun) {
        Write-AcpStatus -Level "INFO" -Message "Plan: create or update $codexTarget after backup."
    } elseif ($Apply) {
        if ($NoModifyExisting -and (Test-Path -LiteralPath $codexTarget)) {
            Write-AcpStatus -Level "WARN" -Message "File exists and -NoModifyExisting is set: $codexTarget"
        } else {
            $backup = New-AcpBackup -Path $codexTarget
            if ($backup) { Write-AcpStatus -Level "OK" -Message "Backup created: $backup" }
            Set-AcpFileAtomic -Path $codexTarget -Content $codexContent
            Write-AcpStatus -Level "OK" -Message "Managed Codex config written."
        }
    }
}

Write-AcpStatus -Level "WARN" -Message "Claude Code and ChatGPT require manual review/auth before applying user settings."
Write-AcpStatus -Level "INFO" -Message "Next step: powershell -ExecutionPolicy Bypass -File .\scripts\doctor.ps1"
