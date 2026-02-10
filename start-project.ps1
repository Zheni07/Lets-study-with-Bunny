# Start Project Script
# Starts both backend and frontend servers

Write-Host "Starting Learn with Bunny Project..." -ForegroundColor Green
Write-Host ""

# Check if Node.js is available
$nodePath = "C:\Program Files\nodejs"
if (Test-Path $nodePath) {
    $env:PATH += ";$nodePath"
} else {
    Write-Host "ERROR: Node.js not found!" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Disable offline mode
$env:npm_config_offline = "false"

# Get script directory
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $projectRoot "backend"

# Check if backend dependencies are installed
if (-not (Test-Path (Join-Path $backendDir "node_modules"))) {
    Write-Host "Backend dependencies not found. Installing..." -ForegroundColor Yellow
    Set-Location $backendDir
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to install backend dependencies!" -ForegroundColor Red
        exit 1
    }
}

# Start backend server in background
Write-Host "Starting backend server (port 4000)..." -ForegroundColor Cyan
Set-Location $backendDir
$backendJob = Start-Job -ScriptBlock {
    param($dir)
    Set-Location $dir
    $env:PATH += ";C:\Program Files\nodejs"
    $env:npm_config_offline = "false"
    npm run dev
} -ArgumentList $backendDir

# Wait a moment for backend to start
Start-Sleep -Seconds 3

# Start frontend server (Node script binds to 0.0.0.0 so 127.0.0.1 and network IP show the same)
Write-Host "Starting frontend server (port 3000 on all interfaces)..." -ForegroundColor Cyan
Set-Location $projectRoot
$frontendJob = Start-Job -ScriptBlock {
    param($dir)
    Set-Location $dir
    $env:PATH += ";C:\Program Files\nodejs"
    & node serve-frontend.js
} -ArgumentList $projectRoot

# Wait for servers to start
Start-Sleep -Seconds 2

Write-Host ""
Write-Host "✓ Servers started!" -ForegroundColor Green
Write-Host ""
Write-Host "Backend API:  http://localhost:4000 (also on network IP:4000)" -ForegroundColor Cyan
Write-Host "Frontend:     http://localhost:3000 (also http://YOUR_IP:3000, e.g. 172.20.10.11:3000)" -ForegroundColor Cyan
Write-Host ""
Write-Host "Opening browser..." -ForegroundColor Yellow

# Open browser
Start-Process "http://localhost:3000"

Write-Host ""
Write-Host "Press Ctrl+C to stop both servers" -ForegroundColor Yellow
Write-Host ""

# Keep script running and show logs
try {
    while ($true) {
        Start-Sleep -Seconds 1
        # Show backend output
        $backendOutput = Receive-Job $backendJob -ErrorAction SilentlyContinue
        if ($backendOutput) {
            Write-Host $backendOutput
        }
    }
} finally {
    Write-Host "`nStopping servers..." -ForegroundColor Yellow
    Stop-Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
    Remove-Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
    Write-Host "Servers stopped." -ForegroundColor Green
}
