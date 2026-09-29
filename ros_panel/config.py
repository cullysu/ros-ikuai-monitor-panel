"""Panel bootstrap constants shared across app.py and ros_panel modules.

后端拆分批次 7：由 app.py 模块级引导段整体迁入（逐字保留）。
env 派生常量（ROS_MONITOR_*/ROS_PANEL_* 共享子集）与 profile/flag 派生链
集中在这里；collector.py 与 server.py 从本模块 import，app.py 重导出保持兼容。

导入顺序敏感（与原 app.py 一致）：
1. 本模块 import 的 ros_panel.panel_access / ros_panel.util 先完成各自的
   import 期 env 读取（env 文件此时还未加载）；
2. PANEL_ENV_FILE = load_panel_env() 把 env 文件合入 os.environ；
3. 之后的常量才读 os.environ。
"""

import os
import re
import sys
from pathlib import Path

from ros_panel.panel_access import (
    DEFAULT_PANEL_BIND,
    DEFAULT_PANEL_PORT,
    DEFAULT_PANEL_TARGET,
    normalize_panel_host,
    normalize_panel_port,
    resolve_panel_access_host,
    validate_panel_public_contract,
)
from ros_panel.util import env_value


def is_frozen_app():
    return bool(getattr(sys, "frozen", False))


def resolve_base_dir():
    if is_frozen_app():
        return Path(sys.executable).resolve().parent
    # ros_panel/config.py 位于包内一层；仓库根 = 再上一层（同 router_config.py 先例）。
    return Path(__file__).resolve().parent.parent


BASE_DIR = resolve_base_dir()
BUNDLE_DIR = Path(getattr(sys, "_MEIPASS", BASE_DIR)).resolve()


def resolve_runtime_path(value, base_dir=BASE_DIR):
    path = Path(value).expanduser()
    if not path.is_absolute():
        path = base_dir / path
    return path.resolve()


def load_env_file(path):
    try:
        content = path.read_text(encoding="utf-8-sig")
    except FileNotFoundError:
        return False
    except UnicodeDecodeError:
        fallback_encoding = "mbcs" if os.name == "nt" else "utf-8"
        content = path.read_text(encoding=fallback_encoding, errors="replace")

    for raw_line in content.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[7:].strip()
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()
        if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", key):
            continue
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
            value = value[1:-1]
        os.environ.setdefault(key, value)
    return True


def load_panel_env():
    configured = os.getenv("ROS_PANEL_ENV_FILE")
    env_path = resolve_runtime_path(configured) if configured else BASE_DIR / "routeros-panel.env"
    return env_path if load_env_file(env_path) else None


PANEL_ENV_FILE = load_panel_env()
PUBLIC_DIR = resolve_runtime_path(os.getenv("ROS_PANEL_PUBLIC_DIR", str(BUNDLE_DIR / "public")))
PANEL_PROFILE_RAW = env_value("ROS_PANEL_PROFILE", "routeros_only")
PANEL_BIND = normalize_panel_host(env_value("ROS_PANEL_BIND", DEFAULT_PANEL_BIND), "bind")
PANEL_PORT = normalize_panel_port(env_value("ROS_PANEL_PORT", str(DEFAULT_PANEL_PORT)))
PANEL_TARGET = resolve_panel_access_host(env_value("ROS_PANEL_TARGET_IP", DEFAULT_PANEL_TARGET))
PANEL_BIND, PANEL_TARGET = validate_panel_public_contract(PANEL_BIND, PANEL_TARGET, PANEL_PROFILE_RAW)


DNS_STATIC_PAGE_LIMIT = int(os.getenv("ROS_MONITOR_DNS_STATIC_PAGE_LIMIT", "100"))
DNS_STATIC_MAX_PAGE_LIMIT = int(os.getenv("ROS_MONITOR_DNS_STATIC_MAX_PAGE_LIMIT", "300"))


def env_bool(name, default=False):
    raw = os.getenv(name)
    if raw is None:
        return default
    text = str(raw).strip().lower()
    if text in {"1", "true", "yes", "on", "enabled"}:
        return True
    if text in {"0", "false", "no", "off", "disabled"}:
        return False
    return default


PANEL_OPEN_BROWSER = env_bool("ROS_PANEL_OPEN_BROWSER", default=is_frozen_app())


def normalize_panel_profile(value):
    text = re.sub(r"[^a-z0-9]+", "_", str(value or "").strip().lower()).strip("_")
    return text


PANEL_PROFILE_ALIASES = {
    "public": "routeros_only",
    "routeros_public": "routeros_only",
    "routeros_only": "routeros_only",
    "public_routeros": "routeros_only",
    "routeros_public_preview": "routeros_only",
    "private": "private_ops",
    "private_ops": "private_ops",
}


def resolve_panel_profile(value):
    normalized = normalize_panel_profile(value)
    canonical = PANEL_PROFILE_ALIASES.get(normalized)
    if not canonical:
        allowed = ", ".join(sorted(PANEL_PROFILE_ALIASES))
        raise ValueError(f"Unknown ROS_PANEL_PROFILE {value!r}; allowed values: {allowed}")
    return canonical


PANEL_PROFILE = resolve_panel_profile(PANEL_PROFILE_RAW)


def is_public_routeros_profile(profile=None):
    normalized = normalize_panel_profile(profile if profile is not None else PANEL_PROFILE)
    return PANEL_PROFILE_ALIASES.get(normalized, normalized) == "routeros_only"


PUBLIC_ROUTEROS_PROFILE = is_public_routeros_profile(PANEL_PROFILE)
READONLY_DIAGNOSTICS_ENABLED = not PUBLIC_ROUTEROS_PROFILE

# Public RouterOS-only profile is intended for localhost-only public trials.
# Keep any mutating endpoints opt-in (and default-off) for that profile.
IP_ALIAS_WRITE_ENABLED = env_bool("ROS_PANEL_IP_ALIAS_WRITE_ENABLED", default=not PUBLIC_ROUTEROS_PROFILE)

# Active admin sessions can be sensitive; default-off for public profile.
EXPOSE_ADMIN_SESSIONS = env_bool("ROS_PANEL_EXPOSE_ADMIN_SESSIONS", default=not PUBLIC_ROUTEROS_PROFILE)
