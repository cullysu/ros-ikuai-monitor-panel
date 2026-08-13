#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const desktopCss = fs.readFileSync(path.join(root, 'src/panel-framework/sections/section-console.css'), 'utf8');
const mobileCss = fs.readFileSync(path.join(root, 'src/panel-framework/overview/mobile-overview/incident-lens/styles/layout.css'), 'utf8');
const mobileSource = fs.readFileSync(path.join(root, 'src/panel-framework/overview/mobile-overview/incident-lens/IncidentLens.tsx'), 'utf8');
const routeSource = fs.readFileSync(path.join(root, 'src/panel-framework/routes/usePanelRoute.ts'), 'utf8');

function block(source, selector) {
  const start = source.indexOf(`${selector} {`);
  if (start < 0) return '';
  const open = source.indexOf('{', start);
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  return '';
}

function lastDeclaration(source, property) {
  const declarations = [...source.matchAll(new RegExp(`\\b${property}\\s*:\\s*([^;]+);`, 'g'))];
  return declarations.at(-1)?.[1].trim() || '';
}

function hasVisibleRing(blockSource) {
  const outline = lastDeclaration(blockSource, 'outline');
  const offset = lastDeclaration(blockSource, 'outline-offset');
  const boxShadow = lastDeclaration(blockSource, 'box-shadow');
  const outlineRing = /^(?:2|3)px\s+solid\s+(?!transparent(?:\s|$))\S+/.test(outline) &&
    /^-?\d+px$/.test(offset) &&
    !/\b(?:display\s*:\s*none|visibility\s*:\s*hidden|content-visibility\s*:\s*hidden|opacity\s*:\s*0(?:\.0+)?)(?:\s*;|\s*$)/.test(blockSource);
  const insetMarker = /\binset\s+(?:2|3|4)px\s+0\s+(?!transparent(?:\s|$))\S+/.test(boxShadow) &&
    /\bpadding-left\s*:\s*(?:6|7|8|9|10)px\s*;/.test(blockSource);
  const textDecoration = /\btext-decoration(?:-line)?\s*:\s*underline\b/.test(blockSource) &&
    !/\btext-decoration-color\s*:\s*transparent\b/.test(blockSource);
  return outlineRing || insetMarker || textDecoration;
}

function hasVisibleFocusRing(source, selector) {
  const focusVisible = block(source, `${selector}:focus-visible`);
  // Route changes still move DOM focus for assistive technology. The visual
  // ring belongs to keyboard-visible focus only, so pointer/programmatic route
  // changes do not leave a decorative rectangle in screenshots.
  return hasVisibleRing(focusVisible);
}

const checks = {
  'route changes intentionally move focus to the route title':
    /querySelector<HTMLElement>\(\s*["']\[data-panel-route-title\]["']\s*\)/.test(routeSource) &&
    /title(?:\?)?\.focus\(\{\s*preventScroll:\s*true\s*\}\)/.test(routeSource),
  'desktop route title has a visible keyboard focus ring':
    hasVisibleFocusRing(desktopCss, '.panel-section-heading [data-panel-route-title]'),
  'desktop route title does not show a ring for every programmatic focus':
    block(desktopCss, '.panel-section-heading [data-panel-route-title]:focus') === '',
  'Incident Split Lens title participates in the shared route-focus contract':
    /<h1\b[^>]*\bdata-panel-route-title\b[^>]*\bdata-incident-lens-route-title\b|<h1\b[^>]*\bdata-incident-lens-route-title\b[^>]*\bdata-panel-route-title\b/.test(mobileSource),
  'mobile route title has a visible keyboard focus ring':
    hasVisibleFocusRing(mobileCss, '.incident-lens__route-title'),
};
const failures = Object.entries(checks).filter(([, pass]) => !pass).map(([name]) => name);
const report = { pass: failures.length === 0, contract: 'route-title-focus-visible-v1', checks, failures };
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
