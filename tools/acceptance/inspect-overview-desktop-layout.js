'use strict';

function inspectOverviewDesktopLayout({
  sectionName,
  scaleScenario,
  profile,
  viewport,
  sectionRoot,
  app,
  active,
  requested,
  root,
  overflowX,
  hasBadLiteral,
  scaleMetaOk,
  normalize,
}) {
  const wideLandscapeBrowserOwner = window.innerWidth >= 600 && window.innerWidth > window.innerHeight;
  if (sectionName !== 'overview' || (window.innerWidth < 900 && !wideLandscapeBrowserOwner)) return {
    overviewBlankProbe: null,
    overviewBlankAreaOk: true,
    overviewNoSnapshotModuleFillProbe: null,
    overviewNoSnapshotModuleFillOk: true,
    overviewResourceModuleFillProbe: null,
    overviewResourceModuleFillOk: true,
    overviewDesktopRightFillProbe: null,
    overviewDesktopRightFillOk: true,
    overviewDesktopColumnContinuityProbe: null,
    overviewDesktopColumnContinuityOk: true,
    overviewDesktopTopBandProbe: null,
    overviewDesktopTopBandOk: true,
    overviewDesktopEffectiveHeightProbe: null,
    overviewDesktopEffectiveHeightOk: true,
    overviewDesktopFocusedHierarchyProbe: null,
    overviewDesktopFocusedHierarchyOk: true,
  };

  const desktopRoot = sectionRoot?.querySelector('[data-desktop-overview]');
  if (!desktopRoot) return null;

  const expected = {
    single: { mode: 'current', risk: 'none' },
    'traffic-accumulating': { mode: 'current', risk: 'none', surfaceScenario: 'single' },
    fleet: { mode: 'current', risk: 'interfaces' },
    'all-offline': { mode: 'current', risk: 'wan' },
    'no-snapshot': { mode: 'unavailable', risk: 'evidence' },
    'collection-down': { mode: 'historical', risk: 'collection' },
    'resource-full': { mode: 'current', risk: 'resource' },
    'interfaces-down': { mode: 'current', risk: 'interfaces' },
  }[scaleScenario] || null;

  const visible = (node) => {
    if (!node) return false;
    const box = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    return box.width > 0 && box.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
  };
  const rect = (node) => {
    if (!node) return null;
    const box = node.getBoundingClientRect();
    return Object.fromEntries(['top', 'right', 'bottom', 'left', 'width', 'height'].map((key) => [key, Math.round(box[key])]));
  };

  const desktopText = normalize(desktopRoot.textContent || '');
  const summary = desktopRoot.querySelector('[data-desktop-status-bus]');
  const summaryTiles = Array.from(summary?.querySelectorAll('.legacy-summary-tile') || []);
  const verdict = desktopRoot.querySelector('[data-desktop-incident-verdict]');
  const wan = desktopRoot.querySelector('[data-desktop-wan-evidence]');
  const right = desktopRoot.querySelector('.legacy-right-column');
  const trafficCharts = Array.from(desktopRoot.querySelectorAll('.legacy-chart'));
  const resource = desktopRoot.querySelector('[data-desktop-resource-evidence]');
  const resourceCards = Array.from(resource?.querySelectorAll('.legacy-resource-card') || []);
  const objects = desktopRoot.querySelector('[data-desktop-object-list]');
  const objectRows = Array.from(objects?.querySelectorAll('.legacy-object-row') || []);
  const bandwidthSummary = desktopRoot.querySelector('[data-desktop-bandwidth-summary]');
  const styleLink = document.querySelector('link[data-panel-surface-asset="desktop-style"]');
  const textNodes = Array.from(desktopRoot.querySelectorAll('h1, h2, b, small, span, button'))
    .filter((node) => normalize(node.textContent || '') && visible(node));
  const smallText = textNodes.filter((node) => Number.parseFloat(getComputedStyle(node).fontSize || '0') < 10)
    .map((node) => ({ text: normalize(node.textContent || '').slice(0, 48), size: getComputedStyle(node).fontSize }));
  const clippedText = textNodes.filter((node) => {
    const style = getComputedStyle(node);
    return (style.overflowX === 'hidden' || style.overflowX === 'clip') && node.scrollWidth > node.clientWidth + 2;
  }).map((node) => ({
    text: normalize(node.textContent || '').slice(0, 48),
    width: node.clientWidth,
    scrollWidth: node.scrollWidth,
    tag: node.tagName,
    className: typeof node.className === 'string' ? node.className : '',
  }));
  const smallTargets = Array.from(desktopRoot.querySelectorAll('button')).filter(visible)
    .filter((node) => node.getBoundingClientRect().height < 28)
    .map((node) => {
      const style = getComputedStyle(node);
      const parentStyle = node.parentElement ? getComputedStyle(node.parentElement) : null;
      return {
        text: normalize(node.textContent || '').slice(0, 48),
        height: Math.round(node.getBoundingClientRect().height),
        offsetHeight: node.offsetHeight,
        minHeight: style.minHeight,
        transform: style.transform,
        zoom: style.zoom,
        parentClass: typeof node.parentElement?.className === 'string' ? node.parentElement.className : '',
        parentTransform: parentStyle?.transform || '',
        parentZoom: parentStyle?.zoom || '',
      };
    });
  const chartEvidence = trafficCharts.map((node) => {
    const svg = node.querySelector('svg');
    return {
      role: svg?.getAttribute('role') || '',
      viewBox: svg?.getAttribute('viewBox') || '',
      preserveAspectRatio: svg?.getAttribute('preserveAspectRatio') || '',
      title: Boolean(svg?.querySelector('title')),
      description: Boolean(svg?.querySelector('desc')),
    };
  });
  const evidenceBoundary = expected?.mode === 'current'
    ? true
    : expected?.mode === 'historical'
      ? /历史快照|上次成功|历史证据/.test(desktopText)
      : !/[0-9.]+\s*(?:K|M|G)?(?:b\/s|bps)/i.test(desktopText);
  const evidenceBoundaryRateMatches = desktopText.match(/[0-9.]+\s*(?:K|M|G)?(?:b\/s|bps)/ig) || [];
  const firstWork = rect(wan || right);
  const rootRect = rect(desktopRoot);
  const sectionRect = rect(sectionRoot);
  const checks = {
    mounted: Boolean(desktopRoot),
    visualGrammar: desktopRoot.getAttribute('data-visual-grammar') === 'ikuai-4-ipad',
    taskContract: desktopRoot.getAttribute('data-overview-task-contract') === 'legacy-desktop-task-v1',
    scenario: desktopRoot.getAttribute('data-desktop-overview-scenario') === (expected?.surfaceScenario || scaleScenario),
    evidenceMode: Boolean(expected && desktopRoot.getAttribute('data-desktop-evidence-mode') === expected.mode),
    risk: Boolean(expected && desktopRoot.getAttribute('data-desktop-overview-risk') === expected.risk),
    isolatedTree: !sectionRoot?.querySelector('[data-ikuai4-mobile], [data-mobile-inspection-overview], [data-mobile-native-console]'),
    summary: summaryTiles.length === 8,
    operationalColumns: Boolean(visible(wan) && visible(right)),
    resourceTriplet: resourceCards.length === 3,
    objectWorkspace: expected?.risk === 'none'
      ? Boolean(bandwidthSummary && bandwidthSummary.children.length === 8)
      : Boolean(objects && (objectRows.length > 0 || /没有可列出的对象/.test(desktopText))),
    bottomComparison: expected?.risk === 'none' ? Boolean(bandwidthSummary && bandwidthSummary.children.length === 8) : true,
    incidentRhythm: expected?.risk === 'none' ? !visible(verdict) : visible(verdict),
    chartTruth: trafficCharts.every((node, index) => {
      const evidence = chartEvidence[index];
      return Boolean(evidence.role === 'img' && evidence.viewBox && !/none/i.test(evidence.preserveAspectRatio) && evidence.title && evidence.description);
    }),
    evidenceBoundary,
    readableType: smallText.length === 0,
    unclippedText: clippedText.length === 0,
    pointerTargets: smallTargets.length === 0,
    firstViewport: Boolean(firstWork && firstWork.top >= 0 && firstWork.top < window.innerHeight - 80),
    noHorizontalOverflow: overflowX <= 1,
    viewport: Boolean(rootRect && sectionRect && Math.abs(rootRect.left - sectionRect.left) <= 1 && rootRect.width >= sectionRect.width - 2),
    readonly: /只读/.test(desktopText),
    desktopStyleAsset: Boolean(styleLink && matchMedia(styleLink.media || 'all').matches),
  };
  const pass = Boolean(app && active && (requested || active.id === sectionName) && !hasBadLiteral && scaleMetaOk && Object.values(checks).every(Boolean));
  const desktopOverviewLedgerProbe = {
    contract: desktopRoot.getAttribute('data-overview-task-contract') || '',
    visualGrammar: desktopRoot.getAttribute('data-visual-grammar') || '',
    evidenceMode: desktopRoot.getAttribute('data-desktop-evidence-mode') || '',
    risk: desktopRoot.getAttribute('data-desktop-overview-risk') || '',
    summaryTiles: summaryTiles.length,
    trafficCharts: trafficCharts.length,
    resourceCards: resourceCards.length,
    objectRows: objectRows.length,
    bandwidthSummaryItems: bandwidthSummary?.children.length || 0,
    chartEvidence,
    smallText,
    clippedText,
    evidenceBoundaryRateMatches,
    smallTargets,
    checks,
  };

  return {
    pass,
    surface: 'desktop-overview',
    desktopOverviewLedgerProbe,
    overviewFirstScreenCoverageOk: checks.firstViewport,
    profile,
    viewport,
    scaleScenario,
    requestedSection: sectionName,
    activeSection: active ? active.id : '',
    requestedFound: Boolean(requested),
    title: normalize(desktopRoot.querySelector('h1')?.textContent || ''),
    url: location.href,
    overflowX: Math.round(overflowX),
    scroll: { width: root.scrollWidth, height: root.scrollHeight, viewportWidth: window.innerWidth, viewportHeight: window.innerHeight },
    hasBadLiteral,
    scaleMetaOk,
  };
}

module.exports = { inspectOverviewDesktopLayout };
