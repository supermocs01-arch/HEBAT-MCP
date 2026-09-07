@echo off
rem ===== PATEN: AUTO START SEMUA (dipanggil dari Startup Windows via startup_hidden.vbs) =====
rem 1) Nyalakan TradingView Desktop + remote debugging (kalau belum jalan)
rem 2) Pasang overlay + scan + monitor (via hi_fitra.cjs / auto_start_watch.cjs)
cd /d C:\HEBAT

echo [%date% %time%] start_all.cmd mulai >> C:\HEBAT\auto_start_watch.log

rem --- Watcher background: setiap TV menyala -> overlay + scan otomatis ---
start "" /min "wscript.exe" "C:\HEBAT\start_watcher_hidden.vbs"

rem --- Nyalakan TV + pasang overlay/scan/monitor satu kali ---
node C:\HEBAT\hi_fitra.cjs >> C:\HEBAT\hi_fitra.log 2>&1

echo [%date% %time%] start_all.cmd selesai >> C:\HEBAT\auto_start_watch.log