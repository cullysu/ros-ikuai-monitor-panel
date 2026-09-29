"""Drive the real panel through chaos scenarios and record anomalies.

Usage: python run_chaos.py [scenario ...]
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
REST_PORT, PANEL_PORT = 18500, 29500
BASE = f"http://127.0.0.1:{PANEL_PORT}"

SCENARIOS = [
    "baseline", "zero_wan", "all_offline", "empty_everything", "dup_names",
    "counter_reset", "counter_backwards", "counter_wrap64", "counter_frozen", "counter_garbage", "counter_negative", "counter_float",
    "resource_zero", "resource_garbage", "resource_inverted", "resource_empty", "uptime_weird", "ros_v6",
    "clock_garbage", "clock_far_future", "clock_epoch",
    "xss_names", "long_names", "unicode_names", "iface_missing_fields", "wrong_types", "bad_addresses", "dhcp_wan_mixed",
    "arp_conflict_storm", "huge_rate",
    "http_401", "http_500", "http_html", "http_truncated_json", "http_empty_body", "http_null", "http_wrong_shape",
    "flapping", "slow_partial",
    "wan_1000", "iface_10000", "routes_100k", "terminals_20000", "logs_50000",
]
SECTIONS = ["overview", "interfaces", "terminals", "dhcp", "dns4", "dns6", "routes", "lineStatus", "balance",
            "trafficLoad", "loadAudit", "connections", "security", "arp", "trafficAudit", "logs", "serviceLogs"]

PROBE = r"""
() => {
  const t = document.body.innerText;
  const bad = (t.match(/NaN|undefined|Infinity|\[object Object\]|null B|-\d[\d.]* ?[KMGT]?B\/s/g) || []);
  const vw = document.documentElement.clientWidth;
  return {docH: document.documentElement.scrollHeight, overflowX: document.documentElement.scrollWidth - vw,
          bad: bad.slice(0, 8), badCount: bad.length, xss: window.__xss || 0,
          scriptsInjected: document.querySelectorAll('main script, #app script, .content script').length,
          textLen: t.length, blank: t.trim().length < 50};
}
"""


def http(path, method="GET", body=None, port=PANEL_PORT, timeout=10):
    req = urllib.request.Request(f"http://127.0.0.1:{port}{path}", method=method,
                                 data=json.dumps(body).encode() if body is not None else None,
                                 headers={"Content-Type": "application/json"})
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            raw = r.read()
            return r.status, raw, time.time() - t0
    except urllib.error.HTTPError as e:
        return e.code, e.read(), time.time() - t0
    except Exception as e:
        return -1, str(e).encode(), time.time() - t0


def set_scenario(name):
    http("/_scenario", "POST", {"name": name}, port=REST_PORT)


def proc_mem(pid):
    out = subprocess.run(["tasklist", "/FI", f"PID eq {pid}", "/FO", "CSV", "/NH"], capture_output=True, text=True).stdout
    try:
        return int(out.strip().split('","')[4].replace(" K", "").replace(",", "").replace('"', "")) // 1024
    except Exception:
        return -1


def main():
    names = sys.argv[1:] or SCENARIOS
    fake = subprocess.Popen([PY, str(ROOT / "_scale" / "chaos_ros.py"), str(REST_PORT)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    env = dict(os.environ, ROS_MONITOR_ROUTER_REST_PORT=str(REST_PORT), ROS_MONITOR_ROUTER_HOST="127.0.0.1", ROS_MONITOR_ROUTER_USER="admin",
               ROS_MONITOR_ROUTER_PASSWORD="x", ROS_MONITOR_ROUTER_SSH_PORT="1", ROS_PANEL_PORT=str(PANEL_PORT), ROS_PANEL_OPEN_BROWSER="0",
               ROS_PANEL_ENV_FILE=str(OUT / "none.env"), ROS_PANEL_ROUTER_LOGIN_STORE_FILE=str(OUT / "logins.json"),
               ROS_PANEL_IP_ALIAS_FILE=str(OUT / "alias.json"), ROS_MONITOR_STATIC_POLL_SECONDS="300")
    results = []

    def start_panel(tag):
        logf = open(OUT / f"panel-{tag}.log", "w", encoding="utf-8")
        for f in ("logins.json", "alias.json"):
            try: (OUT / f).unlink()
            except FileNotFoundError: pass
        pr = subprocess.Popen([PY, "-X", "utf8", str(ROOT / "app.py")], cwd=str(ROOT), env=env, stdout=logf, stderr=subprocess.STDOUT)
        return pr, logf

    panel = None
    time.sleep(1.5)
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path=CHROME, headless=True)
            for name in names:
                set_scenario(name)
                panel, logf = start_panel(name)
                boot = time.time()
                while time.time() - boot < 40:
                    st0, _r, _d = http("/api/snapshot", timeout=5)
                    if st0 == 200:
                        break
                    time.sleep(0.5)
                wait = 30 if name in ("slow_partial",) else (20 if name.startswith(("wan_", "iface_", "routes_", "terminals_", "logs_")) else 9)
                time.sleep(wait)
                ctx = browser.new_context(viewport={"width": 1440, "height": 900})
                page = ctx.new_page()
                errors = []
                page.on("pageerror", lambda e: errors.append(str(e)[:300]))
                page.on("console", lambda m: errors.append("console." + m.type + ": " + m.text[:200]) if m.type == "error" else None)
                try:
                    page.goto(BASE + "/#overview", wait_until="domcontentloaded", timeout=60000)
                    page.wait_for_timeout(3500)
                except Exception as e:
                    errors.append("goto:" + str(e)[:150])
                st, raw, dt = http("/api/snapshot", timeout=30)
                snap = {}
                try:
                    snap = json.loads(raw)
                except Exception:
                    pass
                api = {"status": st, "latency": round(dt, 2), "bytes": len(raw), "snapStatus": snap.get("status"),
                       "error": (str(snap.get("error"))[:160] if snap.get("error") else None),
                       "wan": len(snap.get("wan") or []), "memMB": proc_mem(panel.pid), "alive": panel.poll() is None}
                raw_s = raw.decode("utf-8", "replace")
                api["rawBad"] = sorted({tok for tok in ("NaN", "Infinity", "-Infinity") if tok in raw_s})
                sec_res = {}
                for sec in (SECTIONS if name in ("xss_names", "baseline", "empty_everything", "zero_wan", "wrong_types",
                                                  "counter_garbage", "resource_garbage", "long_names", "http_401", "wan_1000") else
                            ["overview", "interfaces", "lineStatus", "balance", "trafficLoad"]):
                    t0 = time.time()
                    try:
                        page.evaluate(f"location.hash = '{sec}'")
                        page.wait_for_timeout(900)
                        p = page.evaluate(PROBE)
                    except Exception as e:
                        p = {"probeError": str(e)[:200]}
                    p["renderS"] = round(time.time() - t0, 2)
                    if sec == "overview" or p.get("badCount") or p.get("xss") or p.get("overflowX", 0) > 2 or p.get("probeError"):
                        page.screenshot(path=str(OUT / f"{name}-{sec}.png"), full_page=False)
                    sec_res[sec] = p
                res = {"scenario": name, "api": api, "sections": sec_res, "pageErrors": list(dict.fromkeys(errors))[:8]}
                results.append(res)
                flags = []
                if st != 200: flags.append(f"HTTP{st}")
                if api["rawBad"]: flags.append("rawJSON:" + ",".join(api["rawBad"]))
                if not api["alive"]: flags.append("PANEL-DIED")
                if res["pageErrors"]: flags.append(f"jsErr{len(res['pageErrors'])}")
                bad = {k: v["bad"] for k, v in sec_res.items() if v.get("badCount")}
                if bad: flags.append("bad:" + json.dumps(bad, ensure_ascii=False)[:200])
                xs = max((v.get("xss", 0) for v in sec_res.values()), default=0)
                if xs: flags.append(f"XSS-EXECUTED={xs}")
                ov = {k: v["overflowX"] for k, v in sec_res.items() if v.get("overflowX", 0) > 2}
                if ov: flags.append(f"overflowX:{ov}")
                slow = {k: v["renderS"] for k, v in sec_res.items() if v["renderS"] > 3}
                if slow: flags.append(f"slowRender:{slow}")
                print(f"{name:22s} api={st} {api['latency']}s {api['bytes']//1024}KB snap={api['snapStatus']} wan={api['wan']} "
                      f"mem={api['memMB']}MB {' | '.join(flags)}", flush=True)
                (OUT / "results.json").write_text(json.dumps(results, ensure_ascii=False, indent=1), encoding="utf-8")
                ctx.close()
                panel.kill(); logf.close()
            browser.close()
    finally:
        if panel and panel.poll() is None:
            panel.kill()
        fake.kill()


if __name__ == "__main__":
    main()
