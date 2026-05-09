# Open Port 3001 in Windows Firewall for POS Server
# Run this script as Administrator

$port = 3001
$ruleName = "POS_Server_Port_3001"

Write-Host "Checking for existing firewall rule..." -ForegroundColor Cyan

$existingRule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue

if ($existingRule) {
    Write-Host "Rule '$ruleName' already exists. Removing it to ensure a clean setup..." -ForegroundColor Yellow
    Remove-NetFirewallRule -DisplayName $ruleName
}

Write-Host "Creating Inbound Rule to allow TCP port $port..." -ForegroundColor Cyan
New-NetFirewallRule -DisplayName $ruleName `
                    -Direction Inbound `
                    -LocalPort $port `
                    -Protocol TCP `
                    -Action Allow `
                    -Description "Allows incoming traffic for the POS Server API"

Write-Host "Successfully opened port $port! Other PCs can now connect to this server." -ForegroundColor Green
pause
