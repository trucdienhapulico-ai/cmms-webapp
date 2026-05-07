# scripts/duckdns-update.ps1
# Updates the DuckDNS A record for montanagc.duckdns.org with the current public IP.
# Schedule this via Windows Task Scheduler to run every 5 minutes.
#
# Usage:
#   .\duckdns-update.ps1
#   .\duckdns-update.ps1 -Token "your_token" -Domain "montanagc"
#
# Environment variables (alternative to parameters):
#   $env:DUCKDNS_TOKEN  — your DuckDNS token (from https://www.duckdns.org)
#   $env:DUCKDNS_DOMAIN — subdomain name (default: montanagc)

param(
    [string]$Token  = $env:DUCKDNS_TOKEN,
    [string]$Domain = if ($env:DUCKDNS_DOMAIN) { $env:DUCKDNS_DOMAIN } else { "montanagc" }
)

# --- Validation ---
if (-not $Token) {
    Write-Error "DUCKDNS_TOKEN is not set. Set the environment variable or pass -Token parameter."
    exit 1
}

# --- Paths ---
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$logDir    = Join-Path $scriptDir "..\logs"
$logFile   = Join-Path $logDir "duckdns.log"

if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir | Out-Null
}

# --- Get public IP and call DuckDNS API ---
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

try {
    $publicIp = (Invoke-RestMethod -Uri "https://api.ipify.org" -Method Get -TimeoutSec 10).Trim()
} catch {
    $publicIp = "unknown"
}

try {
    $apiUrl   = "https://www.duckdns.org/update?domains=$Domain&token=$Token&ip="
    $response = (Invoke-RestMethod -Uri $apiUrl -Method Get -TimeoutSec 10).Trim()

    if ($response -eq "OK") {
        $msg = "[$timestamp] OK — $Domain.duckdns.org updated to $publicIp"
    } else {
        $msg = "[$timestamp] NOCHANGE or ERROR — DuckDNS returned: '$response' (current IP: $publicIp)"
    }
} catch {
    $msg = "[$timestamp] EXCEPTION — $($_.Exception.Message) (IP: $publicIp)"
}

# --- Output and log ---
Write-Host $msg
Add-Content -Path $logFile -Value $msg
