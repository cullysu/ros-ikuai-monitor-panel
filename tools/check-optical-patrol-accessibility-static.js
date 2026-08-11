#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const mobileRoot = path.join(root, "src", "panel-framework", "overview", "mobile-overview");
const opticalRoot = path.join(mobileRoot, "optical-patrol");
const entryFile = path.join(mobileRoot, "MobileOverviewEntry.tsx");
const opticalFile = path.join(opticalRoot, "OpticalPatrol.tsx");
const historyFile = path.join(opticalRoot, "useOpticalPatrolSelectionHistory.ts");
const runtimeStylesFile = path.join(root, "src", "panel-framework", "runtime", "panel-runtime.css");
const issues = [];

function check(condition, message) {
  if (!condition) issues.push(message);
}

function exists(file) {
  return fs.existsSync(file);
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function relative(file) {
  return path.relative(root, file).split(path.sep).join("/");
}

function walk(directory, predicate) {
  if (!exists(directory)) return [];
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const item = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(item, predicate));
    else if (predicate(item)) files.push(item);
  }
  return files;
}

function cssRules(source) {
  return Array.from(source.matchAll(/([^{}]+)\{([^{}]*)\}/g), (match) => ({
    selector: match[1].trim(),
    declarations: match[2],
  }));
}

function jsxAttributes(node) {
  return new Map(node.attributes.properties
    .filter(ts.isJsxAttribute)
    .map((attribute) => [attribute.name.text, attribute]));
}

function jsxStaticValue(attribute) {
  if (!attribute?.initializer) return "";
  if (ts.isStringLiteral(attribute.initializer)) return attribute.initializer.text;
  const expression = attribute.initializer.expression;
  return expression && ts.isStringLiteral(expression) ? expression.text : null;
}

function visitJsx(sourceFile, visitor) {
  const visit = (node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) visitor(node);
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
}

function claimFocusIdBindings(sourceFile) {
  const bindings = new Set();
  const visit = (node) => {
    if (
      ts.isVariableDeclaration(node)
      && ts.isIdentifier(node.name)
      && node.initializer
      && ts.isCallExpression(node.initializer)
      && node.initializer.expression.getText(sourceFile) === "opticalPatrolClaimDomId"
    ) bindings.add(node.name.text);
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return bindings;
}

function isClaimFocusIdExpression(expression, sourceFile, bindings) {
  if (!expression) return false;
  if (ts.isIdentifier(expression)) return bindings.has(expression.text);
  return ts.isCallExpression(expression)
    && expression.expression.getText(sourceFile) === "opticalPatrolClaimDomId";
}

function mediaBodies(source, feature, value) {
  const bodies = [];
  const media = /@media\s*\(([^)]*)\)\s*\{/gi;
  let match;
  while ((match = media.exec(source))) {
    const condition = match[1].replace(/\s+/g, "").toLowerCase();
    if (condition !== `${feature}:${value}`) continue;
    const start = media.lastIndex;
    let depth = 1;
    let cursor = start;
    while (cursor < source.length && depth > 0) {
      if (source[cursor] === "{") depth += 1;
      else if (source[cursor] === "}") depth -= 1;
      cursor += 1;
    }
    if (depth === 0) bodies.push(source.slice(start, cursor - 1));
  }
  return bodies;
}

check(exists(opticalRoot), `missing Optical Patrol owner root: ${relative(opticalRoot)}`);
check(exists(entryFile), `missing mobile owner entry: ${relative(entryFile)}`);
check(exists(historyFile), `missing Optical Patrol selection history: ${relative(historyFile)}`);

const sourceFiles = walk(opticalRoot, (file) => /\.(?:ts|tsx)$/.test(file));
const componentFiles = sourceFiles.filter((file) => file.endsWith(".tsx"));
const styleFiles = walk(opticalRoot, (file) => file.endsWith(".css"));
const componentSource = componentFiles.map(read).join("\n");
const styles = styleFiles.map(read).join("\n");
const runtimeStyles = read(runtimeStylesFile);

check(componentFiles.length > 0, "Optical Patrol must have an isolated TSX presentation owner");
check(styleFiles.length > 0, "Optical Patrol must have isolated accessibility-aware styles");
check(
  !/aria-label=\{`展开\s+\$\{claim\.title\}/.test(componentSource),
  "claim selection controls must say 查看 rather than imply an aria-expanded disclosure they do not own",
);
check(
  /aria-label=\{`查看\s+\$\{claim\.title\}：\$\{claim\.state\}`\}/.test(componentSource),
  "claim selection controls must expose the selected object and state as a view action",
);

for (const file of sourceFiles.concat(styleFiles)) {
  const contents = read(file);
  check(
    !/(?:PocketConsole|panelPocketConsole|pocket-console|data-pocket|\.pc__|DesktopOverview|desktop-overview)/i.test(contents),
    `Optical Patrol must not import, render, or style a hidden Pocket/desktop owner: ${relative(file)}`,
  );
}

if (exists(entryFile)) {
  const entry = read(entryFile);
  check(/optical-patrol\//.test(entry), "MobileOverviewEntry must import its active owner from optical-patrol");
  check(/<OpticalPatrol\b/.test(entry), "MobileOverviewEntry must render OpticalPatrol as the mobile overview owner");
  check(
    !/(?:PocketConsole|pocket-console|DesktopOverview|desktop-overview)/.test(entry),
    "MobileOverviewEntry must not retain a hidden Pocket Console or desktop presentation owner",
  );
}

const requiredSemanticMarkers = [
  "data-optical-patrol-root",
  "data-optical-patrol-evidence-boundary",
  "data-optical-patrol-decision",
  "data-optical-patrol-expanded-claim",
  "data-optical-patrol-claim-control",
  "data-optical-patrol-evidence-deck",
  "data-optical-patrol-action",
];
const semanticAttributes = new Set();
let nativeRoot = false;
let namedEvidenceBoundary = false;
let renderedClaimFocusTarget = false;
let labelledExpandedClaim = false;
for (const file of componentFiles) {
  const contents = read(file);
  const sourceFile = ts.createSourceFile(file, contents, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const focusIdBindings = claimFocusIdBindings(sourceFile);
  visitJsx(sourceFile, (node) => {
    const tagName = node.tagName.getText(sourceFile);
    const nativeTagName = /^[a-z]/.test(tagName) ? tagName.toLowerCase() : null;
    const attributes = jsxAttributes(node);
    for (const name of attributes.keys()) {
      if (name.startsWith("data-optical-patrol-")) semanticAttributes.add(name);
    }

    if (attributes.has("data-optical-patrol-root") && nativeTagName === "main") nativeRoot = true;
    if (
      attributes.has("data-optical-patrol-evidence-boundary")
      && (attributes.has("aria-label") || attributes.has("aria-labelledby"))
    ) namedEvidenceBoundary = true;
    const idAttribute = attributes.get("id");
    const idExpression = idAttribute?.initializer && ts.isJsxExpression(idAttribute.initializer)
      ? idAttribute.initializer.expression
      : null;
    if (isClaimFocusIdExpression(idExpression, sourceFile, focusIdBindings) && attributes.has("tabIndex")) {
      renderedClaimFocusTarget = true;
    }
    if (
      attributes.has("data-optical-patrol-expanded-claim")
      && (attributes.has("aria-label") || attributes.has("aria-labelledby"))
    ) labelledExpandedClaim = true;

    if (jsxStaticValue(attributes.get("role")) === "button") {
      issues.push("Optical Patrol must use a native button instead of role=button");
    }
    if (
      nativeTagName
      && attributes.has("onClick")
      && !["button", "a", "input", "select", "textarea", "summary"].includes(nativeTagName)
    ) issues.push(`non-native <${nativeTagName}> owns an onClick handler; use a native control`);
    if (nativeTagName === "button" && jsxStaticValue(attributes.get("type")) !== "button") {
      issues.push("every Optical Patrol button must declare type=\"button\"");
    }
    if (attributes.has("data-optical-patrol-claim-control")) {
      check(nativeTagName === "button", "data-optical-patrol-claim-control must be a native button");
      check(attributes.has("aria-label"), "claim selection buttons must expose a stable accessible name");
      check(!attributes.has("aria-pressed"), "one-shot claim selection must not pretend to be a toggle with aria-pressed");
    }
    if (attributes.has("data-optical-patrol-action")) {
      check(
        nativeTagName === "button" || (nativeTagName === "a" && attributes.has("href")),
        "object actions must use a native button or link",
      );
    }
  });
}
for (const marker of requiredSemanticMarkers) {
  check(semanticAttributes.has(marker), `Optical Patrol lacks stable semantic marker: ${marker}`);
}
check(nativeRoot, "data-optical-patrol-root must be exposed on the native main landmark");
check(namedEvidenceBoundary, "the evidence boundary must expose a stable accessible name or relationship");
check(
  renderedClaimFocusTarget && /opticalPatrolClaimDomId\s*\(/.test(componentSource),
  "OpticalPatrolClaim.tsx must derive a focus id with opticalPatrolClaimDomId(claim.id) and apply that id plus tabIndex={-1} to the rendered selected-claim focus target",
);
check(
  labelledExpandedClaim,
  "the programmatically focusable expanded claim must retain an aria-label or aria-labelledby relationship",
);

const targetToken = /--op-target\s*:\s*44px\b/i.test(styles)
  ? "--op-target"
  : /--optical-patrol-target\s*:\s*44px\b/i.test(styles)
    ? "--optical-patrol-target"
    : null;
check(Boolean(targetToken), "styles must declare a stable Optical Patrol 44px target token");
const interactiveRules = cssRules(styles).filter(({ selector }) => (
  /(?:\.op__object-action|\.op__followup|\[data-optical-patrol-claim-control\]|\[data-optical-patrol-action\])/.test(selector)
));
const interactiveDeclarations = interactiveRules.map((rule) => rule.declarations).join("\n");
const targetReference = targetToken
  ? new RegExp(`var\\(\\s*${targetToken.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\)`, "i")
  : /$a/;
check(
  new RegExp(`min-inline-size\\s*:\\s*${targetReference.source}`, "i").test(interactiveDeclarations)
    || /inline-size\s*:\s*(?:100%|calc\(\s*100%\s*-\s*(?:[1-9]\d?|1[01]\d|120)px\s*\))/i.test(interactiveDeclarations),
  "Optical Patrol action/claim selectors must guarantee at least a 44px inline target",
);
check(
  new RegExp(`min-block-size\\s*:\\s*${targetReference.source}`, "i").test(interactiveDeclarations)
    || /min-block-size\s*:\s*(?:4[4-9]|[5-9]\d|\d{3,})px\b/i.test(interactiveDeclarations),
  "Optical Patrol action/claim selectors must guarantee at least a 44px block target",
);

const focusDeclarations = cssRules(styles)
  .filter(({ selector }) => /(?:\[data-optical-patrol-root\]|\.op\b)/.test(selector) && /:focus-visible/.test(selector))
  .map((rule) => rule.declarations)
  .join("\n");
check(focusDeclarations.length > 0, "Optical Patrol must define a root-scoped :focus-visible treatment");
check(
  /outline(?:-width)?\s*:\s*(?!0(?:px|rem|em)?\b|none\b)/i.test(focusDeclarations),
  ":focus-visible must retain a non-zero outline",
);

const reducedMotion = mediaBodies(styles, "prefers-reduced-motion", "reduce").join("\n");
check(reducedMotion.length > 0, "Optical Patrol styles must support prefers-reduced-motion: reduce");
check(/(?:animation(?:-duration)?\s*:\s*(?:none|0(?:\.0+)?(?:ms|s)|0\.0*1ms)|animation-name\s*:\s*none)/i.test(reducedMotion), "Reduced Motion must reduce Optical Patrol animation to none or at most 0.01ms");
check(/(?:transition(?:-duration)?\s*:\s*(?:none|0(?:\.0+)?(?:ms|s)|0\.0*1ms))/i.test(reducedMotion), "Reduced Motion must reduce Optical Patrol transitions to none or at most 0.01ms");
const stylesOutsideReducedMotion = styles.replace(reducedMotion, "");
if (/\btransform\s*:/i.test(stylesOutsideReducedMotion)) {
  check(/transform\s*:\s*none/i.test(reducedMotion), "Reduced Motion must remove transform-based feedback");
}
check(
  /@media\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)\s*\{[\s\S]*?\.op__object-action:hover[\s\S]*?\.op__followup:hover/i.test(styles),
  "hover feedback must be scoped to hover-capable fine pointers so touch does not retain a false state",
);
check(
  /@media\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)\s*\{[\s\S]*?\.panel-runtime-actions button:hover[\s\S]*?\.panel-runtime-notice button:hover/i.test(runtimeStyles),
  "runtime chrome hover feedback must be scoped to hover-capable fine pointers",
);

const reducedTransparency = mediaBodies(styles, "prefers-reduced-transparency", "reduce").join("\n");
check(reducedTransparency.length > 0, "Optical Patrol styles must support prefers-reduced-transparency: reduce");
check(/(?:-webkit-)?backdrop-filter\s*:\s*none/i.test(reducedTransparency), "Reduce Transparency must disable optical backdrop filtering");
const transparencyBackgrounds = Array.from(
  reducedTransparency.matchAll(/background(?:-color)?\s*:\s*([^;]+);/gi),
  (match) => match[1].trim(),
);
const customProperties = new Map(Array.from(styles.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g), (match) => [match[1], match[2].trim()]));
function isOpaqueBackground(value, seen = new Set()) {
  const variable = value.match(/^var\(\s*(--[\w-]+)\s*\)$/i)?.[1];
  if (variable) {
    if (seen.has(variable) || !customProperties.has(variable)) return false;
    return isOpaqueBackground(customProperties.get(variable), new Set([...seen, variable]));
  }
  return !/(?:\b(?:transparent|none|rgba|hsla|color-mix)\b|\/\s*(?:0|\.)|#[\da-f]{4}\b|#[\da-f]{8}\b)/i.test(value);
}
check(
  transparencyBackgrounds.some((value) => isOpaqueBackground(value)),
  "Reduce Transparency must provide a statically verifiable opaque chrome background",
);

const forcedColors = mediaBodies(styles, "forced-colors", "active").join("\n");
check(forcedColors.length > 0, "Optical Patrol styles must support forced-colors: active");
check(/\b(?:Canvas|CanvasText|ButtonText|Highlight|HighlightText)\b/.test(forcedColors), "forced colors must use system colors for visible hierarchy");
check(/(?:outline|border)(?:-color)?\s*:/i.test(forcedColors), "forced colors must preserve a non-color-only boundary or focus indicator");

if (exists(historyFile)) {
  const history = read(historyFile);
  check(/panelOpticalPatrol/.test(history), "history must use the panelOpticalPatrol namespace");
  check(/OPTICAL_PATROL_HISTORY_VERSION\s*=\s*1\s+as const/.test(history), "history must declare version 1 as a literal contract");
  check(/version:\s*typeof OPTICAL_PATROL_HISTORY_VERSION/.test(history), "history state must carry its version");
  check(/scope:\s*string/.test(history) && /candidate\.scope\s*!==\s*scope/.test(history), "history selection must be scoped to the active scene/risk/evidence context");
  check(/FOCUS_RESTORE_ATTEMPTS\s*=\s*2\s+as const/.test(history), "history focus restoration must remain bounded to exactly two RAF attempts");
  check(/attemptsRemaining\s*=\s*FOCUS_RESTORE_ATTEMPTS/.test(history) && /attemptsRemaining\s*-\=\s*1/.test(history), "history focus restoration must consume its bounded retry budget");
  check(/optical-claim-\$\{encodeURIComponent\(claimId\)\}/.test(history), "claim focus ids must use optical-claim-${encoded id}");
  check(/addEventListener\(["']popstate["']/.test(history), "history must restore selection on Back/Forward traversal");
  check(/const restoreSelection[\s\S]*setFocusRequest\(\(request\) => request \+ 1\)/.test(history), "Back/Forward must issue a fresh focus request even when selection identity repeats");
  check(/\}, \[focusRequest, scope, selectedId\]\);/.test(history), "focus restoration must react to both selected claim, traversal request, and active scope");
  check(/\.focus\(\{\s*preventScroll:\s*true\s*\}\)/.test(history), "history traversal must restore claim focus without scroll jumps");
  check(/interface OpticalPatrolScrollPosition/.test(history) && /rootTop:\s*number/.test(history) && /windowTop:\s*number/.test(history), "history state must retain both Optical Patrol owner and window fallback scroll positions");
  check(/function persistCurrentEntryScroll[\s\S]*captureScrollPosition\(\)/.test(history), "history must persist the current entry scroll position before selection changes");
  check(/pendingScrollRestoreRef\.current\s*=\s*scrollPositionFromHistory/.test(history) && /restoreScrollPosition\(restoreScroll\)/.test(history), "Back/Forward must restore stored scroll positions instead of always scrolling the claim into view");
  check(/persistCurrentEntryScroll\(selectedId,\s*scope\)/.test(history), "a newly focused selection must persist its resulting scroll position");
  check(/selectedIdFromHistory\(validIds,\s*scope\)\s*!==\s*nextId/.test(history), "selection must guard pushState against duplicate history entries within the active scope");
  check(/pushState\(/.test(history) && /replaceState\(/.test(history), "history must distinguish new selections from current-entry initialization");
  check(!/panelPocketConsole/.test(history), "Optical Patrol must not read or write the retired panelPocketConsole state");
}

if (exists(opticalFile)) {
  const optical = read(opticalFile);
  check(/data-optical-patrol-semantic-status/.test(optical), "Optical Patrol must expose one semantic evidence and decision status target");
  check(/role="status"/.test(optical) && /aria-live="polite"/.test(optical) && /aria-atomic="true"/.test(optical), "Optical Patrol semantic status must be polite and atomic");
  check(/semanticStatusAnnouncement\(model, selected\)/.test(optical), "semantic status must include the current evidence, decision, and selected object state");
}

const limitation = "LIMITATION: static accessibility evidence only; runtime geometry, reading order, history traversal, media rendering, and human visual acceptance require separate checks.";
if (issues.length > 0) {
  console.error("Optical Patrol accessibility/static contract: FAIL");
  for (const issue of Array.from(new Set(issues))) console.error(`- ${issue}`);
  console.error(limitation);
  process.exitCode = 1;
} else {
  console.log("Optical Patrol accessibility/static contract: PASS");
  console.log("Verified native semantics, stable Optical Patrol ownership/data names, 44px targets, focus visibility, accessible media fallbacks, and versioned selection history.");
  console.log(limitation);
}
