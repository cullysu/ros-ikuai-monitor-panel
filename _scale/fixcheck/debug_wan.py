import json, time, urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE = "http://127.0.0.1:28997/"
CHROME = str(Path.home() / "AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe")
def wait_ok(t=40):
    t0=time.time()
    while time.time()-t0<t:
        try:
            d=json.loads(urllib.request.urlopen(BASE+"api/snapshot",timeout=5).read())
            if d.get("status")=="ok": return d
        except Exception: pass
        time.sleep(2)
    raise RuntimeError
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME, headless=True)
    page = b.new_page(viewport={"width":1440,"height":960})
    errs=[]
    page.on("pageerror", lambda e: errs.append(str(e)))
    d = wait_ok()
    print("pppoe:", len(d.get("pppoe") or []), "wan:", len(d.get("wan") or []))
    page.goto(BASE, wait_until="domcontentloaded", timeout=30000)
    page.wait_for_timeout(1500)
    page.evaluate("location.hash = '#lineStatus'")
    page.wait_for_timeout(4000)
    print("lineStatus errors:", errs[:2])
    print("fold:", page.query_selector(".ik-fold-more") is not None)
    print("record-cards total:", len(page.query_selector_all(".record-card")))
    print("section title:", page.evaluate("document.querySelector('.section-title')?.textContent"))
    tabs = page.evaluate("Array.from(document.querySelectorAll('.tabs button, .subtabs button, [role=tab]')).map(b=>b.textContent.trim())")
    print("tabs:", tabs[:8])
    errs.clear()
    page.evaluate("location.hash = '#overview'")
    page.wait_for_timeout(4000)
    print("overview errors:", errs[:2])
    body = page.inner_text("body")
    print("hint present:", "条线路未计入" in body)
    print("has 未计入 anywhere:", "未计入" in body)
    idx = body.find("未计入")
    print("ctx:", body[max(0,idx-60):idx+30].replace("\n"," ") if idx>=0 else "N/A")
    b.close()
