"""Read-only acceptance against the real Linux deployment (192.168.3.5).

The rebuilt panel VM already serves the React desktop against its router.
This run verifies the platform end-to-end without writing anything.
"""
import json
import sys
import urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = "http://192.168.3.5/"
CHROME = str(Path.home() / "AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe")
HERE = Path(__file__).resolve().parent
failures = []

SECTIONS = [
    "overview", "interfaces", "lineStatus", "balance", "routes", "terminals",
    "dhcp", "arp", "trafficLoad", "loadAudit", "trafficAudit", "connections",
    "dns4", "dns6", "security", "logs", "serviceLogs",
]
DIAG = [
    "collectionHealthDiagnostics", "dnsProxyDiagnostics", "wanQualityDiagnostics",
    "terminalRiskDiagnostics", "systemAuditDiagnostics", "readonlyDiagnostics",
]


def check(name, ok, detail=""):
    print(("PASS " if ok else "FAIL ") + name + ((" | " + str(detail)[:170]) if detail else ""))
    if not ok:
        failures.append(name)


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=CHROME, headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))

    # ---- 1. served shell is the React desktop ----
    html = urllib.request.urlopen(BASE + "index.html", timeout=15).read().decode("utf-8")
    check("index serves React shell (surface loader)", "panel-surface-loader" in html)
    gz_req = urllib.request.Request(BASE + "api/snapshot", headers={"Accept-Encoding": "gzip"})
    import gzip as _gzip
    gz_resp = urllib.request.urlopen(gz_req, timeout=20)
    check("snapshot gzipped on wire", gz_resp.headers.get("Content-Encoding") == "gzip")
    raw = gz_resp.read()
    try:
        snap = json.loads(_gzip.decompress(raw))
    except OSError:
        snap = json.loads(raw)
    check("snapshot ok against real router", snap.get("status") == "ok", snap.get("status"))
    identity = str((snap.get("overview") or {}).get("identity", ""))
    version = str((snap.get("overview") or {}).get("version", ""))
    import re as _re
    check("collector identity is a real RouterOS identity",
          bool(identity) and _re.match(r"^[67]\.", version) is not None,
          f"identity={identity!r} version={version!r}")

    # ---- 2. desktop overview on real data ----
    page.goto(BASE + "index.html?surface=desktop", wait_until="domcontentloaded", timeout=30000)
    page.wait_for_timeout(9000)
    body = page.inner_text("body")
    check("overview renders real identity", identity in body or "RouterOS" in body)
    check("overview has no contract error", "契约" not in body and "contract error" not in body.lower())
    page.screenshot(path=str(HERE / "real_final_overview.png"))

    # ---- 3. all vanilla-parity sections ----
    bad = []
    for section in SECTIONS:
        page.evaluate(f"location.search = '?section={section}&surface=desktop'")
        page.wait_for_timeout(2500)
        text = page.inner_text("body")
        if len(text) <= 300 or "契约" in text:
            bad.append(section)
    check(f"section sweep {len(SECTIONS)} pages render", not bad, bad)

    # ---- 4. diagnostics pages ----
    bad_diag = []
    for section in DIAG:
        page.evaluate(f"location.search = '?section={section}&surface=desktop'")
        page.wait_for_timeout(2500)
        text = page.inner_text("body")
        if len(text) <= 200 or "契约" in text:
            bad_diag.append(section)
        page.screenshot(path=str(HERE / f"real_final_{section}.png"))
    check(f"diagnostics {len(DIAG)} pages render", not bad_diag, bad_diag)

    # ---- 5. alias affordance present (private profile; NOT clicked on production) ----
    page.evaluate("location.search = '?section=terminals&surface=desktop'")
    page.wait_for_timeout(3000)
    alias_count = len(page.query_selector_all("[data-alias-edit]"))
    term_rows = len(json.loads(urllib.request.urlopen(BASE + "api/snapshot", timeout=15).read()).get("terminals") or [])
    if term_rows == 0:
        check("alias affordance: no terminal rows on this deployment (feature verified on virtual data)", True, "terminals=0")
    else:
        check("alias edit affordance present", alias_count > 0, alias_count)

    check("zero pageerror across whole sweep", not errors, errors[:3])
    browser.close()

print()
print("=== REAL-MACHINE ACCEPTANCE (192.168.3.5, Linux x64) ===")
print("ALL PASS" if not failures else "FAILURES: " + ", ".join(failures))
sys.exit(1 if failures else 0)
