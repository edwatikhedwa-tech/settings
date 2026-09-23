[CmdletBinding()]
param(
    [Parameter(Mandatory)][ValidatePattern("^[a-z0-9][a-z0-9-]*$")] [string] $Slug,
    [Parameter(Mandatory)][string] $Title,
    [Parameter(Mandatory)][string] $Topic,
    [switch] $Plan,
    [switch] $DryRun,
    [switch] $Apply
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
if (-not $Plan -and -not $DryRun -and -not $Apply) { $Plan = $true }

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$templatePath = Join-Path $root "templates\topic-research.md"
$reportPath = Join-Path $root "knowledge\youtube\$Slug.md"
$taskPath = Join-Path $root "work\active\$Slug.md"
$mode = if ($Apply) { "Apply" } elseif ($DryRun) { "DryRun" } else { "Plan" }

Write-Output "[INFO] Topic research mode: $mode"
if (-not (Test-Path -LiteralPath $templatePath)) { throw "Template missing: $templatePath" }
foreach ($target in @($reportPath, $taskPath)) {
    if (Test-Path -LiteralPath $target) { Write-Output "[OK] Existing file will not be overwritten: $target" }
    else { Write-Output "[INFO] Plan: create $target" }
}
if (-not $Apply) { exit 0 }

$date = Get-Date -Format "yyyy-MM-dd"
if (-not (Test-Path -LiteralPath $reportPath)) {
    $report = Get-Content -LiteralPath $templatePath -Raw -Encoding UTF8
    $report = $report.Replace("{{TITLE}}", $Title).Replace("{{DATE}}", $date).Replace("{{TOPIC}}", $Topic)
    $report = $report.Replace("{{QUESTION}}", "Собрать проверяемые практические выводы по теме: $Topic")
    $report = $report.Replace("{{SEARCH_QUERIES}}", $Topic).Replace("{{CANDIDATE_COUNT}}", "0").Replace("{{DEEP_DIVE_COUNT}}", "0")
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $reportPath) | Out-Null
    Set-Content -LiteralPath $reportPath -Value $report -Encoding UTF8
    Write-Output "[OK] Report created: $reportPath"
}
if (-not (Test-Path -LiteralPath $taskPath)) {
    $task = @"
# $Title

- Status: active
- Started: $date
- Last updated: $date

## Goal

Исследовать тему: $Topic

## Current State

Карточка и шаблон отчёта созданы. Следующий этап: получить ранжированную выборку через `youtube_research_candidates`.

## Decisions

- До 15 кандидатов и до 6 глубоких разборов.
- Полные расшифровки не сохраняются в публичном Git.
- Изменения глобальной конфигурации требуют отдельного подтверждения.

## Next Action

Запустить skill `topic-research` и обновить `$reportPath`.

## References

- $reportPath
"@
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $taskPath) | Out-Null
    Set-Content -LiteralPath $taskPath -Value $task -Encoding UTF8
    Write-Output "[OK] Task created: $taskPath"
}
