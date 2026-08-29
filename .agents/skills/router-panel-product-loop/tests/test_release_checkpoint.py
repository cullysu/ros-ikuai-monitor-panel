#!/usr/bin/env python3
"""Focused contracts for progress and final release-checkpoint verification."""

from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from typing import Any


WORKSPACE = Path(__file__).resolve().parents[4]
SCRIPT = WORKSPACE / ".agents/skills/router-panel-product-loop/scripts/release_checkpoint.py"


class ReleaseCheckpointVerifyTest(unittest.TestCase):
    def setUp(self) -> None:
        acc_dir = WORKSPACE / "_acceptance"
        acc_dir.mkdir(parents=True, exist_ok=True)
        self.tempdir = tempfile.TemporaryDirectory(dir=acc_dir)
        self.repo = Path(self.tempdir.name) / "repo"
        self.repo.mkdir()
        self.git("init")
        self.git("config", "user.email", "release-checkpoint@example.invalid")
        self.git("config", "user.name", "Release Checkpoint Fixture")
        (self.repo / "README.md").write_text("fixture\n", encoding="utf-8")
        self.git("add", "README.md")
        self.git("commit", "-m", "fixture")
        self.commit = self.git("rev-parse", "HEAD")
        self.tree = self.git("show", "-s", "--format=%T", self.commit)
        self.state_path = Path(self.tempdir.name) / "checkpoint.json"

    def tearDown(self) -> None:
        self.tempdir.cleanup()

    def git(self, *args: str) -> str:
        return subprocess.check_output(["git", *args], cwd=self.repo, text=True).strip()

    def state(self) -> dict[str, Any]:
        return {
            "schema": 1,
            "candidate": {"commit": self.commit, "tree": self.tree},
            "intended_paths": ["README.md"],
            "completed_blobs": [],
            "remote": {"tree": None, "commit": None, "ref": None},
            "cl": {
                name: {"status": "pending", "evidence": None}
                for name in ("linux", "windows", "container")
            },
        }

    def write(self, state: dict[str, Any]) -> None:
        self.state_path.write_text(json.dumps(state), encoding="utf-8")

    def invoke(self, *args: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [
                sys.executable,
                str(SCRIPT),
                *args,
                "--workspace",
                str(self.repo),
                "--state",
                str(self.state_path),
            ],
            cwd=WORKSPACE,
            text=True,
            capture_output=True,
            check=False,
        )

    def final_state(self) -> dict[str, Any]:
        state = self.state()
        state["remote"] = {
            "tree": self.tree,
            "commit": self.commit,
            "ref": self.commit,
        }
        state["cl"] = {
            name: {
                "status": "pass",
                "evidence": f"https://example.invalid/actions/{name}",
            }
            for name in ("linux", "windows", "container")
        }
        return state

    def test_progress_allows_unpublished_checkpoint(self) -> None:
        self.write(self.state())

        result = self.invoke("verify-progress")

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout)["mode"], "progress")

    def test_verify_requires_explicit_final_flag(self) -> None:
        self.write(self.final_state())

        result = self.invoke("verify")

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("--final", result.stderr)

    def test_final_rejects_missing_remote_and_pending_cl(self) -> None:
        self.write(self.state())

        result = self.invoke("verify", "--final")

        self.assertNotEqual(result.returncode, 0)
        payload = json.loads(result.stdout)
        self.assertIn("final verification requires remote.tree", payload["errors"])
        self.assertIn("final verification requires linux CL pass, got pending", payload["errors"])

    def test_final_rejects_remote_identity_mismatch(self) -> None:
        state = self.final_state()
        state["remote"]["commit"] = "0" * 40
        state["remote"]["ref"] = "0" * 40
        self.write(state)

        result = self.invoke("verify", "--final")

        self.assertNotEqual(result.returncode, 0)
        errors = json.loads(result.stdout)["errors"]
        self.assertTrue(any("remote commit differs from candidate" in item for item in errors))
        self.assertTrue(any("remote ref differs from candidate" in item for item in errors))

    def test_final_rejects_pass_without_evidence(self) -> None:
        state = self.final_state()
        state["cl"]["linux"]["evidence"] = " "
        self.write(state)

        result = self.invoke("verify", "--final")

        self.assertNotEqual(result.returncode, 0)
        self.assertIn(
            "final verification requires linux CL evidence",
            json.loads(result.stdout)["errors"],
        )

    def test_final_rejects_head_mismatch(self) -> None:
        self.write(self.final_state())
        (self.repo / "README.md").write_text("new head\n", encoding="utf-8")
        self.git("add", "README.md")
        self.git("commit", "-m", "head mismatch")

        result = self.invoke("verify", "--final")

        self.assertNotEqual(result.returncode, 0)
        self.assertTrue(
            any(
                "final verification requires HEAD to equal candidate commit" in item
                for item in json.loads(result.stdout)["errors"]
            )
        )

    def test_final_rejects_dirty_worktree(self) -> None:
        self.write(self.final_state())
        (self.repo / "untracked.txt").write_text("dirty\n", encoding="utf-8")

        result = self.invoke("verify", "--final")

        self.assertNotEqual(result.returncode, 0)
        self.assertIn(
            "final verification requires a clean worktree",
            json.loads(result.stdout)["errors"],
        )

    def test_final_accepts_exact_identity_and_all_cl_evidence(self) -> None:
        self.write(self.final_state())

        result = self.invoke("verify", "--final")

        self.assertEqual(result.returncode, 0, result.stderr)
        payload = json.loads(result.stdout)
        self.assertEqual(payload["mode"], "final")
        self.assertEqual(payload["errors"], [])


if __name__ == "__main__":
    unittest.main()
