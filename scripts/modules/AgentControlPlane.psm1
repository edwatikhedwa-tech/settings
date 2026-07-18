Set-StrictMode -Version Latest

function Get-AcpRoot {
    return (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
}

function Write-AcpStatus {
    param(
        [Parameter(Mandatory)][ValidateSet("OK","WARN","ERROR","SKIP","INFO")] [string] $Level,
        [Parameter(Mandatory)][string] $Message
    )
    "[$Level] $Message"
}

function Test-AcpCommand {
    param([Parameter(Mandatory)][string] $Name)
    $cmd = Get-Command $Name -ErrorAction SilentlyContinue
    return $null -ne $cmd
}

function New-AcpBackup {
    param([Parameter(Mandatory)][string] $Path)
    if (-not (Test-Path -LiteralPath $Path)) {
        return $null
    }
    $root = Get-AcpRoot
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $backupDir = Join-Path $root ".agent-control-plane\backups\$stamp"
    New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
    $leaf = Split-Path -Leaf $Path
    $backupPath = Join-Path $backupDir $leaf
    Copy-Item -LiteralPath $Path -Destination $backupPath -Force
    return $backupPath
}

function Set-AcpFileAtomic {
    param(
        [Parameter(Mandatory)][string] $Path,
        [Parameter(Mandatory)][string] $Content
    )
    $dir = Split-Path -Parent $Path
    if ($dir -and -not (Test-Path -LiteralPath $dir)) {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
    }
    $tmp = "$Path.tmp"
    Set-Content -LiteralPath $tmp -Value $Content -Encoding UTF8
    Move-Item -LiteralPath $tmp -Destination $Path -Force
}

function Invoke-AcpGenerator {
    $root = Get-AcpRoot
    $python = Get-Command python -ErrorAction SilentlyContinue
    if (-not $python) {
        $venvPython = Join-Path (Split-Path $root -Parent) ".venv\Scripts\python.exe"
        if (Test-Path -LiteralPath $venvPython) {
            & $venvPython (Join-Path $root "scripts\build-configs.py")
            return $LASTEXITCODE
        }
        Write-AcpStatus -Level "WARN" -Message "Python not found; generation skipped."
        return 0
    }
    & $python.Source (Join-Path $root "scripts\build-configs.py")
    return $LASTEXITCODE
}

Export-ModuleMember -Function Get-AcpRoot,Write-AcpStatus,Test-AcpCommand,New-AcpBackup,Set-AcpFileAtomic,Invoke-AcpGenerator
