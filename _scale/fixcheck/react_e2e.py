"""React desktop E2E vs live vanilla backend (backend already configured)."""
import json
import sys
import urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:28997/index.html?surface=desktop"
CHAOS = "http://127.0.0.1:8721/_scenario"
SSH_STATE = Path(__file__).resolve().parents[1] / "ssh_state.json"
CHROME = str(Path.home() / "AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe")
HERE = Path(__file__).resolve().parent
failures = []


def check(name, ok, detail=""):
    print(("PASS " if ok else "FAIL ") + name + ((" | " + str(detail)[:180]) if detail else ""))
    if not ok:
        failures.append(name)


def post_json(url, payload):
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    return urllib.request.urlopen(req, timeout=15).read()


def set_ssh_state(**kwargs):
    current = json.loads(SSH_STATE.read_text(encoding="utf-8")) if SSH_STATE.exists() else {}
    current.update(kwargs)
    SSH_STATE.write_text(json.dumps(current), encoding="utf-8")


def restore_ssh_state(raw):
    if raw is not None:
        SSH_STATE.write_text(raw, encoding="utf-8")


def snapshot_json():
    with urllib.request.urlopen("http://127.0.0.1:28997/api/snapshot", timeout=15) as response:
        return json.loads(response.read())


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=CHROME, headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))

    page.goto(BASE, wait_until="domcontentloaded", timeout=30000)
    page.wait_for_timeout(9000)
    body = page.inner_text("body")

    identity = [m for m in ("Chaos-baseline", "RouterOS", "7.15.3", "REST 可用") if m in body]
    check("overview shows live device identity", len(identity) >= 2, identity)
    check("no contract error page", ("契约" not in body) and ("contract error" not in body.lower()))
    normalized = ("+08:00" in body) or ("当前快照" in body) or ("2026-09-29T" in body)
    check("timestamps normalized", normalized)
    page.screenshot(path=str(HERE / "react_e2e_overview.png"))

    for section in ("lineStatus", "terminals"):
        page.evaluate(f"location.search = '?section={section}&surface=desktop'")
        page.wait_for_timeout(4500)
        text = page.inner_text("body")
        bad = ("契约" in text) or ("contract error" in text.lower())
        check(f"section {section} renders", len(text) > 300 and not bad, f"chars={len(text)} contractError={bad}")
        page.screenshot(path=str(HERE / f"react_e2e_{section}.png"))

    # Readonly diagnostics feature pages (React parity with vanilla six pages).
    DIAG_SECTIONS = (
        "collectionHealthDiagnostics",
        "dnsProxyDiagnostics",
        "wanQualityDiagnostics",
        "terminalRiskDiagnostics",
        "systemAuditDiagnostics",
        "readonlyDiagnostics",
    )
    diag_probe_states = {}
    for section in DIAG_SECTIONS:
        page.evaluate(f"location.search = '?section={section}&surface=desktop'")
        page.wait_for_timeout(4500)
        text = page.inner_text("body")
        bad = ("契约" in text) or ("contract error" in text.lower())
        check(f"diag section {section} renders", len(text) > 200 and not bad, f"chars={len(text)} contractError={bad}")
        shell = page.locator(f'[data-readonly-diagnostics-evidence="{section}"]')
        if shell.count():
            diag_probe_states[section] = shell.first.get_attribute("data-readonly-probe-state")
        page.screenshot(path=str(HERE / f"diag_{section}.png"))
    check("diag probe evidence attached on all six pages", len(diag_probe_states) == 6, diag_probe_states)

    page.evaluate("location.search = '?section=readonlyDiagnostics&surface=desktop'")
    page.wait_for_timeout(4500)
    for target in DIAG_SECTIONS[:5]:
        links = page.locator(f'nav.readonly-feature-nav [data-section="{target}"]')
        check(f"readonlyDiagnostics links {target}", links.count() >= 1, f"count={links.count()}")

    # ---- Parity batch: scale badges, panel-network topbar, loadAudit enrichment,
    # ---- trafficAudit drill-down, IP alias inline rename.
    original_ssh_state = SSH_STATE.read_text(encoding="utf-8") if SSH_STATE.exists() else None

    # 1) wan_1000 scenario: lineStatus must render the 1000-line page. The
    # backend declares the wan collection fully enumerated (meta.scale.wan
    # shown == total, hasMore=false via list_scale_meta), so the sampling
    # badge correctly stays hidden here; the sampled-collection badge is
    # asserted on trafficAudit below via connectionsActive.
    post_json(CHAOS, {"name": "wan_1000"})
    page.evaluate("location.search = '?section=lineStatus&surface=desktop'")
    page.wait_for_timeout(9000)
    text = page.inner_text("body")
    check("lineStatus wan_1000 renders", len(text) > 300 and "契约" not in text, f"chars={len(text)}")
    check("lineStatus wan_1000 hides badge for fully shown wan list", page.locator("[data-panel-scale-notice]").count() == 0)

    # 2) Sampled collection: tracking total >> captured rows drives
    # meta.scale.connectionsActive hasMore=true -> trafficAudit shows the badge.
    set_ssh_state(tracking=1234, connections=60)
    page.evaluate("location.search = '?section=trafficAudit&surface=desktop'")
    badge = page.locator("[data-panel-scale-notice]")
    badge_ok = False
    badge_text = None
    scale_active = {}
    for _ in range(8):
        page.wait_for_timeout(4000)
        snapshot = snapshot_json()
        scale_active = (snapshot.get("meta", {}).get("scale", {}).get("connectionsActive") or {})
        badge_ok = badge.count() >= 1 and "显示" in badge.first.inner_text() and "活跃连接" in badge.first.inner_text()
        badge_text = badge.first.inner_text() if badge.count() else None
        if badge_ok:
            break
    check("trafficAudit sampled badge appears", badge_ok, f"scale={scale_active} badge={badge_text}")

    # 3) trafficAudit single-IP drill-down reuses the connection-search supplement.
    active_rows = (snapshot.get("connections", {}).get("active") or [])
    target_ip = str((active_rows[0].get("localIp") if active_rows else "") or "").split(":")[0].strip()
    check("trafficAudit drill-down target available", bool(target_ip), target_ip)
    if target_ip:
        page.fill('[data-supplemental-target-input="trafficAudit"]', target_ip)
        page.click('[data-supplemental-submit="trafficAudit"]')
        page.wait_for_timeout(6000)
        shell = page.locator('[data-supplemental-surface="trafficAudit"]')
        kind = shell.get_attribute("data-supplemental-kind")
        rows = page.locator('[data-supplemental-surface="trafficAudit"] .ddrs-connections tbody tr')
        check("trafficAudit drill-down shows connection evidence block", shell.count() == 1 and kind == "connection-search" and rows.count() >= 1, f"kind={kind} rows={rows.count()}")

    # 4) terminals inline IP alias rename: edit -> save -> optimistic UI update.
    page.evaluate("location.search = '?section=terminals&surface=desktop'")
    page.wait_for_timeout(7000)
    alias_button = page.locator("[data-alias-edit]").first
    if alias_button.count():
        alias_ip = alias_button.get_attribute("data-alias-edit")
        alias_button.click()
        page.fill("[data-alias-input]", "E2E别名机")
        page.click("[data-alias-save]")
        page.wait_for_timeout(4000)
        body = page.inner_text("body")
        posted = snapshot_json()
        alias_confirmed = any(
            (row.get("ip") == alias_ip and row.get("customName") == "E2E别名机")
            for row in (posted.get("terminals") or [])
        )
        check("terminals rename POST confirmed by snapshot", alias_confirmed, f"ip={alias_ip}")
        check("terminals rename reflected in UI", "E2E别名机" in body and page.locator("[data-alias-custom]").count() >= 1)
        # Clear the alias through the page itself so the same-origin session/CSRF guard applies.
        page.evaluate(
            "ip => fetch('/api/ip-alias', {method: 'POST', headers: {'Content-Type': 'application/json'}, credentials: 'same-origin', body: JSON.stringify({ip, name: ''})}).then(r => r.status)",
            alias_ip,
        )
    else:
        check("terminals rename affordance present", False, "no [data-alias-edit] rendered")

    # 5) loadAudit enrichment: admin sessions + classified health events.
    # Workspace rows surface their source table in the 来源 column, so an
    # admin row renders as "admin · rest-api" under source 当前登录管理员.
    page.evaluate("location.search = '?section=loadAudit&surface=desktop'")
    page.wait_for_timeout(6000)
    text = page.inner_text("body")
    admins_rows = snapshot_json().get("overview", {}).get("admins") or []
    if admins_rows:
        check("loadAudit shows admin sessions table", "当前登录管理员" in text and str(admins_rows[0].get("via")) in text, f"admins={len(admins_rows)}")
    else:
        check("loadAudit admin table has rows or is structurally present", "当前登录管理员" in text, "admins empty in this profile")
    check("loadAudit shows health events table", "健康事件摘要" in text and "来源" in text)

    # 6) panel-network access info in the desktop topbar.
    page.evaluate("location.search = '?section=overview&surface=desktop'")
    page.wait_for_timeout(6000)
    access = page.locator("[data-panel-access-url]")
    check("topbar shows panel access url", access.count() == 1 and "面板地址" in (access.first.inner_text() or ""), access.first.inner_text() if access.count() else None)

    # restore stub state so later runs stay deterministic
    post_json(CHAOS, {"name": "baseline"})
    restore_ssh_state(original_ssh_state)

    check("zero pageerror across whole flow", not errors, errors[:3])
    browser.close()

print()
print("=== REACT E2E ===")
print("ALL PASS" if not failures else "FAILURES: " + ", ".join(failures))
sys.exit(1 if failures else 0)
