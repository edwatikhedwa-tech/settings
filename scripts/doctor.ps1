[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
Import-Module (Join-Path $PSScriptRoot "modules\AgentControlPlane.psm1") -Force

$root = Get-AcpRoot
Write-AcpStatus -Level "INFO" -Message "Agent Control Plane diagnostics."

foreach ($name in @("powershell", "git", "gh", "codex", "claude", "node", "npx")) {
    if (Test-AcpCommand $name) {
        Write-AcpStatus -Level "OK" -Message "$name is available."
    } else {
        Write-AcpStatus -Level "SKIP" -Message "$name not found; related client setup is manual or skipped."
    }
}

foreach ($path in @("policies", "skills", "mcp\servers.yaml", "mcp\schema.json", "scripts\bootstrap.ps1")) {
    $full = Join-Path $root $path
    if (Test-Path -LiteralPath $full) {
        Write-AcpStatus -Level "OK" -Message "$path found."
    } else {
        Write-AcpStatus -Level "ERROR" -Message "$path missing."
    }
}

$envExample = Join-Path $root ".env.example"
if (Test-Path -LiteralPath $envExample) {
    Write-AcpStatus -Level "OK" -Message ".env.example found."
} else {
    Write-AcpStatus -Level "WARN" -Message ".env.example missing."
}
