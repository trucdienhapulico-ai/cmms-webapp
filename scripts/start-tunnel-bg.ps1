# scripts/start-tunnel-bg.ps1
# Starts Cloudflare Quick Tunnel in the background (hidden window).
# The public URL is extracted from the log and saved to logs\tunnel-url.log.
# The process survives terminal close — it runs independently of this session.
#
# Usage: .\scripts\start-tunnel-bg.ps1
# Stop:  Get-Content logs\tunnel.pid | ForEach-Object { Stop-Process -Id $_ -Force }
#   or:  Stop-Process -Name cloudflared -Force

param(
    [string]$LocalPort = "3090"
)

$LocalUrl  = "http://localhost:$LocalPort"
$ScriptDir = Split-Path $MyInvocation.MyCommand.Path
$LogDir    = Join-Path $ScriptDir "..\logs"
$TunnelLog = Join-Path $LogDir "tunnel.log"
$UrlLog    = Join-Path $LogDir "tunnel-url.log"
$PidFile   = Join-Path $LogDir "tunnel.pid"

if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir -Force | Out-Null }

# ── Locate cloudflared ──────────────────────────────────────────────────────
function Find-Cloudflared {
    $cmd = Get-Command cloudflared -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }

    $wingetBase = "$env:LOCALAPPDATA\Microsoft\WinGet\Packages"
    if (Test-Path $wingetBase) {
        $found = Get-ChildItem -Path $wingetBase -Recurse -Filter "cloudflared.exe" -ErrorAction SilentlyContinue |
                 Select-Object -First 1
        if ($found) { return $found.FullName }
    }

    $candidates = @(
        "$env:LOCALAPPDATA\Microsoft\WinGet\Links\cloudflared.exe",
        "$env:ProgramFiles\cloudflared\cloudflared.exe",
        "$env:ProgramFiles\Cloudflare\cloudflared\cloudflared.exe",
        "C:\Program Files (x86)\cloudflared\cloudflared.exe",
        "$env:ProgramData\chocolatey\bin\cloudflared.exe",
        "C:\tools\cloudflared\cloudflared.exe"
    )
    foreach ($p in $candidates) { if (Test-Path $p) { return $p } }
    return $null
}

$cloudflaredExe = Find-Cloudflared
if (-not $cloudflaredExe) {
    Write-Host "ERROR: cloudflared not found." -ForegroundColor Red
    Write-Host "Install: winget install Cloudflare.cloudflared" -ForegroundColor Yellow
    exit 1
}

# ── Stop any existing cloudflared process from a previous run ─────────────────
if (Test-Path $PidFile) {
    $oldPid = (Get-Content $PidFile -ErrorAction SilentlyContinue).Trim()
    if ($oldPid -and ($oldPid -match '^\d+$')) {
        $oldProc = Get-Process -Id $oldPid -ErrorAction SilentlyContinue
        if ($oldProc) {
            Write-Host "Stopping existing tunnel (PID $oldPid)..." -ForegroundColor Yellow
            Stop-Process -Id $oldPid -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 1
        }
    }
}

# Reset log files
"" | Out-File $TunnelLog -Encoding utf8 -Force
"" | Out-File $UrlLog    -Encoding utf8 -Force

Write-Host "=== CMMS Cloudflare Tunnel (Background) ===" -ForegroundColor Green
Write-Host "Binary : $cloudflaredExe" -ForegroundColor DarkGray
Write-Host "Target : $LocalUrl" -ForegroundColor Gray
Write-Host ""

# ── Launch cloudflared as a hidden process via cmd.exe ───────────────────────
# cmd.exe merges stderr into stdout (2>&1) before writing to the log file.
# The spawned process is independent of this PowerShell session.
$TunnelLogAbs = (Resolve-Path $TunnelLog -ErrorAction SilentlyContinue).Path
if (-not $TunnelLogAbs) { $TunnelLogAbs = $TunnelLog }

$cmdArgs = "/C `"$cloudflaredExe`" tunnel --url `"$LocalUrl`" >> `"$TunnelLogAbs`" 2>&1"
$proc = Start-Process -FilePath "cmd.exe" `
                      -ArgumentList $cmdArgs `
                      -WindowStyle Hidden `
                      -PassThru

$proc.Id | Out-File $PidFile -Encoding utf8 -Force
Write-Host "Tunnel process started (PID $($proc.Id))." -ForegroundColor Cyan
Write-Host "Waiting for public URL (up to 30 seconds)..." -ForegroundColor Yellow

# ── Poll the log for the trycloudflare.com URL ───────────────────────────────
$publicUrl = $null
$deadline  = (Get-Date).AddSeconds(30)

while ((Get-Date) -lt $deadline) {
    Start-Sleep -Milliseconds 600
    if (Test-Path $TunnelLog) {
        $content = Get-Content $TunnelLog -Raw -ErrorAction SilentlyContinue
        if ($content -match 'https://[a-z0-9\-]+\.trycloudflare\.com') {
            $publicUrl = $Matches[0]
            break
        }
    }
}

# ── Report result ─────────────────────────────────────────────────────────────
if ($publicUrl) {
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$ts  $publicUrl" | Out-File $UrlLog -Encoding utf8 -Force

    Write-Host ""
    Write-Host "══════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host "  PUBLIC URL: $publicUrl" -ForegroundColor Cyan
    Write-Host "══════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host ""
    Write-Host "URL saved : $UrlLog" -ForegroundColor Gray
    Write-Host "Full log  : $TunnelLog" -ForegroundColor Gray
    Write-Host "PID file  : $PidFile" -ForegroundColor Gray
    Write-Host ""
    Write-Host "The tunnel runs in the background and survives terminal close." -ForegroundColor Green
    Write-Host ""
    Write-Host "To stop the tunnel:" -ForegroundColor Yellow
    Write-Host "  Stop-Process -Name cloudflared -Force" -ForegroundColor Gray
    Write-Host "  -- or --"
    Write-Host "  Get-Content `"$PidFile`" | ForEach-Object { Stop-Process -Id `$_ -Force }" -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "WARNING: Could not detect public URL within 30 seconds." -ForegroundColor Red
    Write-Host "The tunnel may still be starting. Check the log:" -ForegroundColor Yellow
    Write-Host "  Get-Content `"$TunnelLog`"" -ForegroundColor Gray
    Write-Host ""
    Write-Host "To stop if needed: Stop-Process -Id $($proc.Id) -Force" -ForegroundColor Gray
}
