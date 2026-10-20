import json
import os
import sys
import time
import traceback

import MetaTrader5 as mt5

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
RUNTIME = os.path.join(ROOT, "runtime")
SNAP = os.path.join(RUNTIME, "mt5_snapshot.json")
LOCK = os.path.join(RUNTIME, "mt5_bridge.lock")
LOG = os.path.join(RUNTIME, "mt5_bridge.log")
AUTH = os.path.join(RUNTIME, "mt5_auth.json")
CFG = os.path.join(ROOT, "config.json")

os.makedirs(RUNTIME, exist_ok=True)


def cfg():
    try:
        with open(CFG, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def log(msg):
    line = time.strftime("%Y-%m-%d %H:%M:%S") + " " + msg
    print(line, flush=True)
    try:
        with open(LOG, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass


def auth():
    try:
        with open(AUTH, "r", encoding="utf-8") as f:
            a = json.load(f)
        return int(a.get("login") or 0), str(a.get("password") or ""), str(a.get("server") or "")
    except Exception:
        return 0, "", ""


def connect(path, timeout_ms):
    login, password, server = auth()
    if login and password and server:
        return mt5.initialize(path=path, login=login, password=password, server=server, timeout=timeout_ms)
    return mt5.initialize(path=path, timeout=timeout_ms)


def write_json_atomic(path, obj):
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False)
    os.replace(tmp, path)


def lock_ok():
    if os.path.exists(LOCK):
        try:
            age = time.time() - os.path.getmtime(LOCK)
            pid = int(open(LOCK).read().strip() or 0)
        except Exception:
            age, pid = 999, 0
        if age < 30 and pid and pid != os.getpid():
            log(f"bridge lain masih hidup (PID {pid}, umur {age:.0f}s) - keluar")
            return False
    with open(LOCK, "w") as f:
        f.write(str(os.getpid()))
    return True


def pick_symbol(positions, wanted):
    if wanted:
        return wanted
    for p in positions:
        if "XAU" in p.symbol.upper():
            return p.symbol
    syms = mt5.symbols_get() or ()
    for s in syms:
        if "XAU" in s.name.upper():
            return s.name
    return ""


def snapshot(connected, error=None, symbol=""):
    ai = mt5.account_info() if connected else None
    ti = mt5.terminal_info() if connected else None
    raw = mt5.positions_get() if connected else ()
    orders_raw = mt5.orders_get() if connected else ()
    tick = mt5.symbol_info_tick(symbol) if (connected and symbol) else None
    positions = []
    orders = []
    for o in orders_raw or ():
        if symbol and o.symbol != symbol:
            continue
        orders.append({
            "ticket": o.ticket,
            "symbol": o.symbol,
            "type": o.type,
            "type_id": o.type,
            "volume": o.volume_current,
            "price_open": o.price_open,
            "sl": o.sl,
            "tp": o.tp,
            "price_stoplimit": o.price_stoplimit,
            "time_setup": o.time_setup,
            "comment": o.comment,
            "magic": o.magic,
        })
    for p in raw or ():
        if symbol and p.symbol != symbol:
            continue
        positions.append({
            "ticket": p.ticket,
            "symbol": p.symbol,
            "type": "BUY" if p.type == 0 else "SELL",
            "type_id": p.type,
            "volume": p.volume,
            "price_open": p.price_open,
            "sl": p.sl,
            "tp": p.tp,
            "profit": p.profit,
            "swap": p.swap,
            "comment": p.comment,
            "time": p.time,
        })
    return {
        "ok": bool(connected and ai is not None),
        "error": error,
        "ts": time.time(),
        "ts_wib": time.strftime("%Y-%m-%d %H:%M:%S"),
        "terminal": None if not ti else {
            "name": ti.name, "build": ti.build, "connected": ti.connected,
            "path": ti.path, "company": ti.company,
        },
        "account": None if not ai else {
            "login": ai.login, "server": ai.server, "currency": ai.currency,
            "balance": ai.balance, "equity": ai.equity,
            "margin": ai.margin, "margin_free": ai.margin_free,
            "leverage": ai.leverage, "profit": ai.profit,
        },
        "symbol": symbol,
        "tick": None if not tick else {
            "bid": tick.bid, "ask": tick.ask, "time": tick.time,
            "spread": round(tick.ask - tick.bid, 3),
        },
        "positions": positions,
        "orders": orders,
    }


def main():
    once = "--once" in sys.argv
    c = cfg().get("mt5", {})
    path = c.get("terminalPath") or r"C:\Program Files\MetaTrader 5\terminal64.exe"
    wanted = c.get("symbol") or ""
    interval = int(c.get("pollSeconds") or 10)
    timeout_ms = int(c.get("timeoutMs") or 15000)

    if not lock_ok():
        return

    log("=== BRIDGE MULAI (read-only) ===")
    initialized = False
    last_try = 0
    last_n = -1
    if once:
        log("mode --once: satu snapshot lalu keluar")
    while True:
        try:
            if not initialized and (time.time() - last_try) > 30:
                last_try = time.time()
                initialized = connect(path, timeout_ms)
                if initialized:
                    log("initialize OK (build " + str(mt5.version()[1] if mt5.version() else "?") + ")")
                else:
                    log("initialize gagal: " + str(mt5.last_error()))
            ti = mt5.terminal_info() if initialized else None
            if initialized and not ti:
                try:
                    mt5.shutdown()
                except Exception:
                    pass
                initialized = False
            connected = bool(ti and ti.connected)
            sym = pick_symbol(mt5.positions_get() or (), wanted) if initialized else wanted
            snap = snapshot(connected, None if connected else "terminal tidak terhubung / belum login", sym)
            write_json_atomic(SNAP, snap)
            if len(snap["positions"]) != last_n:
                last_n = len(snap["positions"])
                log("posisi berubah: " + str(last_n) + " | akun " + str((snap.get("account") or {}).get("login")) + " | equity " + str((snap.get("account") or {}).get("equity")))
            if not connected and not once:
                log("snapshot STALE: " + str(snap["error"]))
            with open(LOCK, "w") as f:
                f.write(str(os.getpid()))
            if once:
                log("snapshot: ok=" + str(snap["ok"]) + " posisi=" + str(len(snap["positions"])))
                return
        except Exception as e:
            log("ERROR: " + str(e))
            log(traceback.format_exc().splitlines()[-1])
            try:
                write_json_atomic(SNAP, {
                    "ok": False, "error": str(e), "ts": time.time(),
                    "ts_wib": time.strftime("%Y-%m-%d %H:%M:%S"), "positions": [],
                })
            except Exception:
                pass
        time.sleep(interval)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        pass
    finally:
        try:
            mt5.shutdown()
        except Exception:
            pass
        try:
            os.remove(LOCK)
        except Exception:
            pass
