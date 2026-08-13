#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const owner = path.join(root, "src", "panel-framework", "overview", "mobile-overview", "incident-lens");
const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function walk(directory, predicate = () => true) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((item) => {
    const target = path.join(directory, item.name);
    return item.isDirectory() ? walk(target, predicate) : (predicate(target) ? [target] : []);
  });
}

function rules(source) {
  return Array.from(source.matchAll(/([^{}]+)\{([^{}]*)\}/g), (match) => ({ selector: match[1], declarations: match[2] }));
}

function mediaBody(source, feature, value) {
  const match = new RegExp(`@media\\s*\\(\\s*${feature}\\s*:\\s*${value}\\s*\\)\\s*\\{`, "i").exec(source);
  if (!match) return "";
  let depth = 1;
  let cursor = match.index + match[0].length;
  const start = cursor;
  while (cursor < source.length && depth > 0) {
    if (source[cursor] === "{") depth += 1;
    if (source[cursor] === "}") depth -= 1;
    cursor += 1;
  }
  return depth === 0 ? source.slice(start, cursor - 1) : "";
}

function attributes(node) {
  return new Map(node.attributes.properties.filter(ts.isJsxAttribute).map((attribute) => [attribute.name.text, attribute]));
}

function literal(attribute) {
  if (!attribute?.initializer) return "";
  if (ts.isStringLiteral(attribute.initializer)) return attribute.initializer.text;
  const expression = ts.isJsxExpression(attribute.initializer) ? attribute.initializer.expression : undefined;
  return expression && ts.isStringLiteral(expression) ? expression.text : null;
}

const tsx = walk(owner, (file) => file.endsWith(".tsx"));
const cssFiles = walk(owner, (file) => file.endsWith(".css"));
const history = read(path.join(owner, "useIncidentLensSelectionHistory.ts"));
const componentSource = tsx.map(read).join("\n");
const css = cssFiles.map(read).join("\n");

check(tsx.length >= 3, "Incident Split Lens needs a real TSX surface before static accessibility can pass");
check(cssFiles.length >= 1, "Incident Split Lens needs an isolated CSS surface before static accessibility can pass");
check(!/optical-patrol|OpticalPatrol|opticalPatrol|\bop__|className\s*=\s*["'`]op\b/.test(`${componentSource}\n${css}`), "accessibility owner must not retain Optical Patrol presentation identifiers");
check(/data-incident-lens-root/.test(componentSource), "missing stable Incident Split Lens root semantic marker");
check(/<main\b[\s\S]{0,500}data-incident-lens-root|data-incident-lens-root[\s\S]{0,500}<\/main>/i.test(componentSource), "Incident Split Lens root must be a native main landmark");
check(/role=["']status["']/.test(componentSource) && /aria-live=["']polite["']/.test(componentSource) && /aria-atomic=["']true["']/.test(componentSource), "evidence/risk changes require one polite atomic status announcement");
check(/data-incident-lens-impact/.test(componentSource) && /(?:aria-label|aria-labelledby)/.test(componentSource), "Impact Lens must have an accessible name");
check(/data-incident-lens-evidence/.test(componentSource) && /(?:aria-label|aria-labelledby)/.test(componentSource), "Evidence Lens must have an accessible name");

for (const file of tsx) {
  const source = read(file);
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const visit = (node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(sf);
      const native = /^[a-z]/.test(tag) ? tag.toLowerCase() : "";
      const attrs = attributes(node);
      if (literal(attrs.get("role")) === "button") failures.push(`${path.basename(file)} uses role=button; use a native button`);
      if (native && attrs.has("onClick") && !["button", "a", "input", "select", "textarea", "summary"].includes(native)) {
        failures.push(`${path.basename(file)} assigns onClick to non-native <${native}>`);
      }
      if (native === "button" && literal(attrs.get("type")) !== "button") {
        failures.push(`${path.basename(file)} has a button without type=\"button\"`);
      }
      if (attrs.has("data-incident-lens-object") || attrs.has("data-incident-lens-action")) {
        check(native === "button" || (native === "a" && attrs.has("href")), "object and action targets must be native controls");
        check(attrs.has("aria-label") || attrs.has("aria-labelledby") || node.getText(sf).trim().length > 0, "object/action target lacks an accessible name");
      }
      if (literal(attrs.get("role")) === "tab") {
        check(attrs.has("aria-controls"), "every tab must name its controlled panel");
        check(attrs.has("aria-selected"), "every tab must expose selection state");
      }
      if (literal(attrs.get("role")) === "tabpanel") {
        check(attrs.has("id") && attrs.has("aria-labelledby"), "every tabpanel must have an id and reciprocal aria-labelledby");
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

check(!/font-size\s*:\s*(?:[0-9]|1[01](?:\.\d+)?)(?:px|rem|em)\b/i.test(css), "operational CSS must retain the 12px readability floor");
check(/(?:--(?:incident-lens|il)-target\s*:\s*44px|min-(?:block|height)\s*:\s*44px)/i.test(css), "styles must encode a 44px touch-target floor");
const interactive = rules(css).filter((rule) => /(?:button|\[data-incident-lens-(?:object|action)\])/.test(rule.selector)).map((rule) => rule.declarations).join("\n");
check(/min-(?:block-size|height)\s*:\s*(?:var\(\s*--(?:incident-lens|il)-target\s*\)|4[4-9]px|[5-9]\dpx)/i.test(interactive), "interactive Incident Split Lens selectors must guarantee a 44px block target");
check(/:focus-visible/.test(css) && /outline(?:-width)?\s*:\s*(?!0(?:px|rem|em)?\b|none\b)/i.test(css), "styles must provide a non-zero :focus-visible outline");
check(/min-inline-size\s*:\s*0|overflow-wrap\s*:\s*anywhere|word-break\s*:\s*break-word/.test(css), "styles must include 200% text reflow protection");
check(!/transition\s*:\s*all\b/.test(css), "motion must name transform/opacity properties rather than transition: all");
const reducedMotion = mediaBody(css, "prefers-reduced-motion", "reduce");
check(reducedMotion.length > 0, "styles must support prefers-reduced-motion: reduce");
check(/(?:animation|transition)(?:-duration)?\s*:\s*(?:none|0(?:\.0+)?(?:ms|s)|0\.0*1ms)/i.test(reducedMotion), "reduced motion must disable or reduce animation/transition to at most 0.01ms");
if (/\btransform\s*:/i.test(css.replace(reducedMotion, ""))) check(/transform\s*:\s*none/i.test(reducedMotion), "reduced motion must remove transform feedback");
const forcedColors = mediaBody(css, "forced-colors", "active");
check(forcedColors.length > 0, "styles must support forced-colors: active");
check(/\b(?:Canvas|CanvasText|ButtonText|Highlight|HighlightText)\b/.test(forcedColors), "forced colors must use system colors");
check(/(?:outline|border)(?:-color)?\s*:/.test(forcedColors), "forced colors must preserve a visible non-color-only boundary/focus treatment");
check(/addEventListener\(["']popstate["']/.test(history) && /pushState\(/.test(history) && /replaceState\(/.test(history), "selection history must support Back and Forward state restoration");
check(/focus\(\{\s*preventScroll\s*:\s*true\s*\}\)/.test(history), "history restoration must return focus without a scroll jump");
check(/scroll/i.test(history), "history must retain and restore a real scroll owner");

const report = {
  pass: failures.length === 0,
  gate: "incident-split-lens-accessibility-static-v1",
  owner: path.relative(root, owner).replaceAll("\\\\", "/"),
  tsxFiles: tsx.length,
  cssFiles: cssFiles.length,
  failures: [...new Set(failures)],
  limitation: "Static-only gate: it does not claim runtime geometry, browser zoom, visual quality, or assistive-technology traversal evidence.",
};
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
