# JusticeLink Dev Manager
# Usage:
#   .\dev.ps1 start    - Start backend + expo
#   .\dev.ps1 stop     - Stop both
#   .\dev.ps1 restart  - Restart both

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

function Kill-Port([int]$Port) {
    $conns = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    foreach ($c in $conns) {
        try { Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue } catch {}
    }
}

function Kill-Saved {
    if (Test-Path $PID_FILE) {
        foreach ($p in (Get-Content $PID_FILE)) {
            if ($p -match "^\d+$") {
                try { Stop-Process -Id ([int]$p) -Force -ErrorAction SilentlyContinue } catch {}
            }
        }
        Remove-Item $PID_FILE -Force -ErrorAction SilentlyContinue
    }
}

function Do-Stop([switch]$Silent) {
    if (-not $Silent) { Write-Host "  Stopping all services..." -ForegroundColor Yellow }
    Kill-Saved
    Kill-Port 8000
    Kill-Port 8081
    if (-not $Silent) {
        Write-Host "  Stopped." -ForegroundColor Green
        Write-Host ""
    }
}

function Do-Start {
    Show-Banner
    Do-Stop -Silent

    Write-Host "  Starting Backend (port 8000)..." -ForegroundColor Green
    $backend = Start-Process "python" `
        -ArgumentList "-m uvicorn main:app --host 0.0.0.0 --port 8000 --reload" `
        -WorkingDirectory $BACKEND `
        -PassThru -WindowStyle Normal

    Start-Sleep -Milliseconds 1500

    Write-Host "  Starting Expo (port 8081)..." -ForegroundColor Green
    $expo = Start-Process "cmd" `
        -ArgumentList "/c npm start" `
        -WorkingDirectory $MOBILE `
        -PassThru -WindowStyle Normal

    "$($backend.Id)`n$($expo.Id)" | Set-Content $PID_FILE

    Write-Host ""
    Write-Host "  Services running!" -ForegroundColor Green
    Write-Host "  Backend PID : $($backend.Id)" -ForegroundColor DarkGray
    Write-Host "  Expo    PID : $($expo.Id)" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "  .\dev.ps1 stop     -> stop both" -ForegroundColor Yellow
    Write-Host "  .\dev.ps1 restart  -> restart both" -ForegroundColor Yellow
    Write-Host ""
}

function Do-Restart {
    Show-Banner
    Write-Host "  Restarting..." -ForegroundColor Cyan
    Do-Stop -Silent
    Start-Sleep -Milliseconds 800
    Do-Start
}

switch ($Command.ToLower()) {
    "start"   { Do-Start }
    "stop"    { Show-Banner; Do-Stop }
    "restart" { Do-Restart }
    default {
        Show-Banner
        Write-Host "  Usage: .\dev.ps1 [start|stop|restart]" -ForegroundColor Yellow
        Write-Host ""
    }
}
