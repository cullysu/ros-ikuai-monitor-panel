'use strict';

/** Browser-side contract for the isolated Mobile Flow owner. */
async function inspectOverviewMobileInteraction({ sectionName, viewport }) {
  if (sectionName !== 'overview' || Number(viewport?.width || innerWidth) >= 900) {
    return { mobilePulseInteractionOk: true, mobilePulseInteractionProbe: { applicable: false }, mobilePulseObjectSelectionOk: true, mobilePulseObjectSelectionProbe: { applicable: false } };
  }
  const root = document.querySelector('[data-mobile-flow-overview]');
  const visible = (node) => {
    const rect = node.getBoundingClientRect(); const style = getComputedStyle(node);
    return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
  };
  const controls = [...(root?.querySelectorAll('button') || [])].filter(visible);
  const targetOk = controls.every((node) => {
    const rect = node.getBoundingClientRect();
    return rect.width >= 44 && rect.height >= 44 && Boolean(node.getAttribute('aria-label') || node.textContent?.trim());
  });
  const evidenceActions = [...(root?.querySelectorAll('.mflow-instrument button, .mflow-stream button') || [])].filter(visible);
  return {
    mobilePulseInteractionOk: Boolean(root && controls.length > 0 && targetOk),
    mobilePulseInteractionProbe: { applicable: true, owner: 'mobile-flow-ui', controls: controls.length, targetOk },
    mobilePulseObjectSelectionOk: evidenceActions.length > 0,
    mobilePulseObjectSelectionProbe: { applicable: true, owner: 'mobile-flow-ui', objects: evidenceActions.length },
  };
}

function inspectMobileNativeOverview(context) {
  const width = Number(context.viewport?.width || innerWidth);
  if (context.sectionName !== 'overview' || width >= 900) return null;
  const root = document.querySelector('[data-mobile-flow-overview]');
  const navigation = document.querySelector('[data-mobile-flow-navigation]');
  const evidenceMode = root?.getAttribute('data-evidence-mode') || '';
  const scene = root?.getAttribute('data-mobile-flow-scene') || '';
  const tabs = [...(navigation?.querySelectorAll('button') || [])];
  const labels = tabs.map((node) => String(node.textContent || '').replace(/\s+/g, ' ').trim());
  const instrument = root?.querySelector('.mflow-instrument');
  const sceneSelectors = {
    normal: '.mflow-route', fleet: '.mflow-fleet', wan: '.mflow-wan', unavailable: '.mflow-withdrawn',
    collection: '.mflow-channels', resource: '.mflow-resource', interfaces: '.mflow-chain',
  };
  const expectedInstrument = sceneSelectors[scene];
  const normal = scene === 'normal';
  const sceneContract = Boolean(expectedInstrument && root?.querySelector(expectedInstrument) &&
    (normal ? evidenceMode === 'current' && root.querySelector('.mflow-route__traffic') : !root?.querySelector('.mflow-route__traffic')));
  const capabilityChecks = {
    flowOwner: Boolean(root?.matches('main.mflow')),
    evidenceMode: /^(current|historical|unavailable)$/.test(evidenceMode),
    knownScene: Boolean(expectedInstrument),
    decisiveInstrument: Boolean(instrument && root?.querySelectorAll('.mflow-instrument').length === 1),
    sceneContract,
    statusVerdict: Boolean(root?.querySelector('.mflow-status[aria-label="当前结论"]')),
    fourNavigationRoots: tabs.length === 4 && ['概览', '网络', '终端', '日志'].every((label) => labels.includes(label)),
    moreDirectory: Boolean(root?.querySelector('button[aria-label="更多模块"]')),
    evidenceAction: Boolean(root?.querySelector('.mflow-instrument button, .mflow-stream button')),
    soleFlowOwner: document.querySelectorAll('[data-mobile-flow-overview]').length === 1,
  };
  const checks = {
    root: Boolean(root), navigation: Boolean(navigation), noHorizontalOverflow: Number(context.overflowX || 0) <= 1,
    noBadLiteral: context.hasBadLiteral !== true, interaction: context.mobilePulseInteractionOk === true,
    objectSelection: context.mobilePulseObjectSelectionOk === true,
  };
  const risk = scene === 'unavailable' ? 'evidence' : scene === 'normal' ? 'none' : scene;
  return {
    pass: Object.values(checks).every(Boolean) && Object.values(capabilityChecks).every(Boolean), surface: 'mobile-flow-overview', contract: 'mobile-flow-runtime-v1',
    profile: context.profile, scaleScenario: context.scaleScenario, viewport: context.viewport, requestedSection: context.sectionName,
    requestedFound: true, activeSection: 'overview',
    scene, evidenceMode, truthMode: evidenceMode, risk, navButtons: tabs.length, checks,
    mobilePulseGateProbe: { contract: 'mobile-flow-runtime-v1', appHomePass: Object.values(capabilityChecks).every(Boolean), truthMode: evidenceMode, risk, requiredChecks: Object.keys(capabilityChecks), checks: capabilityChecks },
  };
}

module.exports = { inspectMobileNativeOverview, inspectOverviewMobileInteraction };
