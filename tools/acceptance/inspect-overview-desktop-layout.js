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
  if (sectionName !== 'overview' || window.innerWidth < 900) return {
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
    single: { mode: 'current', risk: 'none', chart: true, incident: false },
    fleet: { mode: 'current', risk: 'interfaces', chart: false, incident: true },
    'all-offline': { mode: 'current', risk: 'wan', chart: false, incident: true },
    'no-snapshot': { mode: 'unavailable', risk: 'evidence', chart: false, incident: true },
    'collection-down': { mode: 'historical', risk: 'collection', chart: false, incident: true },
    'resource-full': { mode: 'current', risk: 'resource', chart: false, incident: true },
    'interfaces-down': { mode: 'current', risk: 'interfaces', chart: false, incident: true },
  }[scaleScenario] || null;

  const visible = (node) => {
    if (!node) return false;
    const rect = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
  };
  const rect = (node) => {
    if (!node) return null;
    const box = node.getBoundingClientRect();
    return {
      top: Math.round(box.top),
      right: Math.round(box.right),
      bottom: Math.round(box.bottom),
      left: Math.round(box.left),
      width: Math.round(box.width),
      height: Math.round(box.height),
    };
  };

  const statusBus = desktopRoot.querySelector('[data-desktop-status-bus]');
  const verdict = statusBus?.querySelector('.do-verdict');
  const verdictTitle = verdict?.querySelector('h1');
  const statusItems = Array.from(statusBus?.querySelectorAll('[data-desktop-status-item]') || []);
  const incident = desktopRoot.querySelector('[data-desktop-incident]');
  const incidentFacts = Array.from(desktopRoot.querySelectorAll('[data-desktop-incident-fact]'));
  const ledgers = Array.from(desktopRoot.querySelectorAll('[data-desktop-ledger]'));
  const ledgerRows = Array.from(desktopRoot.querySelectorAll('[data-desktop-ledger-row]'));
  const ledgerSources = Array.from(desktopRoot.querySelectorAll('.do-ledger-source'));
  const ledgerButtons = Array.from(desktopRoot.querySelectorAll('[data-desktop-ledger-route]'));
  const chartSections = Array.from(desktopRoot.querySelectorAll('[data-desktop-wan-evidence]'));
  const chart = chartSections[0]?.querySelector('.do-wan-chart');
  const mainGrid = desktopRoot.querySelector('.do-main-grid');
  const lowerGrid = desktopRoot.querySelector('.do-lower-grid');
  const mainChildren = Array.from(mainGrid?.children || []).filter(visible);
  const lowerChildren = Array.from(lowerGrid?.children || []).filter(visible);
  const desktopText = normalize(desktopRoot.textContent || '');
  const rootRect = rect(desktopRoot);
  const sectionRect = rect(sectionRoot);
  const statusRect = rect(statusBus);
  const firstWorkRect = rect(incident || mainGrid);

  const textNodes = Array.from(desktopRoot.querySelectorAll('h1, h2, p, b, small, span, code, button, dt, dd'))
    .filter((node) => normalize(node.textContent || '') && visible(node));
  const smallText = textNodes
    .filter((node) => Number.parseFloat(getComputedStyle(node).fontSize || '0') < 12)
    .map((node) => ({ text: normalize(node.textContent || '').slice(0, 48), size: getComputedStyle(node).fontSize }));
  const clippedText = textNodes
    .filter((node) => {
      const style = getComputedStyle(node);
      const clips = style.overflowX === 'hidden' || style.overflowX === 'clip';
      return clips && node.scrollWidth > node.clientWidth + 2;
    })
    .map((node) => ({ text: normalize(node.textContent || '').slice(0, 48), width: node.clientWidth, scrollWidth: node.scrollWidth }));
  const smallTargets = Array.from(desktopRoot.querySelectorAll('button'))
    .filter(visible)
    .filter((node) => node.getBoundingClientRect().height < 28)
    .map((node) => ({ text: normalize(node.textContent || '').slice(0, 48), height: Math.round(node.getBoundingClientRect().height) }));

  const chartEvidence = {
    viewBox: Boolean(chart?.getAttribute('viewBox')),
    role: chart?.getAttribute('role') === 'img',
    unit: chart?.getAttribute('data-unit') === 'bit/s',
    title: Boolean(chart?.querySelector('title')),
    description: Boolean(chart?.querySelector('desc')),
    samples: Number(chartSections[0]?.getAttribute('data-sample-count') || 0),
    currentDown: /当前下载/.test(desktopText),
    currentUp: /当前上传/.test(desktopText),
    peak: /窗口峰值/.test(desktopText),
    sampling: /采样/.test(desktopText),
  };
  const chartTruth = !chart || Boolean(
    chartEvidence.viewBox &&
    chartEvidence.role &&
    chartEvidence.unit &&
    chartEvidence.title &&
    chartEvidence.description &&
    chartEvidence.samples >= 2 &&
    chartEvidence.currentDown &&
    chartEvidence.currentUp &&
    chartEvidence.peak &&
    chartEvidence.sampling
  );
  const chartContract = expected?.chart ? chartSections.length === 1 && chartTruth : chartSections.length === 0;
  const incidentContract = expected?.incident
    ? Boolean(incident && incidentFacts.length === 3 && !chart)
    : !incident;
  const evidenceBoundary = expected?.mode === 'unavailable'
    ? !/[0-9.]+\s*(?:K|M|G)?bps/i.test(desktopText) && !/网络可用/.test(desktopText)
    : expected?.mode === 'historical'
      ? !/[0-9.]+\s*(?:K|M|G)?bps/i.test(desktopText) && /当前变化不可见/.test(desktopText)
      : true;

  const mainGridUse = !mainGrid || Boolean(
    mainChildren.length === 2 &&
    mainChildren.every((node) => node.getBoundingClientRect().width >= mainGrid.getBoundingClientRect().width * 0.28)
  );
  const lowerGridUse = Boolean(lowerGrid && lowerChildren.length >= 1 && lowerChildren.every((node) => {
    const child = node.getBoundingClientRect();
    const parent = lowerGrid.getBoundingClientRect();
    return child.width >= parent.width * (lowerChildren.length === 1 ? 0.95 : 0.35);
  }));
  const firstViewport = Boolean(
    statusRect && firstWorkRect &&
    statusRect.top >= 0 &&
    statusRect.bottom < window.innerHeight &&
    firstWorkRect.top < window.innerHeight - 80
  );
  const sourceCoverage = ledgerRows.length > 0 && ledgerSources.length === ledgerRows.length && ledgerSources.every((node) => normalize(node.textContent || ''));
  const routeCoverage = ledgerButtons.length > 0 && ledgerButtons.every((node) => Boolean(node.getAttribute('data-desktop-ledger-route')) && Boolean(node.getAttribute('aria-label')));

  const checks = {
    mounted: Boolean(desktopRoot),
    scenario: desktopRoot.getAttribute('data-desktop-overview-scenario') === scaleScenario,
    evidenceMode: Boolean(expected && desktopRoot.getAttribute('data-desktop-evidence-mode') === expected.mode),
    risk: Boolean(expected && desktopRoot.getAttribute('data-desktop-overview-risk') === expected.risk),
    isolatedTree: !sectionRoot?.querySelector('[data-mobile-overview], [data-mobile-native-console], .ro-status-bus, .ro-desktop-grid'),
    statusBus: Boolean(statusBus && verdictTitle && statusItems.length === 3 && desktopRoot.querySelectorAll('h1').length === 1),
    incidentSubstitution: incidentContract,
    chartTruth: chartContract,
    evidenceBoundary,
    semanticLedgers: ledgers.length >= 2 && sourceCoverage && routeCoverage,
    accessibleLedger: ledgerRows.every((row) => row.getAttribute('role') === 'row') && !desktopRoot.querySelector('[role="tab"], [role="tablist"], canvas'),
    readableType: smallText.length === 0,
    unclippedText: clippedText.length === 0,
    pointerTargets: smallTargets.length === 0,
    firstViewport,
    workspaceUse: mainGridUse && lowerGridUse,
    noHorizontalOverflow: overflowX <= 1,
    viewport: Boolean(rootRect && sectionRect && Math.abs(rootRect.left - sectionRect.left) <= 1 && rootRect.width >= sectionRect.width - 2),
    readonly: /只读/.test(desktopText),
  };
  const pass = Boolean(app && active && (requested || active.id === sectionName) && !hasBadLiteral && scaleMetaOk && Object.values(checks).every(Boolean));
  const desktopOverviewLedgerProbe = {
    contract: 'cold-blue-operations-ledger',
    evidenceMode: desktopRoot.getAttribute('data-desktop-evidence-mode') || '',
    risk: desktopRoot.getAttribute('data-desktop-overview-risk') || '',
    statusItems: statusItems.length,
    incidentFacts: incidentFacts.length,
    ledgers: ledgers.map((node) => node.getAttribute('data-desktop-ledger') || ''),
    ledgerRows: ledgerRows.length,
    chartCount: chartSections.length,
    chartEvidence,
    firstViewport,
    smallText,
    clippedText,
    smallTargets,
    mainChildren: mainChildren.map(rect),
    lowerChildren: lowerChildren.map(rect),
    checks,
  };

  return {
    pass,
    surface: 'desktop-overview',
    desktopOverviewLedgerProbe,
    overviewFirstScreenCoverageOk: firstViewport,
    profile,
    viewport,
    scaleScenario,
    requestedSection: sectionName,
    activeSection: active ? active.id : '',
    requestedFound: Boolean(requested),
    title: normalize(document.querySelector('#pageTitle')?.textContent),
    url: location.href,
    overflowX: Math.round(overflowX),
    scroll: {
      width: root.scrollWidth,
      height: root.scrollHeight,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    },
    hasBadLiteral,
    scaleMetaOk,
  };
}

module.exports = { inspectOverviewDesktopLayout };
