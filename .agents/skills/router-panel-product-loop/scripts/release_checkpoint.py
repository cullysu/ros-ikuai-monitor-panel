#!/usr/bin/env python3
"""Persist cancellation-safe state for the Router Panel Git Data release transaction."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


SCHEMA_VERSION = 1
CL_NAMES = ("linux", "windows", "container")
CL_STATUSES = ("pending", "running", "pass", "fail", "missing", "cancelled")
SHA_RE = re.compile(r"[0-9a-f]{40}")


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def git(workspace: Path, *args: str, binary: bool = False) -> str | bytes:
    output = subprocess.check_output(["git", *args], cwd=workspace)
    return output if binary else output.decode("utf-8").strip()


def state_path(workspace: Path, value: str | None) -> Path:
    path = Path(value) if value else Path(".product-loop/release-checkpoint.json")
    return path if path.is_absolute() else workspace / path


def write_json(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(
        json.dumps(value, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    temporary.replace(path)


def read_json(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if value.get("schema") != SCHEMA_VERSION:
        raise RuntimeError(f"unsupported checkpoint schema: {value.get('schema')}")
    return value


def record_event(state: dict[str, Any], event: str, value: str) -> None:
    state.setdefault("events", []).append({"at": now(), "event": event, "value": value})
    state["updated_at"] = now()


def command_init(args: argparse.Namespace) -> None:
    workspace = Path(args.workspace).resolve()
    candidate = str(git(workspace, "rev-parse", args.candidate))
    tree = str(git(workspace, "show", "-s", "--format=%T", candidate))
    paths_raw = git(
        workspace,
        "diff",
        "--name-only",
        "-z",
        f"{args.parent}..{candidate}",
        binary=True,
    )
    dirty_raw = git(
        workspace,
        "status",
        "--porcelain=v1",
        "-z",
        "--untracked-files=all",
        binary=True,
    )
    paths = [item.decode("utf-8") for item in paths_raw.split(b"\0") if item]
    dirty = [item.decode("utf-8") for item in dirty_raw.split(b"\0") if item]
    state = {
        "schema": SCHEMA_VERSION,
        "repository": args.repository,
        "created_at": now(),
        "updated_at": now(),
        "candidate": {"commit": candidate, "tree": tree},
        "remote_parent": args.parent,
        "intended_paths": paths,
        "worktree_dirty_at_init": dirty,
        "completed_blobs": [],
        "remote": {"tree": None, "commit": None, "ref": None},
        "cl": {name: {"status": "pending", "evidence": None} for name in CL_NAMES},
        "events": [{"at": now(), "event": "init", "value": candidate}],
    }
    path = state_path(workspace, args.state)
    write_json(path, state)
    print(json.dumps({"checkpoint": str(path), "candidate": candidate, "tree": tree, "paths": len(paths), "dirty": len(dirty)}))


def command_mark(args: argparse.Namespace) -> None:
    workspace = Path(args.workspace).resolve()
    path = state_path(workspace, args.state)
    state = read_json(path)
    if not SHA_RE.fullmatch(args.value):
        raise ValueError(f"{args.kind} must be a lowercase 40-character Git SHA")
    if args.kind == "blob":
        blobs = state.setdefault("completed_blobs", [])
        if args.value not in blobs:
            blobs.append(args.value)
            blobs.sort()
    else:
        state.setdefault("remote", {})[args.kind] = args.value
    record_event(state, f"mark-{args.kind}", args.value)
    write_json(path, state)
    print(json.dumps({"kind": args.kind, "value": args.value}))


def command_cl(args: argparse.Namespace) -> None:
    workspace = Path(args.workspace).resolve()
    path = state_path(workspace, args.state)
    state = read_json(path)
    state.setdefault("cl", {})[args.name] = {
        "status": args.status,
        "evidence": args.evidence,
    }
    record_event(state, f"cl-{args.name}", args.status)
    write_json(path, state)
    print(json.dumps({"name": args.name, "status": args.status}))


def command_verify(args: argparse.Namespace) -> None:
    workspace = Path(args.workspace).resolve()
    path = state_path(workspace, args.state)
    state = read_json(path)
    commit = state["candidate"]["commit"]
    expected_tree = state["candidate"]["tree"]
    actual_tree = str(git(workspace, "show", "-s", "--format=%T", commit))
    errors = []
    if actual_tree != expected_tree:
        errors.append(f"candidate tree changed: {actual_tree} != {expected_tree}")
    blobs = state.get("completed_blobs", [])
    if len(blobs) != len(set(blobs)):
        errors.append("duplicate completed blob entries")
    remote = state.get("remote", {})
    if remote.get("tree") and remote["tree"] != expected_tree:
        errors.append(f"remote tree differs from candidate: {remote['tree']} != {expected_tree}")
    if remote.get("ref") and remote.get("commit") and remote["ref"] != remote["commit"]:
        errors.append(f"remote ref differs from staged commit: {remote['ref']} != {remote['commit']}")
    if any(item.get("status") == "pass" for item in state.get("cl", {}).values()) and not remote.get("ref"):
        errors.append("a CL gate is pass before a remote ref is recorded")
    result = {
        "checkpoint": str(path),
        "candidate": commit,
        "tree": actual_tree,
        "paths": len(state.get("intended_paths", [])),
        "completed_blobs": len(blobs),
        "remote": state.get("remote", {}),
        "cl": state.get("cl", {}),
        "errors": errors,
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    if errors:
        raise SystemExit(1)


def command_status(args: argparse.Namespace) -> None:
    workspace = Path(args.workspace).resolve()
    path = state_path(workspace, args.state)
    print(path.read_text(encoding="utf-8"), end="")


def parser() -> argparse.ArgumentParser:
    root = argparse.ArgumentParser(description=__doc__)
    commands = root.add_subparsers(dest="command", required=True)

    init = commands.add_parser("init")
    init.add_argument("--workspace", required=True)
    init.add_argument("--repository", required=True)
    init.add_argument("--parent", required=True)
    init.add_argument("--candidate", default="HEAD")
    init.add_argument("--state")
    init.set_defaults(handler=command_init)

    mark = commands.add_parser("mark")
    mark.add_argument("--workspace", required=True)
    mark.add_argument("--state")
    mark.add_argument("--kind", choices=("blob", "tree", "commit", "ref"), required=True)
    mark.add_argument("--value", required=True)
    mark.set_defaults(handler=command_mark)

    cl = commands.add_parser("cl")
    cl.add_argument("--workspace", required=True)
    cl.add_argument("--state")
    cl.add_argument("--name", choices=CL_NAMES, required=True)
    cl.add_argument("--status", choices=CL_STATUSES, required=True)
    cl.add_argument("--evidence")
    cl.set_defaults(handler=command_cl)

    verify = commands.add_parser("verify")
    verify.add_argument("--workspace", required=True)
    verify.add_argument("--state")
    verify.set_defaults(handler=command_verify)

    status = commands.add_parser("status")
    status.add_argument("--workspace", required=True)
    status.add_argument("--state")
    status.set_defaults(handler=command_status)
    return root


if __name__ == "__main__":
    arguments = parser().parse_args()
    arguments.handler(arguments)
