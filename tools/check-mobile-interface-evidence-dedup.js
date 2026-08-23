const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const surface = read("src", "panel-framework", "mobile-reference-ui", "MobileReferenceSurface.tsx");
const style = read("src", "panel-framework", "mobile-reference-ui", "mobile-reference.css");
const failures = [];
const check = (name, pass, detail) => { if (!pass) failures.push({ name, detail }); };

check("reference owner is the only interface surface", surface.includes("function InterfaceList") && surface.includes("function interfaceViews"), "current interface evidence must be owned by mobile-reference-ui");
check("overview incident uses one canonical interface list", (surface.match(/scene === \"interfaces\" \? <InterfaceList/g) || []).length === 1, "overview must not render duplicate interface evidence blocks");
check("network directory reuses the same list component", (surface.match(/<InterfaceList title=\"WAN 与接口\"/g) || []).length === 1, "network directory must reuse InterfaceList instead of creating a second row grammar");
check("interface rows retain object navigation", /onOpen=\{\(id\) => onNavigate\("interfaces"/.test(surface), "interface evidence rows must retain object-level navigation");
check("interface detail is sourced from domain rows", surface.includes("rowsFromModel(route, model)") && surface.includes("domainEvidenceFacts(row)"), "interface detail must use the shared domain evidence model");
check("overflow action is excluded from row grid", style.includes(".ref-interfaces > button:not(.ref-card-link)") && style.includes(".ref-interfaces > .ref-card-link"), "the list overflow action must not inherit the interface row grid");

const result = { pass: failures.length === 0, contract: "mobile-reference-interface-evidence-dedup-v2", checks: 6 - failures.length, total: 6, failures };
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
