'use strict';

async function inspectOverviewMobileInteraction({ sectionName, sectionRoot, scaleScenario }) {
  const result = {
    nativeMobileInteractionOk: true,
    nativeMobileInteractionProbe: null,
    nativeMobileFocusKeyboardOk: true,
    nativeMobileFocusKeyboardProbe: null,
    nativeMobileObjectSelectionOk: true,
    nativeMobileObjectNavigationOk: true,
    nativeDetailSectionCount: 0,
    nativeDetailRawEvidenceCount: 0,
    nativeDetailHasNovelEvidence: true,
    nativeDetailNoHomeReplay: true,
  };
  if (sectionName !== 'overview') return result;
  const canonicalInteractionCell = scaleScenario === 'single' && window.innerWidth === 390 && window.innerHeight === 844;
  const tabletInspectorCell = scaleScenario === 'interfaces-down' && window.innerWidth === 768 && window.innerHeight === 1024;
  if (tabletInspectorCell) {
    const tabletRoot = sectionRoot?.querySelector('[data-mobile-overview]');
    const rows = Array.from(tabletRoot?.querySelectorAll('[data-mobile-incident-object]') || []);
    const selectedRow = rows[1];
    const selectedId = selectedRow?.getAttribute('data-mobile-incident-object') || '';
    const initialUrl = `${location.pathname}${location.search}${location.hash}`;
    selectedRow?.click();
    await new Promise((resolve) => setTimeout(resolve, 40));
    const inspector = tabletRoot?.querySelector('[data-mobile-incident-inspector]');
    const selected = Boolean(
      selectedId &&
      selectedRow?.getAttribute('aria-pressed') === 'true' &&
      inspector?.getAttribute('data-mobile-incident-inspector') === selectedId
    );
    const stayedOnOverview = `${location.pathname}${location.search}${location.hash}` === initialUrl &&
      document.querySelector('[data-panel-app]')?.getAttribute('data-active-section') === 'overview';
    result.nativeMobileInteractionOk = selected && stayedOnOverview;
    result.nativeMobileObjectSelectionOk = result.nativeMobileInteractionOk;
    result.nativeMobileInteractionProbe = {
      exercised: true,
      mode: 'tablet-master-detail',
      selectedId,
      selected,
      stayedOnOverview,
    };
    return result;
  }
  if (!canonicalInteractionCell) {
    result.nativeMobileInteractionProbe = {
      exercised: false,
      reason: 'interaction is exercised at single 390x844, interfaces-down 768x1024, and by check:runtime-browser',
    };
    return result;
  }
  const waitFor = (predicate, timeout = 1200) => {
    const started = performance.now();
    return new Promise((resolve) => {
      const inspect = () => {
        if (predicate()) return resolve(true);
        if (performance.now() - started >= timeout) return resolve(Boolean(predicate()));
        setTimeout(inspect, 20);
      };
      inspect();
    });
  };

  const root = sectionRoot?.querySelector('[data-mobile-overview]');
  const destination = root?.querySelector('[data-mobile-incident-route], [data-mobile-destination]');
  if (!root || !destination) {
    result.nativeMobileInteractionOk = false;
    result.nativeMobileObjectNavigationOk = false;
    result.nativeMobileInteractionProbe = { reason: 'no real overview destination is available' };
    return result;
  }

  const expectedRoute = destination.getAttribute('data-mobile-incident-route') ||
    destination.getAttribute('data-mobile-destination') || '';
  const initialUrl = `${location.pathname}${location.search}${location.hash}`;
  destination.focus({ preventScroll: true });
  destination.click();
  const opened = await waitFor(() => (
    document.querySelector('[data-panel-app]')?.getAttribute('data-active-section') === expectedRoute &&
    Boolean(document.querySelector('[data-mobile-domain-workspace]'))
  ));
  history.back();
  const backed = await waitFor(() => (
    `${location.pathname}${location.search}${location.hash}` === initialUrl &&
    Boolean(document.querySelector('[data-mobile-overview]'))
  ));
  history.forward();
  const forwarded = await waitFor(() => (
    document.querySelector('[data-panel-app]')?.getAttribute('data-active-section') === expectedRoute &&
    Boolean(document.querySelector('[data-mobile-domain-workspace]'))
  ));
  history.back();
  const restored = await waitFor(() => (
    `${location.pathname}${location.search}${location.hash}` === initialUrl &&
    Boolean(document.querySelector('[data-mobile-overview]'))
  ));

  result.nativeMobileInteractionOk = Boolean(expectedRoute && opened && backed && forwarded && restored);
  result.nativeMobileObjectNavigationOk = result.nativeMobileInteractionOk;
  result.nativeMobileInteractionProbe = { exercised: true, expectedRoute, opened, backed, forwarded, restored };
  return result;
}

function inspectMobileNativeOverview({
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
  nativeMobileInteractionOk,
  nativeMobileInteractionProbe,
}) {
  if (sectionName !== 'overview') return null;
  const mobileRoot = sectionRoot?.querySelector('[data-mobile-overview]');
  if (!mobileRoot) return null;

  const expected = {
    single: { mode: 'current', risk: 'none', facts: ['route', 'wan', 'collection'], title: '出口路径已核实', priority: 0, traffic: true, resource: false },
    fleet: { mode: 'current', risk: 'interfaces', facts: ['interfaces', 'route', 'wan'], title: '3 个接口未运行', priority: 3, traffic: true, resource: false },
    'all-offline': { mode: 'current', risk: 'wan', facts: ['wan', 'route', 'collection'], title: '全部', priority: 8, traffic: false },
    'no-snapshot': { mode: 'unavailable', risk: 'evidence', facts: ['snapshot', 'target', 'last-success'], title: '当前业务状态不可判断', priority: 2, traffic: false },
    'collection-down': { mode: 'historical', risk: 'collection', facts: ['collection-channels', 'last-success', 'failed-endpoints'], title: '', priority: 2, traffic: false },
    'resource-full': { mode: 'current', risk: 'resource', facts: ['resource-breaches', 'resource-trailing', 'resource-samples'], title: '资源策略已触发', priority: 1, traffic: false, resource: true },
    'interfaces-down': { mode: 'current', risk: 'interfaces', facts: ['interfaces', 'route', 'wan'], title: '3 个接口未运行', priority: 3, traffic: true, resource: false },
  }[scaleScenario] || null;

  const rect = (node) => {
    if (!node) return null;
    const value = node.getBoundingClientRect();
    return {
      top: Math.round(value.top),
      right: Math.round(value.right),
      bottom: Math.round(value.bottom),
      left: Math.round(value.left),
      width: Math.round(value.width),
      height: Math.round(value.height),
    };
  };
  const isVisible = (node) => {
    if (!node) return false;
    const box = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    return box.width > 0 && box.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
  };

  const verdict = mobileRoot.querySelector('[data-mobile-verdict]');
  const verdictTitle = verdict?.querySelector('h1');
  const evidenceLine = mobileRoot.querySelector('.mp-evidence-line');
  const facts = Array.from(mobileRoot.querySelectorAll('[data-mobile-core-fact]'));
  const factKeys = facts.map((node) => node.getAttribute('data-mobile-core-fact') || '');
  const incidentCount = mobileRoot.querySelector('[data-mobile-incident-count]');
  const incidentRows = Array.from(mobileRoot.querySelectorAll('[data-mobile-incident-object]'));
  const traffic = mobileRoot.querySelector('[data-mobile-traffic]');
  const chart = mobileRoot.querySelector('.mp-chart');
  const resourceSignal = mobileRoot.querySelector('[data-mobile-resource-signal]');
  const resourceChart = mobileRoot.querySelector('.mp-resource-chart');
  const ledger = mobileRoot.querySelector('[data-mobile-evidence-ledger]');
  const ledgerRows = Array.from(ledger?.querySelectorAll('dl > div') || []);
  const patrolActions = mobileRoot.querySelector('[data-mobile-patrol-actions]');
  const patrolActionButtons = Array.from(patrolActions?.querySelectorAll('[data-mobile-patrol-action]') || []);
  const workspacePrimary = mobileRoot.querySelector('.mp-workspace-primary');
  const workspaceContext = mobileRoot.querySelector('.mp-workspace-context');
  const taskNavigation = document.querySelector('.panel-task-navigation');
  const taskButtons = Array.from(taskNavigation?.querySelectorAll('button') || []);
  const mobileText = normalize(mobileRoot.textContent || '');
  const pageText = normalize(document.body.textContent || '');
  const mobileRect = rect(mobileRoot);
  const sectionRect = rect(sectionRoot);
  const verdictRect = rect(verdict);
  const factsRect = rect(mobileRoot.querySelector('[data-mobile-core-facts]'));
  const primaryAction = (expected?.resource ? resourceSignal : null) ||
    incidentRows[0] ||
    traffic ||
    mobileRoot.querySelector('.mp-load');
  const primaryRect = rect(primaryAction);
  const navRect = rect(taskNavigation);

  const visibleText = Array.from(mobileRoot.querySelectorAll('h1, h2, p, b, small, em, time, button, summary, dt, dd, span'))
    .filter((node) => normalize(node.textContent || '') && isVisible(node));
  const smallText = visibleText
    .filter((node) => Number.parseFloat(getComputedStyle(node).fontSize || '0') < 12)
    .map((node) => ({ text: normalize(node.textContent || '').slice(0, 40), size: getComputedStyle(node).fontSize }));
  const smallTargets = Array.from(mobileRoot.querySelectorAll('button, summary'))
    .filter(isVisible)
    .filter((node) => node.getBoundingClientRect().height < 44)
    .map((node) => ({ text: normalize(node.textContent || '').slice(0, 40), height: Math.round(node.getBoundingClientRect().height) }));
  const ariaControlsValid = Array.from(mobileRoot.querySelectorAll('[aria-controls]')).every((node) => {
    const id = node.getAttribute('aria-controls');
    return Boolean(id && document.getElementById(id));
  });

  const factPairs = facts.map((node) => normalize(`${node.querySelector('small')?.textContent || ''}::${node.querySelector('b')?.textContent || ''}`));
  const objectPairs = incidentRows.map((node) => normalize(`${node.querySelector('small')?.textContent || ''}::${node.querySelector('em')?.textContent || ''}`));
  const repeatedPairs = objectPairs.filter((pair) => factPairs.includes(pair));
  const priorityTotal = Number(incidentCount?.textContent || 0);
  const expectedPriorityVisible = window.innerWidth >= 600 ? expected?.priority || 0 : Math.min(3, expected?.priority || 0);
  const priorityRoutesValid = incidentRows.every((node) => Boolean(node.getAttribute('data-mobile-incident-route')));
  const priorityLabelsValid = incidentRows.every((node) => Boolean(node.getAttribute('aria-label')));
  const currentRateText = /\b\d+(?:\.\d+)?\s*(?:[KMG]?bps)\b/i.test(mobileText);
  const shouldShowPatrolActions = Boolean(
    window.innerWidth >= 600 ||
    expected?.risk === 'evidence' ||
    expected?.risk === 'collection'
  );
  const patrolActionRoutes = patrolActionButtons.map((button) => button.getAttribute('data-mobile-destination') || '');
  const patrolActionsOk = shouldShowPatrolActions
    ? Boolean(patrolActions && patrolActionButtons.length === 3 && patrolActionRoutes.every(Boolean))
    : !patrolActions && patrolActionButtons.length === 0;
  const tabletWorkspaceOk = window.innerWidth < 600 || window.innerHeight < 700 || (() => {
    if (!workspacePrimary || !workspaceContext || !patrolActions) return false;
    const primaryBounds = workspacePrimary.getBoundingClientRect();
    const contextBounds = workspaceContext.getBoundingClientRect();
    return (
      primaryBounds.width >= 240 &&
      contextBounds.width >= 220 &&
      Math.abs(primaryBounds.top - contextBounds.top) <= 2 &&
      primaryBounds.right <= contextBounds.left + 2
    );
  })();

  const chartStatus = traffic?.getAttribute('data-mobile-traffic') || '';
  const chartSvg = chart?.querySelector('svg');
  const chartTruthOk = !traffic || chartStatus === 'accumulating' || Boolean(
    chartSvg &&
    chartSvg.getAttribute('preserveAspectRatio') !== 'none' &&
    chartSvg.querySelector('title') &&
    chartSvg.querySelector('desc') &&
    chart.querySelector('.mp-chart-time') &&
    /下载/.test(mobileText) && /上传/.test(mobileText) && /峰值/.test(mobileText)
  );
  const chartModeOk = expected?.traffic === true ? Boolean(traffic && chartTruthOk) : !traffic && !currentRateText;
  const resourceStatus = resourceSignal?.getAttribute('data-mobile-resource-signal') || '';
  const resourceSvg = resourceChart?.querySelector('svg');
  const resourceMeters = Array.from(resourceSignal?.querySelectorAll('[role="meter"]') || []);
  const resourceTruthOk = !resourceSignal || Boolean(
    resourceMeters.length === 3 &&
    resourceMeters.every((meter) => (
      Number(meter.getAttribute('aria-valuenow')) >= 0 &&
      Number(meter.getAttribute('aria-valuenow')) <= 100 &&
      /阈值/.test(meter.getAttribute('aria-label') || '')
    )) &&
    (resourceStatus === 'accumulating' || (
      resourceSvg &&
      resourceSvg.getAttribute('preserveAspectRatio') !== 'none' &&
      resourceSvg.querySelector('title') &&
      resourceSvg.querySelector('desc') &&
      resourceSvg.querySelector('.mp-resource-threshold') &&
      resourceChart.querySelector('.mp-resource-time')
    ))
  );
  const resourceModeOk = expected?.resource === true
    ? Boolean(resourceSignal && resourceTruthOk)
    : !resourceSignal;

  const bottomNavigation = Boolean(navRect && navRect.width >= window.innerWidth * 0.7);
  const firstViewportBottom = bottomNavigation ? navRect.top : window.innerHeight;
  const firstViewportOk = Boolean(
    verdictRect && factsRect && primaryRect &&
    verdictRect.top >= 0 &&
    factsRect.bottom <= firstViewportBottom &&
    primaryRect.top < firstViewportBottom
  );

  const availableBelowSummary = ledger ? window.innerHeight - ledger.getBoundingClientRect().top - 76 : 0;
  const estimatedLedgerBody = ledgerRows.length * 54;
  const shouldOpenLedger = Boolean(expected && ledger && (
    expected.mode === 'unavailable' ||
    (priorityTotal > 0 && (window.innerHeight >= 720 || window.innerWidth >= 600 || incidentRows.length <= 2)) ||
    availableBelowSummary >= Math.min(180, estimatedLedgerBody)
  ));
  const adaptiveLedgerOk = Boolean(ledger && ledger.open === shouldOpenLedger);

  const checks = {
    mounted: Boolean(mobileRoot),
    scenario: mobileRoot.getAttribute('data-mobile-overview-scenario') === scaleScenario,
    desktopDomAbsent: !sectionRoot?.querySelector('.ro-desktop-grid, .ro-status-bus'),
    evidenceMode: Boolean(expected && mobileRoot.getAttribute('data-mobile-evidence-mode') === expected.mode),
    evidenceCopy: Boolean(expected && evidenceLine && (
      expected.mode === 'current' ? /当前证据/.test(mobileText) :
      expected.mode === 'historical' ? /历史证据/.test(mobileText) :
      /证据不可用/.test(mobileText)
    )),
    riskPriority: Boolean(expected && mobileRoot.getAttribute('data-mobile-overview-risk') === expected.risk),
    verdict: Boolean(expected && verdictTitle && (!expected.title || normalize(verdictTitle.textContent || '').includes(expected.title))),
    compactVerdict: Boolean(verdictRect && verdictRect.height >= 58 && verdictRect.height <= 90),
    threeFacts: Boolean(expected && facts.length === 3 && expected.facts.every((key) => factKeys.includes(key))),
    noFactQueueReplay: repeatedPairs.length === 0,
    priorityCount: Boolean(expected && priorityTotal === expected.priority && incidentRows.length === expectedPriorityVisible),
    priorityRoutes: priorityRoutesValid && priorityLabelsValid,
    patrolActions: patrolActionsOk,
    tabletWorkspace: tabletWorkspaceOk,
    chartTruth: chartTruthOk && chartModeOk && resourceTruthOk && resourceModeOk,
    unavailableBoundary: expected?.mode !== 'unavailable' || (!currentRateText && !/出口路径已核实|默认路由已核实/.test(mobileText)),
    historicalBoundary: expected?.mode !== 'historical' || (!currentRateText && !/出口路径已核实/.test(mobileText)),
    adaptiveLedger: adaptiveLedgerOk,
    interaction: nativeMobileInteractionOk,
    accessibility: Boolean(verdictTitle?.id && mobileRoot.querySelectorAll('h1').length === 1 && ariaControlsValid),
    readableType: smallText.length === 0,
    touchTargets: smallTargets.length === 0,
    readonly: /只读/.test(pageText),
    firstViewport: firstViewportOk,
    noHorizontalOverflow: overflowX <= 1,
    noRejectedPatterns: !mobileRoot.querySelector('[role="tab"], [role="tablist"], [role="tabpanel"], [role="listbox"], .mn-grabber, .mo-verdict, canvas'),
    stableTaskNavigation: taskButtons.length === 4 && ['overview', 'interfaces', 'terminals', 'logs'].every((route) => taskButtons.some((button) => button.getAttribute('data-section') === route)),
    isolatedTree: !sectionRoot?.querySelector('[data-mobile-native-console], [class*="mn-"], [class*="mo-"]'),
    viewport: Boolean(mobileRect && sectionRect && Math.abs(mobileRect.left - sectionRect.left) <= 1 && mobileRect.width >= sectionRect.width - 2),
  };
  const pass = Boolean(app && active && (requested || active.id === sectionName) && !hasBadLiteral && scaleMetaOk && Object.values(checks).every(Boolean));
  const mobileOverviewAppHomeGateProbe = {
    appHomePass: pass,
    contract: 'mobile-patrol-console-v3',
    evidenceMode: mobileRoot.getAttribute('data-mobile-evidence-mode') || '',
    risk: mobileRoot.getAttribute('data-mobile-overview-risk') || '',
    factKeys,
    priorityTotal,
    priorityVisible: incidentRows.length,
    traffic: chartStatus,
    resource: resourceStatus,
    verdictHeight: verdictRect?.height || 0,
    firstViewport: {
      bottom: Math.round(firstViewportBottom),
      bottomNavigation,
      verdict: verdictRect ? {
        top: Math.round(verdictRect.top),
        bottom: Math.round(verdictRect.bottom),
        height: Math.round(verdictRect.height),
      } : null,
      facts: factsRect ? {
        top: Math.round(factsRect.top),
        bottom: Math.round(factsRect.bottom),
        height: Math.round(factsRect.height),
      } : null,
      primary: primaryRect ? {
        top: Math.round(primaryRect.top),
        bottom: Math.round(primaryRect.bottom),
        height: Math.round(primaryRect.height),
      } : null,
    },
    smallText,
    smallTargets,
    repeatedPairs,
    interaction: nativeMobileInteractionProbe,
    checks,
  };
  return {
    pass,
    surface: 'mobile-overview',
    mobileOverviewAppHomeGateProbe,
    profile,
    viewport,
    scaleScenario,
    requestedSection: sectionName,
    activeSection: active ? active.id : '',
    requestedFound: Boolean(requested),
    title: normalize(document.querySelector('[data-panel-route-title]')?.textContent || ''),
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

module.exports = { inspectMobileNativeOverview, inspectOverviewMobileInteraction };
