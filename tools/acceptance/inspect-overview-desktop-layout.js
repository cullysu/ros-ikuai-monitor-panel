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
  if (sectionName !== 'overview' || window.innerWidth < 1200) return {
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
    single: { mode: 'current', risk: 'none', wan: 'trend', incident: false, comparison: false },
    'traffic-accumulating': { mode: 'current', risk: 'none', wan: 'accumulating', incident: false, surfaceScenario: 'single', comparison: false },
    fleet: { mode: 'current', risk: 'interfaces', wan: 'absent', incident: true },
    'all-offline': { mode: 'current', risk: 'wan', wan: 'absent', incident: true },
    'no-snapshot': { mode: 'unavailable', risk: 'evidence', wan: 'absent', incident: true },
    'collection-down': { mode: 'historical', risk: 'collection', wan: 'absent', incident: true },
    'resource-full': { mode: 'current', risk: 'resource', wan: 'absent', incident: true },
    'interfaces-down': { mode: 'current', risk: 'interfaces', wan: 'absent', incident: true },
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
  const incident = desktopRoot.querySelector('.do-incident');
  const incidentFacts = Array.from(desktopRoot.querySelectorAll('.do-incident-facts > div'));
  const ledgers = Array.from(desktopRoot.querySelectorAll('[data-desktop-ledger]'));
  const ledgerRows = Array.from(desktopRoot.querySelectorAll('[data-desktop-ledger-row]'));
  const ledgerSources = Array.from(desktopRoot.querySelectorAll('.do-ledger-source'));
  const ledgerButtons = Array.from(desktopRoot.querySelectorAll('[data-desktop-ledger-route]'));
  const chartSections = Array.from(desktopRoot.querySelectorAll('[data-desktop-wan-evidence]'));
  const chart = chartSections[0]?.querySelector('.do-wan-chart');
  const accumulating = chartSections[0]?.querySelector('[data-traffic-accumulating]');
  const resourceSignal = desktopRoot.querySelector('[data-desktop-resource-evidence]');
  const resourceMetrics = Array.from(resourceSignal?.querySelectorAll('[data-desktop-resource-metric]') || []);
  const resourceMetricEvidence = resourceMetrics.map((node) => {
    const currentRaw = node.getAttribute('data-current');
    const latestRaw = node.getAttribute('data-history-latest');
    const historyAt = node.getAttribute('data-history-at') || '';
    const samples = Number(node.getAttribute('data-history-samples') || 0);
    const current = currentRaw === null || !currentRaw.trim() ? null : Number(currentRaw);
    const latest = latestRaw === null || !latestRaw.trim() ? null : Number(latestRaw);
    return {
      key: node.getAttribute('data-desktop-resource-metric') || '',
      current,
      latest,
      samples,
      historyAt,
      valid: Number.isFinite(current) && samples >= 2 && Number.isFinite(latest) && Math.abs(current - latest) <= 1 && !Number.isNaN(Date.parse(historyAt)),
    };
  });
  const resourceSeries = Array.from(resourceSignal?.querySelectorAll('[data-section-series]') || []);
  const resourceChart = resourceSignal?.querySelector('[data-section-time-series] svg');
  const resourceTimes = Array.from(resourceSignal?.querySelectorAll('.section-timeseries-axis b') || []);
  const resourceChartRect = rect(resourceChart);
  const resourceViewBox = resourceChart?.viewBox?.baseVal;
  const resourcePreserveAspectRatio = resourceChart?.getAttribute('preserveAspectRatio') || '';
  const resourceViewBoxRatio = resourceViewBox?.width > 0 && resourceViewBox?.height > 0
    ? resourceViewBox.width / resourceViewBox.height
    : 0;
  const resourceRenderedRatio = resourceChartRect?.width > 0 && resourceChartRect?.height > 0
    ? resourceChartRect.width / resourceChartRect.height
    : 0;
  const resourceAspectRatioDelta = resourceViewBoxRatio > 0 && resourceRenderedRatio > 0
    ? Math.abs(resourceViewBoxRatio / resourceRenderedRatio - 1)
    : Number.POSITIVE_INFINITY;
  const resourceChartGeometryOk = Boolean(
    resourceChart &&
    resourcePreserveAspectRatio &&
    !/none/i.test(resourcePreserveAspectRatio) &&
    resourceAspectRatioDelta <= 0.03
  );
  const taskContract = desktopRoot.getAttribute('data-overview-task-contract') || '';
  const taskLandmarks = Array.from(desktopRoot.querySelectorAll('[data-overview-task-landmark]')).filter(visible);
  const taskLandmarkNames = [...new Set(taskLandmarks.map((node) => node.getAttribute('data-overview-task-landmark') || '').filter(Boolean))];
  const taskFocus = desktopRoot.querySelector('[data-overview-task-focus]');
  const taskFocusObject = desktopRoot.querySelector('[data-overview-task-focus-object]');
  const taskRiskObjects = Array.from(desktopRoot.querySelectorAll('[data-overview-task-risk-object]')).filter(visible);
  const taskRiskObjectIds = taskRiskObjects.map((node) => node.getAttribute('data-overview-task-risk-object') || '').filter(Boolean);
  const taskInspector = desktopRoot.querySelector('[data-overview-task-inspector]');
  const taskInspectorId = taskInspector?.getAttribute('data-overview-task-inspector') || '';
  const operatorSource = desktopRoot.querySelector('[data-desktop-operator-source]');
  const operatorSourceText = normalize(operatorSource?.textContent || '');
  const taskActions = Array.from(desktopRoot.querySelectorAll('.do-task-actions button[id]')).filter(visible);
  const taskActionRoutes = taskActions.map((node) => node.id).filter(Boolean);
  const mainGrid = desktopRoot.querySelector('.do-main-grid');
  const lowerGrid = desktopRoot.querySelector('.do-lower-grid');
  const normalWorkspace = desktopRoot.querySelector('[data-desktop-normal-workspace]');
  const normalTopBand = desktopRoot.querySelector('[data-desktop-normal-top-band]');
  const normalDecisionBand = desktopRoot.querySelector('[data-desktop-normal-decision-band]');
  const normalMainline = desktopRoot.querySelector('[data-desktop-normal-mainline]');
  const normalLedgerBand = desktopRoot.querySelector('[data-desktop-normal-ledger-band]');
  const mainChildren = Array.from(mainGrid?.children || []).filter(visible);
  const lowerChildren = Array.from(lowerGrid?.children || []).filter(visible);
  const mainStacks = Array.from(mainGrid?.querySelectorAll('[data-desktop-main-stack]') || []).filter(visible);
  const stackEvidence = mainStacks.map((stack) => {
    const children = Array.from(stack.children || []).filter(visible);
    const boxes = children.map(rect).filter(Boolean);
    const gaps = boxes.slice(1).map((box, index) => box.top - boxes[index].bottom);
    return {
      name: stack.getAttribute('data-desktop-main-stack') || '',
      rect: rect(stack),
      children: boxes,
      gaps,
    };
  });
  const desktopText = normalize(desktopRoot.textContent || '');
  const rootRect = rect(desktopRoot);
  const sectionRect = rect(sectionRoot);
  const statusRect = rect(statusBus);
  const firstWorkRect = rect(incident || normalTopBand || mainGrid);

  const textNodes = Array.from(desktopRoot.querySelectorAll('h1, h2, p, b, small, span, code, button, dt, dd'))
    .filter((node) => normalize(node.textContent || '') && visible(node));
  const smallText = textNodes
    .filter((node) => Number.parseFloat(getComputedStyle(node).fontSize || '0') < 12)
    .map((node) => ({
      text: normalize(node.textContent || '').slice(0, 48),
      size: getComputedStyle(node).fontSize,
      tag: node.tagName.toLowerCase(),
      className: typeof node.className === 'string' ? node.className : '',
      parentTag: node.parentElement?.tagName?.toLowerCase() || '',
      parentClassName: typeof node.parentElement?.className === 'string' ? node.parentElement.className : '',
      ancestors: Array.from({ length: 5 }, (_, index) => {
        let current = node;
        for (let step = 0; step <= index && current; step += 1) current = current.parentElement;
        return current ? `${current.tagName.toLowerCase()}.${typeof current.className === 'string' ? current.className : ''}` : '';
      }).filter(Boolean),
    }));
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

  const chartUnit = chart?.getAttribute('data-unit') || '';
  const chartPeak = normalize(desktopRoot.querySelector('[data-chart-peak-label]')?.textContent || '');
  const chartLegend = normalize(desktopRoot.querySelector('.do-wan-legend span:last-child')?.textContent || '');
  const chartEvidence = {
    viewBox: Boolean(chart?.getAttribute('viewBox')),
    role: chart?.getAttribute('role') === 'img',
    unit: /^(?:bps|Kbps|Mbps|Gbps)$/.test(chartUnit) && chartPeak.endsWith(chartUnit) && chartLegend.endsWith(chartUnit),
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
  const accumulatingRect = rect(accumulating);
  const wanRect = rect(chartSections[0]);
  const wanText = normalize(chartSections[0]?.textContent || '');
  const wanContract = expected?.wan === 'trend'
    ? chartSections.length === 1 && Boolean(chart) && chartTruth
    : expected?.wan === 'accumulating'
      ? Boolean(
          chartSections.length === 1 &&
          !chart &&
          accumulating &&
          chartEvidence.samples === 1 &&
          /当前下载/.test(wanText) &&
          /当前上传/.test(wanText) &&
          /待积累|正在积累/.test(wanText) &&
          accumulatingRect && accumulatingRect.height <= 96 &&
          wanRect && wanRect.height <= 250
        )
      : chartSections.length === 0;
  const resourceSignalRect = rect(resourceSignal);
  const resourceEvidenceContract = expected?.risk !== 'resource' || Boolean(
    resourceSignal &&
    resourceMetrics.length === 3 &&
    resourceSeries.length === 3 &&
    resourceMetricEvidence.every((metric) => metric.valid) &&
    resourceMetrics.every((node) => {
      const threshold = node.getAttribute('data-threshold');
      return threshold !== null && threshold.trim() !== '' && Number.isFinite(Number(threshold));
    }) &&
    resourceChart?.getAttribute('role') === 'img' &&
    resourceChart.hasAttribute('viewBox') &&
    Boolean(resourceChart.querySelector('title')) &&
    Boolean(resourceChart.querySelector('desc')) &&
    resourceChartGeometryOk &&
    Number(resourceSignal.getAttribute('data-sample-count') || 0) >= 2 &&
    resourceTimes.length === 2 &&
    /阈值/.test(normalize(resourceSignal.textContent || '')) &&
    resourceSignalRect && resourceSignalRect.top >= 0 && resourceSignalRect.bottom <= window.innerHeight
  );
  const taskNeedsScenarioFocus = ['evidence', 'collection', 'wan'].includes(expected?.risk || '');
  const selectedInspectorContract = taskInspectorId
    ? taskLandmarkNames.includes('selected-inspector') && taskRiskObjectIds.includes(taskInspectorId)
    : !taskLandmarkNames.includes('selected-inspector');
  const comparisonLandmarkContract = expected?.comparison === false || taskLandmarkNames.includes('comparison');
  const taskLandmarkContract = Boolean(
    taskContract === 'overview-task-v1' &&
    taskLandmarkNames.includes('verdict') &&
    taskLandmarkNames.includes('freshness') &&
    taskLandmarkNames.includes('evidence-boundary') &&
    taskLandmarkNames.includes('investigation') &&
    taskActions.length >= 3 &&
    new Set(taskActionRoutes).size === taskActionRoutes.length &&
    (expected?.incident
      ? taskLandmarkNames.includes('risk-objects') &&
        taskRiskObjectIds.length >= 1 &&
        selectedInspectorContract &&
        (!taskNeedsScenarioFocus || (taskLandmarkNames.includes('scenario-focus') && Boolean(taskFocus)))
      : taskLandmarkNames.includes('signal') &&
        taskLandmarkNames.includes('focus') &&
        comparisonLandmarkContract &&
        Boolean(taskFocusObject))
  );
  const incidentEvidenceContract = expected?.risk === 'resource'
    ? resourceEvidenceContract
    : taskNeedsScenarioFocus
      ? taskLandmarkNames.includes('scenario-focus') && Boolean(taskFocus)
      : statusItems.length === 3 && incidentFacts.length === 0;
  const incidentContract = expected?.incident
    ? Boolean(
        incident && !normalWorkspace && !chart && statusItems.length === 3 && incidentFacts.length === 0 &&
        taskLandmarkContract && incidentEvidenceContract
      )
    : !incident;
  const evidenceBoundary = expected?.mode === 'unavailable'
    ? !/[0-9.]+\s*(?:K|M|G)?bps/i.test(desktopText) && !/网络可用/.test(desktopText)
    : expected?.mode === 'historical'
      ? !/[0-9.]+\s*(?:K|M|G)?bps/i.test(desktopText) && /(?:当前变化不可见|不代表当前业务)/.test(desktopText)
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
  const stackContinuity = Boolean(
    mainStacks.length === 2 &&
    stackEvidence.every((stack) => stack.children.length >= 2 && stack.gaps.every((gap) => gap >= 0 && gap <= 14))
  );
  const normalWorkspaceUse = Boolean(
    normalWorkspace && normalTopBand && normalDecisionBand &&
    normalTopBand.children.length >= 2 &&
    normalMainline && normalLedgerBand &&
    normalMainline.getBoundingClientRect().width >= normalWorkspace.getBoundingClientRect().width * 0.95 &&
    normalLedgerBand.getBoundingClientRect().width >= normalWorkspace.getBoundingClientRect().width * 0.95 &&
    normalWorkspace.querySelector('[data-overview-task-landmark="investigation"]') &&
    normalLedgerBand.querySelector('[data-overview-task-landmark="evidence-boundary"]')
  );
  const firstViewport = Boolean(
    statusRect && firstWorkRect &&
    statusRect.top >= 0 &&
    statusRect.bottom < window.innerHeight &&
    firstWorkRect.top < window.innerHeight - 80
  );
  const sourceCoverage = ledgerRows.length > 0 && ledgerSources.length === ledgerRows.length && ledgerSources.every((node) => normalize(node.textContent || ''));
  const routeCoverage = ledgerButtons.length > 0 && ledgerButtons.every((node) => Boolean(node.getAttribute('data-desktop-ledger-route')) && Boolean(node.getAttribute('aria-label')));
  const operatorSourceLanguage = !operatorSource || !/(?:meta\.|overview\.history|defaultRoutes\[|interfaces\[)/.test(operatorSourceText);

  const checks = {
    mounted: Boolean(desktopRoot),
    scenario: desktopRoot.getAttribute('data-desktop-overview-scenario') === (expected?.surfaceScenario || scaleScenario),
    evidenceMode: Boolean(expected && desktopRoot.getAttribute('data-desktop-evidence-mode') === expected.mode),
    risk: Boolean(expected && desktopRoot.getAttribute('data-desktop-overview-risk') === expected.risk),
    isolatedTree: !sectionRoot?.querySelector('[data-mobile-overview], [data-mobile-native-console], .ro-status-bus, .ro-desktop-grid'),
    statusBus: Boolean(
      statusBus && verdictTitle && desktopRoot.querySelectorAll('h1').length === 1 &&
      statusItems.length === 3
    ),
    taskContract: taskLandmarkContract,
    operatorSourceLanguage,
    incidentSubstitution: incidentContract,
    chartTruth: wanContract,
    resourceEvidence: resourceEvidenceContract,
    evidenceBoundary,
    semanticLedgers: ledgers.length >= 1 && sourceCoverage && routeCoverage,
    accessibleLedger: ledgerRows.every((row) => row.getAttribute('role') === 'row') && !desktopRoot.querySelector('[role="tab"], [role="tablist"], canvas'),
    readableType: smallText.length === 0,
    unclippedText: clippedText.length === 0,
    pointerTargets: smallTargets.length === 0,
    firstViewport,
    workspaceUse: mainGridUse && (expected?.incident ? lowerGridUse : normalWorkspaceUse || (!lowerGrid && stackContinuity)),
    noHorizontalOverflow: overflowX <= 1,
    viewport: Boolean(rootRect && sectionRect && Math.abs(rootRect.left - sectionRect.left) <= 1 && rootRect.width >= sectionRect.width - 2),
    readonly: /只读/.test(desktopText),
  };
  const pass = Boolean(app && active && (requested || active.id === sectionName) && !hasBadLiteral && scaleMetaOk && Object.values(checks).every(Boolean));
  const desktopOverviewLedgerProbe = {
    contract: taskContract,
    evidenceMode: desktopRoot.getAttribute('data-desktop-evidence-mode') || '',
    risk: desktopRoot.getAttribute('data-desktop-overview-risk') || '',
    statusItems: statusItems.length,
    incidentFacts: incidentFacts.length,
    ledgers: ledgers.map((node) => node.getAttribute('data-desktop-ledger') || ''),
    ledgerRows: ledgerRows.length,
    chartCount: chartSections.length,
    wanMode: expected?.wan || '',
    chartEvidence,
    accumulatingEvidence: {
      present: Boolean(accumulating),
      rect: accumulatingRect,
      sectionRect: wanRect,
      currentDown: /当前下载/.test(wanText),
      currentUp: /当前上传/.test(wanText),
      pending: /待积累|正在积累/.test(wanText),
    },
    resourceEvidence: {
      present: Boolean(resourceSignal),
      metrics: resourceMetrics.length,
      series: resourceSeries.length,
      samples: Number(resourceSignal?.getAttribute('data-sample-count') || 0),
      times: resourceTimes.length,
      rect: resourceSignalRect,
      chartRect: resourceChartRect,
      preserveAspectRatio: resourcePreserveAspectRatio,
      viewBoxRatio: Number(resourceViewBoxRatio.toFixed(3)),
      renderedRatio: Number(resourceRenderedRatio.toFixed(3)),
      aspectRatioDelta: Number.isFinite(resourceAspectRatioDelta) ? Number(resourceAspectRatioDelta.toFixed(3)) : null,
      chartGeometryOk: resourceChartGeometryOk,
      metricEvidence: resourceMetricEvidence,
    },
    task: {
      landmarks: taskLandmarkNames,
      focus: taskFocus?.getAttribute('data-overview-task-focus') || '',
      focusObject: taskFocusObject?.getAttribute('data-overview-task-focus-object') || '',
      riskObjects: taskRiskObjectIds,
      inspector: taskInspectorId,
      actions: taskActionRoutes,
      operatorSource: operatorSourceText,
    },
    firstViewport,
    smallText,
    clippedText,
    smallTargets,
    mainChildren: mainChildren.map(rect),
    lowerChildren: lowerChildren.map(rect),
    mainStacks: stackEvidence,
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
