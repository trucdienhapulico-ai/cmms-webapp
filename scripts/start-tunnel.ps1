# scripts/start-tunnel.ps1
# Starts a Cloudflare Tunnel to expose CMMS webapp (port 3090) publicly.
# No router port-forwarding required — uses outbound connection only.
#
# Usage:
#   .\scripts\start-tunnel.ps1                                                   # Quick Tunnel (temp URL)
#   .\scripts\start-tunnel.ps1 -TunnelName "cmms" -Hostname "cmms.example.com"  # Named Tunnel

param(
    [string]$LocalPort  = "3090",
    [string]$TunnelName = "",
    [string]$Hostname   = ""
)

$LocalUrl = "http://localhost:$LocalPort"

# ── Locate cloudflared ──────────────────────────────────────────────────────
function Find-Cloudflared {
    # 1. Already in PATH?
    $cmd = Get-Command cloudflared -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }

    # 2. WinGet packages folder (catches installs before PATH refresh)
    $wingetBase = "$env:LOCALAPPDATA\Microsoft\WinGet\Packages"
    if (Test-Path $wingetBase) {
        $found = Get-ChildItem -Path $wingetBase -Recurse -Filter "cloudflared.exe" -ErrorAction SilentlyContinue |
                 Select-Object -First 1
        if ($found) { return $found.FullName }
    }

    # 3. WinGet shim links
    $wingetLinks = "$env:LOCALAPPDATA\Microsoft\WinGet\Links\cloudflared.exe"
    if (Test-Path $wingetLinks) { return $wingetLinks }

    # 4. Common explicit install paths
    $candidates = @(
        "$env:ProgramFiles\cloudflared\cloudflared.exe",
        "$env:ProgramFiles\Cloudflare\cloudflared\cloudflared.exe",
        "C:\Program Files (x86)\cloudflared\cloudflared.exe",
        "$env:ProgramData\chocolatey\bin\cloudflared.exe",
        "C:\tools\cloudflared\cloudflared.exe",
        "C:\cloudflared\cloudflared.exe"
    )
    foreach ($p in $candidates) { if (Test-Path $p) { return $p } }

    return $null
}

$cloudflaredExe = Find-Cloudflared

if (-not $cloudflaredExe) {
    Write-Host ""
    Write-Host "ERROR: 'cloudflared' was not found." -ForegroundColor Red
    Write-Host ""
    Write-Host "Install it with one of these commands:" -ForegroundColor Yellow
    Write-Host "  winget install Cloudflare.cloudflared   <- recommended" -ForegroundColor Cyan
    Write-Host "  choco install cloudflared" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "After installing, restart PowerShell and try again." -ForegroundColor Gray
    exit 1
}

$version = (& $cloudflaredExe --version 2>&1) -join ""
Write-Host "=== CMMS Cloudflare Tunnel ===" -ForegroundColor Green
Write-Host "Binary : $cloudflaredExe" -ForegroundColor DarkGray
Write-Host "Version: $version" -ForegroundColor Cyan

# ── Pre-flight: verify local server ─────────────────────────────────────────
Write-Host ""
Write-Host "Checking local server at $LocalUrl ..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$LocalUrl/api/health" -TimeoutSec 5
    Write-Host "Server OK (v$($health.version))" -ForegroundColor Green
} catch {
    Write-Host "WARNING: Server not responding at $LocalUrl" -ForegroundColor Red
    Write-Host "Start it first: node server.js" -ForegroundColor Yellow
    Write-Host "Continuing anyway — tunnel will return 503 until the server is up." -ForegroundColor DarkYellow
}

# ── Named Tunnel mode ────────────────────────────────────────────────────────
if ($TunnelName -and $Hostname) {
    Write-Host ""
    Write-Host "Mode      : Named Tunnel" -ForegroundColor Magenta
    Write-Host "Tunnel    : $TunnelName" -ForegroundColor White
    Write-Host "Public URL: https://$Hostname" -ForegroundColor Cyan
    Write-Host "Press Ctrl+C to stop."
    Write-Host ""
    & $cloudflaredExe tunnel run --url $LocalUrl $TunnelName
    exit $LASTEXITCODE
}

# ── Quick Tunnel mode (default) ──────────────────────────────────────────────
Write-Host ""
Write-Host "Mode: Quick Tunnel (temporary URL, no account needed)" -ForegroundColor Magenta
Write-Host "A *.trycloudflare.com URL will appear in the output below." -ForegroundColor Gray
Write-Host "Share it for remote access — valid until this window is closed." -ForegroundColor Gray
Write-Host "Press Ctrl+C to stop."
Write-Host ""

& $cloudflaredExe tunnel --url $LocalUrl
