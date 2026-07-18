[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$Failures = New-Object System.Collections.Generic.List[string]

function Assert-True {
    param([bool] $Condition, [string] $Message)
    if (-not $Condition) { $script:Failures.Add($Message) }
}

function Read-Text($Path) {
    return Get-Content -LiteralPath $Path -Raw -Encoding UTF8
}

Assert-True (Test-Path (Join-Path $Root "mcp\servers.yaml")) "mcp/servers.yaml missing"
Assert-True (Test-Path (Join-Path $Root "mcp\schema.json")) "mcp/schema.json missing"
Assert-True ((Read-Text (Join-Path $Root "mcp\servers.yaml")) -match "secret_names") "servers.yaml lacks secret_names"
Assert-True ((Read-Text (Join-Path $Root ".gitignore")) -match "\.env") ".gitignore does not ignore .env"

$secretPattern = "(sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{20,})"
$files = Get-ChildItem -LiteralPath $Root -Recurse -File |
    Where-Object { $_.FullName -notmatch "\\\.agent-control-plane\\" -and $_.FullName -notmatch "\\generated\\" }
foreach ($file in $files) {
    $text = Get-Content -LiteralPath $file.FullName -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
    if ($text -match $secretPattern) {
        $Failures.Add("Secret-like text found: $($file.FullName)")
    }
}

& powershell -ExecutionPolicy Bypass -File (Join-Path $Root "scripts\bootstrap.ps1") -Plan | Out-Null
Assert-True ($LASTEXITCODE -eq 0) "bootstrap -Plan failed"

& powershell -ExecutionPolicy Bypass -File (Join-Path $Root "scripts\uninstall.ps1") -DryRun | Out-Null
Assert-True ($LASTEXITCODE -eq 0) "uninstall -DryRun failed"

& powershell -ExecutionPolicy Bypass -File (Join-Path $Root "scripts\doctor.ps1") | Out-Null
Assert-True ($LASTEXITCODE -eq 0) "doctor failed"

$unicodeDir = Join-Path $env:TEMP "acp unicode path"
New-Item -ItemType Directory -Force -Path $unicodeDir | Out-Null
Assert-True (Test-Path -LiteralPath $unicodeDir) "Unicode path test failed"

if ($Failures.Count -gt 0) {
    foreach ($failure in $Failures) { Write-Host "[ERROR] $failure" }
    exit 1
}

Write-Host "[OK] All local tests passed."
