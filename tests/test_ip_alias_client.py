"""Unit tests for the React desktop IP-alias request contract.

POST /api/ip-alias is the panel's only write endpoint; the React desktop must
send exactly {ip, name} (same semantics as the vanilla renderEditableNameCell
flow) and treat success/failure responses the same way. The pure contract lives
in src/panel-framework/runtime/ipAliasClient.ts, which Node executes directly
(native type stripping) — these tests assert the request body, headers and
success/failure handling against the real source, not a reimplementation.
"""
import json
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CLIENT = ROOT / "src" / "panel-framework" / "runtime" / "ipAliasClient.ts"


def run_client(script: str) -> object:
    """Evaluate a snippet against ipAliasClient.ts and return JSON.stringify output."""
    quoted = json.dumps(script)
    # Capture bytes and decode explicitly: text=True would use the platform
    # locale (cp1252 on the Windows CI runner) and choke on UTF-8 client
    # output, which silently empties stdout.
    result = subprocess.run(
        ["node", "--input-type=module", "-e", f"import * as alias from '{CLIENT.as_uri()}';\nconst run = (script) => eval(script);\nconsole.log(JSON.stringify(run({quoted})));"],
        capture_output=True,
        timeout=60,
    )
    stdout = result.stdout.decode("utf-8", errors="replace") if result.stdout else ""
    stderr = result.stderr.decode("utf-8", errors="replace") if result.stderr else ""
    lines = [line for line in stdout.splitlines() if line.strip()]
    if not lines:
        raise AssertionError(
            f"client snippet produced no stdout (exit {result.returncode}); stderr tail: {stderr[-400:]}"
        )
    return json.loads(lines[-1])


class IpAliasRequestBodyTest(unittest.TestCase):
    def test_request_body_is_exactly_ip_and_name(self):
        body = run_client("alias.buildIpAliasRequestBody(' 192.168.1.2 ', ' My PC ')")
        self.assertEqual(body, {"ip": "192.168.1.2", "name": "My PC"})

    def test_empty_name_is_preserved_as_clear_marker(self):
        body = run_client("alias.buildIpAliasRequestBody('192.168.1.2', '  ')")
        self.assertEqual(body, {"ip": "192.168.1.2", "name": ""})

    def test_whitespace_in_name_is_collapsed_and_bounded(self):
        body = run_client("alias.buildIpAliasRequestBody('192.168.1.2', 'a\\t\\nb ' + 'x'.repeat(60))")
        self.assertEqual(body["name"], ("a b " + "x" * 60)[:48])
        self.assertLessEqual(len(body["name"]), 48)

    def test_empty_ip_is_rejected(self):
        self.assertIsNone(run_client("alias.buildIpAliasRequestBody('  ', 'name')"))
        self.assertIsNone(run_client("alias.buildIpAliasRequestBody('', '')"))

    def test_request_carries_post_path_json_body_and_csrf_header(self):
        request = run_client("alias.buildIpAliasRequest('192.168.1.2', 'nas', 'csrf-token')")
        self.assertEqual(request["path"], "/api/ip-alias")
        self.assertEqual(request["method"], "POST")
        self.assertEqual(json.loads(request["body"]), {"ip": "192.168.1.2", "name": "nas"})
        self.assertEqual(request["headers"]["X-CSRF-Token"], "csrf-token")
        self.assertEqual(request["headers"]["Content-Type"], "application/json")

    def test_request_without_csrf_omits_header(self):
        request = run_client("alias.buildIpAliasRequest('192.168.1.2', 'nas')")
        self.assertNotIn("X-CSRF-Token", request["headers"])


class IpAliasResponseTest(unittest.TestCase):
    def test_success_payload_confirms_ip_and_custom_name(self):
        parsed = run_client("alias.parseIpAliasResponse({ ok: true, ip: '192.168.1.2', customName: 'nas' }, true)")
        self.assertEqual(parsed, {"ok": True, "ip": "192.168.1.2", "customName": "nas", "error": ""})

    def test_ok_false_payload_surfaces_server_error_text(self):
        parsed = run_client("alias.parseIpAliasResponse({ ok: false, error: 'ip alias write disabled', code: 'write_disabled' }, false)")
        self.assertFalse(parsed["ok"])
        self.assertEqual(parsed["error"], "ip alias write disabled")
        self.assertEqual(parsed["customName"], "")

    def test_http_error_without_body_still_fails(self):
        parsed = run_client("alias.parseIpAliasResponse(null, false)")
        self.assertFalse(parsed["ok"])
        self.assertTrue(parsed["error"])

    def test_contract_violating_success_payload_is_rejected(self):
        parsed = run_client("alias.parseIpAliasResponse({ ok: 'yes' }, true)")
        self.assertFalse(parsed["ok"])
        self.assertEqual(parsed["customName"], "")


if __name__ == "__main__":
    unittest.main()
