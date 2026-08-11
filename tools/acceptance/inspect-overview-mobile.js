'use strict';

/*
 * Runtime acceptance for the isolated Optical Patrol Overview surface.
 *
 * This module is stringified into the browser by inspect-section-browser.js.
 * Keep both exported functions self-contained: they cannot rely on Node APIs
 * or outer-scope helpers once they run in the page.
 */

const MOBILE_OVERVIEW_REQUIRED_CHECKS = Object.freeze([
  'mounted',
  'scenario',
  'evidenceTruth',
  'risk',
  'composition',
  'scope',
  'evidenceBoundary',
  'decision',
  'expandedClaim',
  'claimControls',
  'objectAction',
  'currentDataBoundary',
  'noFalseCurrentData',
  'targets44',
  'navigationClearance',
  'noHorizontalOverflow',
  'responsiveComposition',
  'readableText',
  'noLegacyPresentation',
  'isolatedTree',
  'interaction',
  'keyboard',
  'selectionHistory',
  'navigationHistory',
  'novelDetail',
  'desktopDomAbsent',
  'viewport',
]);

async function inspectOverviewMobileInteraction({ sectionName, sectionRoot, scaleScenario }) {
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

  const optical = sectionRoot?.querySelector?.('[data-optical-patrol-root]');
  if (!optical) {
    result.nativeMobileInteractionOk = false;
    result.nativeMobileFocusKeyboardOk = false;
    result.nativeMobileObjectSelectionOk = false;
    result.nativeMobileObjectNavigationOk = false;
    result.nativeMobileInteractionProbe = { exercised: false, reason: 'Optical Patrol root is absent' };
    return result;
  }

  const canonical = scaleScenario === 'single' && window.innerWidth === 390 && window.innerHeight === 844;
  if (!canonical) {
    result.nativeMobileInteractionProbe = {
      exercised: false,
      reason: 'stateful history is exercised at single 390x844; every viewport runs Optical Patrol semantic and geometry gates',
    };
    return result;
  }

  const waitFor = (predicate, timeout = 1600) => new Promise((resolve) => {
    const started = performance.now();
    const tick = () => {
      if (predicate()) return resolve(true);
      if (performance.now() - started >= timeout) return resolve(Boolean(predicate()));
      setTimeout(tick, 20);
    };
    tick();
  });
  const selectedClaim = () => optical.querySelector('[data-optical-patrol-expanded-claim]');
  const selectedId = () => selectedClaim()?.getAttribute('data-optical-patrol-expanded-claim') || '';
  const selectedFocusId = () => selectedClaim()?.id || '';
  const initialId = selectedId();
  const claimControl = optical.querySelector('button[data-optical-patrol-claim-control]');
  let nativeClaimControl = false;
  let claimFocusRestored = false;
  let selectionHistory = false;
  let nextId = '';

  if (initialId && claimControl instanceof HTMLButtonElement) {
    nativeClaimControl = claimControl.type === 'button';
    claimControl.focus({ preventScroll: true });
    claimControl.click();
    const opened = await waitFor(() => selectedId() && selectedId() !== initialId);
    nextId = selectedId();
    claimFocusRestored = opened && document.activeElement === selectedClaim() &&
      selectedFocusId() === `optical-claim-${encodeURIComponent(nextId)}`;
    history.back();
    const backed = await waitFor(() => selectedId() === initialId && document.activeElement === selectedClaim());
    history.forward();
    const forwarded = await waitFor(() => selectedId() === nextId && document.activeElement === selectedClaim());
    selectionHistory = backed && forwarded;
  }

  const action = optical.querySelector('[data-optical-patrol-action]');
  const returnFocusId = selectedFocusId();
  const overviewUrl = `${location.pathname}${location.search}${location.hash}`;
  let openedRoute = false;
  let backedRoute = false;
  let forwardedRoute = false;
  let restored = false;
  if (action instanceof HTMLButtonElement || action instanceof HTMLAnchorElement) {
    action.focus({ preventScroll: true });
    action.click();
    openedRoute = await waitFor(() => (
      document.querySelector('[data-panel-app]')?.getAttribute('data-active-section') !== 'overview' &&
      Boolean(document.querySelector('[data-mobile-domain-workspace], [data-panel-route-content]'))
    ));
    if (openedRoute) {
      const details = document.querySelectorAll('[data-mobile-domain-workspace], [data-panel-route-content]');
      result.nativeDetailSectionCount = details.length;
      const detail = document.querySelector('[data-mobile-object-detail], [data-desktop-object-detail]');
      const evidenceNodes = detail?.querySelectorAll?.(
        'dl, table, [data-evidence-source], [data-raw-evidence], .mdi-facts > div, .ddi-block'
      ) || [];
      const typedSections = detail?.querySelectorAll?.('.mdi-section, .ddi-block') || [];
      const detailKind = detail?.getAttribute?.('data-domain-inspector-kind') || '';
      result.nativeDetailRawEvidenceCount = evidenceNodes.length;
      result.nativeDetailHasNovelEvidence = Boolean(
        detail && detailKind && typedSections.length >= 1 && evidenceNodes.length >= 2
      );
      result.nativeDetailNoHomeReplay = !detail?.querySelector?.('[data-optical-patrol-expanded-claim]');
      history.back();
      backedRoute = await waitFor(() => (
        `${location.pathname}${location.search}${location.hash}` === overviewUrl &&
        Boolean(document.querySelector('[data-optical-patrol-root]'))
      ));
      restored = await waitFor(() => !returnFocusId || document.activeElement?.id === returnFocusId);
      history.forward();
      forwardedRoute = await waitFor(() => document.querySelector('[data-panel-app]')?.getAttribute('data-active-section') !== 'overview');
      history.back();
      restored = restored && await waitFor(() => Boolean(document.querySelector('[data-optical-patrol-root]')));
    }
  }

  result.nativeMobileFocusKeyboardOk = nativeClaimControl && claimFocusRestored;
  result.nativeMobileObjectSelectionOk = claimFocusRestored && selectionHistory;
  result.nativeMobileObjectNavigationOk = Boolean(action && openedRoute && backedRoute && forwardedRoute && restored);
  result.nativeMobileInteractionOk = result.nativeMobileFocusKeyboardOk && result.nativeMobileObjectSelectionOk && result.nativeMobileObjectNavigationOk;
  result.nativeMobileFocusKeyboardProbe = { nativeClaimControl, claimFocusRestored, selectionHistory };
  result.nativeMobileObjectSelectionProbe = { selectedBefore: initialId, selectedAfter: nextId };
  result.nativeMobileInteractionProbe = {
    exercised: true,
    action: Boolean(action),
    opened: openedRoute,
    backed: backedRoute,
    forwarded: forwardedRoute,
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
  nativeMobileFocusKeyboardOk,
  nativeMobileFocusKeyboardProbe,
  nativeMobileObjectSelectionOk,
  nativeMobileObjectSelectionProbe,
  nativeMobileObjectNavigationOk,
  nativeDetailSectionCount,
  nativeDetailRawEvidenceCount,
  nativeDetailHasNovelEvidence,
  nativeDetailNoHomeReplay,
}) {
  if (sectionName !== 'overview') return null;
  const optical = sectionRoot?.querySelector?.('[data-optical-patrol-root]');
  if (!optical) return null;

  const expected = {
    single: { mode: 'current', risk: 'none', scene: 'single' },
    fleet: { mode: 'current', risk: 'interfaces', scene: 'interfaces-down' },
    'all-offline': { mode: 'current', risk: 'wan', scene: 'all-offline' },
    'no-snapshot': { mode: 'unavailable', risk: 'evidence', scene: 'no-snapshot' },
    'collection-down': { mode: 'historical', risk: 'collection', scene: 'collection-down' },
    'resource-full': { mode: 'current', risk: 'resource', scene: 'resource-full' },
    'interfaces-down': { mode: 'current', risk: 'interfaces', scene: 'interfaces-down' },
  }[scaleScenario] || null;
  const runtimeMode = optical.getAttribute('data-optical-patrol-evidence-mode') || '';
  const sceneKind = optical.getAttribute('data-optical-patrol-scene') || '';
  const riskKind = optical.getAttribute('data-optical-patrol-risk') || '';
  const forbidsCurrent = optical.getAttribute('data-optical-patrol-forbids-current') === 'true';
  const rect = (node) => {
    if (!node) return null;
    const value = node.getBoundingClientRect();
    return { top: value.top, right: value.right, bottom: value.bottom, left: value.left, width: value.width, height: value.height };
  };
  const visible = (node) => {
    if (!node) return false;
    const box = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    return box.width > 0 && box.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
  };
  const readable = (node) => Boolean(node && visible(node) && normalize(node.getAttribute('aria-label') || node.textContent || ''));
  const precedes = (left, right) => Boolean(left && right && (left.compareDocumentPosition(right) & Node.DOCUMENT_POSITION_FOLLOWING));
  const text = normalize(optical.textContent || '');
  const evidenceBoundary = optical.querySelector('[data-optical-patrol-evidence-boundary]');
  const decision = optical.querySelector('[data-optical-patrol-decision]');
  const decisionTitle = optical.querySelector('[data-optical-patrol-route-title]');
  const expandedClaim = optical.querySelector('[data-optical-patrol-expanded-claim]');
  const claimControls = Array.from(optical.querySelectorAll('[data-optical-patrol-claim-control]'));
  const action = optical.querySelector('[data-optical-patrol-action]');
  const followups = optical.querySelector('.op__followups');
  const evidenceDeck = optical.querySelector('[data-optical-patrol-evidence-deck]');
  const runtimeManaged = optical.getAttribute('data-optical-patrol-runtime-managed') === 'true';
  const runtimeScope = app?.querySelector?.('[data-panel-runtime-toolbar="mobile"]');
  const standaloneScope = optical.querySelector(':scope > [data-optical-patrol-chrome]');
  const scopeOwner = runtimeManaged ? runtimeScope : standaloneScope;
  const scopeIdentity = runtimeManaged
    ? runtimeScope?.querySelector?.('.panel-runtime-device b')
    : standaloneScope?.querySelector?.('.op__device-copy strong');
  const scopeReadonly = runtimeManaged
    ? runtimeScope?.querySelector?.('[aria-label="只读监控模式"]')
    : standaloneScope?.querySelector?.('.op__readonly');
  const scopeContractOk = Boolean(
    readable(scopeOwner) && readable(scopeIdentity) && readable(scopeReadonly) &&
    normalize(scopeReadonly?.textContent || '') === '只读'
  );
  const interactive = Array.from(optical.querySelectorAll('button, a[href], summary, input, select, textarea')).filter(visible);
  const taskNavigation = optical.querySelector('[data-optical-patrol-task-navigation]');
  const operationalScopes = [
    ['chrome', scopeOwner],
    ['evidence-boundary', evidenceBoundary],
    ['decision', decision],
    ['object-action', action],
    ...claimControls.map((control, index) => [`claim-control-${index + 1}`, control]),
    ['evidence-deck', evidenceDeck],
    ['expanded-claim', expandedClaim],
    ['task-navigation', taskNavigation],
  ].filter((entry) => entry[1] instanceof HTMLElement && visible(entry[1]));
  const seenTextNodes = new Set();
  const unreadableText = [];
  const clippedOperationalText = [];
  const auditedTextScopes = [];
  const isVisuallyHidden = (owner, boundary) => {
    for (let current = owner; current instanceof HTMLElement; current = current.parentElement) {
      const style = getComputedStyle(current);
      const box = current.getBoundingClientRect();
      const clipped = (style.clipPath && style.clipPath !== 'none') ||
        (style.clip && style.clip !== 'auto');
      const standardScreenReaderGeometry = /^(absolute|fixed)$/.test(style.position) &&
        box.width <= 2 && box.height <= 2 && clipped &&
        /(hidden|clip)/.test(style.overflowX) && /(hidden|clip)/.test(style.overflowY);
      if (current.matches('.op__sr-only, [data-visually-hidden="true"], [hidden]') ||
          style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse' ||
          style.contentVisibility === 'hidden' || Number.parseFloat(style.opacity || '1') === 0 ||
          standardScreenReaderGeometry) return true;
      if (current === boundary) break;
    }
    return false;
  };
  const containsFragment = (boundary, fragment, axis) => {
    if (axis === 'x') return fragment.left >= boundary.left - 1 && fragment.right <= boundary.right + 1;
    return fragment.top >= boundary.top - 1 && fragment.bottom <= boundary.bottom + 1;
  };
  const clientRect = (node) => {
    const box = node.getBoundingClientRect();
    const left = box.left + node.clientLeft;
    const top = box.top + node.clientTop;
    return { left, top, right: left + node.clientWidth, bottom: top + node.clientHeight };
  };
  for (const [scopeId, scope] of operationalScopes) {
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
    let textNodes = 0;
    let fragments = 0;
    for (let textNode = walker.nextNode(); textNode; textNode = walker.nextNode()) {
      const value = normalize(textNode.nodeValue || '');
      if (!value || seenTextNodes.has(textNode)) continue;
      seenTextNodes.add(textNode);
      const owner = textNode.parentElement;
      if (!(owner instanceof HTMLElement) || isVisuallyHidden(owner, scope)) continue;
      textNodes += 1;
      const style = getComputedStyle(owner);
      const fontSize = Number.parseFloat(style.fontSize || '0');
      if (!Number.isFinite(fontSize) || fontSize < 12) {
        unreadableText.push({ scope: scopeId, tag: owner.tagName.toLowerCase(), text: value.slice(0, 100), fontSize });
      }
      const range = document.createRange();
      range.selectNodeContents(textNode);
      const renderedFragments = Array.from(range.getClientRects()).filter((fragment) => fragment.width > 0.5 && fragment.height > 0.5);
      fragments += renderedFragments.length;
      if (!renderedFragments.length) {
        clippedOperationalText.push({ scope: scopeId, tag: owner.tagName.toLowerCase(), text: value.slice(0, 100), reason: 'no-rendered-fragment' });
        continue;
      }
      for (const fragment of renderedFragments) {
        let fixedToViewport = false;
        let failure = null;
        for (let current = owner; current instanceof HTMLElement && current !== optical.parentElement; current = current.parentElement) {
          const currentStyle = getComputedStyle(current);
          const boundary = clientRect(current);
          if (/(hidden|clip)/.test(currentStyle.overflowX) && !containsFragment(boundary, fragment, 'x')) {
            failure = { axis: 'x', boundary: normalize(current.getAttribute('class') || current.tagName), boundaryRect: boundary };
            break;
          }
          if (/(hidden|clip)/.test(currentStyle.overflowY) && !containsFragment(boundary, fragment, 'y')) {
            failure = { axis: 'y', boundary: normalize(current.getAttribute('class') || current.tagName), boundaryRect: boundary };
            break;
          }
          if (currentStyle.position === 'fixed') {
            fixedToViewport = true;
            break;
          }
        }
        const viewportX = fragment.left >= -1 && fragment.right <= window.innerWidth + 1;
        const viewportY = fragment.top >= -1 && fragment.bottom <= window.innerHeight + 1;
        if (!failure && (!viewportX || (fixedToViewport && !viewportY))) {
          failure = { axis: !viewportX ? 'viewport-x' : 'viewport-y', boundary: 'viewport' };
        }
        if (failure) {
          clippedOperationalText.push({
            scope: scopeId,
            tag: owner.tagName.toLowerCase(),
            text: value.slice(0, 100),
            fontSize,
            fragment: { left: fragment.left, top: fragment.top, right: fragment.right, bottom: fragment.bottom },
            ...failure,
          });
          break;
        }
      }
    }
    auditedTextScopes.push({ scope: scopeId, textNodes, fragments });
  }
  const undersizedTargets = interactive.map((node) => ({
    label: normalize(node.getAttribute('aria-label') || node.textContent || node.tagName),
    width: node.getBoundingClientRect().width,
    height: node.getBoundingClientRect().height,
  })).filter((target) => target.width < 44 || target.height < 44);
  const selectedId = expandedClaim?.getAttribute('data-optical-patrol-expanded-claim') || '';
  const selectedHeadingId = expandedClaim?.getAttribute('aria-labelledby') || '';
  const selectedHeading = selectedHeadingId ? document.getElementById(selectedHeadingId) : null;
  const selectedFocusContract = Boolean(
    selectedId && expandedClaim?.id === `optical-claim-${encodeURIComponent(selectedId)}` &&
    expandedClaim.getAttribute('tabindex') === '-1' && selectedHeading && expandedClaim.contains(selectedHeading)
  );
  const nativeClaimControls = claimControls.every((control) => (
    control instanceof HTMLButtonElement && control.type === 'button' &&
    !control.hasAttribute('aria-pressed') && Boolean(normalize(control.getAttribute('aria-label') || control.textContent || ''))
  ));
  const semanticModeCopy = runtimeMode === 'current'
    ? /当前|本次|已观测/.test(text)
    : runtimeMode === 'historical'
      ? /历史|上次|不代表当前|当前值已撤回/.test(text)
      : /不可用|无法|不显示|当前值已撤回/.test(text);
  const currentDataBoundary = runtimeMode === 'current' ? !forbidsCurrent : forbidsCurrent;
  const noFalseCurrentData = !forbidsCurrent || !optical.querySelector(
    '[data-optical-patrol-traffic-geometry], [data-optical-patrol-resource-geometry]'
  );
  const opticalRect = rect(optical);
  const summary = optical.querySelector('.op__summary');
  const summaryRect = rect(summary);
  const expandedRect = rect(expandedClaim);
  const followupsRect = visible(followups) ? rect(followups) : null;
  const evidenceDeckRect = visible(evidenceDeck) ? rect(evidenceDeck) : null;
  const tablet = window.innerWidth >= 768 && window.innerWidth < 1200;
  const phone = window.innerWidth < 768;
  const phoneLayout = !phone || Boolean(
    precedes(summary, expandedClaim) && (!followups || precedes(expandedClaim, followups)) &&
    (!evidenceDeck || precedes(expandedClaim, evidenceDeck))
  );
  const tabletLayout = !tablet || Boolean(
    summaryRect && expandedRect && summaryRect.left < expandedRect.left && summaryRect.right <= expandedRect.left + 1 &&
    (!followupsRect || followupsRect.right <= expandedRect.left + 1) &&
    (!evidenceDeckRect || evidenceDeckRect.top >= Math.min(expandedRect.bottom, followupsRect?.bottom ?? expandedRect.bottom) - 1)
  );
  const noHorizontalOverflow = overflowX <= 1 && Boolean(opticalRect && (
    opticalRect.left >= -1 && opticalRect.right <= window.innerWidth + 1 && optical.scrollWidth <= optical.clientWidth + 1
  ));
  const navigation = document.querySelector('.panel-task-navigation');
  const navigationRect = visible(navigation) ? rect(navigation) : null;
  const overlapsNavigation = (node) => {
    const target = rect(node);
    return Boolean(target && navigationRect && target.left < navigationRect.right && target.right > navigationRect.left &&
      target.top < navigationRect.bottom && target.bottom > navigationRect.top);
  };
  const horizontallyOverlapsNavigation = (target) => Boolean(
    target && navigationRect && target.left < navigationRect.right && target.right > navigationRect.left
  );
  const obscuredTargets = navigationRect ? interactive.filter((node) => {
    return overlapsNavigation(node);
  }) : [];
  const obscuredNonFollowups = obscuredTargets.filter((node) => !node.hasAttribute('data-optical-patrol-claim-control'));
  const maxOpticalScroll = Math.max(0, optical.scrollHeight - optical.clientHeight);
  const documentScroller = document.scrollingElement;
  const maxDocumentScroll = Math.max(0, (documentScroller?.scrollHeight || 0) - window.innerHeight);
  const maxAppScroll = Math.max(0, (app?.scrollHeight || 0) - (app?.clientHeight || 0));
  const maxReachableScroll = Math.max(maxOpticalScroll, maxDocumentScroll, maxAppScroll);
  const followupReachability = claimControls.filter(visible).map((node) => {
    const target = rect(node);
    if (!target || !navigationRect || !opticalRect) return { node, reachable: Boolean(target) };
    if (!horizontallyOverlapsNavigation(target)) {
      return { node, reachable: true, requiredScroll: 0, maxScroll: maxReachableScroll, projectedTop: target.top };
    }
    const requiredScroll = Math.max(0, target.bottom - navigationRect.top + 1);
    const projectedTop = target.top - requiredScroll;
    return {
      node,
      reachable: requiredScroll <= maxReachableScroll + 1 && projectedTop >= opticalRect.top - 1,
      requiredScroll,
      maxScroll: maxReachableScroll,
      projectedTop,
    };
  });
  const navigationClearanceOk = obscuredNonFollowups.length === 0 && followupReachability.every((item) => item.reachable);
  const selectionHistoryOk = typeof nativeMobileObjectSelectionOk === 'boolean'
    ? nativeMobileObjectSelectionOk
    : typeof nativeMobileFocusKeyboardProbe?.selectionHistory === 'boolean'
      ? nativeMobileFocusKeyboardProbe.selectionHistory
      : Boolean(nativeMobileFocusKeyboardOk);
  const actionOk = Boolean(
    action && readable(action) &&
    (action instanceof HTMLButtonElement || action instanceof HTMLAnchorElement)
  );
  const noLegacyPresentation = !sectionRoot?.querySelector(
    '[data-pocket-console-root], [data-linkboard-root], [data-mobile-native-console], [class*="pc__"], [class*="lb__"], [class*="mn-"], [class*="mo-"]'
  );
  const checks = {
    mounted: true,
    scenario: Boolean(expected && optical.getAttribute('data-optical-patrol-scenario') === scaleScenario),
    evidenceTruth: Boolean(expected && runtimeMode === expected.mode && semanticModeCopy),
    risk: Boolean(expected && riskKind === expected.risk),
    composition: Boolean(expected && sceneKind === expected.scene),
    scope: scopeContractOk,
    evidenceBoundary: Boolean(evidenceBoundary && readable(evidenceBoundary)),
    decision: Boolean(decision && readable(decisionTitle) && readable(decision)),
    expandedClaim: selectedFocusContract && readable(selectedHeading),
    claimControls: nativeClaimControls,
    objectAction: actionOk,
    currentDataBoundary,
    noFalseCurrentData,
    targets44: undersizedTargets.length === 0,
    navigationClearance: navigationClearanceOk,
    noHorizontalOverflow,
    responsiveComposition: phoneLayout && tabletLayout,
    readableText: unreadableText.length === 0 && clippedOperationalText.length === 0,
    noLegacyPresentation,
    isolatedTree: !sectionRoot?.querySelector('[data-pocket-console-root], [data-desktop-overview]'),
    interaction: Boolean(nativeMobileInteractionOk),
    keyboard: Boolean(nativeMobileFocusKeyboardOk),
    selectionHistory: selectionHistoryOk,
    navigationHistory: Boolean(nativeMobileObjectNavigationOk),
    novelDetail: Boolean(nativeDetailHasNovelEvidence && nativeDetailNoHomeReplay),
    desktopDomAbsent: !sectionRoot?.querySelector('[data-desktop-overview]'),
    viewport: Boolean(opticalRect && opticalRect.left >= -1 && opticalRect.right <= window.innerWidth + 1),
  };
  const pass = Boolean(app && active && (requested || active.id === sectionName) && !hasBadLiteral && scaleMetaOk && Object.values(checks).every(Boolean));
  const mobileOverviewAppHomeGateProbe = {
    appHomePass: pass,
    contract: 'optical-patrol-v1',
    truthMode: runtimeMode,
    runtimeMode,
    scenario: optical.getAttribute('data-optical-patrol-scenario') || '',
    risk: riskKind,
    composition: sceneKind,
    scope: {
      runtimeManaged,
      owner: runtimeManaged ? 'runtime-toolbar' : 'standalone-chrome',
      runtimeToolbar: Boolean(runtimeScope),
      standaloneChrome: Boolean(standaloneScope),
      identity: normalize(scopeIdentity?.textContent || ''),
      readonly: normalize(scopeReadonly?.textContent || ''),
    },
    evidence: { label: normalize(evidenceBoundary?.textContent || ''), forbidsCurrent },
    selectedClaim: { id: selectedId, focusId: expandedClaim?.id || '', headingId: selectedHeadingId },
    claimControls: claimControls.map((control) => ({ tag: control.tagName, label: normalize(control.getAttribute('aria-label') || control.textContent || '') })),
    textReadability: { scopes: auditedTextScopes, unreadable: unreadableText, clipped: clippedOperationalText },
    tablet: { applicable: tablet, summary: summaryRect, expanded: expandedRect, followups: followupsRect, evidenceDeck: evidenceDeckRect, pass: phoneLayout && tabletLayout },
    targets: {
      undersized: undersizedTargets,
      obscuredByNavigation: obscuredTargets.map((node) => normalize(node.getAttribute('aria-label') || node.textContent || node.tagName)),
      obscuredNonFollowups: obscuredNonFollowups.map((node) => normalize(node.getAttribute('aria-label') || node.textContent || node.tagName)),
      followupReachability: followupReachability.map((item) => ({
        label: normalize(item.node.getAttribute('aria-label') || item.node.textContent || item.node.tagName),
        reachable: item.reachable,
        requiredScroll: Math.round(item.requiredScroll || 0),
        maxScroll: Math.round(item.maxScroll || 0),
      })),
    },
    interaction: nativeMobileInteractionProbe,
    detail: {
      sections: nativeDetailSectionCount,
      evidenceNodes: nativeDetailRawEvidenceCount,
      novel: nativeDetailHasNovelEvidence,
      noHomeReplay: nativeDetailNoHomeReplay,
    },
    keyboard: nativeMobileFocusKeyboardProbe,
    selection: nativeMobileObjectSelectionProbe,
    requiredChecks: Object.keys(checks),
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
    scroll: { width: root.scrollWidth, height: root.scrollHeight, viewportWidth: window.innerWidth, viewportHeight: window.innerHeight },
    hasBadLiteral,
    scaleMetaOk,
  };
}

module.exports = {
  MOBILE_OVERVIEW_REQUIRED_CHECKS,
  inspectMobileNativeOverview,
  inspectOverviewMobileInteraction,
};
