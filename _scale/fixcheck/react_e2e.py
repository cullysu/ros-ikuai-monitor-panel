"""React desktop E2E vs live vanilla backend (backend already configured)."""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:28997/index.html?surface=desktop"
CHROME = str(Path.home() / "AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe")
HERE = Path(__file__).resolve().parent
failures = []


def check(name, ok, detail=""):
    print(("PASS " if ok else "FAIL ") + name + ((" | " + str(detail)[:180]) if detail else ""))
    if not ok:
        failures.append(name)


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

    check("zero pageerror across whole flow", not errors, errors[:3])
    browser.close()

print()
print("=== REACT E2E ===")
print("ALL PASS" if not failures else "FAILURES: " + ", ".join(failures))
sys.exit(1 if failures else 0)
