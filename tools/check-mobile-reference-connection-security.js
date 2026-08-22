#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "src/panel-framework/mobile-reference-ui/MobileReferenceConnection.tsx"), "utf8");
const styles = fs.readFileSync(path.join(root, "src/panel-framework/mobile-reference-ui/mobile-reference.css"), "utf8");
const required = (fragment, message) => assert.ok(source.includes(fragment), message);

required("validateRouterAddress(host.trim())", "router address must be validated before a connection request");
required('const [password, setPassword] = useState("")', "password state must start empty");
required('setPassword("")', "password must be cleared after a completed connection");
required("密码仅保留在当前页面内存中", "the UI must disclose the no-password-persistence boundary");
assert.ok(!/\b(?:localStorage|sessionStorage|indexedDB|document\.cookie)\b/.test(source), "connection must not persist credentials in browser storage");
required("sshHostKeyFingerprint", "SSH fingerprint can be sent only with an explicit challenge response");
required("sshHostKeyTrustToken", "SSH trust token must bind the verified challenge");
required('challenge?.kind === "changed"', "changed SSH host keys must remain a hard stop");
required("hostKeyConfirmed", "new SSH host keys require explicit confirmation");
required('data-mobile-reference-connection="form"', "connection flow must expose the current owner marker");
required("通道回执", "connection flow must distinguish REST and SSH evidence");
required('aria-label="REST 协议"', "transport choice must remain named");
required("riskConfirmed", "HTTP or disabled TLS verification must require explicit risk confirmation");
required("insecureRestConfirmed", "insecure transport confirmation must be bound to the request");
required("restVerifyTls", "TLS verification state must be bound to the request");
assert.ok(!/mobile-(?:flow|ops|origin|glance|atomic|ikuai)|MobileFlow|MobileOps|MobileOrigin|MobileGlance|MobileIkuai|Desktop/.test(source), "connection cannot import a retired mobile or desktop presentation");

assert.match(styles, /\.ref-connect footer button[^{}]*\{[^}]*\bmin-height:\s*(?:4[4-9]|[5-9][0-9])px/, "connection submit control must retain at least 44px touch height");
assert.match(styles, /\.ref-connect form > section > label[^{}]*\{[^}]*\bmin-height:\s*(?:4[4-9]|[5-9][0-9])px/, "connection rows must provide a 44px touch surface");
assert.match(styles, /prefers-reduced-motion/, "connection flow must respect reduced motion");
assert.match(styles, /prefers-reduced-transparency/, "connection flow must respect reduced transparency");
assert.match(styles, /forced-colors/, "connection flow must provide a forced-colors fallback");
assert.ok(!/!important/.test(styles), "connection styles cannot depend on !important patches");
assert.ok(!/font-size\s*:\s*(?:[0-9]|1[01])px\b/.test(styles), "connection operational text cannot be smaller than 12px");

console.log(JSON.stringify({ pass: true, contract: "mobile-reference-connection-security-v1" }));
