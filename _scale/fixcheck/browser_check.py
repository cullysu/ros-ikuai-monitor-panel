"""Browser-level verification of the frontend fixes (H2/conn_xss/M4/M6/M9)."""
import json, os, subprocess, sys, time, urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:28997/"
CHAOS = "http://127.0.0.1:8721/_scenario"
CHROME = str(Path.home() / "AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe")
SSH_STATE = Path(__file__).resolve().parent.parent / "ssh_state.json"
REPO = Path(__file__).resolve().parent.parent.parent

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

def sweep(page, sections, phase):
    errors, xss_hits = [], []
    page.on("pageerror", lambda e: errors.append(str(e)))
    for sec in sections:
        goto_section(page, sec)
        val = page.evaluate("window.__xss || null")
        if val is not None:
            xss_hits.append((sec, val))
    check(f"{phase}: zero pageerror across {len(sections)} pages", not errors, errors[:3])
    check(f"{phase}: window.__xss never set", not xss_hits, xss_hits[:3])

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=CHROME, headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 960})

    # ---- Phase 1: wan_1000 -> M6 fold / M4 hint / M9 overflow ----
    set_scenario("wan_1000")
    restart_panel()
    d = wait_snapshot_ok()
    check("wan_1000: snapshot carries 1000 lines", len(d.get("wan") or []) == 1000, len(d.get("wan") or []))

    page.goto(BASE, wait_until="domcontentloaded", timeout=30000)
    page.evaluate("localStorage.clear()")
    goto_section(page, "lineStatus")
    fold = page.query_selector(".ik-fold-more")
    check("M6: fold block rendered on lineStatus", fold is not None)
    if fold:
        check("M6: fold summary counts", "展开其余" in fold.query_selector("summary").inner_text(), fold.query_selector("summary").inner_text())
        main_rows = page.evaluate("document.querySelectorAll('.card-body > .ops-table-wrap tbody tr').length")
        board_cards = page.evaluate("document.querySelectorAll('.card-body > .grid-4 > .ls-line-card').length")
        ok_count = (20 <= main_rows <= 30) or (20 <= board_cards <= 30)
        check("M6: ~24 rows/cards visible before fold", ok_count, f"mainRows={main_rows} boardCards={board_cards}")
        sec_h = page.evaluate("document.getElementById('lineStatus').scrollHeight")
        check("M6: 1000-line page height bounded (<6000px)", sec_h < 6000, f"{sec_h}px")
        if fold:
            page.query_selector(".ik-fold-more > summary").click()
            page.wait_for_timeout(2500)
            expanded = page.evaluate("Array.from(document.querySelectorAll('.ops-table tbody tr')).filter(tr => tr.offsetParent !== null).length")
            check("M6: expand reveals remaining rows and survives poll re-render", expanded > 900, expanded)

    goto_section(page, "overview")
    hint_ok, hint_txt = False, ""
    for _ in range(8):
        body = page.inner_text("body")
        hint_ok = "条线路未计入" in body and "共 1,000 条" in body
        if hint_ok:
            break
        page.wait_for_timeout(1500)
    check("M4: home hidden-line hint", hint_ok, "waited 12s")
    ln = page.query_selector(".line-name")
    check("M9: line-name ellipsis applied", ln is not None and page.evaluate("el => getComputedStyle(el).textOverflow", ln) == "ellipsis")
    overflow = page.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
    check("M9: no horizontal overflow with 1000 lines", overflow <= 2, overflow)

    # ---- Phase 2: xss_names -> H2 dns.servers XSS must not execute ----
    set_scenario("xss_names")
    restart_panel()
    sweep(page, ["dns4", "serviceLogs", "dhcp", "security", "overview"], "xss_names")

    # ---- Phase 3: conn_xss -> SSH connection-field XSS renders post-H1 ----
    SSH_STATE.write_text(json.dumps({"xss": True, "connections": 60, "tracking": 5}))
    active = []
    for _ in range(20):
        time.sleep(3)
        try:
            d = json.loads(urllib.request.urlopen(BASE + "api/snapshot", timeout=10).read())
            active = (d.get("connections") or {}).get("active") or []
            if active:
                break
        except Exception:
            pass
    check("conn_xss: active rows populate after H1 fix", len(active) > 0, len(active))
    sweep(page, ["trafficAudit", "terminals", "trafficLoad"], "conn_xss")
    SSH_STATE.write_text(json.dumps({"xss": False, "connections": 60, "tracking": 5}))
    set_scenario("baseline")

    browser.close()

fails = [r for r in results if not r[1]]
print(f"\n=== BROWSER CHECK: {len(results) - len(fails)}/{len(results)} PASS ===")
sys.exit(1 if fails else 0)
