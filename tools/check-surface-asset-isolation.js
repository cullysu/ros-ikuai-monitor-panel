#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'public', 'assets', 'framework');
const manifest = JSON.parse(fs.readFileSync(path.join(output, 'manifest.json'), 'utf8'));
const reasons = [];
function read(record, label) {
  if (!record || typeof record.file !== 'string') { reasons.push(`manifest missing ${label}`); return ''; }
  return fs.readFileSync(path.join(output, record.file), 'utf8');
}
function requireMarkers(body, label, markers) { for (const marker of markers) if (!body.includes(marker)) reasons.push(`${label} missing owned marker ${marker}`); }
function forbidMarkers(body, label, markers) { for (const marker of markers) if (body.includes(marker)) reasons.push(`${label} leaks foreign marker ${marker}`); }

if (manifest.version !== 3) reasons.push('dual-surface manifest v3 is required');
const mobileScript = read(manifest.assets?.mobile?.script, 'mobile script');
const mobileStyle = read(manifest.assets?.mobile?.style, 'mobile style');
const desktopScript = read(manifest.assets?.desktop?.script, 'desktop script');
const desktopStyle = read(manifest.assets?.desktop?.style, 'desktop style');
const loader = read(manifest.assets?.loader, 'surface loader');

requireMarkers(mobileScript, 'mobile script', ['data-mobile-reference-home', 'data-mobile-reference-navigation', 'data-mobile-reference-network-directory', 'data-panel-surface', 'mobile']);
forbidMarkers(mobileScript, 'mobile script', ['data-mobile-ops-overview', 'data-mobile-ops-navigation', 'data-mobile-ops-detail', 'data-desktop-overview', 'data-desktop-domain-workspace', 'ro-desktop-console']);
requireMarkers(desktopScript, 'desktop script', ['data-desktop-overview', 'data-desktop-domain-workspace', 'data-panel-surface', 'desktop']);
forbidMarkers(desktopScript, 'desktop script', ['data-mobile-reference-home', 'data-mobile-reference-navigation', 'data-mobile-reference-network-directory', 'data-mobile-inspection-overview', 'data-mobile-inspection-navigation', 'data-inspection-detail']);
requireMarkers(mobileStyle, 'mobile style', ['.ref-mobile', '.ref-navigation', '.ref-card', '.panel-runtime-live']);
forbidMarkers(mobileStyle, 'mobile style', ['.mop-overview', '.mop-tabbar', '.legacy-desktop-shell', '.desktop-domain-workspace', '.panel-runtime-bar-desktop']);
requireMarkers(desktopStyle, 'desktop style', ['.legacy-desktop-shell', '.panel-runtime-bar-desktop']);
forbidMarkers(desktopStyle, 'desktop style', ['.ref-mobile', '.ref-navigation', '.inspection-topbar', '.minspection-navigation', '.inspection-detail']);
requireMarkers(loader, 'surface loader', [manifest.assets?.mobile?.script?.file, manifest.assets?.mobile?.style?.file, manifest.assets?.desktop?.script?.file, manifest.assets?.desktop?.style?.file, 'URLSearchParams', 'sessionStorage', 'pointer:coarse']);
forbidMarkers(loader, 'surface loader', ['addEventListener("resize"', "addEventListener('resize'", 'panel-framework.js', 'style.css']);

const report = { pass: reasons.length === 0, manifestVersion: manifest.version, assets: { mobileScript: manifest.assets?.mobile?.script?.file, mobileStyle: manifest.assets?.mobile?.style?.file, desktopScript: manifest.assets?.desktop?.script?.file, desktopStyle: manifest.assets?.desktop?.style?.file, loader: manifest.assets?.loader?.file }, reasons };
console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exitCode = 1;
