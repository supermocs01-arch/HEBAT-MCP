"""Pasang limit 2 layer (L1 TP1, L2 runner) + verifikasi ke MT5.

Satu perintah, atomik: cancel pending lama (magic sama) -> pasang L1 & L2 ->
baca ulang orders_get -> laporkan OK/GAGAL per ticket. Exit code != 0 kalau ada gagal.

Contoh:
  python services/pasang_limit.py sell --entry 4107.9 --sl 4121 --tp1 4067.9 --tp2 4007.9 --lot 0.01
  python services/pasang_limit.py sell --entry 4107.9 --sl 4121 --tp1 4067.9 --tp2 4007.9 --keep
"""
import argparse
import json
import os
import sys
from datetime import datetime

import MetaTrader5 as mt5

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
AUTH = os.path.join(ROOT, "runtime", "mt5_auth.json")
LOG = os.path.join(ROOT, "runtime", "pasang_limit.log")
PATH = r"C:\Program Files\MetaTrader 5\terminal64.exe"
SYMBOL = "XAUUSDm"
MAGIC = 999003


def log(msg):
    line = f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {msg}"
    print(line, flush=True)
    with open(LOG, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def send(req, label):
    r = mt5.order_send(req)
    if r is None:
        log(f"{label} GAGAL: order_send None, last_error={mt5.last_error()}")
        return None
    log(f"{label} -> retcode {r.retcode} {r.comment} (order {r.order})")
    return r if r.retcode == mt5.TRADE_RETCODE_DONE else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("dir", choices=["sell", "buy"])
    ap.add_argument("--entry", type=float, required=True)
    ap.add_argument("--sl", type=float, required=True)
    ap.add_argument("--tp1", type=float, required=True)
    ap.add_argument("--tp2", type=float, required=True)
    ap.add_argument("--lot", type=float, default=0.01)
    ap.add_argument("--keep", action="store_true", help="jangan cancel pending lama")
    a = ap.parse_args()

    with open(AUTH, "r", encoding="utf-8") as f:
        auth = json.load(f)

    if not mt5.initialize(path=PATH, login=int(auth["login"]), password=auth["password"],
                          server=auth["server"], timeout=60000):
        log(f"initialize gagal: {mt5.last_error()}")
        return 2

    ai = mt5.account_info()
    if not ai or ai.trade_mode != mt5.ACCOUNT_TRADE_MODE_DEMO:
        log("BATAL: akun bukan demo")
        mt5.shutdown()
        return 3

    mt5.symbol_select(SYMBOL, True)
    t = mt5.symbol_info_tick(SYMBOL)
    if not t:
        log("tick tidak tersedia")
        mt5.shutdown()
        return 2

    if a.dir == "sell" and not (a.entry > t.bid):
        log(f"BATAL: SELL LIMIT entry {a.entry} harus DI ATAS harga {t.bid}")
        mt5.shutdown()
        return 4
    if a.dir == "buy" and not (a.entry < t.ask):
        log(f"BATAL: BUY LIMIT entry {a.entry} harus DI BAWAH harga {t.ask}")
        mt5.shutdown()
        return 4
    if a.dir == "sell" and not (a.sl > a.entry > a.tp1 > a.tp2):
        log("BATAL: urutan SELL harus SL > entry > TP1 > TP2")
        mt5.shutdown()
        return 4
    if a.dir == "buy" and not (a.sl < a.entry < a.tp1 < a.tp2):
        log("BATAL: urutan BUY harus SL < entry < TP1 < TP2")
        mt5.shutdown()
        return 4

    if not a.keep:
        for o in mt5.orders_get(symbol=SYMBOL) or ():
            if o.magic == MAGIC:
                send({"action": mt5.TRADE_ACTION_REMOVE, "order": o.ticket},
                     f"cancel pending lama {o.ticket}")

    otype = mt5.ORDER_TYPE_SELL_LIMIT if a.dir == "sell" else mt5.ORDER_TYPE_BUY_LIMIT
    plan = [("L1", a.tp1), ("L2", a.tp2)]
    ok = []
    for name, tp in plan:
        req = {"action": mt5.TRADE_ACTION_PENDING, "symbol": SYMBOL, "type": otype,
               "volume": a.lot, "price": a.entry, "sl": a.sl, "tp": tp,
               "magic": MAGIC, "type_time": mt5.ORDER_TIME_GTC,
               "type_filling": mt5.ORDER_FILLING_RETURN,
               "comment": f"HEBAT {name}"}
        r = send(req, f"{name} {a.dir.upper()} LIMIT {a.lot} @ {a.entry} SL {a.sl} TP {tp}")
        if r:
            ok.append(r.order)

    live = {o.ticket: o for o in (mt5.orders_get(symbol=SYMBOL) or ()) if o.magic == MAGIC}
    missing = [ticket for ticket in ok if ticket not in live]

    log(f"VERIFIKASI: {len(ok)}/2 order terkirim, {len(live)} pending aktif di MT5")
    for ticket in ok:
        o = live.get(ticket)
        if o:
            log(f"  OK  {ticket} {a.dir.upper()} @ {o.price_open} SL {o.sl} TP {o.tp}")
        else:
            log(f"  HILANG {ticket} tidak ada di orders_get")

    mt5.shutdown()
    if len(ok) != 2 or missing:
        log("HASIL: GAGAL (sebagian/tidak terpasang)")
        return 1
    log("HASIL: SUKSES - 2 layer aktif & terverifikasi")
    return 0


if __name__ == "__main__":
    sys.exit(main())
