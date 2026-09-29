"""send_json gzip negotiation: compressed when offered and large, plain otherwise."""
import gzip
import json
import unittest


class SendJsonGzipTest(unittest.TestCase):
    def _handler(self, accept_encoding, payload):
        import types
        src = open("ros_panel/server.py", encoding="utf-8").read()
        module = types.ModuleType("server_under_test")
        module.__dict__["__name__"] = "server_under_test"
        module.__dict__["__file__"] = "ros_panel/server.py"
        exec(compile(src, "ros_panel/server.py", "exec"), module.__dict__)

        import json as _json
        sent = {}

        class FakeHandler(module.Handler.__bases__[0]):  # BaseHTTPRequestHandler
            headers = {"Accept-Encoding": accept_encoding}
            def send_response(self, status):
                sent["status"] = status
            def send_header(self, name, value):
                sent[name] = value
            def end_headers(self):
                pass
            def consume_cookie_headers(self):
                return []
            def write(self, data):
                sent["body"] = data

        # wfile is an attribute on the instance; bind ours
        fake = FakeHandler.__new__(FakeHandler)
        fake.wfile = type("W", (), {"write": lambda self, data: sent.__setitem__("body", data)})()
        fake.headers = type("H", (), {"get": staticmethod(lambda name, default="": dict({"Accept-Encoding": accept_encoding}).get(name, default))})()
        module.Handler.send_json(fake, payload)
        return sent

    def test_large_body_gzipped_when_client_accepts(self):
        payload = {"status": "ok", "rows": [{"a": i} for i in range(200)]}
        sent = self._handler("gzip, deflate, br", payload)
        self.assertEqual(sent.get("Content-Encoding"), "gzip")
        self.assertLess(len(sent["body"]), len(gzip.decompress(sent["body"])))
        self.assertEqual(json.loads(gzip.decompress(sent["body"])), payload)

    def test_small_body_stays_plain(self):
        sent = self._handler("gzip", {"ok": True})
        self.assertNotIn("Content-Encoding", sent)
        self.assertEqual(json.loads(sent["body"]), {"ok": True})

    def test_no_gzip_without_accept_encoding(self):
        payload = {"rows": [{"a": i} for i in range(200)]}
        sent = self._handler("identity", payload)
        self.assertNotIn("Content-Encoding", sent)
        self.assertEqual(json.loads(sent["body"]), payload)


if __name__ == "__main__":
    unittest.main()
