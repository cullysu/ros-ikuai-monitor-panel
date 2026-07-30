#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const inspector = read("src/panel-framework/mobile/mobile-inspector/NetworkInspectors.tsx");
const nextStep = read("src/panel-framework/mobile/mobile-inspector/InterfaceNextStep.tsx");
const domainInspector = read("src/panel-framework/mobile/mobile-inspector/MobileDomainInspector.tsx");
const workspaceModel = read("src/panel-framework/mobile/mobileDomainWorkspaceModel.ts");
const css = read("src/panel-framework/mobile/mobile-domain.css")
  + read("src/panel-framework/mobile/mobile-tablet-interface-relations.css");
const nextStepSource = nextStep;
const nextStepCss = css.match(/\.mdi-next-step\s*\{[\s\S]*?\n\s*\}/)?.[0] || "";
const checks = [];

function check(name, pass, detail = "") {
  checks.push({ name, pass: Boolean(pass), detail });
}

check(
  "interface inspector owns an object-scoped next-step region",
  /data-tablet-inspector-next-step="true"/.test(nextStep) && /下一步检查/.test(nextStep),
  "the selected interface inspector must own the follow-up task instead of relying on the collection rail",
);
check(
  "next-step targets the real routes workspace",
  /onNavigate\(\s*["']routes["']/.test(nextStep) && /核对默认路由/.test(nextStep),
  "the action must navigate to the existing routes workspace with a user-facing task label",
);
check(
  "next-step preserves selected object and evidence context",
  /objectId/.test(nextStep)
    && /returnRoute\s*:\s*["']interfaces["']/.test(nextStep)
    && /evidenceAt/.test(nextStep)
    && /data-mobile-action-object-id/.test(nextStep)
    && /data-mobile-action-evidence-at/.test(nextStep)
    && /data-mobile-action-from/.test(nextStep),
  "navigation must preserve the originating interface object, successful snapshot time and return route",
);
check(
  "destination workspace keeps cross-domain source context without selecting an invalid local row",
  /context\.objectId\.startsWith\(`\$\{route\}-`\)/.test(workspaceModel),
  "a source interface ID must survive in the URL while remaining separate from the routes collection selection",
);
check(
  "domain inspector forwards navigation to interface inspector",
  /InterfaceInspector[\s\S]*onNavigate\??\s*:\s*PanelNavigate/.test(inspector)
    && /<InterfaceInspector[^>]*onNavigate=\{onNavigate\}/.test(domainInspector),
  "the action cannot be a static-looking button disconnected from the canonical navigation contract",
);
check(
  "next-step does not replay traffic evidence",
  Boolean(nextStepSource) && !/(rxRate|txRate|rxBytes|txBytes)/.test(nextStepSource),
  "the follow-up region must add a next decision, not a second copy of current readings",
);
check(
  "next-step action is touch-sized",
  /\.mdi-next-step[\s\S]*?min-height:\s*44px/.test(css),
  "the object-level follow-up action must remain usable on tablet and phone touch surfaces",
);
check(
  "next-step avoids layout filler",
  Boolean(nextStepCss)
    && !/(?:min-height\s*:\s*(?:1\d{2,}|auto)|placeholder|dummy|重复指标)/i.test(nextStepCss + nextStepSource),
  "do not solve short-list space with fixed height, placeholders or repeated metrics",
);

const failures = checks.filter((item) => !item.pass);
const report = {
  pass: failures.length === 0,
  contract: "tablet-inspector-next-evidence-v1",
  checks,
  failures,
};
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.pass ? 0 : 1;
