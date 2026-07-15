'use strict';

function inspectOverviewDesktopLayout({
    sectionName,
    isDesktopOverview,
    sectionRoot,
    overviewNoSnapshotGrid,
    overviewDesktopDetail,
    overviewVerdictStatusBus,
    overviewSummaryShell,
    scaleScenario,
    overviewNormalFocusedHierarchyOk,
    overviewStatusBar,
    noSnapshotEdge,
    overviewNoSnapshotModuleContractOk,
    overviewNoSnapshotDesktopCoreFactsOk,
    normalize,
    overviewNoSnapshotRequiredModuleNames,
    overviewNoSnapshotRowHeightMax,
    overviewNoSnapshotRowHeightOk,
    overviewResourceTop5Rows,
    overviewResourceSpecificModulesOk,
    overviewDesktopEvidenceCompositionOk,
    overviewDesktopEvidenceSurfaceOk,
    overviewResourceFirstScreenEvidenceOk,
}) {
  let overviewBlankProbe = null;
  let overviewBlankAreaOk = true;
  let overviewNoSnapshotModuleFillProbe = null;
  let overviewNoSnapshotModuleFillOk = true;
  let overviewResourceModuleFillProbe = null;
  let overviewResourceModuleFillOk = true;
  let overviewDesktopRightFillProbe = null;
  let overviewDesktopRightFillOk = true;
  let overviewDesktopColumnContinuityProbe = null;
  let overviewDesktopColumnContinuityOk = true;
  let overviewDesktopTopBandProbe = null;
  let overviewDesktopTopBandOk = true;
  let overviewDesktopEffectiveHeightProbe = null;
  let overviewDesktopEffectiveHeightOk = true;
  let overviewDesktopFocusedHierarchyProbe = null;
  let overviewDesktopFocusedHierarchyOk = false;
  if (sectionName === 'overview' && isDesktopOverview && sectionRoot) {
    const rect = sectionRoot.getBoundingClientRect();
    const semanticGeometry = (node, key) => {
      if (!node) return { key, present: false, visible: false };
      const item = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      const visible = item.width > 0 &&
        item.height > 0 &&
        item.bottom > 0 &&
        item.top < window.innerHeight &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0';
      return {
        key,
        present: true,
        visible,
        top: Math.round(item.top),
        bottom: Math.round(item.bottom),
        width: Math.round(item.width),
        height: Math.round(item.height),
      };
    };
    const flatConsoleDetailNode = overviewNoSnapshotGrid || overviewDesktopDetail;
    const flatConsoleEvidenceNode = overviewVerdictStatusBus || overviewNoSnapshotGrid || overviewSummaryShell?.querySelector('.ik-home-evidence-grid');
    const focusedWanVisual = sectionRoot.querySelector('[data-overview-density-module="wan-trend"] .ro-wan-integrated-visual');
    const focusedWanVisualRect = focusedWanVisual?.getBoundingClientRect();
    const focusedBottomRail = sectionRoot.querySelector('.ro-col.is-bottom');
    const focusedBottomRailRect = focusedBottomRail?.getBoundingClientRect();
    const focusedTerminalInMain = sectionRoot.querySelector('.ro-col.is-main [data-overview-density-module="terminal-ranking"]');
    const focusedTerminalInBottom = sectionRoot.querySelector('.ro-col.is-bottom [data-overview-density-module="terminal-ranking"]');
    const focusedTerminalRect = focusedTerminalInBottom?.getBoundingClientRect();
    const singleFocusedHierarchy = scaleScenario === 'single' && Boolean(
      overviewNormalFocusedHierarchyOk &&
      !focusedTerminalInMain &&
      focusedTerminalInBottom &&
      focusedTerminalInBottom.querySelector('details[open]') &&
      focusedWanVisualRect &&
      focusedWanVisualRect.width >= rect.width * 0.52 &&
      focusedWanVisualRect.height >= 220 &&
      focusedBottomRailRect &&
      focusedBottomRailRect.width >= rect.width * 0.72 &&
      focusedTerminalRect &&
      focusedTerminalRect.bottom >= window.innerHeight * 0.58 &&
      focusedBottomRailRect.top < window.innerHeight * 0.82
    );
    const fleetFocusedHierarchy = scaleScenario === 'fleet' && Boolean(
      overviewNormalFocusedHierarchyOk &&
      !focusedTerminalInMain &&
      focusedTerminalInBottom &&
      !focusedTerminalInBottom.querySelector('details[open]') &&
      focusedWanVisualRect &&
      focusedWanVisualRect.width >= rect.width * 0.52 &&
      focusedWanVisualRect.height >= 220 &&
      focusedBottomRailRect &&
      focusedBottomRailRect.width >= rect.width * 0.72 &&
      focusedBottomRailRect.top < window.innerHeight * 0.90
    );
    overviewDesktopFocusedHierarchyOk = singleFocusedHierarchy || fleetFocusedHierarchy;
    overviewDesktopFocusedHierarchyProbe = {
      terminalPlacement: focusedTerminalInMain ? 'main' : focusedTerminalInBottom ? 'bottom' : 'missing',
      terminalExpanded: Boolean(focusedTerminalInBottom?.querySelector('details[open]')),
      wanVisualHeight: Math.round(focusedWanVisualRect?.height || 0),
      wanVisualWidth: Math.round(focusedWanVisualRect?.width || 0),
      bottomRailTop: Math.round(focusedBottomRailRect?.top || 0),
      bottomRailHeight: Math.round(focusedBottomRailRect?.height || 0),
      terminalBottom: Math.round(focusedTerminalRect?.bottom || 0),
    };
    const flatConsoleVisible = Boolean(
      overviewStatusBar &&
      overviewStatusBar.getBoundingClientRect().top < window.innerHeight * 0.20 &&
      overviewStatusBar.getBoundingClientRect().height > 0 &&
      flatConsoleDetailNode &&
      flatConsoleDetailNode.getBoundingClientRect().height > 0
      && flatConsoleEvidenceNode && flatConsoleEvidenceNode.getBoundingClientRect().height > 0
    );
    const desktopContentRects = Array.from(sectionRoot.querySelectorAll([
      '.ro-status-bus',
      '.ik-desktop-evidence',
      '[data-overview-density-module]',
      '[data-overview-rank-grid]',
      '.ik-overview-flat-module',
      '.ik-home-density-card'
    ].join(',')))
      .filter((node) => {
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return rect.width > 0 &&
          rect.height > 0 &&
          rect.bottom > 0 &&
          rect.top < window.innerHeight &&
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          style.opacity !== '0';
      })
      .map((node) => node.getBoundingClientRect());
    const effectiveTop = desktopContentRects.length ? Math.max(0, Math.min(...desktopContentRects.map((item) => item.top))) : 0;
    const effectiveBottom = desktopContentRects.length ? Math.max(...desktopContentRects.map((item) => item.bottom)) : 0;
    const effectiveHeight = Math.max(0, effectiveBottom - effectiveTop);
    const effectiveHeightRatio = noSnapshotEdge
      ? 0.40
      : ['collection-down', 'resource-full', 'resource-load', 'interfaces-down'].includes(scaleScenario)
        ? 0.78
        : 0.90;
    const effectiveMinHeight = noSnapshotEdge
      ? Math.min(360, Math.max(0, window.innerHeight * effectiveHeightRatio))
      : window.innerHeight * effectiveHeightRatio;
    const bottomBlank = Math.max(0, window.innerHeight - effectiveBottom);
    overviewDesktopEffectiveHeightOk = noSnapshotEdge
      ? Boolean(overviewNoSnapshotModuleContractOk && overviewNoSnapshotDesktopCoreFactsOk && effectiveHeight >= effectiveMinHeight)
      : effectiveHeight >= effectiveMinHeight;
    overviewDesktopEffectiveHeightProbe = {
      top: Math.round(effectiveTop),
      bottom: Math.round(effectiveBottom),
      height: Math.round(effectiveHeight),
      minHeight: Math.round(effectiveMinHeight),
      bottomBlank: Math.round(bottomBlank),
    };
    overviewBlankProbe = {
      flatConsoleVisible,
      statusBus: semanticGeometry(overviewStatusBar, 'status-bus'),
      evidenceWorkspace: semanticGeometry(overviewDesktopDetail, 'evidence-workspace'),
    };
    const analyzeDesktopStackContinuity = (stackNode) => {
      if (!stackNode) {
        return { maxGap: 999, bottomGap: 999, itemCount: 0 };
      }
      const stackRect = stackNode.getBoundingClientRect();
      const visibleBottom = Math.min(window.innerHeight, Math.max(0, stackRect.bottom || window.innerHeight));
      const visibleTop = Math.max(0, stackRect.top || 0);
      const rects = Array.from(stackNode.children || [])
        .filter((node) => {
          const item = node.getBoundingClientRect();
          const style = getComputedStyle(node);
          return item.width > 0 &&
            item.height > 0 &&
            item.bottom > 0 &&
            item.top < window.innerHeight &&
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            style.opacity !== '0';
        })
        .map((node) => {
          const item = node.getBoundingClientRect();
          return {
            top: Math.max(visibleTop, item.top),
            bottom: Math.min(visibleBottom, window.innerHeight, item.bottom),
            height: Math.max(0, Math.min(visibleBottom, window.innerHeight, item.bottom) - Math.max(visibleTop, item.top)),
            module: node.getAttribute('data-overview-density-module') || normalize(node.textContent || '').slice(0, 24),
          };
        })
        .filter((item) => item.height > 0)
        .sort((a, b) => a.top - b.top);
      let maxGap = 0;
      if (rects.length) {
        maxGap = Math.max(maxGap, Math.max(0, rects[0].top - visibleTop));
        for (let index = 1; index < rects.length; index += 1) {
          maxGap = Math.max(maxGap, Math.max(0, rects[index].top - rects[index - 1].bottom));
        }
        maxGap = Math.max(maxGap, Math.max(0, Math.min(window.innerHeight, visibleBottom) - rects[rects.length - 1].bottom));
      }
      const bottomGap = rects.length ? Math.max(0, Math.min(window.innerHeight, visibleBottom) - rects[rects.length - 1].bottom) : 999;
      return {
        maxGap: Math.round(maxGap),
        bottomGap: Math.round(bottomGap),
        itemCount: rects.length,
        modules: rects.map((item) => item.module).slice(0, 6),
      };
    };
    const continuityRequired = ['all-offline', 'collection-down', 'resource-full', 'interfaces-down', 'no-snapshot'].includes(scaleScenario);
    const leftStackNode = sectionRoot.querySelector('.ik-home-layout > .stack:not(.ik-home-side-stack)');
    const rightStackNode = sectionRoot.querySelector('.ik-home-layout > .ik-home-side-stack');
    const leftContinuity = analyzeDesktopStackContinuity(leftStackNode);
    const rightContinuity = analyzeDesktopStackContinuity(rightStackNode);
    overviewDesktopColumnContinuityProbe = {
      threshold: 120,
      required: continuityRequired,
      left: leftContinuity,
      right: rightContinuity,
    };
    overviewDesktopColumnContinuityOk = !continuityRequired || Boolean(
      noSnapshotEdge && overviewNoSnapshotModuleContractOk && overviewNoSnapshotDesktopCoreFactsOk ||
      leftContinuity.maxGap <= 120 &&
      rightContinuity.maxGap <= 120
    );
    const moduleNode = (name) => sectionRoot.querySelector('[data-overview-density-module="' + name + '"]');
    const moduleGeometry = (name) => semanticGeometry(moduleNode(name), name);
    const noSnapshotModuleGeometry = overviewNoSnapshotRequiredModuleNames.map(moduleGeometry);
    const noSnapshotRawGeometry = moduleGeometry('evidence-boundary');
    overviewNoSnapshotModuleFillProbe = {
      requiredModules: noSnapshotModuleGeometry,
      rawEvidence: noSnapshotRawGeometry,
      rowHeightMax: overviewNoSnapshotRowHeightMax,
    };
    overviewNoSnapshotModuleFillOk = sectionName !== 'overview' || !noSnapshotEdge || !isDesktopOverview || Boolean(
      overviewNoSnapshotModuleContractOk &&
      noSnapshotModuleGeometry.every((item) => item.visible) &&
      noSnapshotRawGeometry.visible &&
      overviewNoSnapshotDesktopCoreFactsOk &&
      overviewNoSnapshotRowHeightOk
    );

    const resourceRiskGeometry = moduleGeometry('resource-risk-priority');
    const resourcePressureGeometry = moduleGeometry('resource-pressure-bars');
    const resourceTop5Geometry = moduleGeometry('resource-interface-top5');
    overviewResourceModuleFillProbe = {
      riskPriority: resourceRiskGeometry,
      pressureBars: resourcePressureGeometry,
      interfaceTop5: resourceTop5Geometry,
      interfaceTop5Rows: overviewResourceTop5Rows.length,
    };
    overviewResourceModuleFillOk = sectionName !== 'overview' || scaleScenario !== 'resource-full' || !isDesktopOverview || Boolean(
      resourceRiskGeometry.visible &&
      resourcePressureGeometry.visible &&
      resourceTop5Geometry.present &&
      overviewResourceSpecificModulesOk &&
      overviewResourceTop5Rows.length >= 5
    );

    const sceneCoreNames = noSnapshotEdge
      ? overviewNoSnapshotRequiredModuleNames
      : scaleScenario === 'resource-full'
        ? ['resource-risk-priority', 'resource-pressure-bars']
        : scaleScenario === 'all-offline'
          ? ['wan-offline-bars', 'wan-route-ledger', 'wan-offline-continuity']
          : scaleScenario === 'collection-down'
            ? ['collection-channel-ledger', 'collection-recent-failures']
            : scaleScenario === 'interfaces-down'
              ? ['interface-forwarding', 'interface-collection-channel']
              : ['wan-trend', 'normal-interface-boundary', 'resource-threshold', 'normal-collection-channel'];
    const sceneCoreGeometry = sceneCoreNames.map(moduleGeometry);
    const rightCoreNames = noSnapshotEdge
      ? ['no-snapshot-recent-success']
      : scaleScenario === 'resource-full'
        ? ['resource-pressure-bars']
        : scaleScenario === 'all-offline'
          ? ['wan-offline-continuity']
          : scaleScenario === 'collection-down'
            ? ['collection-recent-failures']
            : scaleScenario === 'interfaces-down'
              ? ['interface-collection-channel']
              : ['normal-interface-boundary', 'resource-threshold', 'normal-collection-channel'];
    const rightCoreGeometry = rightCoreNames.map(moduleGeometry);
    const rightWorkspaceGeometry = semanticGeometry(rightStackNode, 'right-workspace');
    overviewDesktopRightFillProbe = {
      scenario: scaleScenario,
      workspace: rightWorkspaceGeometry,
      requiredModules: rightCoreGeometry,
      continuity: rightContinuity,
    };
    overviewDesktopRightFillOk = overviewNormalFocusedHierarchyOk
      ? Boolean(
        rightWorkspaceGeometry.visible &&
        rightCoreGeometry.every((item) => item.visible) &&
        rightContinuity.maxGap <= 120
      )
      : Boolean(
        rightWorkspaceGeometry.visible &&
        rightCoreGeometry.every((item) => item.visible) &&
        (!continuityRequired || rightContinuity.maxGap <= 120) &&
        (!noSnapshotEdge || (
          overviewNoSnapshotModuleContractOk &&
          overviewNoSnapshotRowHeightOk &&
          overviewNoSnapshotDesktopCoreFactsOk
        ))
      );

    const decisionRail = sectionRoot.querySelector('.ro-desktop-decision-rail');
    const statusBusGeometry = semanticGeometry(overviewStatusBar, 'status-bus');
    const decisionRailGeometry = semanticGeometry(decisionRail, 'decision-rail');
    const incidentDecisionRequired = ['all-offline', 'no-snapshot', 'collection-down', 'resource-full', 'interfaces-down'].includes(scaleScenario);
    overviewDesktopTopBandProbe = {
      statusBus: statusBusGeometry,
      decisionRail: decisionRailGeometry,
      decisionRequired: incidentDecisionRequired,
    };
    overviewDesktopTopBandOk = Boolean(
      statusBusGeometry.visible &&
      statusBusGeometry.top < window.innerHeight * 0.20 &&
      (!incidentDecisionRequired || decisionRailGeometry.visible)
    );

    const overviewSceneGeometryContractOk = noSnapshotEdge
      ? overviewNoSnapshotModuleFillOk
      : scaleScenario === 'resource-full'
        ? overviewResourceModuleFillOk && overviewResourceFirstScreenEvidenceOk
        : Boolean(
          sceneCoreGeometry.every((item) => item.visible) &&
          overviewDesktopEvidenceCompositionOk &&
          overviewDesktopEvidenceSurfaceOk
        );
    overviewBlankProbe.sceneCore = sceneCoreGeometry;
    overviewBlankProbe.effectiveHeight = overviewDesktopEffectiveHeightProbe;
    overviewBlankProbe.columnContinuity = overviewDesktopColumnContinuityProbe;
    overviewBlankAreaOk = Boolean(
      flatConsoleVisible &&
      overviewSceneGeometryContractOk &&
      overviewDesktopRightFillOk &&
      overviewDesktopTopBandOk &&
      overviewDesktopEffectiveHeightOk &&
      overviewDesktopColumnContinuityOk
    );
  }
  return {
    overviewBlankProbe,
    overviewBlankAreaOk,
    overviewNoSnapshotModuleFillProbe,
    overviewNoSnapshotModuleFillOk,
    overviewResourceModuleFillProbe,
    overviewResourceModuleFillOk,
    overviewDesktopRightFillProbe,
    overviewDesktopRightFillOk,
    overviewDesktopColumnContinuityProbe,
    overviewDesktopColumnContinuityOk,
    overviewDesktopTopBandProbe,
    overviewDesktopTopBandOk,
    overviewDesktopEffectiveHeightProbe,
    overviewDesktopEffectiveHeightOk,
    overviewDesktopFocusedHierarchyProbe,
    overviewDesktopFocusedHierarchyOk,
  };
}

module.exports = { inspectOverviewDesktopLayout };
