# init-pc.ps1
# Super Script: Thiet lap CMMS & AI tu con so 0 (Windows) - Ban V2.0
# Ho tro: Lua chon cai dat Ollama & Vi du giao viec Hello World.

$ErrorActionPreference = "SilentlyContinue"
Clear-Host
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "🚀 BAT DAU THIET LAP HE THONG CMMS & AI TU DONG" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. HAM CAI DAT PHAN MEM
function Install-App($Name, $Id) {
    if (Get-Command $Name -ErrorAction SilentlyContinue) {
        Write-Host "[✓] $Name da co san." -ForegroundColor Green
    } else {
        Write-Host "[+] Dang cai dat $Name..." -ForegroundColor Yellow
        winget install --id $Id --silent --accept-package-agreements --accept-source-agreements
    }
}

# 2. CAI DAT BAT BUOC
Install-App "git" "Git.Git"
Install-App "node" "OpenJS.NodeJS.LTS"
Install-App "docker" "Docker.DockerDesktop"

# 3. LUA CHON CAI DAT OLLAMA (AI CUC BO)
$installOllama = Read-Host "Ban co muon cai dat Ollama de chay AI tren GPU RTX 3060 khong? (Y/N)"
if ($installOllama -eq "Y" -or $installOllama -eq "y") {
    Install-App "ollama" "Ollama.Ollama"
    Write-Host "[+] Dang tai mo hinh Llama3 (Co the mat vai phut)..." -ForegroundColor Yellow
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
npm install -g @anthropic-ai/claude-code

# 5. KET THUC & VI DU GIAO VIEC
Clear-Host
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "✅ HE THONG DA SAN SANG!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "👉 VI DU GIAO VIEC (HELLO WORLD):" -ForegroundColor Cyan
Write-Host "----------------------------------------------------------" -ForegroundColor Gray
Write-Host "1. Test Claude Code (Sau khi login):" -ForegroundColor Yellow
Write-Host "   claude -p 'Hay noi Hello World va gioi thieu ban la ai'" -ForegroundColor White
Write-Host ""
if ($installOllama -eq "Y" -or $installOllama -eq "y") {
    Write-Host "2. Test AI Cuc bo (Ollama):" -ForegroundColor Yellow
    Write-Host "   ollama run llama3 'Hello World, who are you?'" -ForegroundColor White
}
Write-Host "----------------------------------------------------------" -ForegroundColor Gray
Write-Host "ME O: Go '.\claude-worker.ps1' de bat dau tu dong hoa Issue." -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Green
