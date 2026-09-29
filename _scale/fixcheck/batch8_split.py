"""Batch 8: move ReusableThreadingHTTPServer / Handler / main() to ros_panel/server.py.

Mechanical line-range extraction; Handler class body stays byte-identical and
resolves the `collector` singleton via a module-level injected global.
Run from repo root:  python _scale/fixcheck/batch8_split.py
"""
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
app_path = ROOT / "app.py"
lines = app_path.read_text(encoding="utf-8").splitlines(keepends=True)


def block(a, b):
    return "".join(lines[a - 1 : b])


expect = {
    264: ")\n",
    267: "class ReusableThreadingHTTPServer(ThreadingHTTPServer):\n",
    269: "    request_queue_size = 128\n",
    272: "def detect_panel_lan_ip():\n",
    294: '    return "127.0.0.1"\n',
    297: "# panel_access 的守卫/会话函数在调用时按 panel_access 模块全局读取这些 app 引导值\n",
    305: "panel_access.PUBLIC_ROUTEROS_PROFILE = PUBLIC_ROUTEROS_PROFILE\n",
    308: "restore_last_saved_router_login()\n",
    309: "collector = Collector()\n",
    312: "class Handler(BaseHTTPRequestHandler):\n",
    716: "            self.end_headers()\n",
    719: "def main():\n",
    733: "        server.server_close()\n",
    736: 'if __name__ == "__main__":\n',
    737: "    main()\n",
}
for ln, text in expect.items():
    actual = lines[ln - 1]
    assert actual == text, f"line {ln} mismatch:\n  expect: {text!r}\n  actual: {actual!r}"
print("boundary checks OK")


def join_blocks(blocks):
    return "\n\n\n".join(b.rstrip("\n") for b in blocks) + "\n"


# --- ros_panel/server.py ----------------------------------------------------
server_header = '''"""HTTP server: ReusableThreadingHTTPServer / Handler / main（后端拆分批次 8 自 app.py 逐字迁入）。

Handler 类体零改动。Handler/原 app.py 模块级名字 `collector` 单例通过
configure() 注入（app.py 在 import 期构造 Collector 后回填），以解
app -> collector -> server 的循环依赖。
"""'''
server_imports = '''import json
import mimetypes
import sys
import threading
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, unquote, urlparse

from ros_panel.config import (
    DNS_STATIC_MAX_PAGE_LIMIT,
    DNS_STATIC_PAGE_LIMIT,
    IP_ALIAS_WRITE_ENABLED,
    PANEL_BIND,
    PANEL_ENV_FILE,
    PANEL_OPEN_BROWSER,
    PANEL_PORT,
    PANEL_PROFILE,
    PANEL_TARGET,
    PUBLIC_DIR,
)
from ros_panel.panel_access import (
    PANEL_CSRF_COOKIE,
    PANEL_SESSION_COOKIE,
    build_panel_cookie,
    create_panel_session,
    csrf_token_matches,
    first_header_value,
    get_panel_session,
    normalize_panel_host,
    normalize_panel_port,
    panel_access_url,
    panel_client_address_is_allowed,
    panel_host_header_is_allowed,
    panel_network_payload,
    panel_origin_is_allowed,
    panel_request_access_url,
    parse_request_cookies,
    write_panel_network_env,
)
from ros_panel.router_config import (
    clear_router_config,
    find_saved_router_login,
    forget_router_login,
    public_router_config,
    public_saved_router_logins,
    remember_router_login,
    set_router_config,
    test_router_credentials,
)
from ros_panel.util import to_bool, to_int
'''

collector_injection = '''# app.py 在 import 期构造 Collector 单例后调用 configure() 注入；
# Handler/main 的方法体按模块全局 `collector` 在请求期读取（类体零改动）。
collector = None


def configure(collector_instance):
    global collector
    collector = collector_instance
'''

server_blocks = [
    block(267, 269),    # ReusableThreadingHTTPServer
    block(312, 716),    # class Handler（逐字）
    block(719, 733),    # def main()
]
server_src = (
    server_header
    + "\n\n"
    + server_imports
    + "\n\n"
    + collector_injection
    + "\n\n"
    + join_blocks(server_blocks)
)
(ROOT / "ros_panel" / "server.py").write_text(server_src, encoding="utf-8")

# --- new app.py -------------------------------------------------------------
server_import_for_app = '''# Handler/HTTP 入口在 ros_panel/server.py（批 8 迁出）；
# collector 单例注入见下方 configure() 调用。
from ros_panel.server import (
    Handler,
    ReusableThreadingHTTPServer,
    configure,
    main,
)'''

configure_call = '''# server 模块的 Handler 按其模块全局 `collector` 在请求期读取；
# 单例在本模块 import 期构造后立即注入（循环依赖解耦）。
configure(collector)'''

app_blocks = [
    "".join(lines[0:264]),      # 1-264: 全部 import（含 config/collector 重导出）
    server_import_for_app,
    block(272, 294),            # detect_panel_lan_ip
    block(297, 305),            # panel_access 镜像回填
    block(308, 309),            # restore_last_saved_router_login() / collector = Collector()
    configure_call,
    block(736, 737),            # if __name__ == "__main__": main()
]
app_src = "\n\n\n".join(b.rstrip("\n") for b in app_blocks) + "\n"
app_path.write_text(app_src, encoding="utf-8")
print("batch8 files written")
