[CmdletBinding()]
param(
    [Parameter(Mandatory)][ValidatePattern("^[a-z0-9][a-z0-9-]*$")] [string] $Slug,
    [Parameter(Mandatory)][string] $Title
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$target = Join-Path $root "work\active\$Slug.md"
if (Test-Path -LiteralPath $target) { throw "Task already exists: $target" }

$content = @"
# $Title

- Status: active
- Started: $(Get-Date -Format "yyyy-MM-dd")
- Last updated: $(Get-Date -Format "yyyy-MM-dd")

## Goal

## Context

## Current State

## Decisions

## Next Action

## References
"@

New-Item -ItemType Directory -Force -Path (Split-Path -Parent $target) | Out-Null
Set-Content -LiteralPath $target -Value $content -Encoding UTF8
Write-Output "[OK] Task created: $target"
