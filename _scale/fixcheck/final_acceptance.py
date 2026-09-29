"""FINAL ACCEPTANCE: full user journey on virtual data (production has no
RouterOS anymore). Fresh store -> connection form -> rememberProfile ->
overview -> section sweep incl. 6 diagnostics pages -> parity features."""
import json
import sys
import urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:28997/"
CHAOS = "http://127.0.0.1:8721/_scenario"
HERE = Path(__file__).resolve().parent
failures = []


def check(name, ok, detail=""):
    print(("PASS " if ok else "FAIL ") + name + ((" | " + str(detail)[:170]) if detail else ""))
    if not ok:
        failures.append(name)


def post_scenario(name):
    req = urllib.request.Request(CHAOS, data=json.dumps({"name": name}).encode(),
                                 headers={"Content-Type": "application/json"})
    urllib.request.urlopen(req, timeout=5).read()


def wait_snapshot(timeout=40):
    import time
    t0 = time.time()
    while time.time() - t0 < timeout:
        try:
            d = json.loads(urllib.request.urlopen(BASE + "api/snapshot", timeout=5).read())
            if d.get("status") == "ok":
                return d
        except Exception:
            pass
        time.sleep(2)
    raise RuntimeError("snapshot not ok")


with sync_playwright() as p:
    CHROME = str(Path.home() / "AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe")
    browser = p.chromium.launch(executable_path=CHROME, headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))

    # ---- 1. fresh store -> connection form ----
    page.goto(BASE + "index.html?surface=desktop", wait_until="domcontentloaded", timeout=30000)
    page.wait_for_timeout(5000)
    check("connection form on fresh store", page.query_selector("form[data-router-login-form]") is not None)
    page.screenshot(path=str(HERE / "final_1_login.png"))

    # ---- 2. fill credentials + rememberProfile ----
    page.fill("input[name='host']", "127.0.0.1")
    page.fill("input[name='user']", "a")
    page.fill("input[type='password']", "x")
    adv = page.query_selector("text=高级连接设置")
    if adv:
        adv.click()
        page.wait_for_timeout(400)
    page.evaluate(
        """() => {
            const ssh = Array.from(document.querySelectorAll('input[inputmode="numeric"]')).find((el) => el.value === '22');
            if (!ssh) return false;
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            setter.call(ssh, '8722');
            ssh.dispatchEvent(new Event('input', { bubbles: true }));
            const labels = Array.from(document.querySelectorAll('label'));
            const risk = labels.find((l) => l.textContent.includes('确认使用明文 HTTP'));
            const riskBox = risk && risk.querySelector('input[type="checkbox"]');
            if (riskBox && !riskBox.checked) riskBox.click();
            const remember = document.querySelector("input[name='rememberProfile']");
            if (remember && !remember.checked) remember.click();
            return true;
        }"""
    )
    page.screenshot(path=str(HERE / "final_2_filled.png"))

    # ---- 3. submit -> overview ----
    submit = page.query_selector("form[data-router-login-form] button[type='submit']")
    check("submit present", submit is not None)
    if submit:
        submit.click()
    wait_snapshot()
    page.wait_for_timeout(6000)
    body = page.inner_text("body")
    identity = [m for m in ("Chaos-baseline", "RouterOS", "7.15.3") if m in body]
    check("overview renders virtual identity", len(identity) >= 2, identity)
    check("no contract error", "契约" not in body and "contract error" not in body.lower())
    page.screenshot(path=str(HERE / "final_3_overview.png"))

    store = json.loads(Path("_scale/fixcheck/final_logins.json").read_text(encoding="utf-8"))
    entries = store.get("entries", [])
    check("rememberProfile saved profile", len(entries) == 1, [e.get("host") for e in entries])
    if entries:
        check("profile stores no password", not entries[0].get("password"), "password field empty")
    topbar = page.evaluate("document.body.innerText.includes('面板地址')")
    check("topbar shows panel access url", topbar)

    # ---- 4. section sweep (vanilla-parity sections) ----
    sections = ["interfaces", "lineStatus", "balance", "routes", "terminals", "dhcp", "arp",
                "trafficLoad", "loadAudit", "trafficAudit", "connections", "dns4", "dns6",
                "security", "logs", "serviceLogs"]
    bad_pages = []
    for section in sections:
        page.evaluate(f"location.search = '?section={section}&surface=desktop'")
        page.wait_for_timeout(2500)
        text = page.inner_text("body")
        if len(text) <= 300 or "契约" in text:
            bad_pages.append(section)
    check(f"section sweep {len(sections)} pages all render", not bad_pages, bad_pages)

    # ---- 5. six diagnostics pages ----
    diag_pages = ["collectionHealthDiagnostics", "dnsProxyDiagnostics", "wanQualityDiagnostics",
                  "terminalRiskDiagnostics", "systemAuditDiagnostics", "readonlyDiagnostics"]
    bad_diag = []
    for section in diag_pages:
        page.evaluate(f"location.search = '?section={section}&surface=desktop'")
        page.wait_for_timeout(2500)
        text = page.inner_text("body")
        if len(text) <= 200 or "契约" in text:
            bad_diag.append(section)
        page.screenshot(path=str(HERE / f"final_diag_{section}.png"))
    check(f"diagnostics pages {len(diag_pages)} all render", not bad_diag, bad_diag)

    # ---- 6. parity feature: trafficAudit single-IP drill-down ----
    page.evaluate("location.search = '?section=trafficAudit&surface=desktop'")
    page.wait_for_timeout(2500)
    drill = page.evaluate(
        """() => {
            const input = document.querySelector('[data-supplemental-target-input="trafficAudit"]');
            if (!input) return { found: false };
            return { found: true, placeholder: input.placeholder };
        }"""
    )
    check("trafficAudit drill-down input present", drill.get("found"), drill)
    if drill.get("found"):
        page.fill('[data-supplemental-target-input="trafficAudit"]', "192.168.88.61")
        page.click('[data-supplemental-submit="trafficAudit"]')
        page.wait_for_timeout(3000)
        drill_text = page.inner_text("body")
        check("trafficAudit drill-down evidence rendered", "活动连接" in drill_text or "查询" in drill_text)

    # ---- 7. IP alias rename round-trip on terminals ----
    page.evaluate("location.search = '?section=terminals&surface=desktop'")
    page.wait_for_timeout(3000)
    alias_btn = page.query_selector("[data-alias-edit]")
    renamed = False
    if alias_btn:
        alias_btn.click()
        page.wait_for_timeout(400)
        editor = page.query_selector("[data-alias-editor] input")
        if editor:
            page.evaluate(
                """() => {
                    const el = document.querySelector("[data-alias-editor] input");
                    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                    setter.call(el, 'FinalAcceptance-PC');
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                }"""
            )
            save = page.query_selector("[data-alias-save]")
            if save:
                save.click()
                page.wait_for_timeout(2500)
                renamed = "FinalAcceptance-PC" in page.inner_text("body")
    check("IP alias rename reflected in UI", renamed)
    page.screenshot(path=str(HERE / "final_4_alias.png"))

    # ---- 8. scale badge under wan_1000 ----
    post_scenario("wan_1000")
    import time
    time.sleep(6)
    wait_snapshot()
    page.evaluate("location.search = '?section=lineStatus&surface=desktop'")
    page.wait_for_timeout(3000)
    body = page.inner_text("body")
    import re as _re
    check("scale badge under wan_1000 (lineStatus shows nothing: shown==total)", "显示" not in body or _re.search(r"显示 \d+ / 共", body) is None, "lineStatus badge only when hasMore")
    page.evaluate("location.search = '?section=trafficAudit&surface=desktop'")
    page.wait_for_timeout(3000)
    ttext = page.inner_text("body")
    check("scale badge on trafficAudit sampled list", _re.search(r"显示 \d+ / 共 \d+", ttext) is not None, [m for m in _re.findall(r"显示 \d+ / 共 \d+ 条", ttext)][:2])
    page.screenshot(path=str(HERE / "final_5_scalebadge.png"))
    post_scenario("baseline")

    # ---- 9. transport: gzip live ----
    req = urllib.request.Request(BASE + "api/snapshot", headers={"Accept-Encoding": "gzip"})
    resp = urllib.request.urlopen(req, timeout=15)
    check("snapshot gzipped on wire", resp.headers.get("Content-Encoding") == "gzip")

    check("zero pageerror across whole journey", not errors, errors[:3])
    browser.close()

print()
if failures:
    print("FAILURES: " + ", ".join(failures))
else:
    print("ALL PASS")
sys.exit(1 if failures else 0)
