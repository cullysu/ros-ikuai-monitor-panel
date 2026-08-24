'use strict';

function mobileReferenceOwnsViewport(width, height) {
  return width <= 599 || (width <= 1199 && height >= width);
}

/** Browser-side contract for the sole accepted Mobile Reference owner. */
async function inspectOverviewMobileInteraction({ sectionName, viewport }) {
  const width = Number(viewport?.width || innerWidth);
  const height = Number(viewport?.height || innerHeight);
  if (sectionName !== 'overview' || !mobileReferenceOwnsViewport(width, height)) {
    return {
      mobileReferenceInteractionOk: true,
      mobileReferenceInteractionProbe: { applicable: false },
      mobileReferenceObjectSelectionOk: true,
      mobileReferenceObjectSelectionProbe: { applicable: false },
    };
  }
  const root = document.querySelector('[data-mobile-reference-home]');
  const visible = (node) => {
    const rect = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
  };
  const controls = [...document.querySelectorAll('[data-mobile-reference-home] button, [data-mobile-reference-navigation] button')].filter(visible);
  const targetOk = controls.every((node) => {
    const rect = node.getBoundingClientRect();
    return rect.width >= 44 && rect.height >= 44 && Boolean(node.getAttribute('aria-label') || node.textContent?.trim());
  });
  const scene = root?.getAttribute('data-mobile-reference-scene') || '';
  const evidenceActions = [...(root?.querySelectorAll('.ref-card-link, .ref-interfaces > button') || [])].filter(visible);
  const objectSelectionRequired = scene === 'normal' || scene === 'interfaces';
  return {
    mobileReferenceInteractionOk: Boolean(root && controls.length > 0 && targetOk),
    mobileReferenceInteractionProbe: { applicable: true, owner: 'mobile-reference-ui', controls: controls.length, targetOk },
    mobileReferenceObjectSelectionOk: !objectSelectionRequired || evidenceActions.length > 0,
    mobileReferenceObjectSelectionProbe: { applicable: objectSelectionRequired, owner: 'mobile-reference-ui', objects: evidenceActions.length, scene },
  };
}

function inspectMobileNativeOverview(context) {
  const width = Number(context.viewport?.width || innerWidth);
  const height = Number(context.viewport?.height || innerHeight);
  if (context.sectionName !== 'overview' || !mobileReferenceOwnsViewport(width, height)) return null;
  const root = document.querySelector('[data-mobile-reference-home]');
  const navigation = document.querySelector('[data-mobile-reference-navigation]');
  const evidenceMode = root?.getAttribute('data-evidence-mode') || '';
  const scene = root?.getAttribute('data-mobile-reference-scene') || '';
  const tabs = [...(navigation?.querySelectorAll('button') || [])];
  const labels = tabs.map((node) => String(node.textContent || '').replace(/\s+/g, ' ').trim());
  const wan = root?.querySelector('.ref-wan');
  const chart = root?.querySelector('.ref-chart svg');
  const metrics = wan?.querySelectorAll('.ref-rate-grid .ref-rate').length || 0;
  const resourceMeters = root?.querySelectorAll('.ref-resource').length || 0;
  const knownScene = ['normal', 'outage', 'unavailable', 'collection', 'resource', 'interfaces', 'route'].includes(scene);
  const normalContract = scene !== 'normal' || (evidenceMode === 'current' && metrics === 2 && Boolean(chart) && chart?.getAttribute('preserveAspectRatio') !== 'none');
  const resourceContract = scene !== 'resource' || (resourceMeters === 3 && !chart);
  const interfaceContract = scene !== 'interfaces' || (root?.querySelectorAll('.ref-interfaces > button').length > 0 && !chart);
  const withdrawnContract = !['outage', 'unavailable', 'collection'].includes(scene) || (metrics === 0 && !chart);
  const capabilityChecks = {
    ikuai4Root: Boolean(root?.matches('main.ref-mobile')),
    evidenceMode: /^(current|historical|unavailable)$/.test(evidenceMode),
    scene: knownScene,
    currentOnlyRates: normalContract && resourceContract && interfaceContract && withdrawnContract,
    fourNavigationRoots: tabs.length === 4 && ['概览', '网络', '设备', '日志'].every((label) => labels.includes(label)),
    moreDirectory: Boolean(root?.querySelector('button[aria-label="打开更多工具"]')),
    objectDetail: scene === 'normal'
      ? Boolean(root?.querySelector('.ref-card-link'))
      : scene === 'interfaces'
        ? Boolean(root?.querySelector('.ref-interfaces > button'))
        : true,
    noRejectedOwner: document.querySelectorAll('[data-mobile-reference-home]').length === 1 &&
      document.querySelectorAll('[data-mobile-reference-home]').length === 1,
  };
  const checks = {
    root: Boolean(root),
    navigation: Boolean(navigation),
    noHorizontalOverflow: Number(context.overflowX || 0) <= 1,
    noBadLiteral: context.hasBadLiteral !== true,
    interaction: context.mobileReferenceInteractionOk !== false,
    objectSelection: context.mobileReferenceObjectSelectionOk !== false,
  };
  const risk = scene === 'unavailable' ? 'evidence' : scene === 'normal' ? 'none' : scene;
  return {
    pass: Object.values(checks).every(Boolean) && Object.values(capabilityChecks).every(Boolean),
    surface: 'mobile-overview',
    contract: 'mobile-reference-runtime-v1',
    profile: context.profile,
    scaleScenario: context.scaleScenario,
    viewport: context.viewport,
    requestedSection: context.sectionName,
    requestedFound: true,
    activeSection: 'overview',
    scene,
    evidenceMode,
    truthMode: evidenceMode,
    risk,
    navButtons: tabs.length,
    checks,
    mobileReferenceGateProbe: {
      contract: 'mobile-reference-runtime-v1',
      appHomePass: Object.values(capabilityChecks).every(Boolean),
      truthMode: evidenceMode,
      risk,
      requiredChecks: Object.keys(capabilityChecks),
      checks: capabilityChecks,
    },
  };
}

module.exports = { inspectMobileNativeOverview, inspectOverviewMobileInteraction, mobileReferenceOwnsViewport };
