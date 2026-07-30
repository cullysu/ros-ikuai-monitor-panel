#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const css = read("src/panel-framework/mobile/mobile-patrol.css");
const incident = read("src/panel-framework/mobile/MobilePatrolIncidentCenter.tsx");
const queue = read("src/panel-framework/mobile/MobileConcurrentRiskQueue.tsx");
const actions = read("src/panel-framework/mobile/MobilePatrolActions.tsx");
const checks = [];
const check = (name, pass, detail) => checks.push({ name, pass: Boolean(pass), detail });

check("primary risk has a single continuous base surface", /primary-risk"\]\s*\{[\s\S]{0,180}background:\s*var\(--mp-surface-base\)/.test(css), "the primary incident must own the only full surface");
check("primary risk keeps a visible top state rule", /primary-risk"\]\s*\{[\s\S]{0,120}border-top:\s*2px solid var\(--mp-danger\)/.test(css), "the status anchor must remain visible without a side rail");
check("primary header receives the strongest compact rhythm", /primary-risk"\]\s*>\s*header[\s\S]{0,260}min-height:\s*56px/.test(css), "primary header needs a deliberate visual lead");
check("primary title is stronger than context headings", /primary-risk"\]\s*>\s*header[\s\S]{0,420}font-size:\s*19px/.test(css), "hierarchy must be visible without shrinking context text");
check("secondary risk is a transparent context plane", /secondary-risk"\]\s*\{[\s\S]{0,180}background:\s*transparent/.test(css), "concurrent risk must not become a second card");
check("secondary single-object row stays compact", /risk-queue\.is-single[\s\S]{0,900}min-height:\s*48px/.test(css), "secondary risk remains dense but tappable");
check("follow-up stays transparent and action-led", /follow-up"\]\s*\{[\s\S]{0,160}background:\s*transparent/.test(css) && /data-mobile-action-priority=\{action\.priority\}/.test(actions), "actions must remain the next step, not another incident surface");
check("semantic owners remain separate", /primary-risk/.test(incident) && /secondary-risk/.test(queue) && /follow-up/.test(actions), "primary, secondary and next-action owners must remain explicit");
check("no thick side rail is introduced", !/primary-risk[\s\S]{0,300}border-left:\s*[2-9]px/.test(css), "do not recreate the rejected heavy side stripe");

const failed = checks.filter((entry) => !entry.pass);
const result = {
  pass: failed.length === 0,
  contract: "mobile-incident-scan-hierarchy-v2",
  checks,
  failed: failed.map((entry) => entry.name),
};
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.pass ? 0 : 1;
