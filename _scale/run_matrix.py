"""Run the real panel (main d8f0ead) against fake RouterOS with N WAN lines, screenshot every section.

Usage: python run_matrix.py 1 2 3 5 7 ...
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
OUT = ROOT / "_scale" / "out"
PY = sys.executable
CHROME = r"C:\Users\cully\AppData\Local\ms-playwright\chromium-1223\chrome-win64\chrome.exe"

SECTIONS = ["overview", "interfaces", "terminals", "dhcp", "dns4", "dns6", "routes", "lineStatus", "balance",
            "trafficLoad", "loadAudit", "connections", "security", "arp", "trafficAudit", "logs", "serviceLogs"]
VIEWPORTS = {"desktop": (1920, 1080), "laptop": (1366, 768), "mobile": (390, 844)}

PROBE_JS = r"""
() => {
  const vw = document.documentElement.clientWidth;
  const res = {pageScrollW: document.documentElement.scrollWidth, vw, docH: document.documentElement.scrollHeight,
               hOverflow: [], clipped: [], tinyCharts: [], overlaps: 0};
  const vis = el => { const s = getComputedStyle(el); const r = el.getBoundingClientRect();
    return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0; };
  const label = el => (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0,2).join('.') : '') ;
  const all = Array.from(document.querySelectorAll('main *, .main *, #app *, body *')).slice(0, 20000);
  for (const el of all) {
    if (!vis(el)) continue;
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    if (r.right > vw + 2 && s.position !== 'fixed' && res.hOverflow.length < 12) {
      res.hOverflow.push({el: el.tagName + label(el), right: Math.round(r.right), text: (el.innerText||'').trim().slice(0,40)});
    }
    if (el.children.length === 0 && (el.innerText||'').trim() && (s.overflow === 'hidden' || s.textOverflow === 'ellipsis' || s.overflowX === 'hidden')
        && el.scrollWidth > el.clientWidth + 2 && res.clipped.length < 30) {
      res.clipped.push({el: el.tagName + label(el), text: el.innerText.trim().slice(0,40), sw: el.scrollWidth, cw: el.clientWidth});
    }
    if ((el.tagName === 'svg' || el.tagName === 'CANVAS') && r.width > 0 && (r.height < 14 || r.width < 24) && r.width*r.height > 0 && res.tinyCharts.length < 20) {
      res.tinyCharts.push({el: el.tagName + label(el), w: Math.round(r.width), h: Math.round(r.height)});
    }
  }
  const text = document.body.innerText;
  res.nanCount = (text.match(/NaN|undefined|Infinity|\[object Object\]/g) || []).length;
  res.samples = (text.match(/.{0,20}(NaN|undefined|Infinity).{0,20}/g) || []).slice(0,5);
  return res;
}
"""


def wait_http(url, timeout=40):
    end = time.time() + timeout
    while time.time() < end:
        try:
            with urllib.request.urlopen(url, timeout=3) as r:
                return json.loads(r.read())
        except Exception:
            time.sleep(0.5)
    raise RuntimeError(f"timeout {url}")


def run_case(n, pw):
    rest_port = 18000 + n
    panel_port = 29000 + n
    case_dir = OUT / f"wan{n:03d}"
    case_dir.mkdir(parents=True, exist_ok=True)
    fake = subprocess.Popen([PY, str(ROOT / "_scale" / "fake_ros.py"), str(rest_port), str(n)],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    env = dict(os.environ, ROS_MONITOR_ROUTER_REST_PORT=str(rest_port), ROS_MONITOR_ROUTER_HOST="127.0.0.1",
               ROS_MONITOR_ROUTER_USER="admin", ROS_MONITOR_ROUTER_PASSWORD="x", ROS_MONITOR_ROUTER_SSH_PORT="1",
               ROS_PANEL_PORT=str(panel_port), ROS_PANEL_OPEN_BROWSER="0",
               ROS_PANEL_ENV_FILE=str(case_dir / "none.env"),
               ROS_PANEL_ROUTER_LOGIN_STORE_FILE=str(case_dir / "logins.json"),
               ROS_PANEL_IP_ALIAS_FILE=str(case_dir / "alias.json"))
    panel = subprocess.Popen([PY, str(ROOT / "app.py")], cwd=str(ROOT), env=env,
                             stdout=open(case_dir / "panel.log", "w"), stderr=subprocess.STDOUT)
    report = {"wan": n, "views": {}}
    try:
        base = f"http://127.0.0.1:{panel_port}"
        deadline = time.time() + 60
        snap = {}
        while time.time() < deadline:
            snap = wait_http(base + "/api/snapshot")
            wans = snap.get("wan") or []
            hist_ok = wans and sum(1 for w in wans if len((w.get("history") or {}).get("down") or []) >= 6) >= 1
            if snap.get("status") == "ok" and len(wans) == n and hist_ok:
                break
            time.sleep(1)
        report["snapshotWan"] = len(snap.get("wan") or [])
        report["snapshotStatus"] = snap.get("status")
        browser = pw.chromium.launch(executable_path=CHROME, headless=True)
        for vname, (w, h) in VIEWPORTS.items():
            ctx = browser.new_context(viewport={"width": w, "height": h}, device_scale_factor=1,
                                      is_mobile=(vname == "mobile"), has_touch=(vname == "mobile"))
            page = ctx.new_page()
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)[:200]))
            page.goto(base + "/#overview", wait_until="domcontentloaded")
            page.wait_for_timeout(4000)
            views = {}
            for sec in SECTIONS:
                page.evaluate(f"location.hash = '{sec}'")
                page.wait_for_timeout(1300)
                probe = page.evaluate(PROBE_JS)
                shot = case_dir / f"{vname}-{sec}.png"
                page.screenshot(path=str(shot), full_page=True)
                probe["shot"] = shot.name
                views[sec] = probe
            views["_pageErrors"] = errors[:10]
            report["views"][vname] = views
            ctx.close()
        browser.close()
    finally:
        panel.kill()
        fake.kill()
    (case_dir / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")
    return report


def main():
    counts = [int(x) for x in sys.argv[1:]]
    with sync_playwright() as pw:
        for n in counts:
            t0 = time.time()
            r = run_case(n, pw)
            d = r["views"].get("desktop", {}).get("overview", {})
            m = r["views"].get("mobile", {}).get("overview", {})
            print(f"wan={n:3d} snap={r['snapshotWan']} {r['snapshotStatus']} "
                  f"desk.docH={d.get('docH')} mob.docH={m.get('docH')} mob.scrollW={m.get('pageScrollW')} "
                  f"({time.time()-t0:.0f}s)", flush=True)


if __name__ == "__main__":
    main()
