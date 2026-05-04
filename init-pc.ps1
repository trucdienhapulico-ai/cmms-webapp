# init-pc.ps1
# Super Script: Thiet lap CMMS & AI tu con so 0 (Windows) - Ban V2.1
# Tinh nang: Hien thi danh sach phan mem va cho xac nhan truoc khi cai.

$ErrorActionPreference = "SilentlyContinue"
Clear-Host

# DANH SACH PHAN MEM DU KIEN
$Apps = @(
    @{ Name = "Git"; Id = "Git.Git"; Desc = "Quan ly ma nguon" },
    @{ Name = "Node.js LTS"; Id = "OpenJS.NodeJS.LTS"; Desc = "Moi truong chay Backend" },
    @{ Name = "Docker Desktop"; Id = "Docker.DockerDesktop"; Desc = "Chay Database & Container" },
    @{ Name = "GitHub CLI"; Id = "Microsoft.GitHub.CLI"; Desc = "Dieu phoi Task tu Terminal" },
    @{ Name = "Claude Code"; Id = "npm install -g"; Desc = "AI Coding Agent (Builder)" },
    @{ Name = "Ollama (Option)"; Id = "Ollama.Ollama"; Desc = "AI Cuc bo (Dung cho RTX 3060)" }
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "📋 DANH SACH PHAN MEM SE CAI DAT:" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

foreach ($app in $Apps) {
    Write-Host ("- {0,-15} : {1}" -f $app.Name, $app.Desc) -ForegroundColor Gray
}

Write-Host "`n[*] He thong se tu dong kiem tra, neu co roi se bo qua." -ForegroundColor DarkGray
Write-Host "==========================================================" -ForegroundColor Cyan
$confirm = Read-Host "Nhan ENTER de bat dau cai dat hoac Ctrl+C de huy"
Write-Host "`n🚀 Dang bat dau..." -ForegroundColor Green

# 1. HAM CAI DAT PHAN MEM
function Install-App($Name, $Id) {
    if ($Id -eq "npm install -g") {
        Write-Host "[+] Dang cai dat Claude Code qua npm..." -ForegroundColor Yellow
        npm install -g @anthropic-ai/claude-code
        return
    }
    if (Get-Command $Name -ErrorAction SilentlyContinue) {
        Write-Host "[✓] $Name da co san." -ForegroundColor Green
    } else {
        Write-Host "[+] Dang cai dat $Name..." -ForegroundColor Yellow
        winget install --id $Id --silent --accept-package-agreements --accept-source-agreements
    }
}

# 2. THUC THI CAI DAT
Install-App "git" "Git.Git"
Install-App "node" "OpenJS.NodeJS.LTS"
Install-App "docker" "Docker.DockerDesktop"
Install-App "gh" "Microsoft.GitHub.CLI"
Install-App "claude" "npm install -g"

# 3. LUA CHON CAI DAT OLLAMA
$installOllama = Read-Host "`nBan co muon cai dat Ollama (AI Cuc bo cho RTX 3060) khong? (Y/N)"
if ($installOllama -eq "Y" -or $installOllama -eq "y") {
    Install-App "ollama" "Ollama.Ollama"
    Write-Host "[+] Dang tai mo hinh Llama3..." -ForegroundColor Yellow
    start-process "ollama" -ArgumentList "run llama3 'Hello'" -NoNewWindow
}

# 4. CAP NHAT PATH VA KEO CODE
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
$ProjectDir = "$HOME\Desktop\cmms-webapp"
if (-not (Test-Path $ProjectDir)) {
    Write-Host "[+] Dang keo code tu GitHub..." -ForegroundColor Yellow
    git clone https://github.com/trucdienhapulico-ai/cmms-webapp.git $ProjectDir
}
Set-Location $ProjectDir
npm install

# 5. KET THUC
Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "✅ MOI TRUONG DA SAN SANG!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "👉 HAY THU CAC LENH SAU:" -ForegroundColor Cyan
Write-Host "- gh auth login          (Dang nhap GitHub)" -ForegroundColor White
Write-Host "- claude auth login      (Dang nhap AI)" -ForegroundColor White
Write-Host "- .\claude-worker.ps1    (Chay Builder)" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Green
