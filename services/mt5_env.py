"""Samakan versi paket MetaTrader5 (pip) dengan build terminal.

Aturan: pilih versi paket tertinggi yang build-nya <= build terminal.
Kalau tidak ada yang <= build, pakai versi terendah yang tersedia.

Pemakaian:
  python mt5_env.py --check     (lihat rekomendasi, tidak mengubah apa pun)
  python mt5_env.py --install   (pasang versi yang cocok)
"""
import json
import os
import re
import subprocess
import sys
import urllib.request

EXE = r"C:\Program Files\MetaTrader 5\terminal64.exe"
PYPI = "https://pypi.org/pypi/MetaTrader5/json"


def terminal_build():
    if not os.path.exists(EXE):
        return None, "terminal64.exe tidak ditemukan"
    ps = "(Get-Item '%s').VersionInfo.FileVersion" % EXE
    out = subprocess.run(["powershell", "-NoProfile", "-Command", ps],
                         capture_output=True, text=True, timeout=60).stdout.strip()
    nums = re.findall(r"\d+", out)
    return (int(nums[-1]) if nums else None), out


def installed():
    try:
        import MetaTrader5 as m
        return m.__version__
    except Exception as e:
        return "belum terpasang (%s)" % e


def available():
    with urllib.request.urlopen(PYPI, timeout=60) as r:
        data = json.load(r)
    return list(data["releases"].keys())


def build_of(version):
    nums = re.findall(r"\d+", version)
    return int(nums[-1]) if nums else 0


def pick(versions, build):
    parsed = sorted(((build_of(v), v) for v in versions), reverse=True)
    valid = [v for b, v in parsed if b <= build]
    if valid:
        return valid[0]
    return parsed[-1][1]


def main():
    build, raw = terminal_build()
    print("terminal :", EXE)
    print("build    :", build, "(", raw, ")")
    cur = installed()
    print("paket    :", cur)
    if build is None:
        sys.exit(1)
    try:
        vs = available()
    except Exception as e:
        print("gagal ambil daftar versi PyPI:", e)
        sys.exit(1)
    target = pick(vs, build)
    print("target   :", target, "(build %d)" % build_of(target))
    if str(cur) == target:
        print("STATUS   : cocok, tidak perlu diubah")
        return
    print("perintah : \"%s\" -m pip install MetaTrader5==%s" % (sys.executable, target))
    if "--install" in sys.argv:
        rc = subprocess.call([sys.executable, "-m", "pip", "install", "--disable-pip-version-check",
                              "MetaTrader5==" + target])
        print("install  :", "OK" if rc == 0 else "GAGAL (exit %d)" % rc)
        sys.exit(rc)


if __name__ == "__main__":
    main()
