const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const surfacePath = path.join(root, "src", "panel-framework", "mobile", "useMobilePanelSurface.ts");
const cssPath = path.join(root, "src", "panel-framework", "mobile", "mobile-domain.css");
const surface = fs.readFileSync(surfacePath, "utf8");
const css = fs.readFileSync(cssPath, "utf8");

const compactQuery = /COMPACT_WORKBENCH_QUERY\s*=\s*["'][^"']*min-width:\s*600px[^"']*max-width:\s*767px[^"']*["']/.test(surface) &&
  /COMPACT_TASK_QUERY\s*=\s*COMPACT_WORKBENCH_QUERY/.test(surface);
const compactBandStart = css.indexOf("@media (min-width: 600px)");
const compactBandEnd = css.indexOf("@media (prefers-reduced-motion", compactBandStart);
const compactBand = compactBandStart >= 0 && compactBandEnd > compactBandStart
  ? css.slice(compactBandStart, compactBandEnd)
  : "";
const workbenchQuery = /DOMAIN_TABLET_WORKBENCH_QUERY\s*=\s*["'][^"']*min-width:\s*768px[^"']*max-width:\s*1199px[^"']*min-height:\s*700px[^"']*["']/;
const workbenchLayout = /\.is-tablet-workbench\s+\.mdw-layout[\s\S]{0,900}grid-template-columns:\s*minmax\(268px[\s\S]*minmax\(420px/;
const resourceNarrowGrid = !/@media \(min-width: 768px\) and \(max-width: 799px\)[\s\S]{0,1800}data-mobile-domain-workspace="trafficLoad"\]\.is-tablet-workbench[\s\S]{0,700}display:\s*flex[\s\S]{0,220}flex-direction:\s*column/.test(css);

const checks = {
  compactQueryEndsAt767: compactQuery,
  compactCssBandEndsAt767: /@media \(min-width: 600px\) and \(max-width: 767px\)/.test(css),
  no771CapabilityBoundary: !/(?:max-width:\s*771px|600px\) and \(max-width: 771px)/.test(`${surface}\n${css}`),
  resource768To799KeepsWorkbenchGrid: resourceNarrowGrid && workbenchLayout.test(css),
  workbenchStartsAt768: workbenchQuery.test(surface),
  workbenchKeepsPaneMinimums: workbenchLayout.test(css),
};

const failed = Object.entries(checks).filter(([, pass]) => !pass).map(([name]) => name);
const report = {
  pass: failed.length === 0,
  contract: "tablet-domain-capability-continuity-v3",
  source: [
    path.relative(root, surfacePath).replaceAll("\\", "/"),
    path.relative(root, cssPath).replaceAll("\\", "/"),
  ],
  boundary: "600-767 compact / 768-1199 domain workbench; trafficLoad keeps a two-pane workbench from 768px",
  checks,
  failed,
};
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.pass ? 0 : 1;
