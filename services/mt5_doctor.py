"""Dokter MT5: cek proses, build, paket, cache updater, snapshot, lock.

Pemakaian:
  python mt5_doctor.py            (laporan saja)
  python mt5_doctor.py --clean    (matikan stub liveupdate + bersihkan cache + lock basi)
"""
import glob
import json
import os
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
RUNTIME = os.path.join(ROOT, "runtime")
SNAP = os.path.join(RUNTIME, "mt5_snapshot.json")
LOCK = os.path.join(RUNTIME, "mt5_bridge.lock")
EXE = r"C:\Program Files\MetaTrader 5\terminal64.exe"
DATA = os.path.join(os.environ.get("APPDATA", ""), "MetaQuotes", "Terminal",
                    "D0E8209F77C8CF37AD8BF550E51FF075")


def ps(cmd):
    try:
        return subprocess.run(["powershell", "-NoProfile", "-Command", cmd],
                              capture_output=True, text=True, timeout=60).stdout.strip()
    except Exception as e:
        return "ERR " + str(e)


def procs():
    out = ps("Get-Process terminal64 -ErrorAction SilentlyContinue | "
             "Select-Object Id,StartTime,Path | ForEach-Object { $_.Id.ToString() + '|' + $_.Path }")
    rows = []
    for line in out.splitlines():
        if "|" in line:
            pid, path = line.split("|", 1)
            rows.append((pid.strip(), path.strip()))
    return rows


def main():
    print("=== MT5 DOCTOR ===")
    print("exe      :", EXE, "(ada)" if os.path.exists(EXE) else "(TIDAK ADA)")
    if os.path.exists(EXE):
        print("build    :", ps("(Get-Item '%s').VersionInfo.FileVersion" % EXE))
    try:
        import MetaTrader5 as m
        print("paket    :", m.__version__)
    except Exception as e:
        print("paket    : belum terpasang (" + str(e) + ")")

    rows = procs()
    print("proses   :", len(rows))
    for pid, path in rows:
        tag = " [STUB UPDATER]" if "liveupdate" in path.lower() else ""
        print("  PID", pid, path + tag)

    lu = os.path.join(DATA, "liveupdate")
    cache = glob.glob(os.path.join(lu, "*"))
    size = sum(os.path.getsize(p) for p in cache if os.path.isfile(p))
    print("cache updater:", len(cache), "file,", round(size / 1048576, 1), "MB")

    if os.path.exists(SNAP):
        age = time.time() - os.path.getmtime(SNAP)
        print("snapshot :", "%.0f dtk lalu" % age)
    else:
        print("snapshot : belum ada")

    if os.path.exists(LOCK):
        age = time.time() - os.path.getmtime(LOCK)
        print("lock     : %.0f dtk" % age, "(basi)" if age > 60 else "(aktif)")
    else:
        print("lock     : tidak ada")

    if "--clean" in sys.argv:
        print("--- CLEAN ---")
        for pid, path in rows:
            if "liveupdate" in path.lower():
                subprocess.call(["taskkill", "/F", "/PID", pid], capture_output=True)
                print("kill stub updater PID", pid)
        n = 0
        for p in cache:
            try:
                if os.path.isdir(p):
                    subprocess.call(["powershell", "-NoProfile", "-Command",
                                     "Remove-Item -LiteralPath '%s' -Recurse -Force" % p])
                else:
                    os.remove(p)
                n += 1
            except Exception:
                pass
        print("hapus cache:", n, "item")
        try:
            if os.path.exists(LOCK) and time.time() - os.path.getmtime(LOCK) > 60:
                os.remove(LOCK)
                print("hapus lock basi")
        except Exception:
            pass
        print("selesai. Buka MT5, login, lalu tes mt5_test.py")


if __name__ == "__main__":
    main()
