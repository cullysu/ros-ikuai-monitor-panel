#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const contracts = [
  {
    file: 'src/panel-framework/overview/desktop-overview/styles/legacy-desktop.css',
    selectors: [
      '.panel-runtime-bar-desktop .panel-runtime-actions button:hover',
      '.panel-app-desktop .panel-task-navigation button:hover',
      '.legacy-object-row button:not(:disabled):hover',
      '.legacy-focus-link:hover',
      '.legacy-empty-chart button:hover',
    ],
  },
  {
    file: 'src/panel-framework/sections/section-console.css',
    selectors: [
      '.panel-overview-back:hover',
      '.panel-workspace-tabs button:hover',
      '.panel-section-metrics button:hover',
      '.readonly-feature-link:hover',
      '.panel-more-list button:hover',
    ],
  },
  {
    file: 'src/panel-framework/sections/desktop-domain.css',
    selectors: [
      '.ddw-filters button:hover',
      '.ddw-table-scroll tr:hover td',
    ],
  },
];

function maskComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\r\n]/g, ' '));
}

function isFinePointerMedia(header) {
  const normalized = header.toLowerCase().replace(/\s+/g, '');
  return normalized.startsWith('@media')
    && normalized.includes('(hover:hover)')
    && normalized.includes('(pointer:fine)');
}

function hoverRules(source) {
  const css = maskComments(source);
  const stack = [];
  const rules = [];
  let boundary = 0;

  for (let index = 0; index < css.length; index += 1) {
    const character = css[index];
    if (character === '"' || character === "'") {
      const quote = character;
      for (index += 1; index < css.length; index += 1) {
        if (css[index] === '\\') index += 1;
        else if (css[index] === quote) break;
      }
      continue;
    }
    if (character === '{') {
      const headerStart = boundary;
      const header = css.slice(headerStart, index).trim();
      const inheritedFinePointer = stack.length ? stack[stack.length - 1].finePointer : false;
      stack.push({
        header,
        line: css.slice(0, headerStart).split(/\r?\n/).length,
        finePointer: inheritedFinePointer || isFinePointerMedia(header),
      });
      boundary = index + 1;
    } else if (character === ';') {
      boundary = index + 1;
    } else if (character === '}') {
      const block = stack.pop();
      if (block && block.header.includes(':hover')) rules.push(block);
      boundary = index + 1;
    }
  }
  return rules;
}

const files = contracts.map(({ file, selectors }) => {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const rules = hoverRules(source);
  return {
    file,
    hoverRuleCount: rules.length,
    missingSelectors: selectors.filter((selector) => !rules.some((rule) => rule.header.includes(selector))),
    coarsePointerViolations: rules
      .filter((rule) => !rule.finePointer)
      .map((rule) => ({ line: rule.line, selector: rule.header })),
  };
});

const report = {
  contract: 'desktop-current-owner-pointer-contract-v1',
  pass: files.every((file) => file.missingSelectors.length === 0 && file.coarsePointerViolations.length === 0),
  requirement: 'Decorative hover rules exist and are active only for hover-capable fine pointers.',
  files,
};

console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exitCode = 1;
