#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "src/panel-framework/mobile-flow-ui/connection/MobileFlowConnection.tsx"), "utf8");
const styles = fs.readFileSync(path.join(root, "src/panel-framework/mobile-flow-ui/styles/flow-connection.css"), "utf8");
const required = (fragment, message) => assert.ok(source.includes(fragment), message);

required("validateRouterAddress(host.trim())", "router address must be validated before a connection request");
required('const [password, setPassword] = useState("")', "password state must start empty");
required('setPassword("")', "password must be cleared after a completed connection or profile selection");
required("绝不保存密码", "the UI must disclose the no-password-persistence boundary");
assert.ok(!/\b(?:localStorage|sessionStorage|indexedDB|document\.cookie)\b/.test(source), "connection must not persist credentials in browser storage");
required("sshHostKeyFingerprint", "SSH fingerprint can be sent only with an explicit challenge response");
required("sshHostKeyTrustToken", "SSH trust token must bind the verified challenge");
required('challenge?.kind === "changed"', "changed SSH host keys must remain a hard stop");
required("hostKeyConfirmed", "new SSH host keys require an explicit confirmation state");
required('data-mobile-flow-connection="flow"', "connection flow must expose the mobile-flow owner marker");
required("独立通道结果", "connection flow must distinguish REST and SSH evidence");
required('aria-label="REST 协议"', "transport choice must remain named");
required("riskConfirmed", "HTTP or disabled TLS verification must require an explicit risk confirmation");
required("insecureRestConfirmed", "insecure transport confirmation must be bound to the request");
required("restVerifyTls", "TLS verification state must be bound to the request");
assert.ok(!/mobile-(?:ops|origin|glance|atomic)|MobileOps|MobileOrigin|MobileGlance|Desktop/.test(source), "connection cannot import a retired mobile or desktop presentation");

assert.match(styles, /\.mflow-connection footer button[^{}]*\{[^}]*\b(?:min-)?height:\s*(?:4[4-9]|[5-9][0-9])px/, "connection submit control must retain at least 44px touch target");
assert.match(styles, /\.mflow-connection__switch input[^{}]*\{[^}]*width:\s*(?:4[4-9]|[5-9][0-9])px/, "connection switch must retain a 44px horizontal target");
assert.match(styles, /prefers-reduced-motion/, "connection flow must respect reduced motion");
assert.match(styles, /prefers-reduced-transparency/, "connection flow must respect reduced transparency");
assert.match(styles, /forced-colors/, "connection flow must provide a forced-colors fallback");
const dataSurfaceStyles = styles.replace(/\.mflow-connection footer\s*\{[^}]*\}/g, "");
assert.ok(!/backdrop-filter\s*:\s*(?!none\b)/.test(dataSurfaceStyles), "connection evidence/content surfaces cannot use decorative glass");
assert.ok(!/!important/.test(styles), "connection styles cannot depend on !important patches");
assert.ok(!/font-size\s*:\s*(?:[0-9]|1[01])px/.test(styles), "connection operational text cannot be smaller than 12px");

console.log(JSON.stringify({ pass: true, contract: "mobile-flow-connection-security-v1" }));
