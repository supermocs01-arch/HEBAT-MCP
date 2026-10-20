import os
import subprocess
import sys

import MetaTrader5 as mt5

PATH = r"C:\Program Files\MetaTrader 5\terminal64.exe"
SYM = sys.argv[1] if len(sys.argv) > 1 else None


def build_of_exe():
    ps = "(Get-Item '%s').VersionInfo.FileVersion" % PATH
    out = subprocess.run(["powershell", "-NoProfile", "-Command", ps],
                         capture_output=True, text=True, timeout=60).stdout.strip()
    nums = [n for n in out.replace(".", " ").split() if n.isdigit()]
    return nums[-1] if nums else "?"


print("=== MT5 DIAGNOSTIC (read-only) ===")
print("paket python :", mt5.__version__)
print("terminal exe :", build_of_exe(), "build")

ok = mt5.initialize(path=PATH, timeout=15000)
print("initialize   :", ok)
if not ok:
    err = mt5.last_error()
    print("last_error   :", err)
    if err and err[0] == -10005:
        print("ARTI         : IPC timeout = terminal tidak bisa dihubungi.")
        print("PENYEBAB UMUM: (1) belum login akun, (2) beda level admin, (3) beda build paket vs terminal.")
        print("URUTAN FIX   : login dulu -> jalankan mt5_env.py --check -> mt5_doctor.py --clean")
    sys.exit(1)

ti = mt5.terminal_info()
if ti:
    print("terminal     :", ti.name, "build", ti.build, "| connected=", ti.connected)
    print("path         :", ti.path)

ai = mt5.account_info()
if ai:
    print("account      :", ai.login, "|", ai.server, "|", ai.currency,
          "| balance", ai.balance, "equity", ai.equity, "| leverage 1:%d" % ai.leverage)
else:
    print("account      : None (terminal belum login)")

pos = mt5.positions_get() or ()
print("positions    :", len(pos))
for p in pos:
    print("  ticket=%s %s %s %s @ %s SL=%s TP=%s profit=%s" % (
        p.ticket, p.symbol, "BUY" if p.type == 0 else "SELL",
        p.volume, p.price_open, p.sl, p.tp, p.profit))

syms = mt5.symbols_get() or ()
cand = [s.name for s in syms if "XAU" in s.name.upper()]
print("simbol XAU   :", cand[:20])

target = SYM or (cand[0] if cand else None)
if target:
    si = mt5.symbol_info(target)
    print("symbol_info  :", None if si is None else
          "%s digits=%d point=%s visible=%s spread=%s" %
          (si.name, si.digits, si.point, si.visible, si.spread))

mt5.shutdown()
print("=== SELESAI ===")
