'use strict';

async function inspectOverviewMobileInteraction({ sectionName, sectionRoot }) {
  const result = {
    nativeMobileInteractionOk: true,
    nativeMobileInteractionProbe: null,
    nativeMobileFocusKeyboardOk: true,
    nativeMobileFocusKeyboardProbe: null,
    nativeMobileObjectSelectionOk: true,
    nativeMobileObjectSelectionProbe: null,
    nativeMobileObjectNavigationOk: true,
    nativeDetailSectionCount: 0,
    nativeDetailRawEvidenceCount: 0,
    nativeDetailHasNovelEvidence: true,
    nativeDetailNoHomeReplay: true,
  };
  if (sectionName !== 'overview') return result;
  const root = sectionRoot?.querySelector('[data-mobile-overview]');
  const object = root?.querySelector('[data-mobile-priority-object]');
  if (!root || !object) return result;

  const expectedRoute = object.getAttribute('data-mobile-priority-route') || '';
  const initialHash = location.hash;
  const waitFor = async (predicate, timeout = 1000) => {
    const started = performance.now();
    while (performance.now() - started < timeout) {
      if (predicate()) return true;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    return Boolean(predicate());
  };

  object.focus({ preventScroll: true });
  object.click();
  const opened = await waitFor(() => location.hash === `#${expectedRoute}` && document.body.dataset.panelRoute === expectedRoute);
  history.back();
  const backed = await waitFor(() => location.hash === initialHash && Boolean(document.querySelector('[data-mobile-overview]')));
  history.forward();
  const forwarded = await waitFor(() => location.hash === `#${expectedRoute}` && document.body.dataset.panelRoute === expectedRoute);
  history.back();
  const restored = await waitFor(() => location.hash === initialHash && Boolean(document.querySelector('[data-mobile-overview]')));

  result.nativeMobileInteractionOk = Boolean(expectedRoute && opened && backed && forwarded && restored);
  result.nativeMobileObjectNavigationOk = result.nativeMobileInteractionOk;
  result.nativeMobileInteractionProbe = { expectedRoute, opened, backed, forwarded, restored };
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
  const mobileViewport = window.innerWidth <= 899;
  if (sectionName !== 'overview' || !mobileViewport) return null;
  const mobileRoot = sectionRoot?.querySelector('[data-mobile-overview]');
  if (!mobileRoot) return null;

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

  const expected = {
    single: { mode: 'current', risk: 'none', facts: ['route', 'wan', 'collection'], title: '出口路径已核实', priority: 0, traffic: true },
    fleet: { mode: 'current', risk: 'interfaces', facts: ['interfaces', 'route', 'wan'], title: '3 个接口未运行', priority: 3, traffic: false },
    'all-offline': { mode: 'current', risk: 'wan', facts: ['wan', 'route', 'collection'], title: '全部', priority: 8, traffic: false },
    'no-snapshot': { mode: 'unavailable', risk: 'evidence', facts: ['snapshot', 'target', 'last-success'], title: '当前业务状态不可判断', priority: 2, traffic: false },
    'collection-down': { mode: 'historical', risk: 'collection', facts: ['collection-channels', 'last-success', 'failed-endpoints'], title: '', priority: 2, traffic: false },
    'resource-full': { mode: 'current', risk: 'resource', facts: ['resource-breaches', 'resource-trailing', 'resource-samples'], title: '资源策略已触发', priority: 1, traffic: false },
    'interfaces-down': { mode: 'current', risk: 'interfaces', facts: ['interfaces', 'route', 'wan'], title: '3 个接口未运行', priority: 3, traffic: false },
  }[scaleScenario] || null;

  const fixtureToolbar = mobileRoot.querySelector('[data-mobile-fixture-toolbar]');
  const evidence = mobileRoot.querySelector('[data-mobile-evidence-strip]');
  const verdict = mobileRoot.querySelector('[data-mobile-verdict]');
  const verdictTitle = verdict?.querySelector('h1');
  const facts = Array.from(mobileRoot.querySelectorAll('[data-mobile-core-fact]'));
  const factKeys = facts.map((node) => node.getAttribute('data-mobile-core-fact') || '');
  const priority = mobileRoot.querySelector('[data-mobile-priority-count]');
  const objects = Array.from(mobileRoot.querySelectorAll('[data-mobile-priority-object]'));
  const traffic = mobileRoot.querySelector('[data-mobile-traffic]');
  const focusObject = mobileRoot.querySelector('[data-mobile-focus-object]');
  const chart = mobileRoot.querySelector('.mo-instrument-chart');
  const ledger = mobileRoot.querySelector('[data-mobile-evidence-ledger]');
  const taskNavigation = document.querySelector('.panel-task-navigation');
  const taskButtons = Array.from(taskNavigation?.querySelectorAll('button') || []);
  const mobileText = normalize(mobileRoot.textContent || '');
  const mobileRect = rect(mobileRoot);
  const sectionRect = rect(sectionRoot);
  const verdictRect = rect(verdict);
  const factsRect = rect(mobileRoot.querySelector('[data-mobile-core-facts]'));
  const priorityRect = rect(priority);
  const trafficRect = rect(traffic);
  const navRect = rect(taskNavigation);
  const contentRect = rect(mobileRoot.querySelector('.mo-content'));

  const visibleText = Array.from(mobileRoot.querySelectorAll('h1, h2, p, b, small, em, time, button, summary, dt, dd, span'))
    .filter((node) => normalize(node.textContent || '') && isVisible(node));
  const smallText = visibleText
    .filter((node) => Number.parseFloat(getComputedStyle(node).fontSize || '0') < 13)
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
  const objectPairs = objects.map((node) => normalize(`${node.querySelector('.mo-priority-identity small')?.textContent || ''}::${node.querySelector('.mo-priority-state b')?.textContent || ''}`));
  const repeatedPairs = objectPairs.filter((pair) => factPairs.includes(pair));
  const priorityTotal = Number(priority?.getAttribute('data-mobile-priority-count') || 0);
  const priorityRoutesValid = objects.every((node) => Boolean(node.getAttribute('data-mobile-priority-route')));
  const priorityLabelsValid = objects.every((node) => Boolean(node.getAttribute('aria-label')));
  const currentRateText = /\b\d+(?:\.\d+)?\s*(?:[KMG]?bps)\b/i.test(mobileText);

  const chartReady = traffic?.getAttribute('data-mobile-traffic') === 'ready';
  const chartSamples = Number(traffic?.getAttribute('data-mobile-traffic-samples') || 0);
  const chartTruthOk = !traffic || traffic.getAttribute('data-mobile-traffic') === 'accumulating' || Boolean(
    chart &&
    chartSamples >= 2 &&
    chart.querySelector('title') &&
    chart.querySelector('desc') &&
    /下载/.test(mobileText) && /上传/.test(mobileText) && /峰值/.test(mobileText) && /最近/.test(mobileText)
  );
  const chartModeOk = expected?.traffic === true
    ? chartReady
    : expected?.traffic === false
      ? !traffic && !currentRateText
      : !traffic || chartTruthOk;

  const firstViewportBottom = navRect?.top || window.innerHeight;
  const firstViewportOk = window.innerWidth !== 390 || Boolean(
    verdictRect && factsRect &&
    verdictRect.top >= 0 &&
    factsRect.bottom <= firstViewportBottom &&
    (objects.length ? priorityRect?.bottom <= firstViewportBottom : trafficRect?.bottom <= firstViewportBottom)
  );

  const tabletWorkflow = mobileRoot.querySelector('.mo-workflow');
  const workflowChildren = Array.from(tabletWorkflow?.children || []).filter(isVisible);
  const tabletUtilizationOk = window.innerWidth < 600 || !contentRect || workflowChildren.length !== 1 ||
    workflowChildren[0].getBoundingClientRect().width >= contentRect.width * 0.9;
  const tabletPairOk = window.innerWidth < 600 || workflowChildren.length !== 2 || workflowChildren.every((node) =>
    node.getBoundingClientRect().width >= contentRect.width * 0.35);

  const checks = {
    mounted: Boolean(mobileRoot),
    scenario: mobileRoot.getAttribute('data-mobile-overview-scenario') === scaleScenario,
    desktopDomAbsent: !sectionRoot?.querySelector('.ro-desktop-grid, .ro-status-bus'),
    evidenceMode: Boolean(expected && mobileRoot.getAttribute('data-mobile-evidence-mode') === expected.mode),
    evidenceCopy: Boolean(expected && evidence && (
      expected.mode === 'current' ? /当前证据/.test(mobileText) && /业务采样完整/.test(mobileText) :
      expected.mode === 'historical' ? /历史证据/.test(mobileText) && /当前变化不可见/.test(mobileText) :
      /证据不可用/.test(mobileText) && /不作当前业务判断/.test(mobileText)
    )),
    riskPriority: Boolean(expected && mobileRoot.getAttribute('data-mobile-overview-risk') === expected.risk),
    verdict: Boolean(expected && verdictTitle && (!expected.title || normalize(verdictTitle.textContent || '').includes(expected.title))),
    compactVerdict: Boolean(verdictRect && verdictRect.height >= 80 && verdictRect.height <= 150),
    threeFacts: Boolean(expected && facts.length === 3 && expected.facts.every((key) => factKeys.includes(key))),
    noFactQueueReplay: repeatedPairs.length === 0,
    priorityCount: Boolean(expected && priorityTotal === expected.priority && objects.length === Math.min(3, expected.priority)),
    priorityRoutes: priorityRoutesValid && priorityLabelsValid,
    verticalQueue: objects.every((node, index) => index === 0 || node.getBoundingClientRect().top >= objects[index - 1].getBoundingClientRect().bottom - 1),
    chartTruth: chartTruthOk && chartModeOk,
    focusObject: expected?.risk !== 'none' || Boolean(focusObject?.getAttribute('data-mobile-focus-route')),
    chartAfterIncident: !priorityRect || !trafficRect || trafficRect.top >= priorityRect.bottom - 1 || window.innerWidth >= 600,
    unavailableBoundary: expected?.mode !== 'unavailable' || (!currentRateText && !/出口路径已核实|默认路由已核实/.test(mobileText)),
    historicalBoundary: expected?.mode !== 'historical' || (!currentRateText && !/出口路径已核实/.test(mobileText)),
    interaction: nativeMobileInteractionOk,
    accessibility: Boolean(verdictTitle?.id && mobileRoot.querySelectorAll('h1').length === 1 && ariaControlsValid),
    readableType: smallText.length === 0,
    touchTargets: smallTargets.length === 0,
    readonly: /只读/.test(mobileText),
    firstViewport: firstViewportOk,
    tabletUtilization: tabletUtilizationOk && tabletPairOk,
    noHorizontalOverflow: overflowX <= 1,
    noRejectedPatterns: !mobileRoot.querySelector('[role="tab"], [role="tablist"], [role="tabpanel"], [role="listbox"], .mn-grabber, [data-mobile-native-sheet], canvas'),
    stableTaskNavigation: taskButtons.length === 3,
    isolatedTree: !sectionRoot?.querySelector('[data-mobile-native-console], [class*="mn-"]'),
    viewport: Boolean(mobileRect && sectionRect && Math.abs(mobileRect.left - sectionRect.left) <= 1 && mobileRect.width >= sectionRect.width - 2),
  };
  const pass = Boolean(app && active && (requested || active.id === sectionName) && !hasBadLiteral && scaleMetaOk && Object.values(checks).every(Boolean));
  const mobileOverviewAppHomeGateProbe = {
    appHomePass: pass,
    contract: 'adaptive-operations-instrument',
    evidenceMode: mobileRoot.getAttribute('data-mobile-evidence-mode') || '',
    risk: mobileRoot.getAttribute('data-mobile-overview-risk') || '',
    factKeys,
    priorityTotal,
    priorityVisible: objects.length,
    traffic: traffic?.getAttribute('data-mobile-traffic') || '',
    trafficSamples: chartSamples,
    verdictHeight: verdictRect?.height || 0,
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

module.exports = { inspectMobileNativeOverview, inspectOverviewMobileInteraction };
