@echo off
title PENGAMAT XAUUSD - SELL 4065 (Seg press CTRL+C to stop)
cd /d C:\HEBAT
echo ============================================
echo   PENGAMAT XAUUSD - SELL 4065 aktif
echo   Scan harga tiap 5 detik, log ke file
echo   Tekan? sajak apapun untuk stop
echo ============================================
echo.
node watch_sel_v2.cjs
pause
