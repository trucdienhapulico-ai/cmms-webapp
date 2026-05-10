# scripts/install-tunnel-service.ps1
# Installs Cloudflare Tunnel as a persistent Windows background service.
#
# Two modes:
#   1. QUICK TUNNEL via Task Scheduler  — no account, URL changes each restart
#   2. NAMED TUNNEL as Windows Service  — fixed URL, requires Cloudflare account + domain
#
# Run with Administrator privileges.

param(
    [ValidateSet("QuickTunnel", "NamedTunnel", "Uninstall", "")]
    [string]$Mode = ""
)

# ── Helpers ──────────────────────────────────────────────────────────────────
function Write-Header($text) {
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════" -ForegroundColor DarkCyan
    Write-Host "  $text" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════" -ForegroundColor DarkCyan
}

function Test-Admin {
    $identity  = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [Security.Principal.WindowsPrincipal]$identity
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

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

# ── Banner ────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║   CMMS — Cloudflare Tunnel Persistent Setup      ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

# ── Check cloudflared is installed ───────────────────────────────────────────
$cloudflaredExe = Find-Cloudflared
if (-not $cloudflaredExe) {
    Write-Host "ERROR: cloudflared not found." -ForegroundColor Red
    Write-Host "Install it first: winget install Cloudflare.cloudflared" -ForegroundColor Yellow
    exit 1
}
$version = (& $cloudflaredExe --version 2>&1) -join ""
Write-Host "cloudflared: $version" -ForegroundColor Cyan
Write-Host "Path: $cloudflaredExe" -ForegroundColor DarkGray

# ── Interactive menu if no mode specified ─────────────────────────────────────
if (-not $Mode) {
    Write-Host ""
    Write-Host "Choose installation type:" -ForegroundColor Yellow
    Write-Host "  [1] Quick Tunnel  — Task Scheduler, auto-starts at Windows logon"
    Write-Host "       No account needed. URL changes each restart." -ForegroundColor DarkGray
    Write-Host "  [2] Named Tunnel  — Windows Service, fixed URL (production-ready)"
    Write-Host "       Requires a free Cloudflare account + domain managed by Cloudflare." -ForegroundColor DarkGray
    Write-Host "  [3] Uninstall     — Remove scheduled task and/or Windows service"
    Write-Host ""
    $choice = Read-Host "Enter 1, 2, or 3"
    switch ($choice) {
        "1" { $Mode = "QuickTunnel" }
        "2" { $Mode = "NamedTunnel" }
        "3" { $Mode = "Uninstall" }
        default {
            Write-Host "Invalid choice. Exiting." -ForegroundColor Red
            exit 1
        }
    }
}

# ════════════════════════════════════════════════════════════════════════════
# MODE 1 — Quick Tunnel via Task Scheduler
# ════════════════════════════════════════════════════════════════════════════
if ($Mode -eq "QuickTunnel") {
    Write-Header "Mode 1: Quick Tunnel via Task Scheduler"

    $TaskName  = "CMMS-CloudflareTunnel"
    $ScriptDir = Split-Path $MyInvocation.MyCommand.Path
    $BgScript  = Join-Path $ScriptDir "start-tunnel-bg.ps1"

    if (-not (Test-Path $BgScript)) {
        Write-Host "ERROR: start-tunnel-bg.ps1 not found at $BgScript" -ForegroundColor Red
        exit 1
    }

    if (-not (Test-Admin)) {
        Write-Host "WARNING: Not running as Administrator." -ForegroundColor Yellow
        Write-Host "Task Scheduler registration may fail. Re-run as Administrator if needed." -ForegroundColor Yellow
    }

    Write-Host ""
    Write-Host "Registering scheduled task '$TaskName' (trigger: at logon)..." -ForegroundColor Yellow

    $action   = New-ScheduledTaskAction `
        -Execute "powershell.exe" `
        -Argument "-NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$BgScript`""
    $trigger  = New-ScheduledTaskTrigger -AtLogOn
    $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit ([TimeSpan]::Zero)
    $principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive

    try {
        Register-ScheduledTask `
            -TaskName    $TaskName `
            -Action      $action `
            -Trigger     $trigger `
            -Settings    $settings `
            -Principal   $principal `
            -Description "Auto-start CMMS Cloudflare Quick Tunnel at Windows logon" `
            -Force | Out-Null

        Write-Host ""
        Write-Host "SUCCESS: Task '$TaskName' registered." -ForegroundColor Green
        Write-Host ""
        Write-Host "The tunnel auto-starts at next logon." -ForegroundColor Cyan
        Write-Host "To start it right now:" -ForegroundColor Yellow
        Write-Host "  Start-ScheduledTask -TaskName '$TaskName'" -ForegroundColor Gray
        Write-Host "  -- or --"
        Write-Host "  .\scripts\start-tunnel-bg.ps1" -ForegroundColor Gray
        Write-Host ""
        Write-Host "URL is logged to: logs\tunnel-url.log" -ForegroundColor Gray
        Write-Host ""
        Write-Host "NOTE: The public URL changes each time the tunnel restarts." -ForegroundColor Yellow
        Write-Host "For a fixed URL, use Mode 2 (Named Tunnel) instead." -ForegroundColor Yellow
    } catch {
        Write-Host "ERROR registering task: $_" -ForegroundColor Red
        Write-Host "Try running this script as Administrator." -ForegroundColor Yellow
    }
}

# ════════════════════════════════════════════════════════════════════════════
# MODE 2 — Named Tunnel as Windows Service
# ════════════════════════════════════════════════════════════════════════════
if ($Mode -eq "NamedTunnel") {
    Write-Header "Mode 2: Named Tunnel as Windows Service"

    Write-Host ""
    Write-Host "Prerequisites:" -ForegroundColor Yellow
    Write-Host "  - A free Cloudflare account (cloudflare.com)" -ForegroundColor White
    Write-Host "  - A domain added to Cloudflare, OR a free workers.dev subdomain" -ForegroundColor White
    Write-Host ""
    Write-Host "You do NOT need a purchased domain." -ForegroundColor Cyan
    Write-Host "Enable a free workers.dev subdomain in Cloudflare dashboard:" -ForegroundColor Cyan
    Write-Host "  Workers & Pages -> your account -> workers.dev subdomain" -ForegroundColor DarkGray
    Write-Host ""

    if (-not (Test-Admin)) {
        Write-Host "ERROR: Windows Service installation requires Administrator." -ForegroundColor Red
        Write-Host "Re-run PowerShell as Administrator." -ForegroundColor Yellow
        exit 1
    }

    # Step 1: Login
    Write-Host "─── Step 1: Authenticate with Cloudflare ───" -ForegroundColor DarkCyan
    Write-Host "This opens a browser to log you into Cloudflare." -ForegroundColor Gray
    $ans = Read-Host "Already logged in? (y/n)"
    if ($ans -ne "y") {
        Write-Host "Running: cloudflared tunnel login" -ForegroundColor Yellow
        & $cloudflaredExe tunnel login
    }

    # Step 2: Create tunnel
    Write-Host ""
    Write-Host "─── Step 2: Create the tunnel ──────────────" -ForegroundColor DarkCyan
    $tunnelName = Read-Host "Tunnel name (e.g. cmms)"
    if (-not $tunnelName) { $tunnelName = "cmms" }
    Write-Host "Creating tunnel '$tunnelName'..." -ForegroundColor Yellow
    & $cloudflaredExe tunnel create $tunnelName

    # Step 3: Hostname / DNS
    Write-Host ""
    Write-Host "─── Step 3: Configure hostname ─────────────" -ForegroundColor DarkCyan
    Write-Host "Examples:" -ForegroundColor DarkGray
    Write-Host "  cmms.yourdomain.com            (custom domain on Cloudflare)" -ForegroundColor DarkGray
    Write-Host "  cmms.myaccount.workers.dev     (free Cloudflare subdomain)" -ForegroundColor DarkGray
    $hostname = Read-Host "Hostname"

    if ($hostname) {
        Write-Host "Creating DNS route '$hostname' -> tunnel '$tunnelName'..." -ForegroundColor Yellow
        & $cloudflaredExe tunnel route dns $tunnelName $hostname
    }

    # Step 4: Write config.yml
    Write-Host ""
    Write-Host "─── Step 4: Create config.yml ──────────────" -ForegroundColor DarkCyan
    $configDir  = "$env:USERPROFILE\.cloudflared"
    $configFile = "$configDir\config.yml"
    if (-not (Test-Path $configDir)) { New-Item -ItemType Directory -Path $configDir -Force | Out-Null }

    $credFile = Get-ChildItem "$configDir" -Filter "*.json" -ErrorAction SilentlyContinue |
                Where-Object { $_.Name -notmatch "cert" } |
                Select-Object -First 1
    $credPath = if ($credFile) { $credFile.FullName } else { "$configDir\<tunnel-id>.json" }

    $configContent = @"
tunnel: $tunnelName
credentials-file: $credPath

ingress:
  - hostname: $hostname
    service: http://localhost:3090
  - service: http_status:404
"@
    $configContent | Out-File $configFile -Encoding utf8 -Force
    Write-Host "Config written: $configFile" -ForegroundColor Green

    # Step 5: Install Windows Service
    Write-Host ""
    Write-Host "─── Step 5: Install Windows Service ────────" -ForegroundColor DarkCyan
    Write-Host "Installing cloudflared as a Windows service..." -ForegroundColor Yellow
    & $cloudflaredExe service install

    Write-Host ""
    Write-Host "══════════════════════════════════════════════" -ForegroundColor Green
    Write-Host "  Named Tunnel service installed!" -ForegroundColor Green
    if ($hostname) {
        Write-Host "  PUBLIC URL: https://$hostname" -ForegroundColor Cyan
    }
    Write-Host "══════════════════════════════════════════════" -ForegroundColor Green
    Write-Host ""
    Write-Host "Service management:" -ForegroundColor Yellow
    Write-Host "  Start-Service cloudflared" -ForegroundColor Gray
    Write-Host "  Stop-Service  cloudflared" -ForegroundColor Gray
    Write-Host "  Get-Service   cloudflared" -ForegroundColor Gray
    Write-Host ""
    Write-Host "The service auto-starts with Windows. No terminal needed." -ForegroundColor Green
}

# ════════════════════════════════════════════════════════════════════════════
# MODE 3 — Uninstall
# ════════════════════════════════════════════════════════════════════════════
if ($Mode -eq "Uninstall") {
    Write-Header "Uninstall Cloudflare Tunnel background services"

    $TaskName = "CMMS-CloudflareTunnel"
    $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($task) {
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
        Write-Host "Removed scheduled task '$TaskName'." -ForegroundColor Green
    } else {
        Write-Host "Scheduled task '$TaskName' not found (skipped)." -ForegroundColor Gray
    }

    $svc = Get-Service -Name "cloudflared" -ErrorAction SilentlyContinue
    if ($svc) {
        Write-Host "Removing cloudflared Windows service..." -ForegroundColor Yellow
        & $cloudflaredExe service uninstall
        Write-Host "Windows service removed." -ForegroundColor Green
    } else {
        Write-Host "cloudflared Windows service not found (skipped)." -ForegroundColor Gray
    }

    $procs = Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue
    if ($procs) {
        $procs | Stop-Process -Force
        Write-Host "Stopped $($procs.Count) running cloudflared process(es)." -ForegroundColor Green
    }

    Write-Host ""
    Write-Host "Uninstall complete." -ForegroundColor Cyan
}
