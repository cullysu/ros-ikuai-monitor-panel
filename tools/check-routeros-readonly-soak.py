#!/usr/bin/env python3
"""Run a fail-closed, read-only soak check against a RouterOS panel."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import queue
import socket
import sys
import threading
import time
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit, urlunsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener


CHANNELS = ("health", "snapshot")
COLLECTION_CHANNEL = "routeros-realtime-rest"
HTTP_TIMEOUT_SECONDS = 10.0
MAX_RESPONSE_BODY_BYTES = 8 * 1024 * 1024
MAX_REPORT_BYTES = 16 * 1024 * 1024
MAX_EVIDENCE_AGE_SECONDS = 120
MAX_REPORT_VERIFICATION_AGE_SECONDS = 6 * 60 * 60
SUCCESS_STATUSES = {"ok"}
SUMMARY_FIELDS = (
    "channel",
    "httpStatus",
    "outcome",
    "status",
    "collectionChannel",
    "evidenceAt",
    "freshness",
    "ageSeconds",
    "failureState",
    "failureAt",
    "commitCheck",
    "buildCommit",
)


class NoRedirect(HTTPRedirectHandler):
    """Treat redirects as failures so requests remain limited to exact URLs."""

    def redirect_request(self, request, fp, code, msg, headers, newurl):  # type: ignore[override]
        return None


def utc_now() -> datetime:
    return datetime.now(UTC)


def iso_time(value: datetime) -> str:
    return value.isoformat(timespec="milliseconds").replace("+00:00", "Z")


def parse_base_url(value: str) -> str:
    parsed = urlsplit(value)
    if parsed.scheme not in {"http", "https"}:
        raise argparse.ArgumentTypeError("--base-url must use http or https")
    if not parsed.netloc or not parsed.hostname:
        raise argparse.ArgumentTypeError("--base-url must include a host")
    if parsed.username is not None or parsed.password is not None:
        raise argparse.ArgumentTypeError("--base-url must not include credentials")
    if parsed.query or parsed.fragment:
        raise argparse.ArgumentTypeError("--base-url must not include a query or fragment")
    if parsed.path not in {"", "/"}:
        raise argparse.ArgumentTypeError("--base-url must not include a path")
    try:
        port = parsed.port
    except ValueError as exc:
        raise argparse.ArgumentTypeError("--base-url contains an invalid port") from exc
    if port is not None and not 1 <= port <= 65535:
        raise argparse.ArgumentTypeError("--base-url port must be between 1 and 65535")
    return urlunsplit((parsed.scheme, parsed.netloc, "", "", ""))


def positive_number(value: str) -> float:
    try:
        number = float(value)
    except ValueError as exc:
        raise argparse.ArgumentTypeError("must be a number") from exc
    if not math.isfinite(number) or number <= 0:
        raise argparse.ArgumentTypeError("must be a finite number greater than zero")
    return number


def positive_integer(value: str) -> int:
    try:
        number = int(value)
    except ValueError as exc:
        raise argparse.ArgumentTypeError("must be an integer") from exc
    if number <= 0:
        raise argparse.ArgumentTypeError("must be greater than zero")
    return number


def expected_commit(value: str) -> str:
    normalized = value.strip().lower()
    if len(normalized) != 40 or any(char not in "0123456789abcdef" for char in normalized):
        raise argparse.ArgumentTypeError("--expected-commit must be exactly 40 hexadecimal characters")
    return normalized


def parse_timestamp(value: Any) -> datetime | None:
    if not isinstance(value, str) or not value.strip():
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        return None
    return parsed.astimezone(UTC)


def normalized_timestamp(value: Any) -> str | None:
    parsed = parse_timestamp(value)
    return iso_time(parsed) if parsed is not None else None


def evidence_freshness(value: Any, observed_at: datetime) -> tuple[str, int | None]:
    timestamp = parse_timestamp(value)
    if timestamp is None:
        return "missing_or_invalid", None
    age_seconds = int((observed_at - timestamp).total_seconds())
    if age_seconds < 0:
        return "future", age_seconds
    if age_seconds > MAX_EVIDENCE_AGE_SECONDS:
        return "stale", age_seconds
    return "fresh", age_seconds


def safe_status(value: Any) -> str:
    if not isinstance(value, str):
        return "unavailable"
    normalized = value.strip().lower()
    if not normalized or len(normalized) > 80:
        return "unavailable"
    if any(character not in "abcdefghijklmnopqrstuvwxyz0123456789._:-" for character in normalized):
        return "unavailable"
    return normalized


def safe_summary_hash(record: dict[str, Any]) -> str:
    summary = {field: record.get(field) for field in SUMMARY_FIELDS}
    encoded = json.dumps(summary, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def finalize_record(record: dict[str, Any], outcome: str) -> dict[str, Any]:
    record["outcome"] = outcome
    record["summaryHash"] = safe_summary_hash(record)
    return record


def exact_payload_commit(payload: dict[str, Any]) -> str | None:
    value = payload.get("buildCommit")
    if not isinstance(value, str):
        return None
    normalized = value.strip().lower()
    if len(normalized) != 40 or any(char not in "0123456789abcdef" for char in normalized):
        return None
    return normalized


def verify_report(
    report: Any,
    *,
    expected: str,
    min_duration_seconds: float,
    min_samples: int,
) -> list[str]:
    failures: list[str] = []

    def fail(code: str) -> None:
        if code not in failures:
            failures.append(code)

    try:
        expected = expected_commit(expected)
    except argparse.ArgumentTypeError:
        return ["verification_expected_commit_invalid"]
    if (
        isinstance(min_duration_seconds, bool)
        or not isinstance(min_duration_seconds, (int, float))
        or not math.isfinite(min_duration_seconds)
        or min_duration_seconds <= 0
    ):
        return ["verification_min_duration_invalid"]
    if isinstance(min_samples, bool) or not isinstance(min_samples, int) or min_samples <= 0:
        return ["verification_min_samples_invalid"]
    if not isinstance(report, dict):
        return ["report_not_object"]
    if report.get("schema") != "routeros-readonly-soak/v2":
        fail("schema_mismatch")
    if report.get("outcome") != "pass":
        fail("outcome_not_pass")
    if report.get("expectedCommit") != expected:
        fail("expected_commit_mismatch")
    if report.get("interrupted") is not False:
        fail("interrupted_or_missing")
    if "internalOutcome" in report:
        fail("internal_failure_present")
    requested_duration = report.get("durationSeconds")
    elapsed_duration = report.get("elapsedSeconds")
    if isinstance(requested_duration, bool) or not isinstance(requested_duration, (int, float)) or not math.isfinite(requested_duration) or requested_duration < min_duration_seconds:
        fail("requested_duration_below_policy")
    if isinstance(elapsed_duration, bool) or not isinstance(elapsed_duration, (int, float)) or not math.isfinite(elapsed_duration) or elapsed_duration < min_duration_seconds:
        fail("elapsed_duration_below_policy")
    started_at = parse_timestamp(report.get("startedAt"))
    finished_at = parse_timestamp(report.get("finishedAt"))
    if started_at is None or finished_at is None:
        fail("run_time_invalid")
    else:
        wall_duration = (finished_at - started_at).total_seconds()
        verification_age = (utc_now() - finished_at).total_seconds()
        if wall_duration < min_duration_seconds - 1:
            fail("run_time_below_policy")
        if verification_age < 0 or verification_age > MAX_REPORT_VERIFICATION_AGE_SECONDS:
            fail("report_not_recent")

    samples = report.get("samples")
    if not isinstance(samples, list):
        return failures + ["samples_invalid"]
    if len(samples) < min_samples:
        fail("sample_count_below_policy")
    for sample_index, sample in enumerate(samples):
        prefix = f"sample_{sample_index}"
        if not isinstance(sample, dict):
            fail(f"{prefix}_invalid")
            continue
        if sample.get("outcome") != "ok":
            fail(f"{prefix}_not_ok")
        collected_at = parse_timestamp(sample.get("collectedAt"))
        if collected_at is None:
            fail(f"{prefix}_time_invalid")
        elif started_at is not None and finished_at is not None and not started_at <= collected_at <= finished_at:
            fail(f"{prefix}_time_outside_run")
        channels = sample.get("channels")
        if not isinstance(channels, list):
            fail(f"{prefix}_channels_invalid")
            continue
        names = [channel.get("channel") for channel in channels if isinstance(channel, dict)]
        if len(channels) != len(CHANNELS) or set(names) != set(CHANNELS):
            fail(f"{prefix}_channel_set_invalid")
        for channel in channels:
            if not isinstance(channel, dict):
                fail(f"{prefix}_channel_invalid")
                continue
            name = channel.get("channel") if channel.get("channel") in CHANNELS else "unknown"
            channel_prefix = f"{prefix}_{name}"
            if channel.get("outcome") != "ok" or channel.get("status") not in SUCCESS_STATUSES:
                fail(f"{channel_prefix}_not_ok")
            if channel.get("collectionChannel") != COLLECTION_CHANNEL:
                fail(f"{channel_prefix}_collection_channel_invalid")
            if channel.get("freshness") != "fresh" or channel.get("failureState") != "clear":
                fail(f"{channel_prefix}_evidence_invalid")
            if channel.get("commitCheck") != "match" or channel.get("buildCommit") != expected:
                fail(f"{channel_prefix}_commit_mismatch")
            requested_at = parse_timestamp(channel.get("requestedAt"))
            completed_at = parse_timestamp(channel.get("completedAt"))
            evidence_at = parse_timestamp(channel.get("evidenceAt"))
            if requested_at is None or completed_at is None or evidence_at is None:
                fail(f"{channel_prefix}_time_invalid")
            else:
                age_seconds = int((completed_at - evidence_at).total_seconds())
                if age_seconds < 0 or age_seconds > MAX_EVIDENCE_AGE_SECONDS or channel.get("ageSeconds") != age_seconds:
                    fail(f"{channel_prefix}_freshness_recalculation_failed")
                if started_at is not None and finished_at is not None and not started_at <= requested_at <= completed_at <= finished_at:
                    fail(f"{channel_prefix}_time_outside_run")
                if collected_at is not None and requested_at < collected_at:
                    fail(f"{channel_prefix}_time_precedes_sample")
            if channel.get("summaryHash") != safe_summary_hash(channel):
                fail(f"{channel_prefix}_summary_hash_invalid")
    return failures


def channel_url(base_url: str, channel: str) -> str:
    return f"{base_url}/api/{channel}"


def response_worker(url: str, timeout: float, timeout_outcome: str, results: queue.Queue[dict[str, Any]]) -> None:
    result: dict[str, Any]
    try:
        request = Request(url, headers={"Accept": "application/json", "User-Agent": "routeros-readonly-soak/2"}, method="GET")
        with build_opener(NoRedirect()).open(request, timeout=timeout) as response:
            length_header = response.headers.get("Content-Length")
            if length_header is not None:
                try:
                    declared_length = int(length_header)
                except ValueError:
                    result = {"kind": "invalid_content_length", "http_status": response.status}
                else:
                    if declared_length < 0:
                        result = {"kind": "invalid_content_length", "http_status": response.status}
                    elif declared_length > MAX_RESPONSE_BODY_BYTES:
                        result = {"kind": "body_too_large", "http_status": response.status}
                    else:
                        body = response.read(MAX_RESPONSE_BODY_BYTES + 1)
                        result = {"kind": "body_too_large", "http_status": response.status} if len(body) > MAX_RESPONSE_BODY_BYTES else {"kind": "response", "http_status": response.status, "body": body}
            else:
                body = response.read(MAX_RESPONSE_BODY_BYTES + 1)
                result = {"kind": "body_too_large", "http_status": response.status} if len(body) > MAX_RESPONSE_BODY_BYTES else {"kind": "response", "http_status": response.status, "body": body}
    except HTTPError as exc:
        result = {"kind": "redirect_rejected" if 300 <= exc.code < 400 else "http_error", "http_status": exc.code}
    except (TimeoutError, socket.timeout):
        result = {"kind": timeout_outcome}
    except URLError as exc:
        result = {"kind": timeout_outcome if isinstance(exc.reason, (TimeoutError, socket.timeout)) else "request_failed"}
    except OSError:
        result = {"kind": "request_failed"}
    except Exception:
        result = {"kind": "request_failed"}
    try:
        results.put_nowait(result)
    except queue.Full:
        pass


def bounded_get(url: str, soak_deadline: float) -> dict[str, Any]:
    started = time.monotonic()
    if started >= soak_deadline:
        return {"kind": "soak_deadline"}
    request_deadline = started + HTTP_TIMEOUT_SECONDS
    effective_deadline = min(request_deadline, soak_deadline)
    timeout_outcome = "soak_deadline" if soak_deadline <= request_deadline else "request_timeout"
    timeout = max(0.001, effective_deadline - started)
    results: queue.Queue[dict[str, Any]] = queue.Queue(maxsize=1)
    worker = threading.Thread(target=response_worker, args=(url, timeout, timeout_outcome, results), daemon=True)
    worker.start()
    try:
        return results.get(timeout=max(0.001, effective_deadline - time.monotonic()))
    except queue.Empty:
        return {"kind": timeout_outcome}


def collect_channel(base_url: str, channel: str, expected: str | None, soak_deadline: float) -> tuple[dict[str, Any], bool]:
    requested_at = utc_now()
    record: dict[str, Any] = {"channel": channel, "requestedAt": iso_time(requested_at)}
    response = bounded_get(channel_url(base_url, channel), soak_deadline)
    completed_at = utc_now()
    record["completedAt"] = iso_time(completed_at)
    if response.get("http_status") is not None:
        record["httpStatus"] = response["http_status"]
    if response.get("kind") != "response":
        return finalize_record(record, str(response.get("kind") or "request_failed")), False

    try:
        payload = json.loads(response["body"].decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return finalize_record(record, "invalid_json"), False
    if not isinstance(payload, dict):
        return finalize_record(record, "invalid_payload"), False

    evidence = payload.get("collectionEvidence")
    if not isinstance(evidence, dict):
        evidence = {}
    collection_channel = safe_status(evidence.get("channel"))
    evidence_at = normalized_timestamp(evidence.get("lastSuccessAt"))
    freshness, age_seconds = evidence_freshness(evidence.get("lastSuccessAt"), completed_at)
    failure_active = evidence.get("failureActive")
    failure_state = "clear" if failure_active is False else "active" if failure_active is True else "unknown"
    failure_at = normalized_timestamp(evidence.get("lastFailureAt"))
    status = safe_status(payload.get("status"))
    discovered_commit = exact_payload_commit(payload)
    commit_check = "not_requested"
    if expected is not None:
        commit_check = "unavailable" if discovered_commit is None else "match" if discovered_commit == expected else "mismatch"
    record.update(
        {
            "status": status,
            "collectionChannel": collection_channel,
            "evidenceAt": evidence_at,
            "freshness": freshness,
            "ageSeconds": age_seconds,
            "failureState": failure_state,
            "failureAt": failure_at,
            "commitCheck": commit_check,
            "buildCommit": discovered_commit,
        }
    )
    passed = (
        200 <= response["http_status"] < 300
        and status in SUCCESS_STATUSES
        and collection_channel == COLLECTION_CHANNEL
        and freshness == "fresh"
        and failure_state == "clear"
        and commit_check not in {"mismatch", "unavailable"}
    )
    return finalize_record(record, "ok" if passed else "evidence_failed"), passed


def write_report(path: Path, report: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f".{path.name}.tmp")
    try:
        temporary.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        os.replace(temporary, path)
    finally:
        if temporary.exists():
            temporary.unlink()


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", type=parse_base_url, help="Explicit root panel URL; credentials and paths are rejected.")
    parser.add_argument("--duration", type=positive_number, default=300.0, help="Hard soak deadline in seconds (default: 300).")
    parser.add_argument("--interval", type=positive_number, default=30.0, help="Seconds between sample starts (default: 30).")
    parser.add_argument("--out", type=Path, help="Path for the sanitized JSON evidence report.")
    parser.add_argument("--expected-commit", type=expected_commit, help="Exact 40-character build commit required from both endpoints.")
    parser.add_argument("--verify-report", type=Path, help="Verify an existing v2 report instead of running a soak.")
    parser.add_argument("--verify-report-stdin", action="store_true", help="Verify exactly one frozen v2 report byte stream from stdin.")
    parser.add_argument("--min-duration", type=positive_number, help="Minimum requested and elapsed report duration for verification.")
    parser.add_argument("--min-samples", type=positive_integer, help="Minimum report sample count for verification.")
    return parser


def run(arguments: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(arguments)
    if args.verify_report is not None or args.verify_report_stdin:
        if args.verify_report is not None and args.verify_report_stdin:
            parser.error("--verify-report and --verify-report-stdin are mutually exclusive")
        if args.base_url is not None or args.out is not None:
            parser.error("report verification cannot be combined with --base-url or --out")
        if args.expected_commit is None or args.min_duration is None or args.min_samples is None:
            parser.error("report verification requires --expected-commit, --min-duration, and --min-samples")
        try:
            if args.verify_report_stdin:
                encoded_report = sys.stdin.buffer.read(MAX_REPORT_BYTES + 1)
            else:
                with args.verify_report.open("rb") as report_file:
                    encoded_report = report_file.read(MAX_REPORT_BYTES + 1)
            if len(encoded_report) > MAX_REPORT_BYTES:
                raise ValueError("report too large")
            existing_report = json.loads(encoded_report.decode("utf-8"))
        except (OSError, UnicodeDecodeError, json.JSONDecodeError, ValueError):
            print("routeros readonly soak report: fail (report_unreadable)")
            return 1
        failures = verify_report(
            existing_report,
            expected=args.expected_commit,
            min_duration_seconds=args.min_duration,
            min_samples=args.min_samples,
        )
        print(f"routeros readonly soak report: {'pass' if not failures else 'fail'}" + (f" ({','.join(failures)})" if failures else ""))
        return 0 if not failures else 1
    if args.base_url is None or args.out is None:
        parser.error("soak mode requires --base-url and --out")
    started_at = utc_now()
    started_monotonic = time.monotonic()
    deadline = started_monotonic + args.duration
    report: dict[str, Any] = {
        "schema": "routeros-readonly-soak/v2",
        "startedAt": iso_time(started_at),
        "durationSeconds": args.duration,
        "intervalSeconds": args.interval,
        "samples": [],
    }
    if args.expected_commit is not None:
        report["expectedCommit"] = args.expected_commit
    passed = True
    interrupted = False
    try:
        while True:
            sample = {"collectedAt": iso_time(utc_now()), "channels": []}
            sample_passed = True
            for channel in CHANNELS:
                record, channel_passed = collect_channel(args.base_url, channel, args.expected_commit, deadline)
                sample["channels"].append(record)
                sample_passed = sample_passed and channel_passed
            sample["outcome"] = "ok" if sample_passed else "failed"
            report["samples"].append(sample)
            passed = passed and sample_passed
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                break
            time.sleep(min(args.interval, remaining))
            if time.monotonic() >= deadline:
                break
    except KeyboardInterrupt:
        interrupted = True
        passed = False
    except Exception:
        passed = False
        report["internalOutcome"] = "unexpected_failure"
    finally:
        report["finishedAt"] = iso_time(utc_now())
        report["elapsedSeconds"] = round(time.monotonic() - started_monotonic, 3)
        report["interrupted"] = interrupted
        report["outcome"] = "pass" if passed and not interrupted else "fail"
        write_report(args.out, report)

    print(f"routeros readonly soak: {report['outcome']} ({len(report['samples'])} sample(s))")
    if interrupted:
        return 130
    return 0 if report["outcome"] == "pass" else 1


if __name__ == "__main__":
    sys.exit(run())
