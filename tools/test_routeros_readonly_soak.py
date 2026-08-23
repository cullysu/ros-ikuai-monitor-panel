#!/usr/bin/env python3
"""Unit and backend-contract coverage for the RouterOS read-only soak harness."""

from __future__ import annotations

import argparse
import io
import importlib.util
import json
import os
import sys
import tempfile
import threading
import time
import unittest
from datetime import UTC, datetime, timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from unittest import mock
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from panel_backend.http_dispatcher import attach_readonly_evidence, create_panel_handler, resolve_build_commit


MODULE_PATH = Path(__file__).with_name("check-routeros-readonly-soak.py")
SPEC = importlib.util.spec_from_file_location("routeros_readonly_soak", MODULE_PATH)
assert SPEC and SPEC.loader
soak = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = soak
SPEC.loader.exec_module(soak)

COMMIT = "0123456789abcdef0123456789abcdef01234567"
OTHER_COMMIT = "fedcba9876543210fedcba9876543210fedcba98"
SECRET = "must-not-appear-in-report"


def timestamp(delta_seconds: int = 0) -> str:
    return (datetime.now(UTC) + timedelta(seconds=delta_seconds)).isoformat(timespec="seconds").replace("+00:00", "Z")


class TestHTTPServer(ThreadingHTTPServer):
    daemon_threads = True


class SoakHandler(BaseHTTPRequestHandler):
    scenario = "normal"
    methods: list[str] = []
    paths: list[str] = []
    secret = SECRET

    def do_GET(self) -> None:  # noqa: N802
        scenario = type(self).scenario
        type(self).methods.append(self.command)
        type(self).paths.append(self.path)
        if self.path == "/redirect-target":
            body = b"redirect-followed"
            self.send_response(200)
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if self.path not in {"/api/health", "/api/snapshot"}:
            self.send_response(404)
            self.end_headers()
            return
        if scenario == "redirect" and self.path == "/api/health":
            self.send_response(302)
            self.send_header("Location", "/redirect-target")
            self.send_header("Content-Length", "0")
            self.end_headers()
            return
        if scenario == "failure" and self.path == "/api/snapshot":
            self.send_response(503)
            self.send_header("Content-Length", "0")
            self.end_headers()
            return
        if scenario == "slow":
            time.sleep(0.3)

        authority_delta = -600 if scenario == "stale" else 600 if scenario == "future" else 0
        evidence = {
            "channel": "routeros-realtime-rest",
            "lastSuccessAt": timestamp(authority_delta),
            "lastFailureAt": timestamp(0) if scenario == "active_failure" else None,
            "failureActive": scenario == "active_failure",
        }
        body_object = {
            "status": "ok",
            "updatedAt": timestamp(0),
            "collectionEvidence": evidence,
            "secret": type(self).secret,
        }
        if scenario != "missing_commit":
            body_object["buildCommit"] = OTHER_COMMIT if scenario == "commit_mismatch" else COMMIT
        encoded = json.dumps(body_object).encode("utf-8")
        if scenario in {"oversized", "oversized_no_length"}:
            encoded = b"x" * (soak.MAX_RESPONSE_BODY_BYTES + 1)
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        if scenario != "oversized_no_length":
            self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        try:
            self.wfile.write(encoded)
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
            pass

    def log_message(self, format: str, *args: object) -> None:
        return


class RouterosReadonlySoakTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.server = TestHTTPServer(("127.0.0.1", 0), SoakHandler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base_url = f"http://127.0.0.1:{cls.server.server_port}"

    @classmethod
    def tearDownClass(cls) -> None:
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=2)

    def setUp(self) -> None:
        SoakHandler.scenario = "normal"
        SoakHandler.methods = []
        SoakHandler.paths = []
        SoakHandler.secret = SECRET

    def run_scenario(self, scenario: str, *, duration: float = 1.0, expected: str | None = COMMIT) -> tuple[int, dict[str, object], float]:
        SoakHandler.scenario = scenario
        with tempfile.TemporaryDirectory() as temporary_directory:
            output = Path(temporary_directory) / "report.json"
            arguments = [
                "--base-url",
                self.base_url,
                "--duration",
                str(duration),
                "--interval",
                "2",
                "--out",
                str(output),
            ]
            if expected is not None:
                arguments.extend(["--expected-commit", expected])
            started = time.monotonic()
            result = soak.run(arguments)
            elapsed = time.monotonic() - started
            return result, json.loads(output.read_text(encoding="utf-8")), elapsed

    def test_normal_panel_evidence_passes_and_stays_sanitized(self) -> None:
        result, report, _ = self.run_scenario("normal")
        serialized = json.dumps(report)
        self.assertEqual(result, 0)
        self.assertEqual(report["outcome"], "pass")
        self.assertEqual(SoakHandler.methods, ["GET", "GET"])
        self.assertEqual(SoakHandler.paths, ["/api/health", "/api/snapshot"])
        self.assertNotIn(SECRET, serialized)
        self.assertEqual(report["expectedCommit"], COMMIT)
        channels = report["samples"][0]["channels"]
        self.assertTrue(all(channel["freshness"] == "fresh" for channel in channels))
        self.assertTrue(all(channel["commitCheck"] == "match" for channel in channels))
        self.assertEqual([channel["buildCommit"] for channel in channels], [COMMIT, COMMIT])
        self.assertTrue(all(len(channel["summaryHash"]) == 64 for channel in channels))
        self.assertEqual(
            soak.verify_report(report, expected=COMMIT, min_duration_seconds=0.5, min_samples=1),
            [],
        )

    def test_http_failure_fails_closed(self) -> None:
        result, report, _ = self.run_scenario("failure")
        self.assertEqual(result, 1)
        self.assertEqual(report["samples"][0]["channels"][1]["outcome"], "http_error")

    def test_authoritative_stale_time_ignores_fresh_top_level_updated_at(self) -> None:
        result, report, _ = self.run_scenario("stale")
        self.assertEqual(result, 1)
        self.assertEqual(report["samples"][0]["channels"][0]["freshness"], "stale")

    def test_future_authoritative_time_fails_closed(self) -> None:
        result, report, _ = self.run_scenario("future")
        self.assertEqual(result, 1)
        self.assertEqual(report["samples"][0]["channels"][0]["freshness"], "future")

    def test_active_collection_failure_boundary_fails_even_when_success_time_is_fresh(self) -> None:
        result, report, _ = self.run_scenario("active_failure")
        self.assertEqual(result, 1)
        self.assertEqual(report["samples"][0]["channels"][0]["failureState"], "active")

    def test_expected_commit_mismatch_and_missing_commit_fail_both_channels(self) -> None:
        for scenario, expected_check in (("commit_mismatch", "mismatch"), ("missing_commit", "unavailable")):
            with self.subTest(scenario=scenario):
                result, report, _ = self.run_scenario(scenario)
                self.assertEqual(result, 1)
                self.assertEqual(
                    [channel["commitCheck"] for channel in report["samples"][0]["channels"]],
                    [expected_check, expected_check],
                )

    def test_redirect_is_rejected_without_following_location(self) -> None:
        result, report, _ = self.run_scenario("redirect")
        self.assertEqual(result, 1)
        self.assertEqual(report["samples"][0]["channels"][0]["outcome"], "redirect_rejected")
        self.assertNotIn("/redirect-target", SoakHandler.paths)

    def test_oversized_response_is_rejected_before_json_parsing(self) -> None:
        for scenario in ("oversized", "oversized_no_length"):
            with self.subTest(scenario=scenario), mock.patch.object(soak, "MAX_RESPONSE_BODY_BYTES", 512):
                result, report, _ = self.run_scenario(scenario)
                self.assertEqual(result, 1)
                self.assertEqual(report["samples"][0]["channels"][0]["outcome"], "body_too_large")

    def test_single_request_and_whole_soak_deadlines_are_bounded(self) -> None:
        SoakHandler.scenario = "slow"
        with mock.patch.object(soak, "HTTP_TIMEOUT_SECONDS", 0.05):
            started = time.monotonic()
            record, passed = soak.collect_channel(self.base_url, "health", COMMIT, time.monotonic() + 1)
            request_elapsed = time.monotonic() - started
        self.assertFalse(passed)
        self.assertEqual(record["outcome"], "request_timeout")
        self.assertLess(request_elapsed, 0.2)

        result, report, elapsed = self.run_scenario("slow", duration=0.06)
        self.assertEqual(result, 1)
        self.assertLess(elapsed, 0.4)
        self.assertEqual(report["samples"][0]["channels"][0]["outcome"], "soak_deadline")

    def test_base_url_rejects_credentials_non_http_ports_and_paths(self) -> None:
        invalid_values = (
            "ftp://panel.example",
            "https://user:password@panel.example",
            "http://panel.example:0",
            "http://panel.example:65536",
            "http://panel.example:not-a-port",
            "http://panel.example/arbitrary/path",
        )
        for value in invalid_values:
            with self.subTest(value=value), self.assertRaises(argparse.ArgumentTypeError):
                soak.parse_base_url(value)

    def test_expected_commit_requires_exactly_40_hex_characters(self) -> None:
        self.assertEqual(soak.expected_commit(COMMIT.upper()), COMMIT)
        for value in (COMMIT[:39], COMMIT + "0", "z" * 40):
            with self.subTest(value=value), self.assertRaises(argparse.ArgumentTypeError):
                soak.expected_commit(value)

    def test_duration_and_interval_reject_non_finite_values(self) -> None:
        for value in ("nan", "inf", "-inf", "0", "-1"):
            with self.subTest(value=value), self.assertRaises(argparse.ArgumentTypeError):
                soak.positive_number(value)

    def test_summary_hash_ignores_every_non_whitelisted_field(self) -> None:
        base = {"channel": "health", "status": "ok", "freshness": "fresh", "secret": "first"}
        changed_secret = {**base, "secret": "second", "token": "also-secret"}
        self.assertEqual(soak.safe_summary_hash(base), soak.safe_summary_hash(changed_secret))

    def test_report_verifier_cli_enforces_sha_duration_samples_channels_and_terminal_state(self) -> None:
        result, report, _ = self.run_scenario("normal")
        self.assertEqual(result, 0)
        with tempfile.TemporaryDirectory() as temporary_directory:
            report_path = Path(temporary_directory) / "soak.json"
            report_path.write_text(json.dumps(report), encoding="utf-8")
            verifier_arguments = [
                "--verify-report",
                str(report_path),
                "--expected-commit",
                COMMIT,
                "--min-duration",
                "0.5",
                "--min-samples",
                "1",
            ]
            self.assertEqual(soak.run(verifier_arguments), 0)

            stdin_arguments = [
                "--verify-report-stdin",
                "--expected-commit",
                COMMIT,
                "--min-duration",
                "0.5",
                "--min-samples",
                "1",
            ]
            frozen_report = json.dumps(report).encode("utf-8")
            with mock.patch.object(sys, "stdin", type("FrozenStdin", (), {"buffer": io.BytesIO(frozen_report)})()):
                self.assertEqual(soak.run(stdin_arguments), 0)

            tampered_age = json.loads(json.dumps(report))
            tampered_channel = tampered_age["samples"][0]["channels"][0]
            tampered_channel["ageSeconds"] = int(tampered_channel["ageSeconds"]) + 1
            tampered_channel["summaryHash"] = soak.safe_summary_hash(tampered_channel)
            self.assertIn(
                "sample_0_health_freshness_recalculation_failed",
                soak.verify_report(tampered_age, expected=COMMIT, min_duration_seconds=0.5, min_samples=1),
            )

            replayed = json.loads(json.dumps(report))
            replayed["startedAt"] = (datetime.now(UTC) - timedelta(hours=8, seconds=1)).isoformat().replace("+00:00", "Z")
            replayed["finishedAt"] = (datetime.now(UTC) - timedelta(hours=8)).isoformat().replace("+00:00", "Z")
            self.assertIn(
                "report_not_recent",
                soak.verify_report(replayed, expected=COMMIT, min_duration_seconds=0.5, min_samples=1),
            )

            invalid_report = json.loads(json.dumps(report))
            invalid_report["interrupted"] = True
            invalid_report["internalOutcome"] = "unexpected_failure"
            invalid_report["samples"][0]["channels"] = invalid_report["samples"][0]["channels"][:1]
            invalid_report["samples"][0]["channels"][0]["buildCommit"] = OTHER_COMMIT
            report_path.write_text(json.dumps(invalid_report), encoding="utf-8")
            self.assertEqual(soak.run(verifier_arguments), 1)

        policy_failures = soak.verify_report(
            report,
            expected=COMMIT,
            min_duration_seconds=2,
            min_samples=2,
        )
        self.assertIn("requested_duration_below_policy", policy_failures)
        self.assertIn("elapsed_duration_below_policy", policy_failures)
        self.assertIn("sample_count_below_policy", policy_failures)
        self.assertEqual(
            soak.verify_report(report, expected=COMMIT[:39], min_duration_seconds=1, min_samples=1),
            ["verification_expected_commit_invalid"],
        )


class DispatcherReadonlyEvidenceContractTest(unittest.TestCase):
    class Collector:
        def __init__(self) -> None:
            self.lock = threading.Lock()
            self.realtime_updated_at = timestamp(0)
            self.realtime_last_error_at = None
            self.realtime_error = None
            self.realtime_failures = {}
            self.state = {"status": "ok", "updatedAt": timestamp(0), "meta": {}}

        def get_state(self) -> dict[str, object]:
            return dict(self.state)

    class Runtime:
        PANEL_PORT = 28646
        PANEL_PROFILE = "routeros_only"
        PANEL_TARGET = "127.0.0.1"

        def __init__(self) -> None:
            self.collector = DispatcherReadonlyEvidenceContractTest.Collector()

        @staticmethod
        def panel_client_address_is_allowed(client_address, headers) -> bool:
            return True

        @staticmethod
        def panel_host_header_is_allowed(headers) -> bool:
            return True

        @staticmethod
        def panel_request_access_url(headers, fallback_port) -> str:
            return f"http://127.0.0.1:{fallback_port}"

        @staticmethod
        def panel_network_payload(**kwargs) -> dict[str, object]:
            return {"currentUrl": kwargs.get("request_url")}

        @staticmethod
        def public_router_config() -> dict[str, object]:
            return {"configured": True}

        @staticmethod
        def public_saved_router_logins() -> list[object]:
            return []

    def test_build_commit_resolution_is_exact_and_binds_both_payloads(self) -> None:
        runtime = self.Runtime()
        with mock.patch.dict(os.environ, {"ROS_PANEL_BUILD_COMMIT": COMMIT}):
            build_commit = resolve_build_commit(runtime)
        self.assertEqual(build_commit, COMMIT)
        state = {"status": "ok", "updatedAt": timestamp(0), "meta": {}}
        health = attach_readonly_evidence({"status": "ok"}, state, runtime, build_commit)
        snapshot = attach_readonly_evidence(state, state, runtime, build_commit)
        self.assertEqual(health["buildCommit"], COMMIT)
        self.assertEqual(snapshot["buildCommit"], COMMIT)
        self.assertEqual(health["collectionEvidence"], snapshot["collectionEvidence"])

    def test_dispatcher_exposes_failure_boundary_without_error_detail(self) -> None:
        runtime = self.Runtime()
        runtime.collector.realtime_error = SECRET
        runtime.collector.realtime_last_error_at = timestamp(0)
        payload = attach_readonly_evidence({"status": "error"}, {"status": "error", "meta": {}}, runtime, COMMIT)
        self.assertTrue(payload["collectionEvidence"]["failureActive"])
        self.assertNotIn(SECRET, json.dumps(payload))

    def test_real_health_and_snapshot_routes_expose_same_exact_commit_and_evidence(self) -> None:
        runtime = self.Runtime()
        with mock.patch.dict(os.environ, {"ROS_PANEL_BUILD_COMMIT": COMMIT}):
            handler = create_panel_handler(runtime)
        server = TestHTTPServer(("127.0.0.1", 0), handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            payloads = []
            for path in ("/api/health", "/api/snapshot"):
                with urlopen(f"http://127.0.0.1:{server.server_port}{path}", timeout=2) as response:
                    payloads.append(json.loads(response.read()))
        finally:
            server.shutdown()
            server.server_close()
            thread.join(timeout=2)
        self.assertEqual([payload["buildCommit"] for payload in payloads], [COMMIT, COMMIT])
        self.assertEqual(payloads[0]["collectionEvidence"], payloads[1]["collectionEvidence"])


if __name__ == "__main__":
    unittest.main()
