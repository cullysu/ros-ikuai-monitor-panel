#!/usr/bin/env python3
"""Bounded local Docker smoke test for the published panel ingress.

This deliberately exercises the host -> Docker port-forwarding path rather
than only the container's internal health check.  It does not log in, pull, or
push images, and it never prints container environment values.
"""

from __future__ import annotations

import argparse
import http.client
import http.cookiejar
import json
import subprocess
import sys
import time
import unittest
import uuid
from dataclasses import dataclass
from typing import Sequence
from urllib.error import HTTPError, URLError
from urllib.request import HTTPCookieProcessor, Request, build_opener


CONTAINER_PORT = 28646
REQUEST_TIMEOUT_SECONDS = 5
COMMAND_TIMEOUT_SECONDS = 20


class SmokeFailure(RuntimeError):
    """Raised when the image does not meet the host-ingress contract."""


@dataclass
class Deadline:
    timeout_seconds: float
    started_at: float

    @classmethod
    def start(cls, timeout_seconds: float) -> "Deadline":
        return cls(timeout_seconds=timeout_seconds, started_at=time.monotonic())

    def remaining(self) -> float:
        return self.timeout_seconds - (time.monotonic() - self.started_at)

    def bounded_timeout(self, ceiling: float) -> float:
        remaining = self.remaining()
        if remaining <= 0:
            raise SmokeFailure(f"smoke deadline exceeded after {self.timeout_seconds:.0f}s")
        return min(ceiling, remaining)


def command_text(command: Sequence[str]) -> str:
    return " ".join(command[:3]) + (" ..." if len(command) > 3 else "")


def run_command(command: Sequence[str], deadline: Deadline, *, timeout: float = COMMAND_TIMEOUT_SECONDS) -> str:
    try:
        completed = subprocess.run(
            list(command),
            check=False,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=deadline.bounded_timeout(timeout),
        )
    except FileNotFoundError as exc:
        raise SmokeFailure("docker CLI was not found") from exc
    except subprocess.TimeoutExpired as exc:
        raise SmokeFailure(f"command timed out: {command_text(command)}") from exc
    if completed.returncode != 0:
        detail = (completed.stderr or completed.stdout or "").strip()
        raise SmokeFailure(f"command failed ({completed.returncode}): {command_text(command)}: {detail[-800:]}")
    return completed.stdout.strip()


def run_diagnostic(command: Sequence[str]) -> str:
    """Best-effort diagnostics with an independent, short timeout."""
    try:
        completed = subprocess.run(
            list(command),
            check=False,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            timeout=5,
        )
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return "<unavailable>"
    return completed.stdout.strip()[-12000:] if completed.stdout else "<empty>"


def parse_published_port(output: str) -> int:
    lines = [line.strip() for line in output.splitlines() if line.strip()]
    if len(lines) != 1 or not lines[0].startswith("127.0.0.1:"):
        raise SmokeFailure(f"container port was not loopback-only: {output!r}")
    try:
        port = int(lines[0].rsplit(":", 1)[1])
    except ValueError as exc:
        raise SmokeFailure(f"could not parse published port: {output!r}") from exc
    if not 1 <= port <= 65535:
        raise SmokeFailure(f"published port is out of range: {port}")
    return port


def decode_json(body: bytes, label: str) -> dict:
    try:
        payload = json.loads(body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise SmokeFailure(f"{label} did not return JSON") from exc
    if not isinstance(payload, dict):
        raise SmokeFailure(f"{label} returned a non-object JSON payload")
    return payload


def http_get(opener, url: str, deadline: Deadline):
    try:
        return opener.open(Request(url, method="GET"), timeout=deadline.bounded_timeout(REQUEST_TIMEOUT_SECONDS))
    except HTTPError as exc:
        body = exc.read()
        raise SmokeFailure(f"GET {url} returned {exc.code}: {body[:500]!r}") from exc
    except (OSError, URLError) as exc:
        raise SmokeFailure(f"GET {url} could not be completed: {exc}") from exc


def raw_request(
    host_port: int,
    method: str,
    path: str,
    deadline: Deadline,
    *,
    host_header: str | None = None,
    headers: dict[str, str] | None = None,
) -> tuple[int, dict, bytes]:
    connection = http.client.HTTPConnection("127.0.0.1", host_port, timeout=deadline.bounded_timeout(REQUEST_TIMEOUT_SECONDS))
    try:
        connection.putrequest(method, path, skip_host=host_header is not None)
        if host_header is not None:
            connection.putheader("Host", host_header)
        for name, value in (headers or {}).items():
            connection.putheader(name, value)
        if method == "POST":
            connection.putheader("Content-Type", "application/json")
            connection.putheader("Content-Length", "2")
        connection.endheaders(b"{}" if method == "POST" else None)
        response = connection.getresponse()
        return response.status, dict(response.getheaders()), response.read()
    except (OSError, http.client.HTTPException) as exc:
        raise SmokeFailure(f"{method} {path} could not be completed: {exc}") from exc
    finally:
        connection.close()


def expect_error(status: int, body: bytes, *, expected_code: str, label: str) -> None:
    if status != 403:
        raise SmokeFailure(f"{label} expected HTTP 403, received {status}")
    payload = decode_json(body, label)
    if payload.get("code") != expected_code:
        raise SmokeFailure(f"{label} expected code {expected_code!r}, received {payload.get('code')!r}")


def docker_environment() -> list[str]:
    return [
        "ROS_PANEL_PROFILE=routeros_only",
        "ROS_PANEL_BIND=0.0.0.0",
        f"ROS_PANEL_PORT={CONTAINER_PORT}",
        "ROS_PANEL_TARGET_IP=127.0.0.1",
        "ROS_PANEL_TRUST_PROXY_HEADERS=0",
        "ROS_PANEL_ALLOW_DOCKER_HOST_FORWARD=1",
        "ROS_PANEL_ALLOW_LOCALHOST_HOST_FORWARD=0",
        "ROS_PANEL_IP_ALIAS_WRITE_ENABLED=0",
        "ROS_PANEL_EXPOSE_ADMIN_SESSIONS=0",
        "ROS_PANEL_LOCAL_SETTINGS_WRITE_ENABLED=0",
        "ROS_MONITOR_ROUTER_HOST=127.0.0.1",
        "ROS_MONITOR_ROUTER_SSH_PORT=9",
        "ROS_MONITOR_ROUTER_REST_SCHEME=https",
        "ROS_MONITOR_ROUTER_REST_PORT=9",
        "ROS_MONITOR_ROUTER_REST_VERIFY_TLS=1",
        "ROS_MONITOR_POLL_SECONDS=300",
        "ROS_MONITOR_STATIC_POLL_SECONDS=300",
        "ROS_MONITOR_SLOW_REST_POLL_SECONDS=300",
        "ROS_MONITOR_CONNECTION_DETAIL_POLL_SECONDS=300",
        "ROS_MONITOR_CONNECTION_PROTOCOL_POLL_SECONDS=300",
    ]


class ContainerSmoke:
    def __init__(self, image: str, platform: str, timeout_seconds: float) -> None:
        self.image = image
        self.platform = platform
        self.deadline = Deadline.start(timeout_seconds)
        suffix = uuid.uuid4().hex
        self.container_name = f"routeros-panel-smoke-{suffix}"
        self.helper_name = f"routeros-panel-smoke-helper-{suffix}"
        self.volume_name = f"routeros-panel-smoke-data-{suffix}"
        self.container_started = False
        self.helper_started = False
        self.volume_created = False

    def start(self) -> int:
        actual_platform = run_command(
            ["docker", "image", "inspect", "--format", "{{.Os}}/{{.Architecture}}", self.image],
            self.deadline,
        )
        if actual_platform != self.platform:
            raise SmokeFailure(f"image platform is {actual_platform!r}, expected {self.platform!r}")
        run_command(["docker", "volume", "create", self.volume_name], self.deadline)
        self.volume_created = True

        command = [
            "docker", "run", "--detach", "--pull=never", "--platform", self.platform, "--init", "--read-only",
            "--tmpfs", "/tmp", "--cap-drop", "ALL", "--security-opt", "no-new-privileges:true",
            "--pids-limit", "256", "--name", self.container_name,
            "--mount", f"type=volume,src={self.volume_name},dst=/app/data",
            "--publish", f"127.0.0.1::{CONTAINER_PORT}",
        ]
        for value in docker_environment():
            command.extend(["--env", value])
        command.append(self.image)
        run_command(command, self.deadline)
        self.container_started = True
        return parse_published_port(run_command(["docker", "port", self.container_name, f"{CONTAINER_PORT}/tcp"], self.deadline))

    def wait_healthy(self) -> None:
        while True:
            state = run_command(
                ["docker", "inspect", "--format", "{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}}", self.container_name],
                self.deadline,
                timeout=10,
            )
            if state == "running healthy":
                return
            if not state.startswith("running "):
                raise SmokeFailure(f"container stopped before becoming healthy: {state!r}")
            time.sleep(min(0.5, self.deadline.bounded_timeout(0.5)))

    def assert_sibling_rejected(self) -> None:
        inspect_text = run_command(
            [
                "docker", "inspect", "--format",
                "{{range $name, $network := .NetworkSettings.Networks}}{{$name}} {{$network.IPAddress}}{{end}}",
                self.container_name,
            ],
            self.deadline,
        )
        try:
            network_name, container_ip = inspect_text.split(maxsplit=1)
        except ValueError as exc:
            raise SmokeFailure("could not determine the smoke container bridge address") from exc
        if not container_ip:
            raise SmokeFailure("smoke container has no bridge IPv4 address")

        helper_code = (
            "import json,sys,urllib.error,urllib.request; "
            "url='http://'+sys.argv[1]+':28646/api/health'; "
            "request=urllib.request.Request(url,headers={'Host':'127.0.0.1:28646'}); "
            "\ntry:\n r=urllib.request.urlopen(request,timeout=5); status=r.status; body=r.read()"
            "\nexcept urllib.error.HTTPError as e:\n status=e.code; body=e.read()"
            "\nif status != 403 or json.loads(body.decode('utf-8')).get('code') != 'localhost_required': raise SystemExit(1)"
        )
        self.helper_started = True
        run_command(
            [
                "docker", "run", "--rm", "--pull=never", "--platform", self.platform, "--name", self.helper_name,
                "--network", network_name, "--entrypoint", "python", self.image,
                "-c", helper_code, container_ip,
            ],
            self.deadline,
        )

    def cleanup(self) -> None:
        if self.helper_started:
            run_diagnostic(["docker", "rm", "--force", self.helper_name])
            self.helper_started = False
        if self.container_started:
            run_diagnostic(["docker", "rm", "--force", self.container_name])
            self.container_started = False
        if self.volume_created:
            run_diagnostic(["docker", "volume", "rm", self.volume_name])
            self.volume_created = False

    def print_failure_diagnostics(self) -> None:
        if not self.container_started:
            return
        state = run_diagnostic(
            [
                "docker", "inspect", "--format",
                "status={{.State.Status}} health={{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}} exit={{.State.ExitCode}} error={{.State.Error}}",
                self.container_name,
            ]
        )
        logs = run_diagnostic(["docker", "logs", "--tail", "200", self.container_name])
        print(f"[smoke] container state: {state}", file=sys.stderr)
        print("[smoke] recent container logs:", file=sys.stderr)
        print(logs, file=sys.stderr)


def assert_host_ingress(host_port: int, smoke: ContainerSmoke) -> None:
    base_url = f"http://127.0.0.1:{host_port}"
    jar = http.cookiejar.CookieJar()
    opener = build_opener(HTTPCookieProcessor(jar))

    with http_get(opener, base_url + "/", smoke.deadline) as response:
        content_type = response.headers.get("Content-Type", "")
        body = response.read()
        if response.status != 200 or "text/html" not in content_type.lower() or b'id="app"' not in body:
            raise SmokeFailure("host ingress homepage did not return the panel HTML")

    with http_get(opener, base_url + "/api/health", smoke.deadline) as response:
        if response.status != 200:
            raise SmokeFailure(f"/api/health returned {response.status}")
        if decode_json(response.read(), "/api/health").get("profile") != "routeros_only":
            raise SmokeFailure("/api/health did not report the routeros_only profile")

    with http_get(opener, base_url + "/api/panel-network", smoke.deadline) as response:
        first_headers = response.headers.get_all("Set-Cookie") or []
        payload = decode_json(response.read(), "/api/panel-network")
        if response.status != 200 or payload.get("ok") is not True or not payload.get("csrfToken"):
            raise SmokeFailure("session bootstrap did not return the expected payload")
    session_headers = [header for header in first_headers if header.startswith("ros_panel_session=")]
    csrf_headers = [header for header in first_headers if header.startswith("ros_panel_csrf=")]
    if len(session_headers) != 1 or "HttpOnly" not in session_headers[0] or "SameSite=Strict" not in session_headers[0]:
        raise SmokeFailure("session bootstrap did not issue a secure panel session cookie")
    if len(csrf_headers) != 1 or "SameSite=Strict" not in csrf_headers[0]:
        raise SmokeFailure("session bootstrap did not issue the expected CSRF cookie")
    if {cookie.name for cookie in jar} < {"ros_panel_session", "ros_panel_csrf"}:
        raise SmokeFailure("session bootstrap cookies were not retained by the client")

    with http_get(opener, base_url + "/api/panel-network", smoke.deadline) as response:
        repeated_headers = response.headers.get_all("Set-Cookie") or []
        if response.status != 200 or any(header.startswith("ros_panel_session=") for header in repeated_headers):
            raise SmokeFailure("existing panel session was not reused")

    status, _, body = raw_request(host_port, "GET", "/api/health", smoke.deadline, host_header=f"example.invalid:{host_port}")
    expect_error(status, body, expected_code="localhost_required", label="non-loopback Host request")

    status, _, body = raw_request(host_port, "POST", "/api/panel-network", smoke.deadline)
    expect_error(status, body, expected_code="local_session_required", label="cookie-less write request")

    cookie_header = "; ".join(f"{cookie.name}={cookie.value}" for cookie in jar)
    status, _, body = raw_request(
        host_port,
        "POST",
        "/api/panel-network",
        smoke.deadline,
        headers={"Cookie": cookie_header},
    )
    expect_error(status, body, expected_code="csrf_validation_failed", label="session write without CSRF")

    smoke.assert_sibling_rejected()


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run a bounded local Docker host-ingress smoke test.")
    parser.add_argument("--image", help="Existing local image reference to run; the script never pulls it.")
    parser.add_argument("--platform", default="linux/amd64", help="Required local image platform (default: linux/amd64).")
    parser.add_argument("--timeout-seconds", type=int, default=120, help="Whole-smoke deadline in seconds (default: 120).")
    parser.add_argument("--self-test", action="store_true", help="Run no-Docker parser tests.")
    args = parser.parse_args(argv)
    if args.timeout_seconds < 30:
        parser.error("--timeout-seconds must be at least 30")
    if not args.self_test and not args.image:
        parser.error("--image is required unless --self-test is used")
    return args


class StaticTests(unittest.TestCase):
    def test_default_timeout_and_required_image_path(self) -> None:
        args = parse_args(["--image", "local-fixture"])
        self.assertEqual(args.image, "local-fixture")
        self.assertEqual(args.platform, "linux/amd64")
        self.assertEqual(args.timeout_seconds, 120)

    def test_self_test_does_not_require_a_docker_image(self) -> None:
        args = parse_args(["--self-test"])
        self.assertTrue(args.self_test)
        self.assertIsNone(args.image)

    def test_runtime_mode_still_requires_a_docker_image(self) -> None:
        with self.assertRaises(SystemExit):
            parse_args([])

    def test_docker_forward_and_loopback_target_are_configured(self) -> None:
        environment = docker_environment()
        self.assertIn("ROS_PANEL_ALLOW_DOCKER_HOST_FORWARD=1", environment)
        self.assertIn("ROS_MONITOR_ROUTER_HOST=127.0.0.1", environment)
        self.assertIn("ROS_MONITOR_ROUTER_REST_SCHEME=https", environment)
        self.assertIn("ROS_MONITOR_ROUTER_REST_PORT=9", environment)

    def test_parse_loopback_port(self) -> None:
        self.assertEqual(parse_published_port("127.0.0.1:49152"), 49152)

    def test_rejects_non_loopback_port(self) -> None:
        with self.assertRaises(SmokeFailure):
            parse_published_port("0.0.0.0:49152")

    def test_rejects_invalid_port(self) -> None:
        with self.assertRaises(SmokeFailure):
            parse_published_port("127.0.0.1:not-a-port")


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)
    if args.self_test:
        suite = unittest.defaultTestLoader.loadTestsFromTestCase(StaticTests)
        return 0 if unittest.TextTestRunner(verbosity=2).run(suite).wasSuccessful() else 1

    smoke = ContainerSmoke(args.image, args.platform, args.timeout_seconds)
    try:
        host_port = smoke.start()
        smoke.wait_healthy()
        assert_host_ingress(host_port, smoke)
    except SmokeFailure as exc:
        print(f"[smoke] FAIL: {exc}", file=sys.stderr)
        smoke.print_failure_diagnostics()
        return 1
    finally:
        smoke.cleanup()
    print("[smoke] PASS: Docker host ingress, session bootstrap, and rejection boundaries verified")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
