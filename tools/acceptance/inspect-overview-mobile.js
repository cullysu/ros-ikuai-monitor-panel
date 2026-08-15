'use strict';

/**
 * Browser-side contract for the isolated Mobile Pulse owner. This verifies
 * the phone task flow instead of a rejected card-grid structure: normal
 * inspection uses a verified route plus traffic pulse, incidents replace the
 * pulse with object evidence.
 */
async function inspectOverviewMobileInteraction({ sectionName, viewport }) {
  if (sectionName !== 'overview' || Number(viewport?.width || innerWidth) >= 900) {
    return { mobilePulseInteractionOk: true, mobilePulseInteractionProbe: { applicable: false }, mobilePulseObjectSelectionOk: true, mobilePulseObjectSelectionProbe: { applicable: false } };
  }
  const root = document.querySelector('[data-mobile-pulse-overview]');
  const controls = [...(root?.querySelectorAll('button') || [])].filter((node) => {
    const rect = node.getBoundingClientRect(); const style = getComputedStyle(node);
    return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
  });
  const targetOk = controls.every((node) => {
    const rect = node.getBoundingClientRect();
    return rect.width >= 44 && rect.height >= 44 && Boolean(node.getAttribute('aria-label') || node.textContent?.trim());
  });
  const objects = root?.querySelectorAll('[data-mobile-pulse-object], [data-mobile-pulse-resource]') || [];
  return {
    mobilePulseInteractionOk: Boolean(root && targetOk),
    mobilePulseInteractionProbe: { applicable: true, controls: controls.length, targetOk },
    mobilePulseObjectSelectionOk: objects.length > 0,
    mobilePulseObjectSelectionProbe: { applicable: true, owner: 'mobile-pulse-ui', objects: objects.length },
  };
}

function inspectMobileNativeOverview(context) {
  const width = Number(context.viewport?.width || innerWidth);
  if (context.sectionName !== 'overview' || width >= 900) return null;
  const root = document.querySelector('[data-mobile-pulse-overview]');
  const navigation = document.querySelector('[data-mobile-pulse-navigation]');
  const evidenceMode = root?.getAttribute('data-evidence-mode') || '';
  const scene = root?.getAttribute('data-mobile-pulse-scene') || '';
  const tabs = [...(navigation?.querySelectorAll('[data-mobile-pulse-tab]') || [])];
  const destinations = tabs.map((node) => node.getAttribute('data-mobile-pulse-tab') || '');
  const normal = scene === 'normal';
  const pulse = root?.querySelector('.mpu-pulse');
  const route = root?.querySelector('[data-mobile-pulse-route]');
  const traffic = root?.querySelector('[data-mobile-pulse-traffic]');
  const patrol = root?.querySelector('[data-mobile-pulse-patrol]');
  const takeover = root?.querySelector('[data-mobile-pulse-takeover]');
  const incidentEvidence = root?.querySelectorAll('[data-mobile-pulse-takeover] [data-mobile-pulse-object], [data-mobile-pulse-takeover] [data-mobile-pulse-resource]').length || 0;
  const sceneSet = new Set(['normal', 'wan', 'evidence', 'collection', 'resource', 'interfaces']);
  const normalContract = normal
    ? Boolean(route && traffic && patrol && !takeover && evidenceMode === 'current')
    : Boolean(takeover && !traffic && !patrol && incidentEvidence > 0);
  const capabilityChecks = {
    pulseOwner: Boolean(root && pulse),
    evidenceMode: /^(current|historical|unavailable)$/.test(evidenceMode),
    knownScene: sceneSet.has(scene),
    pulseContract: normalContract,
    normalTrafficOnly: normal ? evidenceMode === 'current' && Boolean(traffic) : !traffic,
    incidentTakeover: normal ? !takeover : Boolean(takeover && incidentEvidence > 0),
    fourNavigationRoots: tabs.length === 4 && ['overview', 'interfaces', 'terminals', 'logs'].every((item) => destinations.includes(item)),
    moreDirectory: Boolean(root?.querySelector('button[aria-label="更多模块"]')),
    objectEvidence: normal ? Boolean(patrol?.querySelector('[data-mobile-pulse-object]')) : incidentEvidence > 0,
    solePulseOwner: document.querySelectorAll('[data-mobile-pulse-overview]').length === 1,
  };
  const checks = {
    root: Boolean(root), navigation: Boolean(navigation), noHorizontalOverflow: Number(context.overflowX || 0) <= 1,
    noBadLiteral: context.hasBadLiteral !== true, interaction: context.mobilePulseInteractionOk === true,
    objectSelection: context.mobilePulseObjectSelectionOk === true,
  };
  const risk = scene === 'evidence' ? 'evidence' : scene === 'collection' ? 'collection' : scene === 'resource' ? 'resource' : scene === 'interfaces' ? 'interfaces' : scene === 'wan' ? 'wan' : 'none';
  return {
    pass: Object.values(checks).every(Boolean) && Object.values(capabilityChecks).every(Boolean), surface: 'mobile-pulse-overview', contract: 'mobile-pulse-runtime-v1',
    profile: context.profile, scaleScenario: context.scaleScenario, viewport: context.viewport, requestedSection: context.sectionName,
    scene, evidenceMode, truthMode: evidenceMode, risk, navButtons: tabs.length, checks,
    mobilePulseGateProbe: { contract: 'mobile-pulse-runtime-v1', appHomePass: Object.values(capabilityChecks).every(Boolean), truthMode: evidenceMode, risk, requiredChecks: Object.keys(capabilityChecks), checks: capabilityChecks },
  };
}

module.exports = { inspectMobileNativeOverview, inspectOverviewMobileInteraction };
