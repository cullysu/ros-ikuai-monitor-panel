'use strict';

async function inspectOverviewMobileInteraction({ sectionName, sectionRoot, normalize }) {
  let nativeMobileInteractionOk = true;
  let nativeMobileInteractionProbe = null;
  let nativeMobileFocusKeyboardOk = true;
  let nativeMobileFocusKeyboardProbe = null;
  let nativeMobileObjectSelectionOk = true;
  let nativeMobileObjectSelectionProbe = null;
  let nativeMobileObjectNavigationOk = true;
  let nativeDetailSectionCount = 0;
  let nativeDetailRawEvidenceCount = 0;
  let nativeDetailHasNovelEvidence = false;
  let nativeDetailNoHomeReplay = false;
  const nativeAcceptanceScrollY = window.scrollY;
  if (sectionName === 'overview') {
    const waitForNativeState = async (predicate, timeoutMs = 900) => {
      const startedAt = performance.now();
      while (performance.now() - startedAt < timeoutMs) {
        if (predicate()) return true;
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      return Boolean(predicate());
    };
    const nativeRoot = sectionRoot?.querySelector('[data-mobile-native-console]');
    const nativeAcceptanceRootTop = nativeRoot?.getBoundingClientRect().top ?? 0;
    const nativePrimaryFocus = nativeRoot?.getAttribute('data-mobile-native-primary-focus') || '';
    const nativeFocusOptions = Array.from(nativeRoot?.querySelectorAll('.mn-focus-queue [role="option"]') || []);
    const selectedNativeFocus = nativeFocusOptions.find((option) => option.getAttribute('aria-selected') === 'true');
    if (nativeRoot && selectedNativeFocus && nativeFocusOptions.length > 1) {
      const initialFocusId = selectedNativeFocus.id;
      const initialIndex = nativeFocusOptions.indexOf(selectedNativeFocus);
      const expectedNextId = nativeFocusOptions[(initialIndex + 1) % nativeFocusOptions.length].id;
      selectedNativeFocus.focus({ preventScroll: true });
      selectedNativeFocus.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 40));
      const nextSelectedFocus = nativeRoot.querySelector('[role="option"][aria-selected="true"]');
      const movedForward = nextSelectedFocus?.id === expectedNextId && document.activeElement === nextSelectedFocus;
      const forwardFocusId = document.activeElement?.id || '';
      nextSelectedFocus?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 40));
      const restoredFocus = nativeRoot.querySelector('[role="option"][aria-selected="true"]');
      nativeMobileFocusKeyboardOk = Boolean(movedForward && restoredFocus?.id === initialFocusId && document.activeElement === restoredFocus);
      nativeMobileFocusKeyboardProbe = {
        initialFocusId,
        expectedNextId,
        nextSelectedId: nextSelectedFocus?.id || '',
        forwardFocusId,
        restoredFocusId: restoredFocus?.id || '',
        restoredActiveId: document.activeElement?.id || '',
      };
    }
    const nativeObjectOptions = Array.from(nativeRoot?.querySelectorAll('.mn-object-carousel [role="option"]') || []);
    if (nativeRoot && nativeObjectOptions.length > 1) {
      const initialObject = nativeObjectOptions.find((option) => option.getAttribute('aria-selected') === 'true');
      const initialObjectIndex = nativeObjectOptions.indexOf(initialObject);
      const expectedObject = nativeObjectOptions[(initialObjectIndex + 1) % nativeObjectOptions.length];
      const initialInspectionObject = nativeRoot.querySelector('[data-mobile-native-inspection-object]')?.getAttribute('data-mobile-native-inspection-object') || '';
      initialObject?.focus({ preventScroll: true });
      initialObject?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      await waitForNativeState(() => nativeRoot.querySelector('.mn-object-carousel [aria-selected="true"]')?.id === expectedObject.id);
      const selectedObject = nativeRoot.querySelector('.mn-object-carousel [aria-selected="true"]');
      const changedInspectionObject = nativeRoot.querySelector('[data-mobile-native-inspection-object]')?.getAttribute('data-mobile-native-inspection-object') || '';
      selectedObject?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
      await waitForNativeState(() => nativeRoot.querySelector('.mn-object-carousel [aria-selected="true"]')?.id === initialObject?.id);
      const restoredInspectionObject = nativeRoot.querySelector('[data-mobile-native-inspection-object]')?.getAttribute('data-mobile-native-inspection-object') || '';
      nativeMobileObjectSelectionOk = Boolean(
        initialObject && selectedObject === expectedObject && changedInspectionObject && changedInspectionObject !== initialInspectionObject &&
        restoredInspectionObject === initialInspectionObject && document.activeElement === initialObject
      );
      const previousControl = nativeRoot.querySelector('[data-mobile-native-object-navigation] button[aria-label="上一个对象"]');
      const nextControl = nativeRoot.querySelector('[data-mobile-native-object-navigation] button[aria-label="下一个对象"]');
      nextControl?.click();
      await waitForNativeState(() => nativeRoot.querySelector('.mn-object-carousel [aria-selected="true"]')?.id === expectedObject.id);
      const clickChangedObject = nativeRoot.querySelector('[data-mobile-native-inspection-object]')?.getAttribute('data-mobile-native-inspection-object') || '';
      previousControl?.click();
      await waitForNativeState(() => nativeRoot.querySelector('.mn-object-carousel [aria-selected="true"]')?.id === initialObject?.id);
      const clickRestoredObject = nativeRoot.querySelector('[data-mobile-native-inspection-object]')?.getAttribute('data-mobile-native-inspection-object') || '';
      nativeMobileObjectNavigationOk = Boolean(
        previousControl && nextControl &&
        normalize(previousControl.closest('[data-mobile-native-object-navigation]')?.textContent || '').startsWith('1 /') &&
        clickChangedObject === changedInspectionObject && clickRestoredObject === initialInspectionObject
      );
      nativeMobileObjectSelectionProbe = {
        initialInspectionObject,
        changedInspectionObject,
        restoredInspectionObject,
        clickChangedObject,
        clickRestoredObject,
        navigationText: normalize(previousControl?.closest('[data-mobile-native-object-navigation]')?.textContent || ''),
        navigationOk: nativeMobileObjectNavigationOk,
      };
    }
    const nativeEntry = nativeRoot?.querySelector('[data-mobile-native-open-detail]');
    if (nativeRoot && nativeEntry) {
      const homePairNodes = Array.from(nativeRoot.querySelectorAll(
        '.mn-proof-ledger li, .mn-rate-pair > div, .mn-signal-row, .mn-pressure, .mn-object-carousel [role="option"], .mn-inspection-relations > div, .mn-inspection-row'
      ));
      const homePairs = new Set(homePairNodes.map((node) => {
        const label = normalize(node.querySelector('small, dt, :scope > span:first-child')?.textContent || '');
        const value = normalize(node.querySelector('b, dd, :scope > span:last-child')?.textContent || '');
        return label && value ? label + '::' + value : '';
      }).filter(Boolean));
      const nativeDisclosure = nativeRoot.querySelector('.mn-inspection-disclosure');
      const nativeDisclosureSummary = nativeDisclosure?.querySelector('summary');
      const disclosureInitiallyOpen = Boolean(nativeDisclosure?.open);
      if (nativeDisclosure && !nativeDisclosure.open) {
        nativeDisclosureSummary?.click();
        await waitForNativeState(() => Boolean(nativeDisclosure.open));
      }
      const disclosureReady = !nativeDisclosure || Boolean(nativeDisclosure.open);
      nativeEntry.scrollIntoView({ block: 'center', behavior: 'auto' });
      await new Promise((resolve) => setTimeout(resolve, 30));
      const scrollBeforeDetail = window.scrollY;
      nativeRoot.querySelector('[data-mobile-native-open-detail]')?.click();
      await waitForNativeState(() => Boolean(sectionRoot?.querySelector('[data-mobile-native-detail]')));
      const nativeDetail = sectionRoot?.querySelector('[data-mobile-native-detail]');
      const nativeBack = nativeDetail?.querySelector('[data-mobile-native-back]');
      const nativeDetailTitle = nativeDetail?.querySelector('#mn-detail-title');
      const nativeSelectedEvidence = nativeDetail?.querySelector('[data-mobile-native-selected-evidence]');
      const nativeSelectedEvidenceText = normalize(nativeSelectedEvidence?.textContent || '');
      const nativeDetailSections = Array.from(nativeDetail?.querySelectorAll('[data-mobile-native-detail-section]') || []);
      const nativeDetailTitles = nativeDetailSections
        .map((section) => normalize(section.querySelector('header h2')?.textContent || ''))
        .filter(Boolean);
      const nativeDetailKeys = new Set(nativeDetailSections
        .map((section) => section.getAttribute('data-mobile-native-detail-section') || '')
        .filter(Boolean));
      const nativeDetailRequiredKeys = nativePrimaryFocus === 'evidence' || nativePrimaryFocus === 'collection'
        ? ['target', 'boundary']
        : nativePrimaryFocus === 'wan-offline'
          ? ['route', 'collection', 'boundary']
          : nativePrimaryFocus === 'resource'
            ? ['collection', 'boundary']
            : nativePrimaryFocus === 'interfaces'
              ? ['route', 'boundary']
              : ['wan', 'boundary'];
      const detailPairs = Array.from(nativeDetail?.querySelectorAll('.mn-detail-row') || []).map((node) => {
        const label = normalize(node.querySelector(':scope > span:first-child')?.textContent || '');
        const value = normalize(node.querySelector(':scope > span:last-child b')?.textContent || '');
        return label && value ? label + '::' + value : '';
      }).filter(Boolean);
      const novelDetailPairs = detailPairs.filter((pair) => !homePairs.has(pair));
      nativeDetailSectionCount = nativeDetailSections.length;
      nativeDetailRawEvidenceCount = nativeDetailTitles.filter((title) => /证据详情|记录详情|对象记录|依赖记录|历史记录/.test(title)).length;
      nativeDetailHasNovelEvidence = Boolean(
        nativeSelectedEvidence &&
        /来源路径/.test(nativeSelectedEvidenceText) &&
        /采样时间/.test(nativeSelectedEvidenceText) &&
        /对象标识/.test(nativeSelectedEvidenceText) &&
        novelDetailPairs.length >= 3 &&
        nativeDetailRequiredKeys.every((key) => nativeDetailKeys.has(key))
      );
      nativeDetailNoHomeReplay = Boolean(nativeDetail &&
        !nativeDetail.querySelector('[data-mobile-native-proof], [data-mobile-native-signal], [data-mobile-native-inspection]') &&
        detailPairs.every((pair) => !homePairs.has(pair)));
      await waitForNativeState(() => Boolean(nativeDetailTitle && document.activeElement === nativeDetailTitle && window.scrollY === 0));
      const detailFocused = Boolean(nativeDetail?.tagName === 'MAIN' && nativeDetailTitle && document.activeElement === nativeDetailTitle && window.scrollY === 0);

      window.history.back();
      await waitForNativeState(() => {
        const root = sectionRoot?.querySelector('[data-mobile-native-console]');
        const entry = root?.querySelector('[data-mobile-native-open-detail]');
        return Boolean(root && entry && document.activeElement === entry &&
          !sectionRoot?.querySelector('[data-mobile-native-detail]') && Math.abs(window.scrollY - scrollBeforeDetail) <= 1);
      });
      const returnedRoot = sectionRoot?.querySelector('[data-mobile-native-console]');
      const returnedEntry = returnedRoot?.querySelector('[data-mobile-native-open-detail]');
      const backRestored = Boolean(returnedEntry && document.activeElement === returnedEntry && !sectionRoot?.querySelector('[data-mobile-native-detail]'));

      window.history.forward();
      await waitForNativeState(() => Boolean(
        sectionRoot?.querySelector('[data-mobile-native-detail]') &&
        sectionRoot?.querySelector('#mn-detail-title') === document.activeElement &&
        window.scrollY === 0
      ));
      const forwardDetail = sectionRoot?.querySelector('[data-mobile-native-detail]');
      const forwardTitle = forwardDetail?.querySelector('#mn-detail-title');
      const forwardReopened = Boolean(forwardDetail?.tagName === 'MAIN' && forwardTitle && document.activeElement === forwardTitle && window.scrollY === 0);

      window.history.back();
      await waitForNativeState(() => {
        const root = sectionRoot?.querySelector('[data-mobile-native-console]');
        const entry = root?.querySelector('[data-mobile-native-open-detail]');
        return Boolean(root && entry && document.activeElement === entry && !sectionRoot?.querySelector('[data-mobile-native-detail]'));
      });
      const restoredRoot = sectionRoot?.querySelector('[data-mobile-native-console]');
      const restoredEntry = restoredRoot?.querySelector('[data-mobile-native-open-detail]');
      const restoredDisclosure = restoredRoot?.querySelector('.mn-inspection-disclosure');
      const finalBackRestored = Boolean(restoredEntry && document.activeElement === restoredEntry && !sectionRoot?.querySelector('[data-mobile-native-detail]'));
      const detailScrollRestored = Math.abs(window.scrollY - scrollBeforeDetail) <= 1;
      const scrollAfterReturn = window.scrollY;
      if (restoredDisclosure && disclosureInitiallyOpen !== restoredDisclosure.open) {
        restoredDisclosure.querySelector('summary')?.click();
        await waitForNativeState(() => restoredDisclosure.open === disclosureInitiallyOpen);
      }
      const disclosureRestored = !restoredDisclosure || restoredDisclosure.open === disclosureInitiallyOpen;
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      restoredRoot?.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'auto' });
      window.scrollTo({ top: nativeAcceptanceScrollY, left: 0, behavior: 'auto' });
      await waitForNativeState(() => Boolean(
        Math.abs(window.scrollY - nativeAcceptanceScrollY) <= 1 &&
        restoredRoot && Math.abs(restoredRoot.getBoundingClientRect().top - nativeAcceptanceRootTop) <= 1
      ));
      const acceptanceScrollRestored = Math.abs(window.scrollY - nativeAcceptanceScrollY) <= 1;
      const acceptanceRootRestored = Boolean(restoredRoot && Math.abs(restoredRoot.getBoundingClientRect().top - nativeAcceptanceRootTop) <= 1);
      nativeMobileInteractionProbe = {
        disclosureInitiallyOpen,
        disclosureReady,
        disclosureRestored,
        detailFocused,
        backRestored,
        forwardReopened,
        objectSelection: nativeMobileObjectSelectionProbe,
        finalBackRestored,
        detailSections: nativeDetailSectionCount,
        rawEvidenceSections: nativeDetailRawEvidenceCount,
        detailRequiredKeys: nativeDetailRequiredKeys,
        detailKeys: Array.from(nativeDetailKeys),
        detailNovelPairs: novelDetailPairs,
        detailReplayPairs: detailPairs.filter((pair) => homePairs.has(pair)),
        scrollBeforeDetail,
        scrollAfterReturn,
        detailScrollRestored,
        acceptanceScrollRestored,
        acceptanceRootRestored,
      };
      nativeMobileInteractionOk = Boolean(
        disclosureReady && disclosureRestored && detailFocused && nativeMobileObjectSelectionOk && nativeMobileObjectNavigationOk &&
        nativeDetailHasNovelEvidence && nativeDetailNoHomeReplay &&
        backRestored && forwardReopened && finalBackRestored && detailScrollRestored && acceptanceScrollRestored && acceptanceRootRestored
      );
    }
  }
  return {
    nativeMobileInteractionOk,
    nativeMobileInteractionProbe,
    nativeMobileFocusKeyboardOk,
    nativeMobileFocusKeyboardProbe,
    nativeMobileObjectSelectionOk,
    nativeMobileObjectSelectionProbe,
    nativeMobileObjectNavigationOk,
    nativeDetailSectionCount,
    nativeDetailRawEvidenceCount,
    nativeDetailHasNovelEvidence,
    nativeDetailNoHomeReplay,
  };
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
  nativeMobileFocusKeyboardOk,
  nativeMobileFocusKeyboardProbe,
  nativeMobileObjectSelectionProbe,
  nativeMobileObjectNavigationOk,
  nativeDetailHasNovelEvidence,
  nativeDetailNoHomeReplay,
}) {
  const compactLandscapeOverview = sectionName === 'overview' &&
    window.innerWidth >= 600 &&
    window.innerWidth <= 1199 &&
    window.innerHeight <= 520;
  const mobileOverviewAppViewport = sectionName === 'overview' && window.innerWidth <= 1199;
  const routerMobileRoot = sectionRoot?.querySelector('[data-mobile-native-console]');
  const routerMobileRect = routerMobileRoot?.getBoundingClientRect();
  const routerMobileSectionRect = sectionRoot?.getBoundingClientRect();
  const routerMobileNavigation = routerMobileRoot?.querySelector('.mn-navigation');
  const routerMobileEvidence = routerMobileRoot?.querySelector('[data-mobile-native-evidence-mode]');
  const routerMobileMasthead = routerMobileRoot?.querySelector('.mn-focus-masthead');
  const routerMobileProof = routerMobileRoot?.querySelector('[data-mobile-native-proof]');
  const routerMobileScenarioSignal = routerMobileRoot?.querySelector('[data-mobile-native-signal]');
  const routerMobileInspection = routerMobileRoot?.querySelector('[data-mobile-native-inspection]');
  const routerMobileFocusPanel = routerMobileRoot?.querySelector('#mn-focus-panel');
  const routerMobileDetailEntry = routerMobileRoot?.querySelector('[data-mobile-native-open-detail]');
  const routerMobileDisclosure = routerMobileInspection?.querySelector('details');
  const routerMobileFocusOptions = Array.from(routerMobileRoot?.querySelectorAll('.mn-focus-queue [role="option"]') || []);
  const routerMobileSelectedFocusOptions = routerMobileFocusOptions.filter((option) => option.getAttribute('aria-selected') === 'true');
  const routerMobileObjectOptions = Array.from(routerMobileRoot?.querySelectorAll('.mn-object-carousel [role="option"]') || []);
  const routerMobileSelectedObjectOptions = routerMobileObjectOptions.filter((option) => option.getAttribute('aria-selected') === 'true');
  const routerMobileTabletWorkspace = routerMobileRoot?.querySelector('[data-mobile-native-tablet-workspace]');
  const routerMobileTabletContext = routerMobileRoot?.querySelector('[data-mobile-native-tablet-context]');
  const routerMobileTabletContextCards = Array.from(routerMobileTabletContext?.querySelectorAll('.mn-tablet-context-card') || []);
  const routerMobileTabletContextRows = Array.from(routerMobileTabletContext?.querySelectorAll('.mn-tablet-context-row') || []);
  const routerMobileTabletContextKeys = new Set(routerMobileTabletContextCards.map((card) => card.getAttribute('data-mobile-native-context-key') || ''));
  const routerMobileTabletScopeKeys = new Set(Array.from(routerMobileRoot?.querySelectorAll('[data-mobile-native-scope-key]') || []).map((row) => row.getAttribute('data-mobile-native-scope-key') || ''));
  const routerMobileTabletScopeText = normalize(Array.from(routerMobileRoot?.querySelectorAll('[data-mobile-native-scope-key]') || []).map((row) => row.textContent || '').join(' '));
  const routerMobileTraffic = routerMobileRoot?.querySelector('[data-mobile-native-rates]');
  const routerMobileText = normalize(routerMobileRoot?.textContent || '');
  const routerMobileTitle = routerMobileMasthead?.querySelector('h1');
  const routerMobileLiveStatus = routerMobileRoot?.querySelector('[role="status"][aria-live="polite"]');
  const routerMobileSectionHeadings = [
    routerMobileProof?.querySelector('h2'),
    routerMobileScenarioSignal?.querySelector('h2'),
    routerMobileInspection?.querySelector('h2'),
  ];
  const routerMobileIdentity = normalize(routerMobileNavigation?.querySelector('b')?.textContent || '');
  const routerMobileNavigationRect = routerMobileNavigation?.getBoundingClientRect();
  const routerMobileEvidenceRect = routerMobileEvidence?.getBoundingClientRect();
  const routerMobileMastheadRect = routerMobileMasthead?.getBoundingClientRect();
  const routerMobileProofRect = routerMobileProof?.getBoundingClientRect();
  const routerMobileSignalRect = routerMobileScenarioSignal?.getBoundingClientRect();
  const routerMobileInspectionRect = routerMobileInspection?.getBoundingClientRect();
  const routerMobileDetailEntryRect = routerMobileDetailEntry?.getBoundingClientRect();
  const routerMobileFocusPanelRect = routerMobileFocusPanel?.getBoundingClientRect();
  const routerMobileTitleRect = routerMobileTitle?.getBoundingClientRect();
  const routerMobileTabletWorkspaceRect = routerMobileTabletWorkspace?.getBoundingClientRect();
  const routerMobileTabletMasterRect = routerMobileTabletWorkspace?.querySelector('.mn-focus-master')?.getBoundingClientRect();
  const routerMobileTabletDetailRect = routerMobileTabletWorkspace?.querySelector('.mn-tablet-detail')?.getBoundingClientRect();
  const routerMobileTabletContextRect = routerMobileTabletContext?.getBoundingClientRect();
  const routerMobileTabletQueueRect = routerMobileTabletWorkspace?.querySelector('.mn-focus-master .mn-focus-queue')?.getBoundingClientRect();
  const routerMobileTabletBoundaryRect = routerMobileTabletWorkspace?.querySelector('.mn-readonly-boundary')?.getBoundingClientRect();
  const routerMobileSignalHeaderRect = routerMobileScenarioSignal?.querySelector(':scope > header')?.getBoundingClientRect();
  const routerMobileSignalBody = routerMobileScenarioSignal?.querySelector('.mn-object-selector, .mn-rate-pair, .mn-pressure-list, .mn-signal-rows');
  const routerMobileSignalBodyRect = routerMobileSignalBody?.getBoundingClientRect();
  const routerMobileSignalTailSlack = routerMobileSignalRect && routerMobileSignalBodyRect
    ? Math.round(routerMobileSignalRect.bottom - routerMobileSignalBodyRect.bottom)
    : null;
  const routerMobileInspectionHeadingRect = routerMobileInspection?.querySelector('.mn-inspection-heading')?.getBoundingClientRect();
  const routerMobileObjectNavigation = routerMobileRoot?.querySelector('[data-mobile-native-object-navigation]');
  const routerMobileObjectNavigationControls = Array.from(routerMobileObjectNavigation?.querySelectorAll('button') || []);
  const routerMobilePhoneSource = routerMobileRoot?.querySelector('[data-mobile-native-phone-source]');
  const routerMobilePhoneSourceRect = routerMobilePhoneSource?.getBoundingClientRect();
  const routerMobileRateValueNodes = Array.from(routerMobileRoot?.querySelectorAll('[data-mobile-native-rates="current"] .mn-rate-pair b') || []);
  const routerMobileSnapshot = window.__PANEL_TEST_SNAPSHOT__ || {};
  const routerMobileRawWan = Array.isArray(routerMobileSnapshot.wan) && routerMobileSnapshot.wan.length
    ? routerMobileSnapshot.wan
    : Array.isArray(routerMobileSnapshot.pppoe) ? routerMobileSnapshot.pppoe : [];
  const routerMobileObservedWan = routerMobileRawWan.filter((row) => row.running !== false && row.disabled !== true);
  const routerMobileAllWanOffline = routerMobileRawWan.length > 0 && routerMobileObservedWan.length === 0;
  const routerMobileDownInterfaces = (Array.isArray(routerMobileSnapshot.interfaces) ? routerMobileSnapshot.interfaces : [])
    .filter((row) => row?.running === false);
  const routerMobileOverview = routerMobileSnapshot.overview || {};
  const routerMobileResourceDanger = Number(routerMobileOverview.cpuLoad) >= 85 ||
    Number(routerMobileOverview.memoryUsage) >= 85 || Number(routerMobileOverview.diskUsage) >= 90;
  const routerMobileFailureCount = [
    'realtimeEndpointFailures',
    'slowRestEndpointFailures',
    'staticEndpointFailures',
    'detailEndpointFailures',
    'protocolEndpointFailures',
  ].reduce((total, key) => total + (Array.isArray(routerMobileSnapshot.meta?.[key]) ? routerMobileSnapshot.meta[key].length : 0), 0);
  const routerMobileRatesComplete = routerMobileObservedWan.length > 0 && routerMobileObservedWan.every((row) =>
    row.downRate !== null && row.downRate !== undefined && row.downRate !== '' && Number.isFinite(Number(row.downRate)) &&
    row.upRate !== null && row.upRate !== undefined && row.upRate !== '' && Number.isFinite(Number(row.upRate)));
  const routerMobileDefaults = routerMobileSnapshot.routes?.defaultRoutes;
  const routerMobileRawRoutes = Array.isArray(routerMobileDefaults)
    ? routerMobileDefaults
    : Array.isArray(routerMobileSnapshot.routes?.items)
      ? routerMobileSnapshot.routes.items.filter((route) => route.default === true || route.dstAddress === '0.0.0.0/0' || route.dstAddress === '::/0')
      : [];
  const routerMobileHasExplicitRoute = routerMobileRawRoutes.some((route) => route.active === true && route.disabled !== true);
  const routerMobileEvidenceMode = routerMobileRoot?.getAttribute('data-mobile-native-evidence') || '';
  const routerMobileIncident = routerMobileRoot?.getAttribute('data-mobile-native-incident') === 'true';
  const routerMobileLayout = routerMobileRoot?.getAttribute('data-mobile-native-layout') || '';
  const routerMobilePrimaryFocus = routerMobileRoot?.getAttribute('data-mobile-native-primary-focus') || '';
  const routerMobileScenarioEvidenceOk = scaleScenario === 'no-snapshot'
    ? routerMobileEvidenceMode === 'unavailable'
    : scaleScenario === 'collection-down'
      ? routerMobileEvidenceMode === 'historical'
      : ['current', 'historical'].includes(routerMobileEvidenceMode);
  const routerMobileExpectedRoute = routerMobileEvidenceMode === 'unavailable'
    ? 'unknown'
    : routerMobileEvidenceMode === 'current' && routerMobileAllWanOffline && !routerMobileHasExplicitRoute
      ? 'offline'
      : routerMobileHasExplicitRoute
        ? routerMobileEvidenceMode === 'current' ? 'verified' : 'historical'
        : 'unknown';
  const routerMobileExpectedPrimaryFocus = routerMobileEvidenceMode === 'unavailable'
    ? 'evidence'
    : routerMobileEvidenceMode === 'current' && routerMobileAllWanOffline
      ? 'wan-offline'
      : routerMobileResourceDanger
        ? 'resource'
        : routerMobileDownInterfaces.length > 0
          ? 'interfaces'
          : routerMobileEvidenceMode === 'historical' || routerMobileFailureCount > 0
            ? 'collection'
            : routerMobileSnapshot.meta?.scaleScenario === 'fleet'
              ? 'fleet-scope'
              : 'route';
  const routerMobileExpectedSignal = routerMobileExpectedPrimaryFocus === 'wan-offline'
    ? 'wan'
    : routerMobileExpectedPrimaryFocus === 'evidence'
      ? 'collection'
      : routerMobileExpectedPrimaryFocus === 'fleet-scope'
        ? 'fleet'
      : routerMobileExpectedPrimaryFocus === 'route'
        ? routerMobileRatesComplete && routerMobileEvidenceMode === 'current' ? 'rates' : 'availability'
        : routerMobileExpectedPrimaryFocus;
  const routerMobileExpectedInspection = routerMobileExpectedPrimaryFocus === 'wan-offline'
    ? 'wan'
    : routerMobileExpectedPrimaryFocus === 'evidence'
      ? 'collection'
      : routerMobileExpectedPrimaryFocus === 'interfaces'
        ? 'interface'
        : routerMobileExpectedPrimaryFocus === 'fleet-scope'
          ? 'route'
        : routerMobileExpectedPrimaryFocus;
  const routerMobileExpectedCurrentRates = routerMobileExpectedSignal === 'rates';
  const routerMobileExpectedProofKeys = routerMobileExpectedPrimaryFocus === 'evidence'
    ? ['snapshot', 'target', 'success']
    : routerMobileExpectedPrimaryFocus === 'wan-offline'
      ? ['wan', 'route', 'collection']
      : routerMobileExpectedPrimaryFocus === 'resource'
        ? ['resource-classes', 'resource-streak', 'resource-samples']
        : routerMobileExpectedPrimaryFocus === 'interfaces'
          ? ['interface-count', 'interface-route', 'interface-wan']
          : routerMobileExpectedPrimaryFocus === 'collection'
            ? ['collection-cycle', 'collection-success', 'collection-boundary']
            : routerMobileExpectedPrimaryFocus === 'fleet-scope'
              ? ['fleet-cycle', 'fleet-risk', 'fleet-mode']
            : ['route-proof', 'normal-wan', 'normal-collection'];
  const routerMobileExpectedContextKeys = routerMobileExpectedInspection === 'collection'
    ? ['target', 'boundary']
    : routerMobileExpectedInspection === 'resource'
      ? ['collection', 'boundary']
      : routerMobileExpectedInspection === 'interface'
        ? ['route', 'boundary']
        : routerMobileExpectedInspection === 'wan'
          ? ['route', 'collection']
          : ['collection', 'boundary'];
  const routerMobileVisibleTextNodes = Array.from(routerMobileRoot?.querySelectorAll('span, b, strong, small, p, h1, time, button, summary, dt, dd') || [])
    .filter((node) => {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return normalize(node.textContent || '') && rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    });
  const routerMobileSmallTextNodes = routerMobileVisibleTextNodes
    .filter((node) => Number.parseFloat(getComputedStyle(node).fontSize || '0') < 12)
    .map((node) => ({ text: normalize(node.textContent || '').slice(0, 48), size: getComputedStyle(node).fontSize }));
  const routerMobileRateLikeText = /(?:^|\s)\d+(?:\.\d+)?\s*(?:[KMG]?bps)(?:\s|$)/i.test(routerMobileText);
  const routerMobileRateValuesOneLine = routerMobileRateValueNodes.length === 0 || routerMobileRateValueNodes.every((node) => {
    const amount = node.querySelector(':scope > span')?.getBoundingClientRect();
    const unit = node.querySelector(':scope > em')?.getBoundingClientRect();
    const rect = node.getBoundingClientRect();
    return Boolean(amount && unit && rect.height <= 30 && Math.abs(amount.bottom - unit.bottom) <= 3 && unit.right <= rect.right + 1);
  });
  const routerMobileConfiguredIdentity = normalize(routerMobileSnapshot.meta?.configuredIdentity || '');
  const routerMobileTarget = normalize(routerMobileSnapshot.meta?.routerHost || routerMobileSnapshot.meta?.target || '');
  const routerMobileAriaControls = Array.from(routerMobileRoot?.querySelectorAll('[aria-controls]') || []);
  const routerMobileAriaTargetsOk = routerMobileAriaControls.every((node) => {
    const targetId = node.getAttribute('aria-controls');
    return Boolean(targetId && routerMobileRoot.querySelector('#' + CSS.escape(targetId)));
  });
  const routerMobileProofRows = Array.from(routerMobileProof?.querySelectorAll('li[data-mobile-native-proof-key]') || []);
  const routerMobileProofKeys = new Set(routerMobileProofRows.map((row) => row.getAttribute('data-mobile-native-proof-key') || ''));
  const routerMobileProofPairs = routerMobileProofRows.map((row) =>
    normalize((row.querySelector('small')?.textContent || '') + '|' + (row.querySelector('b')?.textContent || '')));
  const routerMobileInspectionPairs = [
    ...Array.from(routerMobileInspection?.querySelectorAll('.mn-inspection-relations > div') || []).map((row) =>
      normalize((row.querySelector('dt')?.textContent || '') + '|' + (row.querySelector('dd')?.textContent || ''))),
    ...Array.from(routerMobileInspection?.querySelectorAll('.mn-inspection-row') || []).map((row) => {
      const cells = row.querySelectorAll(':scope > span');
      return normalize((cells[0]?.textContent || '') + '|' + (cells[1]?.querySelector('b')?.textContent || ''));
    }),
  ].filter(Boolean);
  const routerMobileProofInspectionRepeat = routerMobileProofPairs.filter((pair) => routerMobileInspectionPairs.includes(pair));
  const routerMobileUnavailableBoundaryOk = routerMobileEvidenceMode !== 'unavailable' || Boolean(
    !routerMobileTraffic &&
    !routerMobileRateLikeText &&
    !/\d+\s*\/\s*\d+/.test(routerMobileTabletScopeText) &&
    !/\b\d+\s*\/\s*\d+\s*(?:\u6761\s*)?WAN\b/i.test(routerMobileText) &&
    !/活动默认路由已核实|当前活动记录/.test(routerMobileText)
  );
  const routerMobilePhoneFlowOk = routerMobileLayout !== 'phone' || Boolean(
    !routerMobileTabletWorkspace &&
    routerMobileNavigationRect && routerMobileEvidenceRect && routerMobileFocusPanelRect &&
    routerMobileEvidenceRect.top >= routerMobileNavigationRect.bottom - 2 &&
    routerMobileFocusPanelRect.top >= routerMobileEvidenceRect.bottom - 2
  );
  const routerMobileTabletFlowOk = routerMobileLayout !== 'tablet' || Boolean(
    routerMobileTabletWorkspaceRect && routerMobileTabletMasterRect && routerMobileTabletDetailRect && routerMobileTabletContextRect &&
    routerMobileTabletDetailRect.left >= routerMobileTabletMasterRect.right - 2 &&
    Math.abs(routerMobileTabletMasterRect.top - routerMobileTabletDetailRect.top) <= 2 &&
    routerMobileTabletQueueRect && routerMobileTabletContextRect.top >= routerMobileTabletQueueRect.bottom - 2 &&
    routerMobileTabletContextRect.left >= routerMobileTabletMasterRect.left - 2 &&
    routerMobileTabletContextRect.right <= routerMobileTabletMasterRect.right + 2 &&
    routerMobileTabletBoundaryRect && routerMobileTabletBoundaryRect.top >= routerMobileFocusPanelRect.bottom - 2 &&
    routerMobileTabletBoundaryRect.left >= routerMobileTabletDetailRect.left - 2 &&
    routerMobileTabletBoundaryRect.right <= routerMobileTabletDetailRect.right + 2 &&
    routerMobileExpectedContextKeys.every((key) => routerMobileTabletContextKeys.has(key)) &&
    routerMobileTabletContextCards.every((card) => Boolean(card.querySelector('.mn-tablet-context-row'))) &&
    ['scope-wan', 'scope-interface', 'scope-risk'].every((key) => routerMobileTabletScopeKeys.has(key))
  );
  const routerMobileTabletMasterRhythmOk = routerMobileLayout !== 'tablet' || Boolean(
    routerMobileTabletContextRect && routerMobileTabletMasterRect && routerMobileTabletBoundaryRect && routerMobileFocusPanelRect &&
    routerMobileTabletMasterRect.bottom - routerMobileTabletContextRect.bottom >= -2 &&
    routerMobileTabletMasterRect.bottom - routerMobileTabletContextRect.bottom <= 2 &&
    routerMobileTabletBoundaryRect.top - routerMobileFocusPanelRect.bottom >= -2 &&
    routerMobileTabletBoundaryRect.top - routerMobileFocusPanelRect.bottom <= 24
  );
  const routerMobileTouchTargets = [
    routerMobileDetailEntry,
    routerMobileDisclosure?.querySelector('summary'),
    ...routerMobileFocusOptions,
    ...routerMobileObjectOptions,
    ...routerMobileObjectNavigationControls,
  ].filter(Boolean);
  const routerMobileObjectNavigationOk = routerMobileObjectOptions.length <= 1 || Boolean(
    routerMobileObjectNavigation && routerMobileObjectNavigationControls.length === 2 &&
    normalize(routerMobileObjectNavigation.textContent || '').startsWith('1 /') && nativeMobileObjectNavigationOk
  );
  const routerMobileSignalContentSizedOk = routerMobileLayout !== 'tablet' || routerMobileSignalTailSlack === null || routerMobileSignalTailSlack <= 32;
  const routerMobileTallPhoneSourceExpected = routerMobileLayout === 'phone' && window.innerWidth >= 420 && window.innerHeight >= 900 &&
    ['route', 'fleet-scope'].includes(routerMobilePrimaryFocus);
  const routerMobileTallPhoneSourceOk = !routerMobileTallPhoneSourceExpected || Boolean(
    routerMobilePhoneSourceRect && routerMobilePhoneSource?.querySelectorAll(':scope > div > div').length >= 2 &&
    routerMobilePhoneSourceRect.bottom <= window.innerHeight + 1
  );
  const routerMobileCompactLandscapeOk = !compactLandscapeOverview || Boolean(
    routerMobileMastheadRect && routerMobileMastheadRect.height >= 90 && routerMobileMastheadRect.height <= 150 &&
    routerMobileInspectionHeadingRect && routerMobileInspectionHeadingRect.bottom <= window.innerHeight + 1 &&
    routerMobileDetailEntryRect && routerMobileDetailEntryRect.bottom <= window.innerHeight + 1
  );
  const routerMobileChecks = {
    mounted: Boolean(routerMobileRoot),
    scenario: routerMobileRoot?.getAttribute('data-mobile-native-scenario') === scaleScenario,
    desktopDomAbsent: !sectionRoot?.querySelector('.ro-desktop-grid, .ro-status-bus'),
    evidenceMode: ['current', 'historical', 'unavailable'].includes(routerMobileEvidenceMode) &&
      routerMobileEvidence?.getAttribute('data-mobile-native-evidence-mode') === routerMobileEvidenceMode &&
      routerMobileScenarioEvidenceOk &&
      (routerMobileEvidenceMode === 'current'
        ? /当前证据/.test(routerMobileText) && /业务采样完整/.test(routerMobileText)
        : routerMobileEvidenceMode === 'historical'
          ? /历史证据/.test(routerMobileText) && /当前变化不可见/.test(routerMobileText)
          : /证据不可用/.test(routerMobileText) && /不作当前业务判断/.test(routerMobileText)),
    routeTruth: routerMobileRoot?.getAttribute('data-mobile-route-verification') === routerMobileExpectedRoute,
    riskPriority: routerMobilePrimaryFocus === routerMobileExpectedPrimaryFocus,
    incidentFlag: routerMobileIncident === !['route', 'fleet-scope'].includes(routerMobileExpectedPrimaryFocus),
    semanticLayers: Boolean(routerMobileMasthead && routerMobileProof && routerMobileScenarioSignal && routerMobileInspection),
    noProofInspectionReplay: routerMobileExpectedProofKeys.every((key) => routerMobileProofKeys.has(key)) && routerMobileProofInspectionRepeat.length === 0,
    evidenceInteraction: nativeMobileInteractionOk,
    detailAddsEvidence: nativeDetailHasNovelEvidence && nativeDetailNoHomeReplay,
    trafficMatchesMode: routerMobileExpectedCurrentRates
      ? routerMobileTraffic?.getAttribute('data-mobile-native-rates') === 'current'
      : !routerMobileTraffic && !routerMobileRateLikeText,
    scenarioSignal: routerMobileScenarioSignal?.getAttribute('data-mobile-native-signal') === routerMobileExpectedSignal,
    inspectionFollowsRisk: routerMobileInspection?.getAttribute('data-mobile-native-inspection') === routerMobileExpectedInspection,
    objectSelectionFollowsRisk: ['interfaces', 'wan'].includes(routerMobileExpectedSignal)
      ? routerMobileObjectOptions.length > 0 && routerMobileSelectedObjectOptions.length === 1 &&
        routerMobileInspection?.getAttribute('data-mobile-native-inspection-object') === routerMobileSelectedObjectOptions[0]?.getAttribute('data-mobile-native-object-option')
      : routerMobileObjectOptions.length === 0,
    objectNavigation: routerMobileObjectNavigationOk,
    unavailableBoundary: routerMobileUnavailableBoundaryOk,
    configuredIdentity: Boolean(
      routerMobileIdentity &&
      !/无可用快照|不可达|采集失败/.test(routerMobileIdentity) &&
      (!routerMobileConfiguredIdentity || routerMobileIdentity === routerMobileConfiguredIdentity) &&
      (!routerMobileTarget || routerMobileNavigation?.textContent?.includes(routerMobileTarget))
    ),
    noConceptTopologyOrChart: !routerMobileRoot?.querySelector('[data-mobile-native-topology], [data-mobile-native-sheet], .mn-grabber, [data-overview-chart-type], canvas'),
    noBottomNavigation: !routerMobileRoot?.querySelector('nav, .rm-tabbar'),
    noFakeTabs: !routerMobileRoot?.querySelector('[role="tab"], [role="tablist"], [role="tabpanel"]'),
    accessibility: Boolean(
      nativeMobileFocusKeyboardOk &&
       routerMobileAriaTargetsOk &&
       routerMobileTitle?.id === 'mn-focus-title' &&
       routerMobileFocusPanel?.getAttribute('aria-labelledby') === 'mn-focus-title' &&
       Boolean(routerMobileLiveStatus && normalize(routerMobileLiveStatus.textContent || '').includes(routerMobileTitle?.textContent || '')) &&
       routerMobileSectionHeadings.every(Boolean) &&
       routerMobileRoot?.querySelectorAll('h1').length === 1 &&
       (routerMobileFocusOptions.length === 0 || routerMobileSelectedFocusOptions.length === 1) &&
       (routerMobileObjectOptions.length === 0 || routerMobileSelectedObjectOptions.length === 1)
    ),
    touchTarget: routerMobileTouchTargets.length >= 2 && routerMobileTouchTargets.every((node) => node.getBoundingClientRect().height >= 44),
    readableType: routerMobileSmallTextNodes.length === 0,
    readonly: routerMobileText.includes('只读监控'),
    viewport: Boolean(routerMobileRect && routerMobileSectionRect &&
      Math.abs(routerMobileRect.left - routerMobileSectionRect.left) <= 1 &&
      routerMobileRect.top <= 1 &&
      routerMobileRect.width >= routerMobileSectionRect.width - 2 &&
      routerMobileRect.height >= window.innerHeight - 2),
    visualCenter: Boolean(routerMobileMastheadRect && routerMobileMastheadRect.height >= (compactLandscapeOverview ? 90 : 120) && routerMobileTitleRect && routerMobileTitleRect.top >= 0),
    priorityObjectVisible: compactLandscapeOverview ? routerMobileCompactLandscapeOk : routerMobileLayout !== 'phone' || window.innerHeight < 650 || Boolean(
      routerMobileInspectionRect && routerMobileDetailEntryRect &&
      routerMobileInspectionRect.top < window.innerHeight && routerMobileDetailEntryRect.bottom <= window.innerHeight
    ),
    rateValueIntegrity: !routerMobileExpectedCurrentRates || routerMobileRateValueNodes.length === 2 && routerMobileRateValuesOneLine,
    contentSizedSignal: routerMobileSignalContentSizedOk,
    tallPhoneProgressiveEvidence: routerMobileTallPhoneSourceOk,
    compactLandscapePatrol: routerMobileCompactLandscapeOk,
    proofSignalInspectionFlow: Boolean(
      routerMobileProofRect && routerMobileSignalRect && routerMobileInspectionRect &&
      routerMobileSignalRect.top >= routerMobileProofRect.top - 2 &&
      routerMobileInspectionRect.top >= Math.min(routerMobileProofRect.top, routerMobileSignalRect.top) - 2
    ),
    responsiveComposition: routerMobilePhoneFlowOk && routerMobileTabletFlowOk,
    tabletMasterRhythm: routerMobileTabletMasterRhythmOk,
    noHorizontalOverflow: overflowX <= 1,
    noLegacyDom: !sectionRoot?.querySelector('[class*="ik-mobile-"], .ro-mobile-first-screen, [class*="phone-ops"], [class*="rm-"]'),
  };
  const mobileOverviewAppHomePass = Boolean(
    sectionName === 'overview' &&
    mobileOverviewAppViewport &&
    app && active && (requested || active.id === sectionName) &&
    !hasBadLiteral && scaleMetaOk &&
    Object.values(routerMobileChecks).every(Boolean)
  );
  const pass = mobileOverviewAppHomePass;
  const mobileOverviewAppHomeGateProbe = mobileOverviewAppViewport ? {
    appHomePass: mobileOverviewAppHomePass,
    compactLandscape: compactLandscapeOverview,
    contract: 'risk-focus-proof-signal-inspection',
    root: routerMobileRect ? { left: routerMobileRect.left, top: routerMobileRect.top, width: routerMobileRect.width, height: routerMobileRect.height } : null,
    layout: routerMobileLayout,
    primaryFocus: routerMobilePrimaryFocus,
    expectedPrimaryFocus: routerMobileExpectedPrimaryFocus,
    proofKeys: [...routerMobileProofKeys],
    focusKeys: routerMobileFocusOptions.map((option) => option.getAttribute('data-mobile-native-focus-option') || ''),
    objectKeys: routerMobileObjectOptions.map((option) => option.getAttribute('data-mobile-native-object-option') || ''),
    signal: routerMobileScenarioSignal?.getAttribute('data-mobile-native-signal') || '',
    inspection: routerMobileInspection?.getAttribute('data-mobile-native-inspection') || '',
    tabletContextKeys: [...routerMobileTabletContextKeys],
    tabletScopeKeys: [...routerMobileTabletScopeKeys],
    tabletMasterGap: routerMobileTabletContextRect && routerMobileTabletMasterRect
      ? Math.round(routerMobileTabletMasterRect.bottom - routerMobileTabletContextRect.bottom)
      : null,
    tabletDetailGap: routerMobileTabletBoundaryRect && routerMobileFocusPanelRect
      ? Math.round(routerMobileTabletBoundaryRect.top - routerMobileFocusPanelRect.bottom)
      : null,
    signalTailSlack: routerMobileSignalTailSlack,
    signalHeaderHeight: routerMobileSignalHeaderRect?.height || 0,
    rateValuesOneLine: routerMobileRateValuesOneLine,
    compactLandscapeMastheadHeight: routerMobileMastheadRect?.height || 0,
    inspectionHeadingBottom: routerMobileInspectionHeadingRect?.bottom || 0,
    phoneSourceVisible: Boolean(routerMobilePhoneSourceRect),
    evidenceMode: routerMobileEvidenceMode,
    routeExpected: routerMobileExpectedRoute,
    currentRatesExpected: routerMobileExpectedCurrentRates,
    focusKeyboard: nativeMobileFocusKeyboardProbe,
    objectSelection: nativeMobileObjectSelectionProbe,
    detailInteraction: nativeMobileInteractionProbe,
    smallTextNodes: routerMobileSmallTextNodes,
    trafficSource: routerMobileTraffic?.getAttribute('data-mobile-native-rates') || '',
    checks: routerMobileChecks,
  } : null;
  if (routerMobileRoot) return {
    pass,
    surface: 'mobile-native',
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
  return null;
}

module.exports = { inspectMobileNativeOverview, inspectOverviewMobileInteraction };
