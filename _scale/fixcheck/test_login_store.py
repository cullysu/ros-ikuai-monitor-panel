"""M11: router login store DPAPI round-trip on an isolated file."""
import os, types, json, tempfile
os.environ["ROS_PANEL_ROUTER_LOGIN_STORE_FILE"] = os.path.join(tempfile.gettempdir(), "ros-panel-login-store-test.json")
if os.path.exists(os.environ["ROS_PANEL_ROUTER_LOGIN_STORE_FILE"]):
    os.remove(os.environ["ROS_PANEL_ROUTER_LOGIN_STORE_FILE"])

src = open("app.py", encoding="utf-8").read()
mod = types.ModuleType("appmod"); mod.__dict__["__name__"] = "appmod"; mod.__dict__["__file__"] = "app.py"
exec(compile(src, "app.py", "exec"), mod.__dict__)

entry = {"id": "t1", "host": "192.168.3.1", "user": "ros-panel-readonly", "password": "秘密-P@ss", "sshPort": 22,
         "label": "test", "source": "saved", "createdAt": "2026-09-28T00:00:00", "updatedAt": "2026-09-28T00:00:00"}

with mod.ROUTER_LOGIN_STORE_LOCK:
    mod.persist_router_login_store_unlocked([entry])
    loaded = mod.load_router_login_store_unlocked()

raw = json.loads(open(os.environ["ROS_PANEL_ROUTER_LOGIN_STORE_FILE"], encoding="utf-8").read())
stored_pw = raw["entries"][0]["password"]
assert stored_pw.startswith("dpapi:v1:"), stored_pw[:24]
assert "秘密" not in stored_pw
assert loaded[0]["password"] == "秘密-P@ss", loaded[0]["password"]
assert raw.get("passwordProtection") == "dpapi"

# legacy plaintext entry still loads unchanged
raw2 = dict(raw); raw2["entries"] = [dict(raw["entries"][0], password="legacy-plain")]
open(os.environ["ROS_PANEL_ROUTER_LOGIN_STORE_FILE"], "w", encoding="utf-8").write(json.dumps(raw2))
with mod.ROUTER_LOGIN_STORE_LOCK:
    loaded2 = mod.load_router_login_store_unlocked()
assert loaded2[0]["password"] == "legacy-plain", loaded2[0]["password"]

# placeholder sentinel never encrypted
with mod.ROUTER_LOGIN_STORE_LOCK:
    mod.persist_router_login_store_unlocked([dict(entry, password="changeme")])
raw3 = json.loads(open(os.environ["ROS_PANEL_ROUTER_LOGIN_STORE_FILE"], encoding="utf-8").read())
assert raw3["entries"][0]["password"] == "changeme", raw3["entries"][0]["password"][:24]

os.remove(os.environ["ROS_PANEL_ROUTER_LOGIN_STORE_FILE"])
print("M11 OK: dpapi at rest, plaintext legacy read, placeholder untouched, round-trip preserved")
