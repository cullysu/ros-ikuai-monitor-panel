"""Phase-1 fold sweep: visit every section after panel.js was folded into panel-head.js.

Asserts per section: zero pageerror, section container exists, at least one .card.
Also asserts the folded IIFEs still export window.panelRouterSwitcher /
window.panelRouterSetup and the boot layer still exposes window.renderApp.

Usage: python _scale/fixcheck/phase1_sweep.py   (expects stubs on :8721/:8722)
"""
import json, os, subprocess, sys, time, urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:28997/"
CHAOS = "http://127.0.0.1:8721/_scenario"
CHROME = str(Path.home() / "AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe")
REPO = Path(__file__).resolve().parent.parent.parent

SECTIONS = ["routes", "balance", "interfaces", "logs", "loadAudit", "connections",
            "lineStatus", "dns4", "dns6", "dhcp", "security", "trafficAudit",
            "terminals", "trafficLoad", "serviceLogs"]

results = []
def check(name, ok, detail=""):
    results.append((name, bool(ok), detail))
    print(("PASS " if ok else "FAIL ") + name + ((" | " + str(detail)[:160]) if detail else ""))

def set_scenario(name):
    req = urllib.request.Request(CHAOS, data=json.dumps({"name": name}).encode(), headers={"Content-Type": "application/json"})
    urllib.request.urlopen(req, timeout=5).read()

def wait_snapshot_ok(timeout=60):
    t0 = time.time()
    while time.time() - t0 < timeout:
        try:
            d = json.loads(urllib.request.urlopen(BASE + "api/snapshot", timeout=5).read())
            if d.get("status") == "ok":
                return d
        except Exception:
            pass
        time.sleep(2)
    raise RuntimeError("snapshot not ok in time")

def restart_panel():
    out = subprocess.run(["netstat", "-ano"], capture_output=True, encoding="gbk", errors="replace").stdout or ""
    for line in out.splitlines():
        if ":28997" in line and "LISTENING" in line:
            subprocess.run(["taskkill", "/PID", line.split()[-1], "/F"], capture_output=True)
            break
    time.sleep(1)
    env = dict(os.environ,
                ROS_MONITOR_ROUTER_REST_PORT="8721",
                ROS_PANEL_PORT="28997", ROS_PANEL_OPEN_BROWSER="0",
                ROS_PANEL_ENV_FILE="_scale/fixcheck/none.env",
                ROS_MONITOR_ROUTER_HOST="127.0.0.1", ROS_MONITOR_ROUTER_USER="a",
                ROS_MONITOR_ROUTER_PASSWORD="x", ROS_MONITOR_ROUTER_SSH_PORT="8722",
                ROS_PANEL_ROUTER_LOGIN_STORE_FILE="_scale/fixcheck/logins.json")
    subprocess.Popen([sys.executable, "app.py"], cwd=str(REPO), env=env,
                     stdout=open("_scale/fixcheck/panel.log", "ab"), stderr=subprocess.STDOUT)
    wait_snapshot_ok()

def goto_section(page, sec):
    page.goto(BASE, wait_until="domcontentloaded", timeout=30000)
    page.wait_for_timeout(600)
    page.evaluate(f"location.hash = '#{sec}'")
    page.wait_for_timeout(2500)

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=CHROME, headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 960})

    set_scenario("baseline")
    restart_panel()
    wait_snapshot_ok()

    # --- global symbol checks on a freshly loaded page (overview) ---
    all_errors = []
    page.on("pageerror", lambda e: all_errors.append(str(e)))
    goto_section(page, "overview")
    check("symbols: window.panelRouterSwitcher is object",
          page.evaluate("typeof window.panelRouterSwitcher") == "object",
          page.evaluate("typeof window.panelRouterSwitcher"))
    check("symbols: window.panelRouterSetup is object",
          page.evaluate("typeof window.panelRouterSetup") == "object",
          page.evaluate("typeof window.panelRouterSetup"))
    check("symbols: window.renderApp is function",
          page.evaluate("typeof window.renderApp") == "function",
          page.evaluate("typeof window.renderApp"))

    # --- per-section sweep ---
    for sec in SECTIONS:
        before = len(all_errors)
        goto_section(page, sec)
        sec_errors = all_errors[before:]
        check(f"{sec}: zero pageerror", not sec_errors, sec_errors[:2])
        exists = page.evaluate(f"!!document.getElementById('{sec}')")
        cards = page.evaluate(f"document.querySelectorAll('#{sec} .card').length")
        check(f"{sec}: section container present with cards", exists and cards > 0,
              f"exists={exists} cards={cards}")

    browser.close()

fails = [r for r in results if not r[1]]
print(f"\n=== PHASE1 SWEEP: {len(results) - len(fails)}/{len(results)} PASS ===")
sys.exit(1 if fails else 0)
