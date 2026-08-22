const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const checks = [];
const failures = [];

function check(name, pass, detail) {
  checks.push({ name, pass: Boolean(pass), detail });
  if (!pass) failures.push({ name, detail });
}

const securityTest = read("tools/check-backend-security.py");
const trustBinding = read("panel_backend/trust_binding.py");
const app = read("app.py");
const dispatcher = read("panel_backend/http_dispatcher.py");
const mobileContract = read("docs/mobile-reference-baseline.md");
const consoleContract = read("docs/full-console-product-contract.md");

check(
  "host delimiter cases are explicit",
  ["router.lan/path", String.raw`router.lan\path`, "user@router.lan", "router.lan?x=1", "router.lan#frag"].every((value) => securityTest.includes(value)),
  "security regression must name path, backslash, credentials, query and fragment inputs",
);
check(
  "valid IPv6 and port boundaries are explicit",
  securityTest.includes("[2001:db8::1]:443") && securityTest.includes("2001:db8::1"),
  "security regression must distinguish a host literal from an embedded port",
);
check(
  "corrupt profile store has an executable regression",
  securityTest.includes("assert_router_profile_store_corruption_contract") && securityTest.includes("RouterProfileStoreCorruptError"),
  "corrupt JSON and invalid roots must remain explicit errors",
);
check(
  "SSH trust binding includes REST scheme",
  trustBinding.includes('"restScheme"') && trustBinding.includes("normalize_rest_scheme") &&
    app.includes("rest_scheme") && dispatcher.includes("request.rest_scheme"),
  "trust challenge must bind the same host, SSH port, REST scheme, fingerprint and expiry on issue and verify",
);
check(
  "public security wording is narrow",
  mobileContract.includes("公开分发、默认仅本机访问") && consoleContract.includes("公开分发、默认仅本机访问"),
  "contracts must not imply arbitrary public-deployment security",
);

const report = {
  pass: failures.length === 0,
  contract: "backend-security-boundary-v1",
  checks,
  failures,
};
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.pass ? 0 : 1;
