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

if ($Client -in @("codex", "all")) {
    $globalAgents = Join-Path $env:USERPROFILE ".codex\AGENTS.md"
    $generatedAgents = Join-Path $root "generated\codex\AGENTS.md"
    $skillsRoot = Join-Path $env:USERPROFILE ".agents\skills"
    $startMarker = "<!-- agent-control-plane:start -->"
    $endMarker = "<!-- agent-control-plane:end -->"

    if ($Plan -or $DryRun) {
        Write-AcpStatus -Level "INFO" -Message "Plan: update the managed block in $globalAgents after backup."
        Write-AcpStatus -Level "INFO" -Message "Plan: link each repository skill into $skillsRoot without overwriting existing skills."
    } elseif ($Apply) {
        $managedContent = Get-Content -LiteralPath $generatedAgents -Raw -Encoding UTF8
        $managedBlock = "$startMarker`n$managedContent$endMarker`n"
        $current = if (Test-Path -LiteralPath $globalAgents) { Get-Content -LiteralPath $globalAgents -Raw -Encoding UTF8 } else { "" }
        $pattern = [regex]::Escape($startMarker) + ".*?" + [regex]::Escape($endMarker) + "\s*"
        $managedRegex = New-Object System.Text.RegularExpressions.Regex($pattern, [System.Text.RegularExpressions.RegexOptions]::Singleline)
        if ($managedRegex.IsMatch($current)) {
            $withoutManaged = $managedRegex.Replace($current, "").TrimEnd()
            $next = if ([string]::IsNullOrWhiteSpace($withoutManaged)) { $managedBlock } else { $withoutManaged + "`n`n" + $managedBlock }
        } elseif ([string]::IsNullOrWhiteSpace($current)) {
            $next = $managedBlock
        } else {
            $next = $current.TrimEnd() + "`n`n" + $managedBlock
        }

        $normalizedCurrent = ($current -replace "`r`n", "`n").TrimEnd()
        $normalizedNext = ($next -replace "`r`n", "`n").TrimEnd()
        if ($normalizedNext -ne $normalizedCurrent) {
            if ($NoModifyExisting -and (Test-Path -LiteralPath $globalAgents)) {
                Write-AcpStatus -Level "WARN" -Message "AGENTS.md exists and -NoModifyExisting is set: $globalAgents"
            } else {
                $backup = New-AcpBackup -Path $globalAgents
                if ($backup) { Write-AcpStatus -Level "OK" -Message "Backup created: $backup" }
                Set-AcpFileAtomic -Path $globalAgents -Content $next
                Write-AcpStatus -Level "OK" -Message "Global Codex guidance updated."
            }
        } else {
            Write-AcpStatus -Level "OK" -Message "Global Codex guidance is already current."
        }

        if (-not (Test-Path -LiteralPath $skillsRoot)) {
            New-Item -ItemType Directory -Force -Path $skillsRoot | Out-Null
        }
        Get-ChildItem -LiteralPath (Join-Path $root "skills") -Directory | ForEach-Object {
            $target = Join-Path $skillsRoot $_.Name
            if (Test-Path -LiteralPath $target) {
                $item = Get-Item -LiteralPath $target -Force
                $targetText = [string]$item.Target
                if ($item.LinkType -and $targetText -eq $_.FullName) {
                    Write-AcpStatus -Level "OK" -Message "Skill link already current: $($_.Name)"
                } else {
                    Write-AcpStatus -Level "WARN" -Message "Existing skill was not replaced: $target"
                }
            } else {
                New-Item -ItemType Junction -Path $target -Target $_.FullName | Out-Null
                Write-AcpStatus -Level "OK" -Message "Global skill linked: $($_.Name)"
            }
        }
    }
}

if ($Client -in @("claude-code", "chatgpt", "all")) {
    Write-AcpStatus -Level "WARN" -Message "Claude Code and ChatGPT use generated instructions and require their own supported import/auth flow."
}
Write-AcpStatus -Level "INFO" -Message "MCP servers remain opt-in: no server is enabled in the current registry."
Write-AcpStatus -Level "INFO" -Message "Next step: powershell -ExecutionPolicy Bypass -File .\scripts\doctor.ps1"
