@echo off
rem ===== PATEN: TradingView Desktop + remote debugging =====
rem Jangan buka TradingView lewat Chrome lagi. Selalu jalankan via file ini.
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:9222/json' -UseBasicParsing -TimeoutSec 3; Write-Output 'TV-ALREADY-RUNNING' } catch { Write-Output 'TV-NOT-RUNNING' }" > %TEMP%\tvcheck.txt
set /p TVSTATE=<%TEMP%\tvcheck.txt
if "%TVSTATE%"=="TV-ALREADY-RUNNING" (
  echo TradingView Desktop sudah berjalan (port 9222) - siap scan.
) else (
  echo Menjalankan TradingView Desktop dengan remote debugging...
  start "" "C:\Users\Newas\AppData\Local\tradingview-mcp\TradingView.Desktop_3.3.0.7992_x64__n534cwy3pjxzj\TradingView.exe" --remote-debugging-port=9222
  echo Tunggu TradingView terbuka penuh lalu ketik "scan" ke Fitra.
)
