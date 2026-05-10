$logFile = "D:\KHONG_XOA\cmms-webapp\cmms-startup.log"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

try {
    Add-Content $logFile "[$timestamp] CMMS server starting..."
    $proc = Start-Process `
        -FilePath "C:\Program Files\nodejs\node.exe" `
        -ArgumentList "server.js" `
        -WorkingDirectory "D:\KHONG_XOA\cmms-webapp" `
        -WindowStyle Hidden `
        -PassThru
    Add-Content $logFile "[$timestamp] CMMS server started (PID: $($proc.Id)), port 3090"
} catch {
    Add-Content $logFile "[$timestamp] ERROR: $_"
}
