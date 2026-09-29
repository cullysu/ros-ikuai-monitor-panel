"""Pinpoint which rendered element executes injected router data."""
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
PY = sys.executable
CHROME = r"C:\Users\cully\AppData\Local\ms-playwright\chromium-1223\chrome-win64\chrome.exe"
REST, PANEL = 18600, 29600

INIT = r"""
window.__hits = [];
window.__xss = 0;
Object.defineProperty(window, '__xss', {
  get() { return window.__hits.length; },
  set(v) {
    const el = document.querySelector('img[src="x"]:not([data-seen]), [onmouseover]:not([data-seen])');
    let info = 'unknown';
    if (el) { el.setAttribute('data-seen', '1');
      let p = el, path = [];
      for (let i = 0; p && i < 6; i++, p = p.parentElement) path.push(p.tagName + (p.className && typeof p.className === 'string' ? '.' + p.className.split(' ')[0] : ''));
      info = path.join(' < ') + ' :: ' + (el.parentElement ? el.parentElement.outerHTML.slice(0, 260) : '');
    }
    window.__hits.push({hash: location.hash, info});
  }
});
"""


def main():
    fake = subprocess.Popen([PY, str(ROOT / "_scale" / "chaos_ros.py"), str(REST)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1)
    urllib.request.urlopen(urllib.request.Request(f"http://127.0.0.1:{REST}/_scenario", method="POST",
                                                  data=b'{"name":"xss_names"}', headers={"Content-Type": "application/json"}))
    env = dict(os.environ, ROS_MONITOR_ROUTER_REST_PORT=str(REST), ROS_MONITOR_ROUTER_HOST="127.0.0.1", ROS_MONITOR_ROUTER_USER="admin",
               ROS_MONITOR_ROUTER_PASSWORD="x", ROS_MONITOR_ROUTER_SSH_PORT="1", ROS_PANEL_PORT=str(PANEL), ROS_PANEL_OPEN_BROWSER="0",
               ROS_PANEL_ENV_FILE=str(OUT / "none.env"), ROS_PANEL_ROUTER_LOGIN_STORE_FILE=str(OUT / "l2.json"),
               ROS_PANEL_IP_ALIAS_FILE=str(OUT / "a2.json"))
    panel = subprocess.Popen([PY, "-X", "utf8", str(ROOT / "app.py")], cwd=str(ROOT), env=env,
                             stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        time.sleep(12)
        with sync_playwright() as pw:
            b = pw.chromium.launch(executable_path=CHROME, headless=True)
            page = b.new_page(viewport={"width": 1440, "height": 900})
            page.add_init_script(INIT)
            page.goto(f"http://127.0.0.1:{PANEL}/#overview")
            page.wait_for_timeout(3500)
            for sec in ["overview", "interfaces", "terminals", "dhcp", "dns4", "dns6", "routes", "lineStatus", "balance",
                        "trafficLoad", "loadAudit", "connections", "security", "arp", "trafficAudit", "logs", "serviceLogs"]:
                page.evaluate(f"location.hash='{sec}'")
                page.wait_for_timeout(1200)
                page.mouse.move(700, 450)
            hits = page.evaluate("window.__hits")
            raw_imgs = page.evaluate("""() => Array.from(document.querySelectorAll('img[src="x"],[onmouseover],[onerror]')).map(e => e.outerHTML.slice(0,200))""")
            b.close()
        print(json.dumps({"hits": hits, "liveInjectedNodes": raw_imgs}, ensure_ascii=False, indent=1))
    finally:
        panel.kill()
        fake.kill()


if __name__ == "__main__":
    main()
