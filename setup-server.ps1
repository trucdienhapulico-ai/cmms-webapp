# setup-server.ps1
# Super Script: Thiet lap CMMS & AI tu con so 0 (Windows) - Ban V2.4
# Loai bo function de dam bao tuong thich tuyet doi.

$ErrorActionPreference = "SilentlyContinue"
Clear-Host

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "🚀 BAT DAU THIET LAP HE THONG CMMS & AI TU DONG" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. KIEU TRA VA CAI DAT (TUAN TU)
Write-Host "[+] Dang kiem tra cac thanh phan..." -ForegroundColor Gray

# Git
if (Get-Command git -ErrorAction SilentlyContinue) { Write-Host "[✓] Git da co san." -ForegroundColor Green }
else { Write-Host "[+] Dang cai Git..." -ForegroundColor Yellow; winget install --id Git.Git --silent --accept-package-agreements --accept-source-agreements }

# Node.js
if (Get-Command node -ErrorAction SilentlyContinue) { Write-Host "[✓] Node.js da co san." -ForegroundColor Green }
else { Write-Host "[+] Dang cai Node.js..." -ForegroundColor Yellow; winget install --id OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements }

# Docker
if (Get-Command docker -ErrorAction SilentlyContinue) { Write-Host "[✓] Docker da co san." -ForegroundColor Green }
else { Write-Host "[+] Dang cai Docker Desktop..." -ForegroundColor Yellow; winget install --id Docker.DockerDesktop --silent --accept-package-agreements --accept-source-agreements }

# GitHub CLI
if (Get-Command gh -ErrorAction SilentlyContinue) { Write-Host "[✓] GitHub CLI da co san." -ForegroundColor Green }
else { Write-Host "[+] Dang cai GitHub CLI..." -ForegroundColor Yellow; winget install --id Microsoft.GitHub.CLI --silent --accept-package-agreements --accept-source-agreements }

# Claude Code
Write-Host "[+] Dang cai Claude Code..." -ForegroundColor Yellow
npm install -g @anthropic-ai/claude-code

# 2. LUA CHON CAI DAT OLLAMA
$installOllama = Read-Host "`nBan co muon cai dat Ollama (AI Cuc bo cho RTX 3060) khong? (Y/N)"
if ($installOllama -match "y|Y") {
    if (Get-Command ollama -ErrorAction SilentlyContinue) { Write-Host "[✓] Ollama da co san." -ForegroundColor Green }
    else { 
        Write-Host "[+] Dang cai Ollama..." -ForegroundColor Yellow
        winget install --id Ollama.Ollama --silent --accept-package-agreements --accept-source-agreements 
    }
    Write-Host "[+] Dang tai mo hinh Llama3..." -ForegroundColor Yellow
    start-process "ollama" -ArgumentList "run llama3 'Hello'" -NoNewWindow
}

# 3. KEO CODE VA THIET LAP DU AN
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
$ProjectDir = "$HOME\Desktop\cmms-webapp"
if (-not (Test-Path $ProjectDir)) {
    Write-Host "[+] Dang keo code tu GitHub..." -ForegroundColor Yellow
    git clone https://github.com/trucdienhapulico-ai/cmms-webapp.git $ProjectDir
}
Set-Location $ProjectDir
npm install

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "✅ MOI TRUONG DA SAN SANG!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "👉 HAY THU CAC LENH SAU:" -ForegroundColor Cyan
Write-Host "- gh auth login          (Dang nhap GitHub)" -ForegroundColor White
Write-Host "- claude auth login      (Dang nhap AI)" -ForegroundColor White
Write-Host "- .\claude-worker.ps1    (Chay Builder)" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Green
