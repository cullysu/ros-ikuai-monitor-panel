import json
import socket
import time
from concurrent.futures import ThreadPoolExecutor

import requests

from .router_transport import build_rest_url, configure_rest_session


class RouterCollectorTransport:
    """RouterOS REST/SSH execution boundary used by the snapshot collector."""

    def __init__(
        self,
        config_provider,
        ssh_client_opener,
        ssh_error_formatter,
        integer_parser,
        *,
        rest_timeout,
        ssh_timeout,
    ):
        self.config_provider = config_provider
        self.ssh_client_opener = ssh_client_opener
        self.ssh_error_formatter = ssh_error_formatter
        self.integer_parser = integer_parser
        self.rest_timeout = rest_timeout
        self.ssh_timeout = ssh_timeout

    def ready_config(self):
        return self.config_provider()

    def rest_get(self, session, endpoint_config):
        router = self.ready_config()
        response = session.get(
            build_rest_url(router, endpoint_config["path"]),
            params=endpoint_config.get("params"),
            timeout=endpoint_config.get("timeout", self.rest_timeout),
            allow_redirects=False,
        )
        if 300 <= response.status_code < 400:
            raise RuntimeError("RouterOS REST redirect was refused; configure the exact HTTPS endpoint")
        if endpoint_config.get("optional") and response.status_code == 404:
            return [] if endpoint_config.get("kind") != "object" else {}
        response.raise_for_status()
        payload = response.json()
        if endpoint_config.get("kind") == "object":
            return payload[0] if isinstance(payload, list) and payload else payload or {}
        return payload if isinstance(payload, list) else ([payload] if payload else [])

    def rest_post(self, session, path, payload=None, timeout=None):
        router = self.ready_config()
        response = session.post(
            build_rest_url(router, path),
            json=payload or {},
            timeout=timeout or self.rest_timeout,
            allow_redirects=False,
        )
        if 300 <= response.status_code < 400:
            raise RuntimeError("RouterOS REST redirect was refused; configure the exact HTTPS endpoint")
        response.raise_for_status()
        if not response.content:
            return {}
        return response.json()

    def rest_print(self, path, proplist=None, query=None, timeout=None):
        router = self.ready_config()
        session = requests.Session()
        configure_rest_session(session, router)
        try:
            payload = {}
            if proplist:
                payload[".proplist"] = proplist
            if query:
                payload[".query"] = query
            result = self.rest_post(session, f"{path.strip('/')}/print", payload, timeout=timeout)
            return result if isinstance(result, list) else ([result] if result else [])
        finally:
            session.close()

    def ssh_exec(self, client, command, timeout=None):
        timeout = max(1, self.integer_parser(timeout, self.ssh_timeout))
        stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
        del stdin
        channel = stdout.channel
        try:
            channel.settimeout(timeout)
            stderr.channel.settimeout(timeout)
            output = stdout.read().decode("utf-8", errors="replace").strip()
            error = stderr.read().decode("utf-8", errors="replace").strip()
            exit_status = channel.recv_exit_status()
        except socket.timeout as exc:
            try:
                channel.close()
            except Exception:
                pass
            raise RuntimeError(f"SSH command timed out after {timeout}s: {command}") from exc
        except Exception as exc:
            try:
                channel.close()
            except Exception:
                pass
            raise RuntimeError(f"SSH command failed: {command}: {exc}") from exc
        if exit_status != 0:
            raise RuntimeError(error or f"SSH command exited with status {exit_status}: {command}")
        if error:
            raise RuntimeError(error)
        return output

    def ssh_json(self, client, expression):
        payload = self.ssh_exec(client, f":put [:serialize to=json value={expression}]")
        return json.loads(payload) if payload else []

    def ssh_capture(self, client, command, capture_seconds, max_bytes=None, quiet_window=0.75, timeout=None):
        timeout = max(1, self.integer_parser(timeout, self.ssh_timeout))
        capture_seconds = max(1.0, float(capture_seconds or 0))
        stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
        del stdin
        channel = stdout.channel
        stdout_chunks = []
        stderr_chunks = []
        total_bytes = 0
        started_at = time.time()
        first_output_at = None
        last_output_at = None
        try:
            channel.settimeout(1.0)
            while time.time() - started_at < capture_seconds:
                received = False
                while channel.recv_ready():
                    data = channel.recv(65535)
                    if not data:
                        break
                    received = True
                    now = time.time()
                    if first_output_at is None:
                        first_output_at = now
                    last_output_at = now
                    stdout_chunks.append(data)
                    total_bytes += len(data)
                    if max_bytes and total_bytes >= max_bytes:
                        break
                while channel.recv_stderr_ready():
                    data = channel.recv_stderr(65535)
                    if not data:
                        break
                    stderr_chunks.append(data)
                if max_bytes and total_bytes >= max_bytes:
                    break
                if channel.exit_status_ready():
                    break
                if first_output_at and last_output_at and (time.time() - last_output_at) >= quiet_window:
                    break
                if not received:
                    time.sleep(0.1)
            error = b"".join(stderr_chunks).decode("utf-8", errors="replace").strip()
            text = b"".join(stdout_chunks).decode("utf-8", errors="replace")
            complete = channel.exit_status_ready()
            if not text and complete:
                exit_status = channel.recv_exit_status()
                if exit_status != 0:
                    raise RuntimeError(error or f"SSH command exited with status {exit_status}: {command}")
            if not text and not complete:
                raise RuntimeError(
                    error or f"SSH stream capture produced no rows within {round(capture_seconds, 1)}s: {command}"
                )
            return {
                "text": text,
                "stderr": error,
                "complete": complete,
                "capturedBytes": total_bytes,
                "firstOutputSeconds": round((first_output_at - started_at), 2) if first_output_at else None,
            }
        finally:
            try:
                channel.close()
            except Exception:
                pass

    def fetch_rest_item(self, key, endpoint_config):
        router = self.ready_config()
        session = requests.Session()
        configure_rest_session(session, router)
        try:
            return key, self.rest_get(session, endpoint_config), None
        except Exception as exc:
            return key, None, str(exc)
        finally:
            session.close()

    def fetch_rest_bundle(self, endpoints, workers=1):
        max_workers = max(1, min(self.integer_parser(workers, 1), len(endpoints) or 1))
        if max_workers > 1 and len(endpoints) > 1:
            payload = {}
            failures = {}
            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                futures = [
                    executor.submit(self.fetch_rest_item, key, endpoint_config)
                    for key, endpoint_config in endpoints.items()
                ]
                for future in futures:
                    key, value, error = future.result()
                    endpoint_config = endpoints[key]
                    fallback = {} if endpoint_config.get("kind") == "object" else []
                    if error:
                        payload[key] = fallback
                        failures[key] = error
                    else:
                        payload[key] = value
            if failures:
                payload["_failures"] = failures
            self.raise_if_all_required_failed(endpoints, failures)
            return payload

        router = self.ready_config()
        session = requests.Session()
        configure_rest_session(session, router)
        try:
            payload = {}
            failures = {}
            for key, endpoint_config in endpoints.items():
                fallback = {} if endpoint_config.get("kind") == "object" else []
                try:
                    payload[key] = self.rest_get(session, endpoint_config)
                except Exception as exc:
                    payload[key] = fallback
                    failures[key] = str(exc)
            if failures:
                payload["_failures"] = failures
            self.raise_if_all_required_failed(endpoints, failures)
            return payload
        finally:
            session.close()

    @staticmethod
    def raise_if_all_required_failed(endpoints, failures):
        required_keys = [key for key, endpoint_config in endpoints.items() if not endpoint_config.get("optional")]
        if failures and required_keys and all(key in failures for key in required_keys):
            joined = "; ".join(f"{key}: {message}" for key, message in failures.items())
            raise RuntimeError(joined)

    def open_ssh_client(self, timeout=None):
        router = self.ready_config()
        timeout = max(1, self.integer_parser(timeout, self.ssh_timeout))
        client = None
        try:
            client = self.ssh_client_opener(router, timeout=timeout)
        except Exception as exc:
            try:
                if client:
                    client.close()
            except Exception:
                pass
            raise RuntimeError(self.ssh_error_formatter(router, exc, timeout=timeout)) from exc
        return client
