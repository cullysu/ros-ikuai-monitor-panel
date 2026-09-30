"""Retry wrapper: once api.github.com responds, finish the GitHub delivery.

1. Merge open PR #46 (platform compatibility workflow).
2. Push fix/mobile-review-parity (mobile review fixes) via the Git Data API.
3. Open the PR for it.
"""
import base64
import json
import subprocess
import sys
import time
import urllib.request

REPO = "cullysu/ros-ikuai-monitor-panel"
BRANCH = "fix/mobile-review-parity"


def token():
    out = subprocess.run(["git", "credential", "fill"], input="protocol=https\nhost=github.com\n\n",
                         capture_output=True, text=True).stdout
    for line in out.splitlines():
        if line.startswith("password="):
            return line.split("=", 1)[1]
    raise RuntimeError("no token")


def api(tok, path, payload=None, method=None, tries=6):
    last = None
    for attempt in range(tries):
        try:
            req = urllib.request.Request(f"https://api.github.com{path}",
                                         data=json.dumps(payload).encode() if payload is not None else None,
                                         headers={"Authorization": f"token {tok}", "Accept": "application/vnd.github+json"},
                                         method=method or ("POST" if payload is not None else "GET"))
            return json.loads(urllib.request.urlopen(req, timeout=30).read())
        except urllib.error.HTTPError as exc:
            if exc.code in (400, 403, 404, 429, 500, 502, 503, 504) and attempt < tries - 1:
                # 404 can be a transient edge during tree/blob churn on a flapping link
                last = exc
                time.sleep(15)
                continue
            raise
        except (urllib.error.URLError, ConnectionError, TimeoutError) as exc:
            last = exc
            time.sleep(15)
    raise last


def wait_api(minutes=40):
    t0 = time.time()
    while time.time() - t0 < minutes * 60:
        try:
            urllib.request.urlopen("https://api.github.com/rate_limit", timeout=10)
            return True
        except Exception:
            print("api down, retry in 60s", flush=True)
            time.sleep(60)
    return False


def git(*args):
    return subprocess.run(["git", *args], capture_output=True, text=True, check=True).stdout


def main():
    tok = token()
    if not wait_api():
        sys.exit("api never recovered")

    # 1. merge PR #46 if still open
    prs = api(tok, "/pulls?head=cullysu:ci/platform-compatibility&state=open")
    if prs:
        n = prs[0]["number"]
        req = urllib.request.Request(f"https://api.github.com/repos/{REPO}/pulls/{n}/merge",
                                     data=b'{"merge_method":"merge"}',
                                     headers={"Authorization": f"token {tok}", "Accept": "application/vnd.github+json"},
                                     method="PUT")
        print("merge #46:", json.loads(urllib.request.urlopen(req, timeout=30).read()).get("merged"))

    base_sha = api(tok, "/git/ref/heads/main")["object"]["sha"]
    base_tree = api(tok, f"/git/commits/{base_sha}")["tree"]["sha"]
    remote_files = {t["path"]: t["sha"] for t in api(tok, f"/git/trees/{base_tree}?recursive=1")["tree"] if t["type"] == "blob"}

    listing = git("ls-tree", "-r", "HEAD").splitlines()
    local = {}
    for line in listing:
        meta, path = line.split("\t", 1)
        mode, kind, sha = meta.split()
        local[path] = (mode, sha)

    changed = []
    for path, (mode, sha) in local.items():
        if remote_files.get(path) != sha:
            changed.append((path, mode, sha))
    for path in remote_files:
        if path not in local:
            changed.append((path, "100644", None))

    entries = []
    for path, mode, sha in changed:
        if sha is None:
            entries.append({"path": path, "mode": mode, "type": "blob", "sha": None})
            continue
        have = api(tok, f"/git/blobs/{sha}")  # may 404 if not on remote -> upload
        entries.append({"path": path, "mode": mode, "type": "blob", "sha": sha})
    # Upload blobs only for ones missing remotely (probe returned 404)
    real_entries = []
    for entry in entries:
        if entry["sha"] is None:
            real_entries.append(entry)
            continue
        req = urllib.request.Request(f"https://api.github.com/repos/{REPO}/git/blobs/{entry['sha']}",
                                     headers={"Authorization": f"token {tok}"})
        try:
            urllib.request.urlopen(req, timeout=30)
            real_entries.append(entry)
        except urllib.error.HTTPError as exc:
            if exc.code == 404:
                content = subprocess.run(["git", "cat-file", "blob", entry["sha"]],
                                         capture_output=True, check=True).stdout
                blob = api(tok, "/git/blobs", {"content": base64.b64encode(content).decode(),
                                              "encoding": "base64"})
                real_entries.append({"path": entry["path"], "mode": entry["mode"], "type": "blob", "sha": blob["sha"]})
            else:
                raise

    new_tree = api(tok, "/git/trees", {"base_tree": base_tree, "tree": real_entries})
    msg = git("log", "-1", "--pretty=%B").strip()
    new_commit = api(tok, "/git/commits", {"message": msg, "tree": new_tree["sha"], "parents": [base_sha]})
    try:
        api(tok, "/git/refs", {"ref": f"refs/heads/{BRANCH}", "sha": new_commit["sha"]})
        print("branch created")
    except urllib.error.HTTPError:
        req = urllib.request.Request(f"https://api.github.com/repos/{REPO}/git/refs/heads/{BRANCH}",
                                     data=json.dumps({"sha": new_commit["sha"], "force": True}).encode(),
                                     headers={"Authorization": f"token {tok}", "Accept": "application/vnd.github+json"},
                                     method="PATCH")
        urllib.request.urlopen(req, timeout=30)
        print("branch force-updated")

    payload = {"title": "Mobile parity: identity, default route, unknown state, logout, search history",
               "head": BRANCH, "base": "main",
               "body": "外部评审对照 main 的五项实证缺口全部修复（首页真实设备身份、默认出口标记、未知态不再计入离线、退出登录接通、搜索历史/监听器生命周期），审计/终端列表补截断披露，framework 重建。54 单测全绿。"}
    pr = api(tok, "/pulls", payload)
    print("PR:", pr["number"], pr["html_url"])


if __name__ == "__main__":
    for attempt in range(20):
        try:
            main()
            print("API PUSH COMPLETE")
            break
        except Exception as exc:
            print(f"attempt {attempt} failed: {type(exc).__name__}: {str(exc)[:150]}; retry in 150s", flush=True)
            time.sleep(150)
    else:
        sys.exit("gave up")
