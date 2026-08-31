# JusticeLink Dev Manager
# Usage:
#   .\dev.ps1 start      - Start backend + expo
#   .\dev.ps1 stop       - Stop both
#   .\dev.ps1 restart    - Restart both
#   .\dev.ps1 emulators  - Start Pixel 10 Pro & Pixel 9 Pro emulators

param([string]$Command = "help")

$ROOT     = $PSScriptRoot
$BACKEND  = Join-Path $ROOT "backend"
$MOBILE   = Join-Path $ROOT "mobile"
$PID_FILE = Join-Path $ROOT ".dev_pids"

function Show-Banner {
    Write-Host ""
    Write-Host "  JusticeLink Dev Manager" -ForegroundColor Cyan
    Write-Host "  -----------------------" -ForegroundColor Cyan
    Write-Host ""
}

function Stop-PortProcess([int]$Port) {
    try {
        $conns = Get-NetTCPConnection -LocalPort $Port -ErrorAction Stop
        foreach ($c in $conns) {
            if ($c.OwningProcess -and $c.OwningProcess -gt 0) {
                try { Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue } catch {}
            }
        }
    } catch {}
}

function Stop-SavedProcess {
    if (Test-Path $PID_FILE) {
        foreach ($p in (Get-Content $PID_FILE)) {
            if ($p -match "^\d+$") {
                try { Stop-Process -Id ([int]$p) -Force -ErrorAction SilentlyContinue } catch {}
            }
        }
        Remove-Item $PID_FILE -Force -ErrorAction SilentlyContinue
    }
}

function Stop-DevEnvironment([switch]$Silent) {
    if (-not $Silent) { Write-Host "  Stopping all services..." -ForegroundColor Yellow }
    Stop-SavedProcess
    Stop-PortProcess 8000
    Stop-PortProcess 8081
    if (-not $Silent) {
        Write-Host "  Stopped." -ForegroundColor Green
        Write-Host ""
    }
}

function Update-EnvIPs {
    $ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -match "^192\.168\." -or $_.IPAddress -match "^10\." } | Select-Object -First 1).IPAddress
    if ($ip) {
        Write-Host "  Auto-updating IP in .env files to: $ip" -ForegroundColor DarkGray
        
        $backendEnv = Join-Path $BACKEND ".env"
        if (Test-Path $backendEnv) {
            (Get-Content $backendEnv) -replace "BACKEND_PUBLIC_BASE_URL=http://[0-9\.]+:\d+", "BACKEND_PUBLIC_BASE_URL=http://${ip}:8000" | Set-Content $backendEnv
        }

        $mobileEnv = Join-Path $MOBILE ".env"
        if (Test-Path $mobileEnv) {
            (Get-Content $mobileEnv) -replace "EXPO_PUBLIC_API_BASE_URL=http://[0-9\.]+:\d+", "EXPO_PUBLIC_API_BASE_URL=http://${ip}:8000" | Set-Content $mobileEnv
        }
    }
}

function Start-DevEnvironment {
    Show-Banner
    Stop-DevEnvironment -Silent
    Update-EnvIPs

    Write-Host "  Starting Backend (port 8000)..." -ForegroundColor Green
    $pythonExe = Join-Path $PWD ".venv\Scripts\python.exe"
    if (-not (Test-Path $pythonExe)) {
        $pythonExe = "python" # fallback
    }
    
    $backend = Start-Process $pythonExe `
        -ArgumentList "-m uvicorn main:app --host 0.0.0.0 --port 8000 --reload" `
        -WorkingDirectory $BACKEND `
        -PassThru -WindowStyle Normal

    Start-Sleep -Milliseconds 1500

    Write-Host "  Starting Expo (port 8081)..." -ForegroundColor Green
    $expo = Start-Process "cmd" `
        -ArgumentList "/k npm start -- -c" `
        -WorkingDirectory $MOBILE `
        -PassThru -WindowStyle Normal

    "$($backend.Id)`n$($expo.Id)" | Set-Content $PID_FILE

    Write-Host ""
    Write-Host "  Services running!" -ForegroundColor Green
    Write-Host "  Backend PID : $($backend.Id)" -ForegroundColor DarkGray
    Write-Host "  Expo    PID : $($expo.Id)" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "  .\dev.ps1 stop      -> stop both" -ForegroundColor Yellow
    Write-Host "  .\dev.ps1 restart   -> restart both" -ForegroundColor Yellow
    Write-Host "  .\dev.ps1 emulators -> start android emulators" -ForegroundColor Yellow
    Write-Host ""
}

function Restart-DevEnvironment {
    Show-Banner
    Write-Host "  Restarting..." -ForegroundColor Cyan
    Stop-DevEnvironment -Silent
    Start-Sleep -Milliseconds 800
    Start-DevEnvironment
}

function Start-Emulators {
    Show-Banner
    Write-Host "  Starting Android Emulators..." -ForegroundColor Green
    
    $emulatorExe = Join-Path $env:LOCALAPPDATA "Android\Sdk\emulator\emulator.exe"
    
    if (-not (Test-Path $emulatorExe)) {
        Write-Host "  Error: Could not find emulator.exe at $emulatorExe" -ForegroundColor Red
        return
    }

    Write-Host "  Launching Pixel_10_Pro..." -ForegroundColor Cyan
    Start-Process $emulatorExe -ArgumentList "-avd Pixel_10_Pro" -WindowStyle Hidden

    Write-Host "  Launching Pixel_9_Pro..." -ForegroundColor Cyan
    Start-Process $emulatorExe -ArgumentList "-avd Pixel_9_Pro" -WindowStyle Hidden

    Write-Host "  Emulators are booting up!" -ForegroundColor Green
    Write-Host ""
}

switch ($Command.ToLower()) {
    "start"     { Start-DevEnvironment }
    "stop"      { Show-Banner; Stop-DevEnvironment }
    "restart"   { Restart-DevEnvironment }
    "emulators" { Start-Emulators }
    default {
        Show-Banner
        Write-Host "  Usage: .\dev.ps1 [start|stop|restart|emulators]" -ForegroundColor Yellow
        Write-Host ""
    }
}
