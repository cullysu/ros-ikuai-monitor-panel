#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const http = require("node:http");
const { actionTimeout, startMock, browserExecutable } = require("./current-runtime-mock");

function request(url, { method = "GET", body = null } = {}) {
  return new Promise((resolve, reject) => {
    const payload = body == null ? null : Buffer.from(JSON.stringify(body), "utf8");
    const call = http.request(url, {
      method,
      headers: payload ? { "content-type": "application/json", "content-length": String(payload.length) } : {},
    }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.once("error", reject);
      response.once("end", () => resolve({ status: response.statusCode, body: Buffer.concat(chunks).toString("utf8") }));
    });
    call.once("error", reject);
    call.setTimeout(actionTimeout, () => call.destroy(new Error("current runtime mock lifecycle request timed out")));
    call.end(payload || undefined);
  });
}

async function main() {
  assert.equal(typeof startMock, "function", "startMock must be importable");
  assert.equal(typeof browserExecutable, "function", "browserExecutable must be importable");
  assert.ok(Number.isFinite(actionTimeout) && actionTimeout >= 8_000, "actionTimeout must remain bounded");

  const mock = await startMock({ transport: "tcp", preferIpv4: true });
  try {
    const profile = await request(new URL("api/router-login", mock.url));
    assert.equal(profile.status, 200, `profile endpoint must start successfully: ${profile.body}`);
    const profileJson = JSON.parse(profile.body);
    assert.match(profileJson.savedLogins?.[0]?.sshHostKeyFingerprint || "", /^SHA256:/, "profile must retain the mock SSH fingerprint");

    const login = await request(new URL("api/router-login", mock.url), {
      method: "POST",
      body: { host: "smoke-router", user: "observer", password: "correct-horse", continueWithVerifiedRestOnly: true },
    });
    assert.equal(login.status, 200, `login endpoint must retain the bounded mock flow: ${login.body}`);

    const starting = await request(new URL("api/snapshot", mock.url));
    assert.equal(starting.status, 200, "snapshot starting state must remain available");
    assert.equal(JSON.parse(starting.body).status, "starting", "first configured snapshot must retain the starting state");
    const snapshot = await request(new URL("api/snapshot", mock.url));
    assert.equal(snapshot.status, 200, "snapshot current state must remain available");
    assert.equal(JSON.parse(snapshot.body).status, "ok", "second configured snapshot must return the real mock payload");

    const asset = await request(mock.url);
    assert.equal(asset.status, 200, "static asset service must remain available");
    assert.match(asset.body, /<div\s+id=["']app["']/, "static asset service must return the production mount");
  } finally {
    mock.beginStop();
    await mock.stop();
  }
}

main().then(
  () => console.log("current runtime mock lifecycle: PASS require, profile, snapshot, static asset, stop"),
  (error) => {
    console.error(error?.stack || error);
    process.exitCode = 1;
  },
);
