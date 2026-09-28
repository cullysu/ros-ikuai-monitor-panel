import types
import ipaddress
src = open("app.py", encoding="utf-8").read()
mod = types.ModuleType("appmod")
mod.__dict__["__name__"] = "appmod"
mod.__dict__["__file__"] = "app.py"
exec(compile(src, "app.py", "exec"), mod.__dict__)

assert mod.format_routeros_uptime("1w2d03:04:05") == "1周2天 03:04:05"
assert mod.format_routeros_uptime("03:04:05") == "03:04:05"
assert mod.format_routeros_uptime("2d05:00:00") == "2天 05:00:00"
assert mod.format_routeros_uptime("weird") == "weird"
assert mod.format_routeros_clock("sep/28/2026") == "2026-09-28"
assert mod.format_routeros_clock("garbage") == "garbage"
print("formatters OK")

class FakeResp:
    def __init__(self, code): self.status_code = code
class FakeExc(Exception):
    def __init__(self, msg, code=None):
        super().__init__(msg); self.response = FakeResp(code) if code else None
t = mod.compact_exception_text(FakeExc("401 Client Error: Unauthorized for url: http://192.168.3.1/rest/system/resource", 401))
assert t == "REST 返回 HTTP 401", t
t2 = mod.compact_exception_text(FakeExc("HTTPConnectionPool(host='r', port=80): Max retries exceeded with url: /rest/x (Caused by boom)"))
assert len(t2) <= 210
print("compact_exception_text OK:", t, "|", t2)

p = mod.dpapi_protect_secret("s3cret-密码")
u = mod.dpapi_unprotect_secret(p)
assert u == "s3cret-密码", u
assert mod.dpapi_unprotect_secret("plain-密码") == "plain-密码"
assert mod.dpapi_unprotect_secret("") is None
print("DPAPI roundtrip OK")

class C:
    extract_local_ip = mod.Collector.extract_local_ip
c = C()
local_networks = [ipaddress.ip_network("192.168.88.0/24")]
router_ips = {"192.168.88.1"}
conn = {"src-address": "192.168.88.2:43470", "reply-src-address": "93.184.216.34:443", "dst-address": "93.184.216.34:443", "reply-dst-address": "192.168.88.2:43470"}
loc, rem, key = c.extract_local_ip(conn, local_networks, router_ips)
assert (loc, key) == ("192.168.88.2", "src-address"), (loc, rem, key)
conn2 = {"src-address": "192.168.88.1:8291", "reply-src-address": "1.2.3.4:5000", "dst-address": "1.2.3.4:5000", "reply-dst-address": "192.168.88.1:8291"}
loc2, rem2, key2 = c.extract_local_ip(conn2, local_networks, router_ips)
assert loc2 is None, (loc2, rem2, key2)
print("extract_local_ip end-to-end OK")
print("ALL HELPER TESTS PASS")
