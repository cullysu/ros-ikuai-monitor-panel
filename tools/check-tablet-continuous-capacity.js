#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const cssPath = path.join(root, 'src', 'panel-framework', 'mobile', 'mobile-tablet-layout.css');
const css = fs.readFileSync(cssPath, 'utf8');
const failures = [];

function check(name, pass, detail) {
  if (!pass) failures.push({ name, detail });
}

function atRuleBlocks(source, name) {
  const blocks = [];
  const header = new RegExp(`@${name}\\s*\\([^)]*\\)\\s*\\{`, 'g');
  let match;
  while ((match = header.exec(source))) {
    const open = source.indexOf('{', match.index);
    let depth = 0;
    for (let index = open; index < source.length; index += 1) {
      if (source[index] === '{') depth += 1;
      if (source[index] === '}') depth -= 1;
      if (depth === 0) {
        blocks.push(source.slice(match.index, index + 1));
        header.lastIndex = index + 1;
        break;
      }
    }
  }
  return blocks;
}

const containers = atRuleBlocks(css, 'container');
const steadyOwner = containers.find((block) => /@container\s*\(min-width:\s*620px\)\s*\{/.test(block)
  && /\.mp-shell:not\(\.is-large-text\)\s+\.mp-tablet-steady\s*\{[\s\S]*?grid-template-columns:\s*45%\s+55%\s*;/.test(block));
const baseCapacity = Boolean(steadyOwner);
const baseDecisionOwner = Boolean(steadyOwner
  && /\.mp-shell:not\(\.is-large-text\)\s+\.mp-tablet-right-column\s*>\s*\.mp-steady-decisions\s+\.mp-load\s*>\s*div\s*,/.test(steadyOwner)
  && /\.mp-shell:not\(\.is-large-text\)\s+\.mp-tablet-right-column\s*>\s*\.mp-steady-decisions\s+\.mp-decision-ledger-rows\s*\{[\s\S]*?grid-template-columns:\s*1fr\s*;/.test(steadyOwner));
const boundedDecisionOwner = containers.some((block) => /@container\s*\(min-width:\s*620px\)\s+and\s+\(max-width:\s*899px\)/.test(block)
  && /\.mp-tablet-right-column\s*>\s*\.mp-steady-decisions/.test(block));
const wideBlock = containers.find((block) => /@container\s*\(min-width:\s*900px\)/.test(block));
const wideVisualFork = Boolean(wideBlock && /\.mp-shell:not\(\.is-large-text\)\s+\.mp-tablet-steady\s*\{[\s\S]*?grid-template-columns:\s*34%\s+66%\s*;/.test(wideBlock));
const wideDecisionFork = Boolean(wideBlock && /\.mp-shell:not\(\.is-large-text\)\s+\.mp-tablet-right-column\s*>\s*\.mp-steady-decisions/.test(wideBlock));

check('620px capacity has one continuous steady column owner', baseCapacity && baseDecisionOwner, {
  baseCapacity: Boolean(baseCapacity),
  baseDecisionOwner: Boolean(baseDecisionOwner),
});
check('decision rows are not split into a bounded 620–899 owner', !boundedDecisionOwner, {
  boundedDecisionOwner: Boolean(boundedDecisionOwner),
});
check('900px does not create a new visual column fork', !wideVisualFork && !wideDecisionFork, {
  wideVisualFork: Boolean(wideVisualFork),
  wideDecisionFork: Boolean(wideDecisionFork),
});

const report = { pass: failures.length === 0, contract: 'tablet-continuous-capacity-v1', checks: { baseCapacity: Boolean(baseCapacity), baseDecisionOwner: Boolean(baseDecisionOwner), boundedDecisionOwner: Boolean(boundedDecisionOwner), wideVisualFork: Boolean(wideVisualFork), wideDecisionFork: Boolean(wideDecisionFork) }, failures };
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
