"""React desktop shell smoke: /index.react.html must mount #app with zero pageerror.

Phase: feat/desktop-react-migration (React source migrated, vanilla index untouched).
No login state expected -> records whatever the React app renders (login/connection page).
"""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:28997/"
CHROME = str(Path.home() / "AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe")
SSHOT = Path(__file__).resolve().parent / "react_smoke.png"

failures = []

def check(name, ok, detail=""):
    print(("PASS " if ok else "FAIL ") + name + ((" | " + str(detail)[:200]) if detail else ""))
    if not ok:
        failures.append(name)

def observe(page, url):
    """Load url, wait 5s, return pageerror list + mount/render info."""
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(url, wait_until="domcontentloaded", timeout=30000)
    page.wait_for_timeout(5000)
    info = page.evaluate(
        """() => {
            const app = document.querySelector('#app');
            const texts = [];
            for (const sel of ['h1','h2','h3','[class*=title]','[class*=brand]','button','input']) {
                const el = document.querySelector(sel);
                if (el && el.textContent && el.textContent.trim()) texts.push(sel + '=' + el.textContent.trim().slice(0, 60));
            }
            return {
                appChildren: app ? app.children.length : -1,
                appChars: app ? (app.textContent || '').trim().length : -1,
                surface: document.documentElement.dataset.panelSurface || null,
                locationSearch: location.search,
                title: document.title,
                samples: texts.slice(0, 8),
            };
        }"""
    )
    return errors, info

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=CHROME, headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})

    # Natural load: surface picked by the loader heuristic. This Playwright
    # chromium build reports navigator.maxTouchPoints=10, so mobile wins here.
    errors, info = observe(page, BASE + "index.react.html")
    print("== natural load ==")
    check("zero_pageerror", len(errors) == 0, "; ".join(errors[:3]))
    check("app_mounted", info["appChildren"] > 0, f"children={info['appChildren']} chars={info['appChars']}")
    print("INFO surface=" + str(info["surface"]))
    print("INFO location.search=" + repr(info["locationSearch"]))
    print("INFO document.title=" + repr(info["title"]))
    for line in info["samples"]:
        print("INFO visible " + line)
    page.screenshot(path=str(Path(__file__).resolve().parent / "react_smoke_mobile.png"), full_page=False)

    # Explicit desktop surface: the migration target for this phase.
    page2 = browser.new_page(viewport={"width": 1440, "height": 900})
    errors2, info2 = observe(page2, BASE + "index.react.html?surface=desktop")
    print("== desktop surface (?surface=desktop) ==")
    check("desktop_zero_pageerror", len(errors2) == 0, "; ".join(errors2[:3]))
    check("desktop_app_mounted", info2["appChildren"] > 0, f"children={info2['appChildren']} chars={info2['appChars']}")
    check("desktop_surface_selected", info2["surface"] == "desktop", f"surface={info2['surface']}")
    print("INFO location.search=" + repr(info2["locationSearch"]))
    print("INFO document.title=" + repr(info2["title"]))
    for line in info2["samples"]:
        print("INFO visible " + line)
    page2.screenshot(path=str(SSHOT), full_page=False)
    print("INFO screenshot=" + str(SSHOT))
    browser.close()

print("RESULT " + ("OK" if not failures else "FAILED: " + ", ".join(failures)))
sys.exit(0 if not failures else 1)
