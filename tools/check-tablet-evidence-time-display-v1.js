const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const componentPath = "src/panel-framework/mobile/MobileTabletNextEvidence.tsx";
const component = fs.readFileSync(path.join(root, componentPath), "utf8");
const failures = [];
const checks = {};
const check = (name, condition, detail = "") => {
  checks[name] = Boolean(condition);
  if (!condition) failures.push({ name, detail });
};

check(
  "uses the shared timezone-aware display formatter",
  component.includes('import { formatRfc3339Local } from "../timeContract";')
    && component.includes("formatRfc3339Local(evidenceAt)")
    && component.includes("|| \"证据时间未取得\""),
  "visible evidence time must be formatted for a person while preserving the machine timestamp separately",
);
check(
  "keeps the raw RFC3339 value only as machine evidence",
  component.includes('dateTime={evidenceAt}')
    && component.includes("data-tablet-next-evidence-at")
    && !component.includes(">{evidenceAt}</time>"),
  "the raw timestamp may remain in dateTime/data attributes but must not be the visible label",
);
check(
  "does not render an ISO T/Z timestamp as visible copy",
  !component.includes("<time dateTime={evidenceAt} data-tablet-next-evidence-at>{evidenceAt}</time>"),
  "raw ISO timestamps are implementation data, not the tablet UI label",
);

const report = {
  pass: failures.length === 0,
  contract: "tablet-evidence-time-display-v1",
  implementationState: failures.length ? "expected-red" : "focused-engineering-green",
  failures,
  checks,
};
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
