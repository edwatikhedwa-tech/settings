[CmdletBinding()]
param(
    [switch]$Plan,
    [switch]$DryRun,
    [switch]$Apply,
    [int]$Port = 8765
)

$root = Split-Path -Parent $PSScriptRoot
$receiver = Join-Path $root "tools\youtube-research-capture\receiver.mjs"
$extension = Join-Path $root "extensions\youtube-research-capture"
$output = Join-Path $root "private\research-cache\youtube-captures"

if ($Plan -or $DryRun -or -not $Apply) {
    Write-Output "[PLAN] Start local receiver: node `"$receiver`" --port $Port --output `"$output`""
    Write-Output "[PLAN] In Chrome open chrome://extensions, enable Developer mode, choose Load unpacked, and select: $extension"
    Write-Output "[PLAN] On a video: click Copy Transcript in YouTube Summary, then use the clipboard capture button in this extension."
    exit 0
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Node.js is required." }
if (-not (Test-Path -LiteralPath $receiver)) { throw "Receiver not found: $receiver" }

$existing = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($existing) {
    Write-Output "[OK] A process is already listening on port $Port."
    exit 0
}

New-Item -ItemType Directory -Force -Path $output | Out-Null
Start-Process -FilePath "node" -ArgumentList @($receiver, "--port", $Port, "--output", $output) -WorkingDirectory $root -WindowStyle Hidden
Start-Sleep -Milliseconds 500
try {
    $health = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/health" -TimeoutSec 3
    if (-not $health.ok) { throw "Health endpoint returned an unexpected response." }
    Write-Output "[OK] Local YouTube capture receiver is ready on port $Port."
} catch {
    throw "The receiver did not start: $($_.Exception.Message)"
}
