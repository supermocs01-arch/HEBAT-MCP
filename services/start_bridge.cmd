@echo off
set "PY=C:\Users\Newas\AppData\Local\Programs\Python\Python311\python.exe"
set "PYW=C:\Users\Newas\AppData\Local\Programs\Python\Python311\pythonw.exe"
echo [1/2] Cek versi paket vs build terminal...
"%PY%" "C:\HEBAT\services\mt5_env.py" --install
echo [2/2] Start bridge (read-only)...
start "" "%PYW%" "C:\HEBAT\services\mt5_bridge.py"
echo Selesai. Log: C:\HEBAT\runtime\mt5_bridge.log
