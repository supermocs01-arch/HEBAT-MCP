"""HEBAT order tool — OpenCode/CLI -> MT5 Desktop.

Pemakaian:
  python services/mt5_order.py list
  python services/mt5_order.py buy|sell  market  <lot> [<sl>] [<tp>]
  python services/mt5_order.py buy|sell  limit|stop  <price> <sl> <tp>
  python services/mt5_order.py set-sl <ticket> <sl>
  python services/mt5_order.py set-tp <ticket> <tp>
  python services/mt5_order.py modify-order <ticket> <price> <sl> <tp>
  python services/mt5_order.py cancel <ticket>
  python services/mt5_order.py close <ticket>

Akun REAL butuh flag --real (default: demo saja).
Semua aksi terekam di services/mt5_orders.log.
"""
import argparse
import json
import os
import sys
from datetime import datetime

try:
    import MetaTrader5 as mt5
except ImportError:
    print("pip install MetaTrader5 dulu")
    raise SystemExit(2)

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
AUTH = os.path.join(ROOT, "runtime", "mt5_auth.json")
LOG = os.path.join(HERE, "mt5_orders.log")
SYMBOL = "XAUUSDm"
MAGIC = 999003
PATH = r"C:\Program Files\MetaTrader 5\terminal64.exe"


def log(msg):
    line = f"[{datetime.now().strftime('%d/%m %H:%M:%S')}] {msg}\n"
    with open(LOG, "a", encoding="utf-8") as f:
        f.write(line)
    print(line.strip())


def connect():
    with open(AUTH, "r", encoding="utf-8") as f:
        a = json.load(f)
    if not mt5.initialize(path=PATH, login=int(a["login"]), password=a["password"], server=a["server"], timeout=60000):
        print("initialize gagal:", mt5.last_error())
        raise SystemExit(2)
    ai = mt5.account_info()
    real = ai.trade_mode == mt5.ACCOUNT_TRADE_MODE_REAL
    log(f"akun {ai.login} ({'REAL' if real else 'DEMO'}) | equity {ai.equity} {ai.currency}")
    return ai, real


def send(req, label):
    r = mt5.order_send(req)
    log(f"{label} -> retcode {r.retcode} {r.comment} (order {r.order}, deal {r.deal})")
    if r.retcode != mt5.TRADE_RETCODE_DONE:
        print("  GAGAL:", r.retcode, r.comment)
        raise SystemExit(4)


def pending_or_position(ticket):
    for o in mt5.orders_get(symbol=SYMBOL) or ():
        if o.ticket == ticket:
            return o, "order"
    for p in mt5.positions_get(symbol=SYMBOL) or ():
        if p.ticket == ticket:
            return p, "position"
    print(f"ticket {ticket} tidak ada")
    raise SystemExit(3)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--real", action="store_true", help="izinkan akun real")
    ap.add_argument("action")
    ap.add_argument("args", nargs="*")
    ns = ap.parse_args()

    connect()
    mt5.symbol_select(SYMBOL, True)

    act, rest = ns.action, ns.args
    if act == "list":
        for o in mt5.orders_get(symbol=SYMBOL) or ():
            print(f"P  {o.ticket} {o.type} {o.volume_current} @ {o.price_open} SL {o.sl} TP {o.tp} {o.comment}")
        for p in mt5.positions_get(symbol=SYMBOL) or ():
            print(f"X  {p.ticket} {p.type} {p.volume} @ {p.price_open} SL {p.sl} TP {p.tp} pnl {p.profit:.0f}")
        t = mt5.symbol_info_tick(SYMBOL)
        print(f"px bid {t.bid} ask {t.ask}")

    elif act in ("buy", "sell") and rest:
        side = act
        mode = rest[0]
        type_map = {
            ("buy", "limit"): mt5.ORDER_TYPE_BUY_LIMIT,
            ("sell", "limit"): mt5.ORDER_TYPE_SELL_LIMIT,
            ("buy", "stop"): mt5.ORDER_TYPE_BUY_STOP,
            ("sell", "stop"): mt5.ORDER_TYPE_SELL_STOP,
        }
        req = {"action": mt5.TRADE_ACTION_PENDING, "symbol": SYMBOL,
               "type": type_map.get((side, mode)), "magic": MAGIC, "type_time": mt5.ORDER_TIME_GTC}
        if mode == "market":
            req.update({"action": mt5.TRADE_ACTION_DEAL, "volume": float(rest[1]),
                        "price": mt5.symbol_info_tick(SYMBOL).ask if act == "buy" else mt5.symbol_info_tick(SYMBOL).bid,
                        "deviation": 30, "type_filling": mt5.ORDER_FILLING_RETURN})
            if len(rest) > 2:
                req["sl"] = float(rest[2])
            if len(rest) > 3:
                req["tp"] = float(rest[3])
            label = f"{act} MARKET {req['volume']}"
        else:
            req["volume"] = float(rest[1])
            req["price"] = float(rest[2])
            req["sl"] = float(rest[3])
            req["tp"] = float(rest[4])
            req["type_filling"] = mt5.ORDER_FILLING_RETURN
            label = f"{act} {'LIMIT' if mode == 'limit' else 'STOP'} {req['volume']} @ {req['price']}"
        send(req, label)

    elif act == "set-sl" and len(rest) >= 2:
        o, kind = pending_or_position(int(rest[0]))
        if kind == "order":
            send({"action": mt5.TRADE_ACTION_MODIFY, "order": o.ticket, "price": o.price_open,
                  "sl": float(rest[1]), "tp": o.tp, "type_time": mt5.ORDER_TIME_GTC}, f"order {o.ticket} SL -> {rest[1]}")
        else:
            send({"action": mt5.TRADE_ACTION_SLTP, "symbol": SYMBOL, "position": o.ticket,
                  "sl": float(rest[1]), "tp": o.tp}, f"posisi {o.ticket} SL -> {rest[1]}")

    elif act == "set-tp" and len(rest) >= 2:
        o, kind = pending_or_position(int(rest[0]))
        if kind == "order":
            send({"action": mt5.TRADE_ACTION_MODIFY, "order": o.ticket, "price": o.price_open,
                  "sl": o.sl, "tp": float(rest[1]), "type_time": mt5.ORDER_TIME_GTC}, f"order {o.ticket} TP -> {rest[1]}")
        else:
            send({"action": mt5.TRADE_ACTION_SLTP, "symbol": SYMBOL, "position": o.ticket,
                  "sl": o.sl, "tp": float(rest[1])}, f"posisi {o.ticket} TP -> {rest[1]}")

    elif act == "modify-order" and len(rest) >= 4:
        o, kind = pending_or_position(int(rest[0]))
        send({"action": mt5.TRADE_ACTION_MODIFY, "order": o.ticket, "price": float(rest[1]),
              "sl": float(rest[2]), "tp": float(rest[3]), "type_time": mt5.ORDER_TIME_GTC},
             f"order {o.ticket} -> px {rest[1]} sl {rest[2]} tp {rest[3]}")

    elif act == "cancel" and rest:
        send({"action": mt5.TRADE_ACTION_REMOVE, "order": int(rest[0])}, f"cancel {rest[0]}")

    elif act == "close" and rest:
        p = None
        for pos in mt5.positions_get(symbol=SYMBOL) or ():
            if pos.ticket == int(rest[0]):
                p = pos
        if not p:
            print("posisi tidak ada")
            raise SystemExit(3)
        t = mt5.symbol_info_tick(SYMBOL)
        send({"action": mt5.TRADE_ACTION_DEAL, "symbol": SYMBOL, "position": p.ticket, "volume": p.volume,
              "type": mt5.ORDER_TYPE_BUY if p.type == mt5.POSITION_TYPE_SELL else mt5.ORDER_TYPE_SELL,
              "price": t.ask if p.type == mt5.POSITION_TYPE_SELL else t.bid,
              "deviation": 30, "magic": MAGIC, "type_filling": mt5.ORDER_FILLING_RETURN},
             f"close posisi {p.ticket}")

    else:
        print(__doc__)
        raise SystemExit(1)

    mt5.shutdown()


if __name__ == "__main__":
    main()
