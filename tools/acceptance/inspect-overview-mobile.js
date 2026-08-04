'use strict';

async function inspectOverviewMobileInteraction({ sectionName, sectionRoot, scaleScenario }) {
  const normalizeText = (value) => String(value || '').replace(/\s+/g, ' ').trim();
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
      selectedRow?.getAttribute('aria-current') === 'true' &&
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
  const expectedObjectId = destination.getAttribute('data-mobile-object-id') || '';
  const expectedEvidenceAt = destination.getAttribute('data-mobile-evidence-at') || '';
  const initialUrl = `${location.pathname}${location.search}${location.hash}`;
  destination.focus({ preventScroll: true });
  destination.click();
  const opened = await waitFor(() => (
    document.querySelector('[data-panel-app]')?.getAttribute('data-active-section') === expectedRoute &&
    Boolean(document.querySelector('[data-mobile-domain-workspace]')) &&
    (!expectedObjectId || document.querySelector('[data-mobile-object-detail]')?.getAttribute('data-mobile-object-detail') === expectedObjectId) &&
    (!expectedEvidenceAt || document.querySelector('[data-mobile-object-detail]')?.getAttribute('data-mobile-origin-evidence-at') === expectedEvidenceAt)
  ));
  const openedInspectorText = normalizeText(document.querySelector('[data-mobile-object-detail]')?.textContent || '');
  const openedObjectEvidence = !expectedObjectId || (
    /活动判据/.test(openedInspectorText) &&
    /路径/.test(openedInspectorText) &&
    /关联接口/.test(openedInspectorText)
  );
  history.back();
  const backed = await waitFor(() => (
    `${location.pathname}${location.search}${location.hash}` === initialUrl &&
    Boolean(document.querySelector('[data-mobile-overview]'))
  ));
  history.forward();
  const forwarded = await waitFor(() => (
    document.querySelector('[data-panel-app]')?.getAttribute('data-active-section') === expectedRoute &&
    Boolean(document.querySelector('[data-mobile-domain-workspace]')) &&
    (!expectedObjectId || document.querySelector('[data-mobile-object-detail]')?.getAttribute('data-mobile-object-detail') === expectedObjectId) &&
    (!expectedEvidenceAt || document.querySelector('[data-mobile-object-detail]')?.getAttribute('data-mobile-origin-evidence-at') === expectedEvidenceAt)
  ));
  history.back();
  const restored = await waitFor(() => (
    `${location.pathname}${location.search}${location.hash}` === initialUrl &&
    Boolean(document.querySelector('[data-mobile-overview]'))
  ));

  result.nativeMobileInteractionOk = Boolean(expectedRoute && opened && openedObjectEvidence && backed && forwarded && restored);
  result.nativeMobileObjectNavigationOk = result.nativeMobileInteractionOk;
  result.nativeMobileInteractionProbe = {
    exercised: true,
    expectedRoute,
    expectedObjectId,
    expectedEvidenceAt,
    opened,
    openedObjectEvidence,
    backed,
    forwarded,
    restored,
  };
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
    single: { mode: 'current', risk: 'none', facts: ['route', 'wan', 'collection'], title: '业务可用性尚未判定', priority: 0, traffic: true, resource: false, ledger: ['target', 'boundary'] },
    fleet: { mode: 'current', risk: 'interfaces', facts: ['route', 'wan', 'collection'], title: '3 个出口依赖接口未运行', priority: 3, priorityLabel: '配置依赖接口', priorityTitle: '核对受影响配置依赖', traffic: false, resource: false, ledger: ['target', 'boundary'] },
    'all-offline': { mode: 'current', risk: 'wan', facts: [], focus: 'outage', title: '全部', priority: 8, priorityLabel: '离线 WAN', priorityTitle: '逐条核对 WAN 链路', traffic: false, ledger: ['target', 'boundary'] },
    'no-snapshot': { mode: 'unavailable', risk: 'evidence', facts: [], focus: 'coverage', title: '当前业务状态不可判断', priority: 2, priorityLabel: '恢复入口', priorityTitle: '恢复当前快照', traffic: false, ledger: ['failures', 'boundary'] },
    'collection-down': { mode: 'historical', risk: 'collection', facts: [], focus: 'planes', title: '', priority: 2, priorityLabel: '断链通道', priorityTitle: '定位断开的采集通道', traffic: false, ledger: ['target', 'failures', 'boundary'] },
    'resource-full': { mode: 'current', risk: 'resource', facts: ['resource-breaches', 'resource-trailing', 'resource-samples'], title: '资源策略已触发', priority: 1, priorityLabel: '资源对象', priorityTitle: '检查超限资源', traffic: false, resource: true, ledger: ['target', 'boundary'] },
    'interfaces-down': { mode: 'current', risk: 'interfaces', facts: ['route', 'wan', 'collection'], title: '3 个出口依赖接口未运行', priority: 3, priorityLabel: '配置依赖接口', priorityTitle: '核对受影响配置依赖', traffic: false, resource: false, ledger: ['target', 'boundary'] },
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
  const scenarioFocus = mobileRoot.querySelector('[data-mobile-scenario-focus]');
  const scenarioFocusItems = Array.from(scenarioFocus?.querySelectorAll('[data-mobile-scenario-focus-item]') || []);
  const scenarioFocusActions = Array.from(scenarioFocus?.querySelectorAll('[data-mobile-scenario-action]') || []);
  const scenarioFocusEvidence = Array.from(scenarioFocus?.querySelectorAll('[data-mobile-scenario-evidence]') || []);
  const incidentCount = mobileRoot.querySelector('[data-mobile-incident-count]');
  const incidentLabel = mobileRoot.querySelector('[data-mobile-incident-center] .mp-section-kicker');
  const incidentTitle = mobileRoot.querySelector('[data-mobile-incident-center] h2');
  const incidentRows = Array.from(mobileRoot.querySelectorAll('[data-mobile-incident-object]'));
  const nextDecision = mobileRoot.querySelector('[data-mobile-next-decision]');
  const nextDecisionButton = nextDecision?.querySelector('button[data-mobile-destination]');
  const traffic = mobileRoot.querySelector('[data-mobile-traffic-signal]');
  const chart = mobileRoot.querySelector('.mp-chart');
  const resourceSignal = mobileRoot.querySelector('[data-mobile-resource-signal]');
  const resourceHistory = mobileRoot.querySelector('[data-mobile-resource-history]');
  const resourceChart = mobileRoot.querySelector('[data-section-time-series]');
  const ledger = mobileRoot.querySelector('[data-mobile-evidence-ledger]');
  const ledgerRows = Array.from(ledger?.querySelectorAll('dl > div') || []);
  const ledgerKeys = ledgerRows.map((node) => node.getAttribute('data-mobile-evidence-row') || '');
  const patrolActions = mobileRoot.querySelector('.mp-actions');
  const patrolActionButtons = Array.from(mobileRoot.querySelectorAll('.mp-actions button[id], [data-mobile-incident-follow-up-context] button[id]'));
  const workspacePrimary = mobileRoot.querySelector('.mp-workspace-primary');
  const workspaceContext = mobileRoot.querySelector('.mp-workspace-context');
  const workspaceBody = mobileRoot.querySelector('.mp-workspace-body');
  const tabletSteady = mobileRoot.querySelector('.mp-tablet-steady');
  const tabletRouteColumn = mobileRoot.querySelector('.mp-tablet-route-column');
  const tabletSteadySupport = mobileRoot.querySelector('.mp-tablet-steady-support');
  const focusDossier = mobileRoot.querySelector('.mp-route-dossier[data-overview-task-focus="active-object"]');
  const steadyObject = nextDecision || focusDossier;
  const focusSignal = steadyObject?.querySelector('.mp-focus-signal');
  const focusSignalMetrics = Array.from(focusSignal?.querySelectorAll('.mp-focus-signal-metric') || []);
  const focusIdentityTitle = steadyObject?.querySelector('.mp-focus-copy > b');
  const focusIdentityNote = steadyObject?.querySelector('.mp-focus-copy > em');
  const incidentCenter = mobileRoot.querySelector('[data-mobile-incident-center]');
  const incidentInspector = mobileRoot.querySelector('[data-mobile-incident-inspector]');
  const tabletMasterDetail = mobileRoot.querySelector('.mp-tablet-master-detail');
  const tabletSupport = mobileRoot.querySelector('.mp-tablet-support');
  const taskNavigation = document.querySelector('.panel-task-navigation');
  const taskButtons = Array.from(taskNavigation?.querySelectorAll('button') || []);
  const mobileText = normalize(mobileRoot.textContent || '');
  const pageText = normalize(document.body.textContent || '');
  const mobileRect = rect(mobileRoot);
  const sectionRect = rect(sectionRoot);
  const verdictRect = rect(verdict);
  const factsRect = rect(mobileRoot.querySelector('[data-mobile-core-facts]'));
  const scenarioFocusRect = rect(scenarioFocus);
  const supportingDecisionRect = scenarioFocusRect || factsRect;
  const nextDecisionRect = rect(nextDecision);
  const focusDossierRect = rect(focusDossier);
  const focusSignalRect = rect(focusSignal);
  const firstIncidentRect = rect(incidentRows[0]);
  const firstIncidentReason = incidentRows[0]?.querySelector('.mp-incident-copy p');
  const firstIncidentReasonRect = rect(firstIncidentReason);
  const firstIncidentChevron = incidentRows[0]?.querySelector('.mp-window svg');
  const decisionRect = firstIncidentRect || supportingDecisionRect;
  const trafficRect = rect(traffic);
  const resourceSignalRect = rect(resourceSignal);
  const primaryAction = incidentRows[0] ||
    scenarioFocus ||
    (expected?.resource ? resourceSignal : null) ||
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
    .map((node) => ({
      text: normalize(node.textContent || '').slice(0, 40),
      height: Math.round(node.getBoundingClientRect().height),
      tag: node.tagName.toLowerCase(),
      className: typeof node.className === 'string' ? node.className : '',
      ancestors: Array.from({ length: 5 }, (_, index) => {
        let current = node;
        for (let step = 0; step <= index && current; step += 1) current = current.parentElement;
        return current ? `${current.tagName.toLowerCase()}.${typeof current.className === 'string' ? current.className : ''}` : '';
      }).filter(Boolean),
    }));
  const ariaControlsValid = Array.from(mobileRoot.querySelectorAll('[aria-controls]')).every((node) => {
    const id = node.getAttribute('aria-controls');
    return Boolean(id && document.getElementById(id));
  });

  const factPairs = facts.map((node) => normalize(`${node.querySelector('small')?.textContent || ''}::${node.querySelector('b')?.textContent || ''}`));
  const objectPairs = incidentRows.map((node) => normalize(`${node.querySelector('small')?.textContent || ''}::${node.querySelector('em')?.textContent || ''}`));
  const repeatedPairs = objectPairs.filter((pair) => factPairs.includes(pair));
  const priorityTotal = Number(incidentCount?.textContent || 0);
  const tabletCapability = window.innerWidth >= 768 && window.innerWidth < 1200 && window.innerHeight >= 700;
  const expectedPriorityVisible = tabletCapability ? expected?.priority || 0 : Math.min(3, expected?.priority || 0);
  const priorityRoutesValid = incidentRows.every((node) => Boolean(node.getAttribute('data-mobile-incident-route')));
  const priorityLabelsValid = incidentRows.every((node) => Boolean(node.getAttribute('aria-label')));
  const clippedIncidentIdentities = incidentRows
    .map((node) => ({
      objectId: node.getAttribute('data-mobile-incident-object') || '',
      identity: node.querySelector('.mp-incident-copy b'),
    }))
    .filter(({ identity }) => Boolean(
      identity && isVisible(identity) && (
        identity.scrollWidth > identity.clientWidth + 1 ||
        identity.scrollHeight > identity.clientHeight + 1
      )
    ))
    .map(({ objectId, identity }) => ({
      objectId,
      text: normalize(identity?.textContent || ''),
      client: [identity?.clientWidth || 0, identity?.clientHeight || 0],
      scroll: [identity?.scrollWidth || 0, identity?.scrollHeight || 0],
    }));
  const currentRateText = /\b\d+(?:\.\d+)?\s*(?:[KMG]?bps)\b/i.test(mobileText);
  const shouldShowNextDecision = scaleScenario === 'single' && expected?.mode === 'current' && expected?.risk === 'none';
  const canonicalNextDecisionCell = window.innerWidth === 390 && window.innerHeight === 844;
  const nextDecisionViewportBottom = navRect && navRect.width >= window.innerWidth * 0.7 ? navRect.top : window.innerHeight;
  const nextDecisionText = normalize(nextDecision?.textContent || '');
  const nextDecisionClippedText = Array.from(nextDecision?.querySelectorAll('b, em, time') || [])
    .filter((node) => node.scrollWidth > node.clientWidth + 1 || node.scrollHeight > node.clientHeight + 1)
    .map((node) => normalize(node.textContent || ''));
  const nextDecisionOk = shouldShowNextDecision
    ? tabletSteady
      ? Boolean(
        !nextDecision &&
        focusDossier?.getAttribute('data-overview-task-focus-object') &&
        focusDossier.querySelector('time[datetime]')?.getAttribute('datetime') &&
        /当前出口/.test(normalize(focusDossier.textContent || '')) &&
        /活动默认路由/.test(normalize(focusDossier.textContent || '')) &&
        /当前承载/.test(normalize(focusDossier.textContent || ''))
      )
      : Boolean(
      nextDecision &&
      nextDecisionButton &&
      nextDecision.getAttribute('data-mobile-next-decision') &&
      nextDecisionButton.getAttribute('data-mobile-destination') === 'routes' &&
      nextDecisionButton.getAttribute('data-mobile-object-id') &&
      nextDecisionButton.getAttribute('data-mobile-evidence-at') &&
      /当前核对对象/.test(nextDecisionText) &&
      /活动默认路由/.test(nextDecisionText) &&
      /当前承载/.test(nextDecisionText) &&
      nextDecisionClippedText.length === 0 &&
      nextDecisionRect &&
      decisionRect &&
      (!verdictRect || nextDecisionRect.top >= verdictRect.bottom - 2) &&
      (!factsRect || nextDecisionRect.bottom <= factsRect.top + 2) &&
      (!trafficRect || nextDecisionRect.bottom <= trafficRect.top + 2) &&
      (canonicalNextDecisionCell ? nextDecisionRect.top <= 320 : nextDecisionRect.bottom <= nextDecisionViewportBottom)
      )
    : !nextDecision;
  const fleetPatrol = Boolean(
    scaleScenario === 'fleet' && expected?.mode === 'current' && expected?.risk === 'interfaces'
  );
  const compactIncidentViewport = window.innerWidth >= 600 && window.innerWidth < 772 && window.innerHeight < 700;
  const shouldShowPatrolActions = Boolean(
    fleetPatrol ||
    tabletCapability ||
    expected?.risk !== 'none' ||
    expected?.risk === 'evidence' ||
    expected?.risk === 'collection' ||
    (compactIncidentViewport && priorityTotal > 0)
  );
  const expectedPatrolActionCount = shouldShowPatrolActions ? 3 : 0;
  const patrolActionRoutes = patrolActionButtons.map((button) => button.id);
  const patrolActionsOk = shouldShowPatrolActions
    ? Boolean(patrolActions && patrolActionButtons.length === expectedPatrolActionCount && patrolActionRoutes.every(Boolean))
    : !patrolActions && patrolActionButtons.length === 0;
  const tabletWorkspaceOk = window.innerWidth < 768 || window.innerHeight < 700 || (() => {
    const largeTextMode = mobileRoot.classList.contains('is-large-text');
    if (priorityTotal === 0) {
      if (!tabletSteady || !tabletRouteColumn || !traffic || !tabletSteadySupport) return false;
      const steadyBounds = tabletSteady.getBoundingClientRect();
      const routeBounds = tabletRouteColumn.getBoundingClientRect();
      const trafficBounds = traffic.getBoundingClientRect();
      const supportBounds = tabletSteadySupport.getBoundingClientRect();
      const supportChildren = Array.from(tabletSteadySupport.children)
        .map((node) => node.getBoundingClientRect())
        .filter((bounds) => bounds.width > 0 && bounds.height > 0);
      const supportVisualWidth = supportBounds.width > 0
        ? supportBounds.width
        : supportChildren.length
          ? Math.max(...supportChildren.map((bounds) => bounds.right)) - Math.min(...supportChildren.map((bounds) => bounds.left))
          : 0;
      return steadyBounds.width >= 620 && routeBounds.width >= 240 && trafficBounds.width >= 320 &&
        Math.abs(routeBounds.top - trafficBounds.top) <= 2 && supportVisualWidth >= steadyBounds.width - 2;
    }
    if (!workspaceBody || !tabletMasterDetail || !tabletSupport || !incidentCenter || !ledger || !patrolActions) return false;
    const bodyBounds = workspaceBody.getBoundingClientRect();
    const splitCapable = bodyBounds.width >= 640;
    const objectsBounds = incidentCenter.getBoundingClientRect();
    const inspectorBounds = incidentInspector?.getBoundingClientRect() || null;
    const masterDetailBounds = tabletMasterDetail.getBoundingClientRect();
    const supportBounds = tabletSupport.getBoundingClientRect();
    const ledgerBounds = ledger.getBoundingClientRect();
    const actionsBounds = patrolActions.getBoundingClientRect();
    const masterDetail = !inspectorBounds
      ? objectsBounds.width >= 400
      : largeTextMode || !splitCapable
        ? objectsBounds.width >= 400 && inspectorBounds.width >= 400 && inspectorBounds.top >= objectsBounds.bottom - 2
        : objectsBounds.width >= 240 && inspectorBounds.width >= 400 && Math.abs(objectsBounds.top - inspectorBounds.top) <= 2;
    const supportRegions = masterDetailBounds.width >= bodyBounds.width - 2 && supportBounds.width >= bodyBounds.width - 2 &&
      ledgerBounds.width >= supportBounds.width - 2 && actionsBounds.width >= supportBounds.width - 2;
    return masterDetail && supportRegions;
  })();
  const shortLandscape = window.innerWidth >= 600 && window.innerWidth < 1200 && window.innerHeight < 700;
  const splitGridTracks = (value) => {
    const tracks = [];
    let current = '';
    let depth = 0;
    for (const character of String(value || '')) {
      if (character === '(') depth += 1;
      if (character === ')') depth = Math.max(0, depth - 1);
      if (/\s/.test(character) && depth === 0) {
        if (current.trim()) tracks.push(current.trim());
        current = '';
      } else {
        current += character;
      }
    }
    if (current.trim()) tracks.push(current.trim());
    return tracks;
  };
  const workspaceColumns = workspaceBody
    ? splitGridTracks(getComputedStyle(workspaceBody).gridTemplateColumns)
    : [];
  const shortLandscapePatrolOk = !shortLandscape || Boolean(
    !tabletMasterDetail &&
    !incidentInspector &&
    (!workspaceBody || workspaceColumns.length <= 1)
  );
  const expectedFocusCounts = expected?.focus === 'coverage'
    ? { action: 2, evidence: 1 }
    : expected?.focus === 'planes' || expected?.focus === 'outage'
      ? { action: 2, evidence: 2 }
      : { action: 0, evidence: 0 };
  const scenarioFocusSemanticsOk = expected?.focus
    ? scenarioFocusItems.length === scenarioFocusActions.length + scenarioFocusEvidence.length &&
      scenarioFocusActions.length === expectedFocusCounts.action &&
      scenarioFocusActions.length <= 2 &&
      scenarioFocusActions.every((node) => node.tagName === 'BUTTON' && Boolean(node.getAttribute('data-mobile-destination'))) &&
      scenarioFocusEvidence.length === expectedFocusCounts.evidence &&
      scenarioFocusEvidence.every((node) => (
        node.tagName !== 'BUTTON' &&
        !node.hasAttribute('data-mobile-destination') &&
        getComputedStyle(node.querySelector('em')).whiteSpace !== 'nowrap'
      ))
    : !scenarioFocus && scenarioFocusActions.length === 0 && scenarioFocusEvidence.length === 0;

  const chartStatus = traffic?.querySelector('.mp-traffic-body')?.classList.contains('is-ready') ? 'ready' : traffic ? 'accumulating' : '';
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
  const firstIncidentText = normalize(incidentRows[0]?.textContent || '');
  const resourceMeterLabels = resourceMeters.map((meter) => normalize(meter.closest('div')?.querySelector('b')?.textContent || ''));
  const resourceTruthOk = !resourceSignal || Boolean(
    resourceMeters.length >= 2 &&
    resourceMeterLabels.every((label, index) => label && resourceMeterLabels.indexOf(label) === index && !firstIncidentText.includes(label)) &&
    resourceMeters.every((meter) => (
      Number(meter.getAttribute('aria-valuenow')) >= 0 &&
      Number(meter.getAttribute('aria-valuenow')) <= 100 &&
      /阈值/.test(meter.getAttribute('aria-label') || '')
    )) &&
    Boolean(resourceHistory) &&
    (!resourceSvg || (
      resourceSvg.getAttribute('preserveAspectRatio') !== 'none' &&
      resourceSvg.querySelector('title') &&
      resourceSvg.querySelector('desc') &&
      resourceSvg.querySelector('.section-series-threshold') &&
      resourceChart.querySelector('.section-timeseries-axis')
    ))
  );
  const resourceModeOk = expected?.resource === true
    ? Boolean(resourceSignal && resourceTruthOk)
    : !resourceSignal;
  const riskEvidenceOrderOk = Boolean(expected && (
    expected.risk === 'interfaces'
      ? firstIncidentRect && (!trafficRect || firstIncidentRect.top < trafficRect.top)
      : expected.risk === 'resource'
        ? resourceSignalRect && firstIncidentRect && firstIncidentRect.top < resourceSignalRect.top
        : true
  ));
  const visualContractViewport = (
    (window.innerWidth === 390 && window.innerHeight === 844) ||
    (window.innerWidth === 768 && window.innerHeight === 1024) ||
    (window.innerWidth === 844 && window.innerHeight === 390)
  );
  const steadyObjectRect = nextDecisionRect || focusDossierRect;
  const steadySignalBalanceOk = !visualContractViewport || scaleScenario !== 'single' || Boolean(
    steadyObjectRect &&
    trafficRect &&
    trafficRect.height <= 230 &&
    (
      window.innerWidth === 768
        ? steadyObjectRect.top <= trafficRect.top + 2
        : steadyObjectRect.bottom <= trafficRect.top + 2
    )
  );
  const scenarioObjectStageOk = !visualContractViewport || !expected?.focus || Boolean(
    firstIncidentRect &&
    scenarioFocusRect &&
    firstIncidentRect.top < scenarioFocusRect.top &&
    firstIncidentRect.bottom <= window.innerHeight
  );
  const bottomNavigation = Boolean(navRect && navRect.width >= window.innerWidth * 0.7);
  const firstViewportBottom = bottomNavigation ? navRect.top : window.innerHeight;
  const narrowCurrentIncident = window.innerWidth < 360 && expected?.mode === 'current' && expected.priority > 0 && expected.facts.length > 0;
  const narrowIncidentObjectFirstOk = !narrowCurrentIncident || Boolean(
    firstIncidentRect &&
    factsRect &&
    firstIncidentReason &&
    firstIncidentReasonRect &&
    firstIncidentChevron &&
    firstIncidentRect.top < factsRect.top &&
    firstIncidentRect.bottom <= firstViewportBottom &&
    firstIncidentReasonRect.bottom <= firstViewportBottom &&
    firstIncidentReason.scrollWidth <= firstIncidentReason.clientWidth + 1 &&
    firstIncidentReason.scrollHeight <= firstIncidentReason.clientHeight + 1
  );

  const focusSignalLabels = focusSignalMetrics.map((node) => normalize(node.querySelector('small')?.textContent || ''));
  const focusSignalValues = focusSignalMetrics.map((node) => normalize(node.querySelector('b')?.textContent || ''));
  const focusSignalValuesTruthful = focusSignalValues.length === 2 && focusSignalValues.every((value) => /^(?:0|\d+(?:\.\d+)?)\s*(?:bps|Kbps|Mbps|Gbps)$/.test(value));
  const focusSignalReadingsSingleLine = focusSignalMetrics.length === 2 && focusSignalMetrics.every((node) => {
    const reading = node.querySelector('b');
    if (!reading) return false;
    const readingStyle = getComputedStyle(reading);
    const lineHeight = Number.parseFloat(readingStyle.lineHeight) || Number.parseFloat(readingStyle.fontSize) * 1.2;
    const readingRect = reading.getBoundingClientRect();
    return reading.scrollWidth <= reading.clientWidth + 1 && readingRect.height <= lineHeight * 1.35;
  });
  const focusIdentityTitleSize = Number.parseFloat(focusIdentityTitle ? getComputedStyle(focusIdentityTitle).fontSize : '0');
  const trafficTitle = traffic?.querySelector('h2');
  const trafficTitleSize = Number.parseFloat(trafficTitle ? getComputedStyle(trafficTitle).fontSize : '0');
  const focusIdentityClipped = Boolean(
    focusIdentityNote && focusIdentityNote.scrollWidth > focusIdentityNote.clientWidth + 1
  );
  const tabletRouteRect = rect(tabletRouteColumn);
  const trafficCurrentPair = traffic?.querySelector('.mp-rate-pair');
  const objectSignalDossierOk = !visualContractViewport || scaleScenario !== 'single' || Boolean(
    steadyObjectRect &&
    focusSignalRect &&
    focusSignalMetrics.length === 2 &&
    focusSignalLabels.join('|') === '下载|上传' &&
    focusSignalValuesTruthful &&
    !trafficCurrentPair &&
    focusIdentityTitleSize >= trafficTitleSize &&
    focusSignalRect.top >= steadyObjectRect.top - 1 &&
    focusSignalRect.bottom <= steadyObjectRect.bottom + 1 &&
    (
      window.innerWidth === 768
        ? tabletRouteRect && trafficRect && tabletRouteRect.width >= trafficRect.width * 0.8 && !focusIdentityClipped && focusSignalReadingsSingleLine
        : focusSignalRect.bottom <= firstViewportBottom
    )
  );

  const firstViewportOk = Boolean(
    verdictRect && decisionRect &&
    verdictRect.top >= 0 &&
    decisionRect.bottom <= firstViewportBottom &&
    (expected?.priority > 0 ? primaryRect : decisionRect)?.top < firstViewportBottom
  );

  const ledgerSummary = ledger?.querySelector('summary');
  const ledgerBody = ledger?.querySelector('dl');
  const ledgerBox = ledger?.getBoundingClientRect();
  const ledgerSummaryBox = ledgerSummary?.getBoundingClientRect();
  const ledgerBodyBox = ledgerBody?.getBoundingClientRect();
  const ledgerBottomBoundary = bottomNavigation && navRect ? navRect.top : window.innerHeight - 16;
  const availableLedgerHeight = ledgerBox ? Math.max(0, ledgerBottomBoundary - ledgerBox.top) : 0;
  const requiredLedgerHeight = (ledgerSummaryBox?.height || 0) + (ledgerBodyBox?.height || 0);
  const explicitAutoOpen = ledger?.getAttribute('data-auto-open') === 'true';
  const shouldOpenLedger = explicitAutoOpen
    ? Boolean(ledgerRows.length)
    : Boolean(ledgerRows.length && requiredLedgerHeight > 0 && requiredLedgerHeight <= availableLedgerHeight);
  const adaptiveLedgerOk = Boolean(
    ledger &&
    (explicitAutoOpen
      ? ledger.open === true
      : ledgerBodyBox && ledgerBodyBox.height > 0 && ledger.open === shouldOpenLedger)
  );
  const expectedLedgerKeys = expected?.ledger.filter((key) => key !== 'failures' || ledgerKeys.includes('failures')) || [];
  const novelLedgerOk = Boolean(
    expected &&
    ledgerKeys.length === expectedLedgerKeys.length &&
    ledgerKeys.every((key, index) => key === expectedLedgerKeys[index]) &&
    !ledgerKeys.includes('success') &&
    ledgerRows.every((row) => row.getAttribute('data-mobile-evidence-row') !== 'failures' || /已记录\s+[1-9]\d*/.test(normalize(row.textContent || '')))
  );

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
    compactVerdict: Boolean(verdictRect && verdictRect.height >= 58 && verdictRect.height <= 96),
    threeFacts: Boolean(expected && (
      expected.focus
        ? facts.length === 0
        : facts.length === 3 && expected.facts.every((key) => factKeys.includes(key))
    )),
    scenarioFocus: Boolean(expected && (
      expected.focus
        ? scenarioFocus?.getAttribute('data-mobile-scenario-focus') === expected.focus && scenarioFocusItems.length >= 3
        : !scenarioFocus
    )),
    scenarioFocusSemantics: scenarioFocusSemanticsOk,
    nextDecision: nextDecisionOk,
    noFactQueueReplay: repeatedPairs.length === 0,
    priorityCount: Boolean(expected && priorityTotal === expected.priority && incidentRows.length === expectedPriorityVisible),
    priorityTaskCopy: Boolean(expected && (
      expected.priority === 0
        ? !incidentLabel && !incidentTitle
        : normalize(incidentLabel?.textContent || '') === expected.priorityLabel && normalize(incidentTitle?.textContent || '') === expected.priorityTitle
    )),
    priorityRoutes: priorityRoutesValid && priorityLabelsValid,
    priorityIdentitiesVisible: clippedIncidentIdentities.length === 0,
    patrolActions: patrolActionsOk,
    tabletWorkspace: tabletWorkspaceOk,
    shortLandscapePatrol: shortLandscapePatrolOk,
    chartTruth: chartTruthOk && chartModeOk && resourceTruthOk && resourceModeOk,
    riskEvidenceOrder: riskEvidenceOrderOk,
    steadySignalBalance: steadySignalBalanceOk,
    scenarioObjectStage: scenarioObjectStageOk,
    objectSignalDossier: objectSignalDossierOk,
    narrowIncidentObjectFirst: narrowIncidentObjectFirstOk,
    unavailableBoundary: expected?.mode !== 'unavailable' || (!currentRateText && !/出口路径已核实|默认路由已核实/.test(mobileText)),
    historicalBoundary: expected?.mode !== 'historical' || (!currentRateText && !/出口路径已核实/.test(mobileText)),
    novelLedger: novelLedgerOk,
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
    scenarioFocus: scenarioFocus?.getAttribute('data-mobile-scenario-focus') || '',
    scenarioFocusItems: scenarioFocusItems.map((node) => node.getAttribute('data-mobile-scenario-focus-item') || ''),
    scenarioFocusSemantics: {
      actions: scenarioFocusActions.map((node) => node.getAttribute('data-mobile-scenario-focus-item') || ''),
      evidence: scenarioFocusEvidence.map((node) => node.getAttribute('data-mobile-scenario-focus-item') || ''),
    },
    priorityTotal,
    priorityVisible: incidentRows.length,
    priorityLabel: normalize(incidentLabel?.textContent || ''),
    priorityTitle: normalize(incidentTitle?.textContent || ''),
    clippedIncidentIdentities,
    nextDecision: nextDecisionRect ? {
      text: nextDecisionText,
      top: nextDecisionRect.top,
      bottom: nextDecisionRect.bottom,
      route: nextDecisionButton?.getAttribute('data-mobile-destination') || '',
      objectId: nextDecisionButton?.getAttribute('data-mobile-object-id') || '',
      evidenceAt: nextDecisionButton?.getAttribute('data-mobile-evidence-at') || '',
      clippedText: nextDecisionClippedText,
    } : null,
    ledger: {
      keys: ledgerKeys,
      open: Boolean(ledger?.open),
      requiredHeight: Math.round(requiredLedgerHeight),
      availableHeight: Math.round(availableLedgerHeight),
      explicitAutoOpen,
      expectedOpen: shouldOpenLedger,
      override: ledger?.getAttribute('data-user-override') || '',
    },
    tabletLayout: workspaceBody ? {
      bodyWidth: Math.round(workspaceBody.getBoundingClientRect().width),
      gridTemplateColumns: getComputedStyle(workspaceBody).gridTemplateColumns,
      direction: getComputedStyle(workspaceBody).direction,
      writingMode: getComputedStyle(workspaceBody).writingMode,
      primaryWidth: Math.round(workspacePrimary?.getBoundingClientRect().width || 0),
      contextWidth: Math.round(workspaceContext?.getBoundingClientRect().width || 0),
      masterDetailWidth: Math.round(tabletMasterDetail?.getBoundingClientRect().width || 0),
      supportWidth: Math.round(tabletSupport?.getBoundingClientRect().width || 0),
      objects: incidentCenter ? {
        top: Math.round(incidentCenter.getBoundingClientRect().top),
        width: Math.round(incidentCenter.getBoundingClientRect().width),
      } : null,
      inspector: incidentInspector ? {
        top: Math.round(incidentInspector.getBoundingClientRect().top),
        width: Math.round(incidentInspector.getBoundingClientRect().width),
      } : null,
      ledgerWidth: Math.round(ledger?.getBoundingClientRect().width || 0),
      actionsWidth: Math.round(patrolActions?.getBoundingClientRect().width || 0),
    } : null,
    shortLandscape: {
      expected: shortLandscape,
      workspaceColumns,
      tabletMasterDetail: Boolean(tabletMasterDetail),
      incidentInspector: Boolean(incidentInspector),
    },
    traffic: chartStatus,
    resource: resourceStatus,
    evidenceOrder: {
      firstIncident: firstIncidentRect,
      scenarioFocus: scenarioFocusRect,
      steadyObject: steadyObjectRect,
      traffic: trafficRect,
      resource: resourceSignalRect,
    },
    objectSignalDossier: {
      focusSignal: focusSignalRect,
      metricLabels: focusSignalLabels,
      metricValues: focusSignalValues,
      readingsSingleLine: focusSignalReadingsSingleLine,
      trafficCurrentPair: Boolean(trafficCurrentPair),
      objectTitleSize: focusIdentityTitleSize,
      trafficTitleSize,
      identityClipped: focusIdentityClipped,
      tabletRouteWidth: tabletRouteRect?.width || 0,
      trafficWidth: trafficRect?.width || 0,
    },
    narrowIncidentObjectFirst: {
      applicable: narrowCurrentIncident,
      facts: factsRect,
      firstIncident: firstIncidentRect,
      reason: firstIncidentReasonRect,
      reasonClipped: Boolean(firstIncidentReason && (
        firstIncidentReason.scrollWidth > firstIncidentReason.clientWidth + 1 ||
        firstIncidentReason.scrollHeight > firstIncidentReason.clientHeight + 1
      )),
      chevronVisible: Boolean(firstIncidentChevron && isVisible(firstIncidentChevron)),
      firstViewportBottom,
    },
    verdictHeight: verdictRect?.height || 0,
    firstViewport: {
      bottom: Math.round(firstViewportBottom),
      bottomNavigation,
      verdict: verdictRect ? {
        top: Math.round(verdictRect.top),
        bottom: Math.round(verdictRect.bottom),
        height: Math.round(verdictRect.height),
      } : null,
      decision: decisionRect ? {
        top: Math.round(decisionRect.top),
        bottom: Math.round(decisionRect.bottom),
        height: Math.round(decisionRect.height),
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
