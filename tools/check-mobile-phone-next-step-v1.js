const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const failures = [];
const checks = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function check(name, pass, detail = "") {
  checks.push({ name, pass: Boolean(pass), detail });
  if (!pass) failures.push({ name, detail });
}

const screen = read("src/panel-framework/mobile/MobilePatrolScreen.tsx");
const actions = read("src/panel-framework/overview/evidence-model/buildOverviewInvestigationActions.ts");
const componentPath = "src/panel-framework/mobile/MobilePhoneNextStep.tsx";
const component = fs.existsSync(path.join(root, componentPath)) ? read(componentPath) : "";
const css = read("src/panel-framework/mobile/mobile-patrol.css");
const runtimePath = path.join(root, "_acceptance/panel-runtime-browser/report.json");
const runtime = fs.existsSync(runtimePath)
  ? JSON.parse(fs.readFileSync(runtimePath, "utf8"))
  : null;
const runtimeCheck = runtime?.checks?.find((item) => /normal patrol actions expose/i.test(item?.name || ""));
const normal390 = runtimeCheck?.detail?.normal390 || null;

check(
  "phone steady next-step component exists",
  Boolean(component),
  componentPath,
);
check(
  "phone next step owns the primary investigation landmark",
  component.includes("data-mobile-phone-next-step")
    && component.includes('data-overview-task-landmark="investigation-primary"')
    && component.includes("onNavigate"),
  "the normal phone must expose one visible next inspection task, not only unlabeled decision rows",
);
check(
  "phone next step carries evidence context",
  /navigation\.objectId|action\.navigation/.test(component)
    && component.includes("evidenceAt")
    && component.includes("returnRoute"),
  "the next task must preserve object/evidence/return context when the action is opened",
);
check(
  "normal phone render owns the next step",
  (() => {
    const workspacePrimaryStart = screen.indexOf('className="mp-workspace-primary"');
    const workspacePrimary = workspacePrimaryStart >= 0 ? screen.slice(workspacePrimaryStart) : "";
    return screen.includes("MobilePhoneNextStep")
      && workspacePrimary.includes("normalPhoneNextStep")
      && workspacePrimary.indexOf("{trafficSignal}") < workspacePrimary.indexOf("{normalPhoneNextStep}")
      && workspacePrimary.indexOf("{normalPhoneNextStep}") < workspacePrimary.indexOf("{normalPhoneSteadyDecisions}");
  })(),
  "normal phone order must be signal, one next task, then secondary decision ledger",
);
check(
  "steady collection action binds snapshot context",
  actions.includes('workspace("lineStatus", "巡检 WAN 线路"')
    && actions.includes("investigationNavigation(evidenceAt, null, null)"),
  "the normal collection-level WAN action must carry the current evidence timestamp",
);
check(
  "phone next step remains touch-sized without filler",
  /mp-phone-next-step[\s\S]*min-height:\s*44px/.test(css)
    && !/mp-phone-next-step[\s\S]*(min-height:\s*(?:1\d{2,}|auto)|height:\s*\d{3,}px|placeholder|filler)/i.test(css),
  "use a compact touch target; do not create a blank-height spacer",
);
check(
  "fresh normal 390 runtime shows one next step in the first viewport",
  Boolean(normal390
    && normal390.investigationPrimaryActionCount === 1
    && normal390.firstInvestigationActionId === "lineStatus"
    && normal390.firstInvestigationActionInFirstViewport === true),
  normal390
    ? JSON.stringify({
        primaryCount: normal390.investigationPrimaryActionCount,
        firstId: normal390.firstInvestigationActionId,
        inViewport: normal390.firstInvestigationActionInFirstViewport,
      })
    : "missing normal390 runtime detail",
);

const report = {
  pass: failures.length === 0,
  contract: "mobile-phone-next-step-v1",
  checks,
  failures,
};
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.pass ? 0 : 1;
