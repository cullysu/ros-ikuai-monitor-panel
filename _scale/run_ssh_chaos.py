"""SSH-path chaos driver: real panel + fake REST + fake SSH.

Usage: python run_ssh_chaos.py [case ...]
"""
import json
import os
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "_scale" / "chaos"
OUT.mkdir(parents=True, exist_ok=True)
PY = sys.executable
CHROME = r"C:\Users\cully\AppData\Local\ms-playwright\chromium-1223\chrome-win64\chrome.exe"
REST, SSH, PANEL = 19100, 19200, 29300
BASE = f"http://127.0.0.1:{PANEL}"
SSH_STATE = ROOT / "_scale" / "ssh_state.json"

CASES = {
    #  name:          (rest_scenario,        ssh_state,                                        probe_sections, wait_s)
    "conn_200":      ("baseline",           {"connections": 200, "tracking": 3000},           ["overview", "terminals", "connections", "trafficAudit", "arp", "security"], 10),
    "conn_xss":      ("baseline",           {"connections": 40, "tracking": 50, "xss": True}, ["overview", "terminals", "connections", "trafficAudit", "security", "logs"], 10),
    "conn_garbage":  ("baseline",           {"connections": 8000, "tracking": 9999, "garbage": True, "huge_line": True}, ["overview", "terminals", "connections"], 16),
    "conn_50k":      ("baseline",           {"connections": 0, "tracking": 1, "lines_50k": True}, ["connections", "terminals"], 20),
    "conn_trickle":  ("baseline",           {"connections": 3000, "tracking": 3000, "trickle": 0.5}, ["connections"], 16),
    "ssh_hang":      ("baseline",           {"connections": 5, "tracking": 5, "delay": 0, "hang": True}, ["overview", "connections"], 14),
    "ssh_auth_fail": ("baseline",           {"connections": 5, "tracking": 5, "refuse_auth": True}, ["overview", "connections"], 12),
    "lan_20k_terminals": ("lan_20k_terminals", {"connections": 500, "tracking": 20000, "lan20k": True},       ["overview", "terminals", "trafficAudit", "dhcp", "arp"], 22),
    "dns_static_5000": ("dns_static_5000",  {"connections": 5, "tracking": 10, "dns_count": 5000},              ["dns4", "dns6"], 14),
    "xss_everything": ("xss_everything",     {"connections": 10, "tracking": 20, "xss": True}, ["overview", "interfaces", "terminals", "dhcp", "dns4", "dns6", "routes", "lineStatus", "balance", "trafficLoad", "loadAudit", "connections", "security", "arp", "trafficAudit", "logs", "serviceLogs"], 12),
}

PROBE = r"""
() => {
  const t = document.body.innerText;
  const bad = (t.match(/NaN|undefined|Infinity|\[object Object\]/g) || []);
  const vw = document.documentElement.clientWidth;
  return {docH: document.documentElement.scrollHeight, overflowX: document.documentElement.scrollWidth - vw,
          bad: bad.slice(0, 6), xss: window.__xss || 0, textLen: t.length};
}
"""
INIT = "window.__xss = 0;"


def http(path, method="GET", body=None, timeout=20):
    req = urllib.request.Request(f"http://127.0.0.1:{PANEL}{path}", method=method,
                                 data=json.dumps(body).encode() if body is not None else None)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()
    except Exception as e:
        return -1, str(e).encode()


def wait_panel(deadline=45):
    end = time.time() + deadline
    while time.time() < end:
        st, raw = http("/api/snapshot", timeout=5)
        if st == 200:
            try:
                if json.loads(raw).get("status") == "ok":
                    return True
            except Exception:
                pass
        time.sleep(0.6)
    return False


def set_ssh(st):
    SSH_STATE.write_text(json.dumps(st), encoding="utf-8")


def main():
    only = sys.argv[1:] or list(CASES)
    set_ssh({})
    fake = subprocess.Popen([PY, str(ROOT / "_scale" / "chaos_ros.py"), str(REST)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    sshd = subprocess.Popen([PY, str(ROOT / "_scale" / "fake_ssh.py"), str(SSH)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(2.5)
    env = dict(os.environ, ROS_MONITOR_ROUTER_REST_PORT=str(REST), ROS_MONITOR_ROUTER_HOST="127.0.0.1", ROS_MONITOR_ROUTER_USER="a",
               ROS_MONITOR_ROUTER_PASSWORD="x", ROS_MONITOR_ROUTER_SSH_PORT=str(SSH), ROS_PANEL_PORT=str(PANEL),
               ROS_PANEL_OPEN_BROWSER="0", ROS_PANEL_ENV_FILE=str(OUT / "none.env"),
               ROS_PANEL_ROUTER_LOGIN_STORE_FILE=str(OUT / "s_logins.json"),
               ROS_PANEL_IP_ALIAS_FILE=str(OUT / "s_alias.json"))
    results = []
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path=CHROME, headless=True)
            for name in only:
                rest_scen, ssh_st, sections, wait = CASES[name]
                urllib.request.urlopen(urllib.request.Request(f"http://127.0.0.1:{REST}/_scenario", method="POST",
                                                              data=json.dumps({"name": rest_scen}).encode(),
                                                              headers={"Content-Type": "application/json"}))
                set_ssh(ssh_st)
                logf = open(OUT / f"ssh-panel-{name}.log", "w", encoding="utf-8", errors="replace")
                for f in ("s_logins.json", "s_alias.json"):
                    try:
                        (OUT / f).unlink()
                    except FileNotFoundError:
                        pass
                panel = subprocess.Popen([PY, "-X", "utf8", str(ROOT / "app.py")], cwd=str(ROOT), env=env, stdout=logf, stderr=subprocess.STDOUT)
                boot = wait_panel()
                time.sleep(wait)
                st, raw = http("/api/snapshot", timeout=30)
                try:
                    snap = json.loads(raw)
                except Exception:
                    snap = {}
                api = {"boot": boot, "snapStatus": snap.get("status"),
                       "error": (str(snap.get("error"))[:200] if snap.get("error") else None),
                       "terminals": ((snap.get("terminals") or {}).get("terminalCount") if isinstance(snap.get("terminals"), dict) else
                                     (len(snap.get("terminals") or []) if isinstance(snap.get("terminals"), list) else None)),
                       "conns": len(((snap.get("connections") or {}).get("active")) or []),
                       "connTotal": (snap.get("connections") or {}).get("total"),
                       "alive": panel.poll() is None}
                try:
                    tr = snap.get("terminals") or []
                    tops = sorted(tr, key=lambda r: -((r.get("totalRate") or r.get("upRate") or 0) + (r.get("downRate") or 0)))[:3]
                    api["topTerminals"] = [(t.get("ip") or t.get("address"), t.get("hostname"), t.get("totalRate"), t.get("upRate"), t.get("downRate")) for t in tops]
                    api["topIps"] = ((snap.get("connections") or {}).get("topIps") or [])[:2]
                except Exception:
                    api["topTerminals"] = "ERR"
                raw_s = raw.decode("utf-8", "replace")
                api["rawBad"] = sorted({tok for tok in ("NaN", "Infinity") if tok in raw_s})
                ctx = browser.new_context(viewport={"width": 1440, "height": 900})
                page = ctx.new_page()
                errs = []
                page.on("pageerror", lambda e: errs.append(str(e)[:200]))
                page.add_init_script(INIT)
                try:
                    page.goto(BASE + "/#overview", wait_until="domcontentloaded", timeout=60000)
                    page.wait_for_timeout(3500)
                except Exception as e:
                    errs.append("goto:" + str(e)[:150])
                secs = {}
                for sec in sections:
                    try:
                        page.evaluate(f"location.hash='{sec}'")
                        page.wait_for_timeout(1100)
                        p = page.evaluate(PROBE)
                    except Exception as e:
                        p = {"probeError": str(e)[:150]}
                    if name == "xss_everything" and p.get("xss"):
                        page.screenshot(path=str(OUT / f"{name}-{sec}.png"))
                    secs[sec] = p
                res = {"case": name, "api": api, "sections": secs, "jsErrors": errs[:6]}
                results.append(res)
                flags = []
                if api["rawBad"]: flags.append("raw:" + ",".join(api["rawBad"]))
                if errs: flags.append(f"jsErr{len(errs)}")
                x = max((v.get("xss", 0) for v in secs.values()), default=0)
                if x: flags.append(f"XSS={x}")
                ov = {k: v["overflowX"] for k, v in secs.items() if v.get("overflowX", 0) > 2}
                if ov: flags.append(f"ovf:{ov}")
                bads = {k: v["bad"] for k, v in secs.items() if v.get("badCount")}
                if bads: flags.append("bad:" + json.dumps(bads, ensure_ascii=False)[:180])
                print(f"{name:20s} boot={boot} snap={api['snapStatus']} term={api['terminals']} conn={api['conns']} "
                      f"top={api['topTerminals']} {' | '.join(flags)}", flush=True)
                (OUT / "ssh_results.json").write_text(json.dumps(results, ensure_ascii=False, indent=1), encoding="utf-8")
                ctx.close()
                panel.kill()
                logf.close()
                _end = time.time() + 12
                import socket as _s
                while time.time() < _end:
                    try:
                        _s.create_connection(("127.0.0.1", PANEL), timeout=1).close()
                        time.sleep(0.5)
                    except Exception:
                        break
            browser.close()
    finally:
        set_ssh({})
        try:
            fake.kill(); sshd.kill()
        except Exception:
            pass


if __name__ == "__main__":
    main()
