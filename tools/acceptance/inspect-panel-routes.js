'use strict';

async function inspectPanelRouteRuntime() {
  const app = document.querySelector('[data-panel-app]');
  if (!app) return { applicable: false, pass: true };

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const current = () => {
    const route = app.getAttribute('data-active-section') || document.body.dataset.panelRoute || '';
    const section = route === 'overview'
      ? document.querySelector('#overview')
      : document.querySelector(`[data-mobile-domain-workspace="${CSS.escape(route)}"], [data-panel-route-content="${CSS.escape(route)}"]`);
    const title = section?.querySelector('[data-panel-route-title], h1');
    const sectionName = section?.id ||
      section?.getAttribute('data-mobile-domain-workspace') ||
      section?.getAttribute('data-panel-route-content') || '';
    return {
      route,
      section: sectionName,
      content: section?.getAttribute('data-panel-route-content') || sectionName,
      mobileOverview: Boolean(section?.querySelector('[data-mobile-overview]')),
      title: String(title?.textContent || '').replace(/\s+/g, ' ').trim(),
      titleIsRouteTarget: Boolean(title?.hasAttribute('data-panel-route-title')),
      titleFocusable: title?.getAttribute('tabindex') === '-1',
      focusOnTitle: Boolean(title && document.activeElement === title),
      url: location.href,
    };
  };
  const waitForRoute = async (route, timeoutMs = 1800, requireTitleFocus = false) => {
    const started = performance.now();
    while (performance.now() - started < timeoutMs) {
      const snapshot = current();
      if (snapshot.route === route && snapshot.section === route && (!requireTitleFocus || snapshot.focusOnTitle)) return snapshot;
      await delay(25);
    }
    return current();
  };
  const clickRoute = async (route) => {
    const candidates = Array.from(document.querySelectorAll('[data-section="' + CSS.escape(route) + '"]'));
    const visible = candidates.find((node) => {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    });
    const target = visible || candidates[0];
    if (target) target.click();
    else location.hash = '#' + route;
    return waitForRoute(route, 1800, route !== 'overview');
  };

  if (current().route !== 'overview') await clickRoute('overview');
  const overview = current();
  const interfaces = await clickRoute('interfaces');
  const interfacesFocusOk = interfaces.focusOnTitle;
  const commandOverview = await clickRoute('overview');
  const overviewBackCommandOk = commandOverview.route === 'overview' && commandOverview.focusOnTitle;
  const interfacesAfterCommand = await clickRoute('interfaces');
  const terminals = await clickRoute('terminals');

  history.back();
  const backInterfaces = await waitForRoute('interfaces');
  history.back();
  const backOverview = await waitForRoute('overview', 1800, true);
  history.forward();
  const forwardInterfaces = await waitForRoute('interfaces');
  history.forward();
  const forwardTerminals = await waitForRoute('terminals');

  const unknownUrl = `${location.pathname}?section=definitely-not-a-route#definitely-not-a-route`;
  history.pushState({ panelRoute: 'definitely-not-a-route' }, '', unknownUrl);
  window.dispatchEvent(new PopStateEvent('popstate', { state: history.state }));
  const unknownNormalized = await waitForRoute('overview');

  const distinctSections = new Set([overview.section, interfacesAfterCommand.section, terminals.section]).size === 3;
  const distinctTitles = new Set([overview.title, interfacesAfterCommand.title, terminals.title]).size === 3;
  const canonicalUnknown = unknownNormalized.route === 'overview' && unknownNormalized.section === 'overview' && /[?#](?:section=overview.*#overview|overview)$/.test(location.href);
  const backForwardOk = backInterfaces.route === 'interfaces' && backOverview.route === 'overview' && forwardInterfaces.route === 'interfaces' && forwardTerminals.route === 'terminals';
  const overviewFocusOk = (
    overview.titleIsRouteTarget &&
    overview.titleFocusable &&
    commandOverview.focusOnTitle &&
    backOverview.focusOnTitle
  );
  const pass = Boolean(
    overview.route === 'overview' &&
    interfaces.route === 'interfaces' &&
    terminals.route === 'terminals' &&
    distinctSections &&
    distinctTitles &&
    interfacesFocusOk &&
    overviewFocusOk &&
    overviewBackCommandOk &&
    backForwardOk &&
    canonicalUnknown
  );

  return {
    applicable: true,
    pass,
    overview,
    interfaces,
    terminals,
    interfacesFocusOk,
    commandOverview,
    overviewBackCommandOk,
    overviewFocusOk,
    backInterfaces,
    backOverview,
    forwardInterfaces,
    forwardTerminals,
    distinctSections,
    distinctTitles,
    backForwardOk,
    unknownNormalized,
    canonicalUnknown,
  };
}

module.exports = { inspectPanelRouteRuntime };
