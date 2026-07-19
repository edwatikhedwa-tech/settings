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
Assert-True (Test-Path (Join-Path $Root "work\README.md")) "work log missing"
Assert-True (Test-Path (Join-Path $Root "knowledge\README.md")) "knowledge base missing"
Assert-True (Test-Path (Join-Path $Root "skills\task-memory\SKILL.md")) "task-memory skill missing"
Assert-True (Test-Path (Join-Path $Root "skills\youtube-research\SKILL.md")) "youtube-research skill missing"
Assert-True (Test-Path (Join-Path $Root "skills\topic-research\SKILL.md")) "topic-research skill missing"
Assert-True (Test-Path (Join-Path $Root "templates\topic-research.md")) "topic-research template missing"
Assert-True (Test-Path (Join-Path $Root "scripts\start-youtube-research.ps1")) "topic-research start script missing"
Assert-True (Test-Path (Join-Path $Root "scripts\new-task.ps1")) "new-task script missing"
Assert-True (Test-Path (Join-Path $Root "scripts\enable-youtube-mcp.ps1")) "YouTube MCP enable script missing"
Assert-True (Test-Path (Join-Path $Root "policies\legal-compliance.md")) "legal compliance policy missing"
Assert-True (Test-Path (Join-Path $Root "policies\cost-awareness.md")) "cost awareness policy missing"
Assert-True ((Read-Text (Join-Path $Root "mcp\servers.yaml")) -match "secret_names") "servers.yaml lacks secret_names"
Assert-True ((Read-Text (Join-Path $Root ".gitignore")) -match "\.env") ".gitignore does not ignore .env"
Assert-True ((Read-Text (Join-Path $Root ".gitignore")) -match "private/research-cache") ".gitignore does not ignore the private research cache"
Assert-True ((Read-Text (Join-Path $Root "policies\legal-compliance.md")) -match "CAPTCHA") "legal compliance policy lacks CAPTCHA guard"
Assert-True ((Read-Text (Join-Path $Root "policies\cost-awareness.md")) -match "Cost Awareness Policy") "cost awareness policy is invalid"

$secretPattern = "(sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{20,}|AIza[0-9A-Za-z_-]{30,}|ya29\.[0-9A-Za-z._-]+)"
$files = Get-ChildItem -LiteralPath $Root -Recurse -File |
    Where-Object { $_.FullName -notmatch "\\\.agent-control-plane\\" -and $_.FullName -notmatch "\\generated\\" -and $_.FullName -notmatch "\\node_modules\\" }
foreach ($file in $files) {
    $text = Get-Content -LiteralPath $file.FullName -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
    if ($text -match $secretPattern) {
        $Failures.Add("Secret-like text found: $($file.FullName)")
    }
}

$youtubeKnowledge = Join-Path $Root "knowledge\youtube"
if (Test-Path -LiteralPath $youtubeKnowledge) {
    foreach ($report in Get-ChildItem -LiteralPath $youtubeKnowledge -Filter "*.md" -File) {
        $reportText = Read-Text $report.FullName
        Assert-True ($reportText -notmatch "(?im)^##\s*(full\s+)?transcript") "Full transcript section found in public report: $($report.FullName)"
    }
}

& powershell -ExecutionPolicy Bypass -File (Join-Path $Root "scripts\bootstrap.ps1") -Plan | Out-Null
Assert-True ($LASTEXITCODE -eq 0) "bootstrap -Plan failed"

$python = Get-Command python -ErrorAction SilentlyContinue
$venvPython = Join-Path (Split-Path $Root -Parent) ".venv\Scripts\python.exe"
if ($python) {
    & $python.Source (Join-Path $Root "scripts\build-configs.py")
    Assert-True ($LASTEXITCODE -eq 0) "build-configs failed"
    Assert-True (Test-Path (Join-Path $Root "generated\codex\AGENTS.md")) "generated global AGENTS missing"
    Assert-True ((Read-Text (Join-Path $Root "generated\codex\AGENTS.md")) -match "Cost Awareness Policy") "generated global AGENTS lacks cost awareness policy"
} elseif (Test-Path -LiteralPath $venvPython) {
    & $venvPython (Join-Path $Root "scripts\build-configs.py")
    Assert-True ($LASTEXITCODE -eq 0) "build-configs failed"
    Assert-True (Test-Path (Join-Path $Root "generated\codex\AGENTS.md")) "generated global AGENTS missing"
    Assert-True ((Read-Text (Join-Path $Root "generated\codex\AGENTS.md")) -match "Cost Awareness Policy") "generated global AGENTS lacks cost awareness policy"
} else {
    $node = Get-Command node -ErrorAction SilentlyContinue
    if ($node) {
        & $node.Source (Join-Path $Root "scripts\build-configs.mjs")
        Assert-True ($LASTEXITCODE -eq 0) "build-configs fallback failed"
        Assert-True (Test-Path (Join-Path $Root "generated\codex\AGENTS.md")) "generated global AGENTS missing"
        Assert-True ((Read-Text (Join-Path $Root "generated\codex\AGENTS.md")) -match "Cost Awareness Policy") "generated global AGENTS lacks cost awareness policy"
    } else {
        Write-Host "[SKIP] Python and Node.js unavailable; generated artifact check skipped."
    }
}

& powershell -ExecutionPolicy Bypass -File (Join-Path $Root "scripts\uninstall.ps1") -DryRun | Out-Null
Assert-True ($LASTEXITCODE -eq 0) "uninstall -DryRun failed"

& powershell -ExecutionPolicy Bypass -File (Join-Path $Root "scripts\enable-youtube-mcp.ps1") -Plan | Out-Null
Assert-True ($LASTEXITCODE -eq 0) "YouTube MCP enable plan failed"

& powershell -ExecutionPolicy Bypass -File (Join-Path $Root "scripts\start-youtube-research.ps1") -Slug test-topic -Title "Test topic" -Topic "Test topic" -Plan | Out-Null
Assert-True ($LASTEXITCODE -eq 0) "topic-research start plan failed"

& powershell -ExecutionPolicy Bypass -File (Join-Path $Root "scripts\doctor.ps1") | Out-Null
Assert-True ($LASTEXITCODE -eq 0) "doctor failed"

$youtubeMcp = Join-Path $Root "tools\youtube-research-mcp"
Assert-True (Test-Path (Join-Path $youtubeMcp "package.json")) "YouTube MCP package missing"
if (Test-Path (Join-Path $youtubeMcp "node_modules")) {
    & npm --prefix $youtubeMcp run test | Out-Null
    Assert-True ($LASTEXITCODE -eq 0) "YouTube MCP protocol test failed"
} else {
    Write-Host "[SKIP] YouTube MCP dependencies are not installed."
}

$unicodeDir = Join-Path $env:TEMP "acp unicode path"
New-Item -ItemType Directory -Force -Path $unicodeDir | Out-Null
Assert-True (Test-Path -LiteralPath $unicodeDir) "Unicode path test failed"

if ($Failures.Count -gt 0) {
    foreach ($failure in $Failures) { Write-Host "[ERROR] $failure" }
    exit 1
}

Write-Host "[OK] All local tests passed."
