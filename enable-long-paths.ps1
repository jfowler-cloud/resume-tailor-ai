# Enable Long Paths in Windows
# Right-click and "Run as Administrator"

Write-Host "Enabling long paths in Windows..." -ForegroundColor Cyan

try {
    New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" `
        -Name "LongPathsEnabled" `
        -Value 1 `
        -PropertyType DWORD `
        -Force | Out-Null
    
    Write-Host "✅ Long paths enabled successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "You may need to restart your terminal for changes to take effect." -ForegroundColor Yellow
} catch {
    Write-Host "❌ Failed to enable long paths: $_" -ForegroundColor Red
    Write-Host "Make sure you're running as Administrator" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
