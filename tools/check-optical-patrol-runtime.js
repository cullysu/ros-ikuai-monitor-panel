#!/usr/bin/env node
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const {
  ACTION,
  ACTION_TIMEOUT_MS,
  CLAIM_CONTROL,
  CONTRACT,
  DEFAULT_VIEWPORT,
  EXPANDED_CLAIM,
  GRID_VIEWPORTS,
  OVERFLOW_CLAIM_CONTROL,
  OVERFLOW_CONTROL,
  REPO_ROOT,
  ROOT,
  SCENE_CASES,
  assert,
  captureOriginal,
  claimDomId,
  closeRuntime,
  inspectRoot,
  matrixCells,
  openOverview,
  runBounded,
  sceneCase,
  serialiseError,
  startOpticalPatrolRuntime,
  viewportProfile,
  waitForSelectedClaim,
  waitForSelectedClaimChange,
  writeReport,
} = require("./lib/optical-patrol-runtime/runtime");
const { gitWorktreeIdentity } = require("./worktree-runtime-identity");

const RUN_TIMEOUT_MS = 150_000;
const args = new Set(process.argv.slice(2));
const fullMatrix = args.has("--full");
const smoke = args.has("--smoke");
const writeArtifacts = !smoke && !args.has("--no-artifacts");

function screenshotManifest(checks) {
  const matrixCheck = checks.find((check) => check.name === "initial-responsive-runtime-matrix");
  const cells = matrixCheck?.evidence?.cells || [];
  return cells.filter((cell) => cell.screenshotPath).map((cell) => {
    const bytes = fs.readFileSync(cell.screenshotPath);
    return {
      scene: cell.scene,
      viewport: cell.viewport,
      path: path.relative(REPO_ROOT, cell.screenshotPath).replaceAll("\\", "/"),
      sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
      bytes: bytes.length,
      capturedAt: cell.capturedAt,
    };
  });
}

function assertTouchTargets(evidence, context) {
  const undersized = evidence.controls.filter((control) => (
    control.rect && (control.rect.width < 44 || control.rect.height < 44)
  ));
  assert(undersized.length === 0, "Optical Patrol exposed a visible target below 44px", {
    context,
    undersized,
  });
  const unlabeled = evidence.controls.filter((control) => !control.label);
  assert(unlabeled.length === 0, "Optical Patrol exposed an unlabeled interactive control", {
    context,
    unlabeled,
  });
}

function rectanglesIntersect(left, right) {
  return Boolean(left && right
    && left.left < right.right && left.right > right.left
    && left.top < right.bottom && left.bottom > right.top);
}

function assertFullyVisibleInInitialViewport(bounds, visibleBounds, context, label) {
  assert(bounds && visibleBounds, `Optical Patrol ${label} is absent from the initial visible viewport`, {
    context,
    bounds,
    visibleBounds,
  });
  const tolerance = 1;
  assert(
    visibleBounds.left <= bounds.left + tolerance
      && visibleBounds.top <= bounds.top + tolerance
      && visibleBounds.right >= bounds.right - tolerance
      && visibleBounds.bottom >= bounds.bottom - tolerance,
    `Optical Patrol ${label} is clipped in the initial visible viewport`,
    { context, bounds, visibleBounds },
  );
}

function assertInitialScrollPosition(evidence, context) {
  const position = evidence.scrollPosition || {};
  assert((position.windowY || 0) <= 1 && (position.rootY || 0) <= 1,
    "Optical Patrol did not begin the task in its initial scroll position", {
      context,
      scrollPosition: position,
    });
}

function assertSmallPhoneCriticalMeasurement(evidence, context) {
  if (evidence.viewport.width !== 320 || evidence.viewport.height !== 568 || evidence.scenario !== "single") return;
  assertInitialScrollPosition(evidence, context);
  const measurement = evidence.selectedCriticalMeasurement;
  assert(measurement, "320px normal Optical Patrol must expose the selected route critical measurement", {
    context,
    selectedClaim: evidence.selectedClaim,
  });
  assertFullyVisibleInInitialViewport(measurement?.rect, measurement?.visibleRect, context, "selected route critical measurement");
  assert(!rectanglesIntersect(measurement?.rect, evidence.navigation?.rect),
    "320px normal Optical Patrol lets fixed navigation obscure the selected route critical measurement", {
      context,
      measurement,
      navigation: evidence.navigation,
    });
}

function assertSmallPhonePrimaryAction(evidence, context) {
  if (evidence.viewport.width !== 320 || evidence.viewport.height !== 568) return;
  assertInitialScrollPosition(evidence, context);
  assertFullyVisibleInInitialViewport(evidence.action?.rect, evidence.action?.visibleRect, context, "primary object action");
  assert((evidence.action?.rect?.height || 0) >= 44,
    "320px Optical Patrol primary object action is smaller than the 44px touch target", {
      context,
      action: evidence.action,
    });
  assert(!rectanglesIntersect(evidence.action?.rect, evidence.navigation?.rect),
    "320px Optical Patrol lets fixed navigation obscure the primary object action", {
      context,
      action: evidence.action,
      navigation: evidence.navigation,
    });
}

const SHORT_PHONE_INCIDENT_SCENES = new Set([
  "interfaces-down",
  "resource-full",
  "collection-down",
  "all-offline",
  "no-snapshot",
]);

function assertShortPhoneIncidentAction(evidence, context) {
  const shortPhone = (
    (evidence.viewport.width === 320 && evidence.viewport.height === 568)
    || (evidence.viewport.width === 375 && evidence.viewport.height === 667)
  );
  if (!shortPhone || !SHORT_PHONE_INCIDENT_SCENES.has(evidence.scenario)) return;
  assertInitialScrollPosition(evidence, context);
  assertFullyVisibleInInitialViewport(evidence.action?.rect, evidence.action?.visibleRect, context, "incident object action");
  assert(!rectanglesIntersect(evidence.action?.rect, evidence.navigation?.rect),
    "Short-phone incident action is obscured by fixed navigation", {
      context,
      action: evidence.action,
      navigation: evidence.navigation,
    });
}

function assertShortLandscapePhone(evidence, context) {
  const shortLandscape = (
    (evidence.viewport.width === 667 && evidence.viewport.height === 375)
    || (evidence.viewport.width === 844 && evidence.viewport.height === 390)
  );
  if (!shortLandscape) return;
  assert(evidence.capability === "short-landscape", "Short-landscape Optical Patrol must use the short-landscape phone capability", {
    context,
    capability: evidence.capability,
    viewport: evidence.viewport,
  });
  assertInitialScrollPosition(evidence, context);
  assertFullyVisibleInInitialViewport(evidence.action?.rect, evidence.action?.visibleRect, context, "selected object action");
  assert(evidence.selectedDecisiveGeometry?.rect,
    "Short-landscape Optical Patrol must expose decisive evidence before its selected object action", {
      context,
      selectedClaim: evidence.selectedClaim,
    });
  assert(
    evidence.action.rect.top >= evidence.selectedDecisiveGeometry.rect.bottom - 1,
    "Short-landscape Optical Patrol presents the selected object action before decisive evidence", {
      context,
      action: evidence.action,
      decisiveGeometry: evidence.selectedDecisiveGeometry,
    },
  );
  assert(!rectanglesIntersect(evidence.action?.rect, evidence.navigation?.rect),
    "Short-landscape Optical Patrol lets fixed navigation obscure the selected object action", {
      context,
      action: evidence.action,
      navigation: evidence.navigation,
    });
}

function assertPhoneNavigationClearance(evidence, context) {
  if (evidence.viewport.width >= 768 || !evidence.navigation?.rect) return;
  const navigation = evidence.navigation.rect;
  const conflicts = [
    ["selected-action", evidence.action?.rect],
    ["first-followup", evidence.followups[0]?.visibleRect],
  ].filter(([, bounds]) => rectanglesIntersect(bounds, navigation));
  assert(conflicts.length === 0, "Initial Optical Patrol task content intersects the fixed navigation material", {
    context,
    navigation,
    conflicts,
  });
}

function assertSemanticTitleLines(evidence, context) {
  const lines = evidence.routeTitle?.lines || [];
  if (lines.length < 2) return;
  const joined = lines.join("");
  const boundaries = new Set();
  let offset = 0;
  for (const line of lines.slice(0, -1)) {
    offset += line.length;
    boundaries.add(offset);
  }
  const phrases = ["业务状态", "采集状态", "默认路由", "运行记录", "出口依赖"];
  const broken = [];
  for (const phrase of phrases) {
    let index = joined.indexOf(phrase);
    while (index >= 0) {
      if ([...boundaries].some((boundary) => boundary > index && boundary < index + phrase.length)) broken.push(phrase);
      index = joined.indexOf(phrase, index + phrase.length);
    }
  }
  assert(broken.length === 0, "Optical Patrol broke a semantic CJK phrase across title lines", {
    context,
    lines,
    broken,
  });
}

function assertTabletNovelEvidence(evidence, context) {
  const rows = evidence.tabletEvidenceDeck?.rows || [];
  assert(rows.length >= 8, "Tablet evidence deck must fill both operational columns", { context, rows });
  const selectedText = (evidence.selectedClaim?.text || "").replace(/\s+/g, "");
  const novelRows = rows.filter((row) => {
    const semanticRow = `${row.label || ""}${row.value || ""}`.replace(/\s+/g, "");
    return semanticRow && !selectedText.includes(semanticRow);
  });
  assert(novelRows.length / rows.length >= 0.7, "Tablet evidence deck must add at least 70% novel rows beyond the selected claim", {
    context,
    selectedText,
    rows,
    novelRows,
  });
}

function assertViewport(evidence, context) {
  assert(evidence.rootPresent, "Optical Patrol root was not rendered", { context, evidence });
  assert(evidence.runtimeManaged === "true", "Runtime overview must use managed Optical Patrol chrome", {
    context,
    runtimeManaged: evidence.runtimeManaged,
  });
  assert(evidence.overflowX <= 1, "Optical Patrol introduced horizontal viewport overflow", {
    context,
    overflowX: evidence.overflowX,
    viewport: evidence.viewport,
    rootRect: evidence.rootRect,
  });
  assert(evidence.evidenceBoundary?.visible, "Optical Patrol evidence boundary must remain visible", {
    context,
    evidenceBoundary: evidence.evidenceBoundary,
  });
  assertTouchTargets(evidence, context);
  assertPhoneNavigationClearance(evidence, context);
  assertSemanticTitleLines(evidence, context);
  assertSmallPhoneCriticalMeasurement(evidence, context);
  assertSmallPhonePrimaryAction(evidence, context);
  assertShortPhoneIncidentAction(evidence, context);
  assertShortLandscapePhone(evidence, context);
}

function assertSceneTruth(descriptor, evidence, context) {
  assert(evidence.scenario === descriptor.id, "Rendered Optical Patrol scenario did not match its mock contract", {
    context,
    expected: descriptor.id,
    actual: evidence.scenario,
  });
  assert(evidence.scene === descriptor.expectedScene, "Rendered Optical Patrol scene did not match its scene contract", {
    context,
    expected: descriptor.expectedScene,
    actual: evidence.scene,
    risk: evidence.risk,
  });
  assert(evidence.selectedClaim, "Optical Patrol must expose a selected claim", { context, evidence });
  assert(evidence.selectedClaim.kind === descriptor.expectedKind, "The scene did not select its evidence-leading claim kind", {
    context,
    expected: descriptor.expectedKind,
    selectedClaim: evidence.selectedClaim,
  });
  assert(evidence.actionCount === 1, "The selected claim must own exactly one visible object action", {
    context,
    actionCount: evidence.actionCount,
  });
  assert(evidence.historySelection?.version === 1, "Claim selection must be represented by versioned browser history", {
    context,
    historySelection: evidence.historySelection,
  });
  assert(evidence.historySelection?.selectedId === evidence.selectedClaim.id, "Browser history selection must match the expanded claim", {
    context,
    historySelection: evidence.historySelection,
    selectedClaim: evidence.selectedClaim,
  });
  assert(
    evidence.historySelection?.scope === `${evidence.scene}|${evidence.risk}|${evidence.evidenceMode}|${evidence.scale}`,
    "Browser history selection must be scoped to the active scene, risk, evidence mode, and scale",
    { context, historySelection: evidence.historySelection, evidence },
  );

  if (descriptor.evidenceMode) {
    assert(evidence.evidenceMode === descriptor.evidenceMode, "Scene evidence mode did not match its truth boundary", {
      context,
      expected: descriptor.evidenceMode,
      actual: evidence.evidenceMode,
    });
  }
  if (descriptor.withdrawsCurrent) {
    assert(evidence.forbidsCurrent === "true", "Non-current evidence must explicitly withdraw current values", {
      context,
      evidenceMode: evidence.evidenceMode,
      forbidsCurrent: evidence.forbidsCurrent,
    });
    assert(evidence.trafficGeometryCount === 0 && evidence.resourceGeometryCount === 0,
      "Withdrawn current evidence must not render current traffic or resource geometry", {
        context,
        trafficGeometryCount: evidence.trafficGeometryCount,
        resourceGeometryCount: evidence.resourceGeometryCount,
      });
  } else {
    assert(evidence.forbidsCurrent === "false", "Current evidence must not be marked as withdrawn", {
      context,
      evidenceMode: evidence.evidenceMode,
      forbidsCurrent: evidence.forbidsCurrent,
    });
  }
  if (descriptor.id === "single") {
    assert(evidence.trafficGeometryCount === 1, "Single scene must expose current traffic from its verified route claim", {
      context,
      trafficGeometryCount: evidence.trafficGeometryCount,
    });
  }
  if (descriptor.id === "fleet") {
    assert(evidence.scopeFacts.length === 3, "Calm fleet must expose WAN scope facts on the first screen", {
      context,
      scopeFacts: evidence.scopeFacts,
    });
    assert(evidence.scopeFacts.map((fact) => fact.label).join("|") === "WAN 范围|运行记录|待确认",
      "Fleet scope facts must preserve the operational comparison order", {
        context,
        scopeFacts: evidence.scopeFacts,
      });
  } else {
    assert(evidence.scopeFacts.length === 0, "Scale facts must not decorate single or incident scenes", {
      context,
      scopeFacts: evidence.scopeFacts,
    });
  }
  if (descriptor.id === "collection-down" || descriptor.id === "no-snapshot") {
    const sshCopy = evidence.followups.map((control) => control.content).find((copy) => /^SSH\b/i.test(copy)) || "";
    assert(!/REST\s*采集失败/i.test(sshCopy), "SSH follow-up must not present a REST failure as SSH evidence", {
      context,
      sshCopy,
    });
  }
  if (descriptor.id === "resource-full") {
    assert(evidence.resourceGeometryCount === 1, "Resource scene must expose its current threshold geometry", {
      context,
      resourceGeometryCount: evidence.resourceGeometryCount,
    });
  }
}

function matrixDescription(cells) {
  const sceneIds = [...new Set(cells.map((cell) => cell.scene.id))];
  const viewportIds = [...new Set(cells.map((cell) => cell.viewport.id))];
  return {
    mode: fullMatrix ? `full-${cells.length}` : "initial-4",
    cells: cells.length,
    scenes: sceneIds,
    viewports: viewportIds,
    extensibleGrid: {
      scenes: SCENE_CASES.map((scene) => scene.id),
      viewports: GRID_VIEWPORTS.map(({ id, width, height }) => ({ id, width, height })),
      totalCells: SCENE_CASES.length * GRID_VIEWPORTS.length,
    },
  };
}

async function inspectMatrix(runtime) {
  const cells = matrixCells({ full: fullMatrix });
  const evidence = [];
  for (const cell of cells) {
    const context = `${cell.scene.id}@${cell.viewport.width}x${cell.viewport.height}`;
    let observation = null;
    let error = null;
    let screenshotPath = null;
    let capturedAt = null;
    try {
      observation = await openOverview(runtime, cell.scene, cell.viewport);
      assertViewport(observation, context);
      assertSceneTruth(cell.scene, observation, context);
      if (cell.viewport.id === "tablet768") {
        assert(observation.tabletEvidenceDeck?.visible, "Tablet Optical Patrol must expose its evidence deck", {
          context,
          tabletEvidenceDeck: observation.tabletEvidenceDeck,
        });
        assertTabletNovelEvidence(observation, context);
      }
    } catch (failure) {
      error = serialiseError(failure);
    }
    if (writeArtifacts) {
      try {
        screenshotPath = await captureOriginal(runtime.page, cell.scene, cell.viewport);
        capturedAt = new Date().toISOString();
      } catch (failure) {
        if (!error) error = serialiseError(failure);
      }
    }
    evidence.push({
      scene: cell.scene.id,
      mockScenario: cell.scene.mockScenario || "single-default",
      viewport: { id: cell.viewport.id, width: cell.viewport.width, height: cell.viewport.height },
      screenshotPath,
      capturedAt,
      observation,
      pass: !error,
      error,
    });
  }
  assert(evidence.length === cells.length, "Optical Patrol runtime matrix did not complete every configured cell", {
    expected: cells.length,
    actual: evidence.length,
  });
  const failed = evidence.filter((cell) => !cell.pass);
  assert(failed.length === 0, "Optical Patrol runtime matrix contained failing cells", {
    failed: failed.map(({ scene, viewport, error }) => ({ scene, viewport, error })),
  });
  return { matrix: matrixDescription(cells), cells: evidence };
}

async function inspectSevenSceneTruth(runtime) {
  const observations = [];
  for (const descriptor of SCENE_CASES) {
    const context = `${descriptor.id}@truth-probe`;
    try {
      const evidence = await openOverview(runtime, descriptor, DEFAULT_VIEWPORT);
      assertViewport(evidence, context);
      assertSceneTruth(descriptor, evidence, context);
      observations.push({
        scene: descriptor.id,
        pass: true,
        renderedScene: evidence.scene,
        evidenceMode: evidence.evidenceMode,
        forbidsCurrent: evidence.forbidsCurrent,
        selectedClaim: evidence.selectedClaim,
      });
    } catch (failure) {
      observations.push({ scene: descriptor.id, pass: false, error: serialiseError(failure) });
    }
  }
  const failed = observations.filter((observation) => !observation.pass);
  assert(failed.length === 0, "One or more Optical Patrol scenes violated runtime truth", { failed });
  return observations;
}

function assertVisibleFocus(evidence, context) {
  const focus = evidence.activeElement.focusAppearance;
  assert(evidence.activeElement.id === evidence.selectedClaim?.domId, "Expanded claim did not receive focus", {
    context,
    activeElement: evidence.activeElement,
    selectedClaim: evidence.selectedClaim,
  });
  const outlined = focus
    && focus.outlineStyle !== "none"
    && focus.outlineWidth >= 2;
  const shadowed = focus && focus.boxShadow && focus.boxShadow !== "none";
  assert(outlined || shadowed, "Focused Optical Patrol claim lacks a visible focus indicator", {
    context,
    focus,
  });
}

async function inspectClaimSelectionHistory(runtime) {
  const { page } = runtime;
  const before = await openOverview(runtime, sceneCase("single"), DEFAULT_VIEWPORT);
  assert(before.followups.length > 0, "Single scene requires a follow-up claim for selection history", { before });
  const initialId = before.selectedClaim.id;
  await page.locator(CLAIM_CONTROL).first().focus();
  await page.keyboard.press("Enter");
  const selectedId = await waitForSelectedClaimChange(page, initialId);
  const selected = await inspectRoot(page);
  assert(selected.selectedClaim.id === selectedId, "Claim selection did not update the expanded claim", {
    initialId,
    selectedId,
    selected: selected.selectedClaim,
  });
  if (selected.navigation?.rect && selected.selectedClaim?.rect) {
    const clearance = selected.navigation.rect.top - selected.selectedClaim.rect.bottom;
    assert(clearance >= 12, "Focused selected claim must finish at least 12px above fixed navigation", {
      clearance,
      navigation: selected.navigation.rect,
      selectedClaim: selected.selectedClaim.rect,
    });
  }
  assert(selected.historySelection?.selectedId === selectedId, "Claim selection did not create matching history state", {
    selectedId,
    historySelection: selected.historySelection,
  });
  assertVisibleFocus(selected, "selection");

  await page.evaluate(() => window.history.back());
  await waitForSelectedClaim(page, initialId, { focused: true });
  const restored = await inspectRoot(page);
  assertVisibleFocus(restored, "history-back");
  assert(restored.historySelection?.selectedId === initialId, "Back did not restore the prior claim history state", {
    initialId,
    historySelection: restored.historySelection,
  });

  await page.evaluate(() => window.history.forward());
  await waitForSelectedClaim(page, selectedId, { focused: true });
  const forwarded = await inspectRoot(page);
  assertVisibleFocus(forwarded, "history-forward");
  return {
    initialId,
    selectedId,
    restoredId: restored.selectedClaim.id,
    forwardedId: forwarded.selectedClaim.id,
  };
}

async function inspectObjectBoundAction(runtime) {
  const { page } = runtime;
  const before = await openOverview(runtime, sceneCase("resource-full"), DEFAULT_VIEWPORT);
  const selectedId = before.selectedClaim.id;
  const selectedDomId = claimDomId(selectedId);
  assert(before.action, "Resource claim must expose an object action", { before });
  await page.locator(ACTION).click();
  await page.waitForFunction(
    (rootSelector) => !document.querySelector(rootSelector)
      && new URLSearchParams(location.search).get("section") !== "overview",
    ROOT,
    { timeout: ACTION_TIMEOUT_MS },
  );
  const destination = await page.evaluate(() => {
    const query = new URLSearchParams(location.search);
    return {
      section: query.get("section"),
      objectId: query.get("object"),
      historyRoute: window.history.state?.panelRoute || null,
      historyObject: window.history.state?.panelObject || null,
    };
  });
  assert(destination.section && destination.section !== "overview", "Object action did not navigate to a real workspace", {
    selectedId,
    destination,
  });
  assert(destination.objectId && destination.objectId === destination.historyObject,
    "Object action URL and history state lost their bound object identity", {
      selectedId,
      destination,
    });
  assert(selectedId === `claim:${destination.objectId}`, "Object action destination does not belong to the selected claim", {
    selectedId,
    destination,
  });
  assert(destination.historyRoute === destination.section, "Object action route and history state diverged", {
    selectedId,
    destination,
  });
  await page.evaluate(() => window.history.back());
  await waitForSelectedClaim(page, selectedId);
  await page.waitForFunction((expectedId) => document.activeElement?.id === expectedId, selectedDomId, {
    timeout: ACTION_TIMEOUT_MS,
  });
  const returned = await inspectRoot(page);
  assert(returned.activeElement.id === returned.selectedClaim?.domId,
    "Returning from an object action did not restore focus to its source claim", {
      selectedId,
      activeElement: returned.activeElement,
      selectedClaim: returned.selectedClaim,
    });
  return { selectedId, destination, returnedFocus: returned.activeElement.id };
}

async function inspectAllOfflineOverflow(runtime) {
  const { page } = runtime;
  const viewport = viewportProfile("phone390");
  const before = await openOverview(runtime, sceneCase("all-offline"), viewport);
  const overflow = before.overflowControl;
  const allClaims = before.allFollowups;
  const initiallyVisibleClaims = before.followups;
  const hiddenOverflowClaims = before.overflowClaimControls;

  assert(overflow, "All-offline Optical Patrol must expose an entry for every overflow claim", {
    viewport,
    allClaims,
    initiallyVisibleClaims,
  });
  assert(overflow.tag === "button" && overflow.type === "button" && !overflow.disabled,
    "All-offline overflow entry must be an enabled native button", { overflow });
  assert(overflow.label && overflow.ariaControls && overflow.controlsTargetPresent,
    "All-offline overflow entry must expose an accessible name and controlled claim list", { overflow });
  assert(overflow.ariaExpanded === "false", "All-offline overflow entry must begin collapsed", { overflow });
  assert(hiddenOverflowClaims.length > 0, "All-offline scene must retain its hidden overflow claims for expansion", {
    allClaims,
    hiddenOverflowClaims,
  });
  assert(initiallyVisibleClaims.length < allClaims.length,
    "All-offline overflow test requires claims that are initially withheld from the compact list", {
      initiallyVisibleClaims,
      allClaims,
    });

  await page.locator(OVERFLOW_CONTROL).click();
  await page.waitForFunction(
    ({ selector, expectedCount }) => {
      const toggle = document.querySelector(selector);
      const claims = [...document.querySelectorAll("[data-optical-patrol-claim-control]")]
        .filter((node) => node instanceof HTMLElement && !node.hidden && node.getClientRects().length > 0);
      return toggle?.getAttribute("aria-expanded") === "true" && claims.length === expectedCount;
    },
    { selector: OVERFLOW_CONTROL, expectedCount: allClaims.length },
    { timeout: ACTION_TIMEOUT_MS },
  );
  const expanded = await inspectRoot(page);
  assert(expanded.overflowControl?.ariaExpanded === "true", "All-offline overflow entry did not announce its expanded state", {
    overflow: expanded.overflowControl,
  });
  assert(expanded.followups.length === allClaims.length,
    "All-offline overflow expansion did not expose every remaining claim", {
      expected: allClaims.length,
      followups: expanded.followups,
    });

  const lastOverflowClaim = expanded.overflowClaimControls.at(-1);
  assert(lastOverflowClaim?.claimId, "All-offline overflow expansion omitted an activatable overflow claim", {
    overflowClaimControls: expanded.overflowClaimControls,
  });
  await page.locator(OVERFLOW_CLAIM_CONTROL).last().click();
  await waitForSelectedClaim(page, lastOverflowClaim.claimId);
  const activated = await inspectRoot(page);
  assert(activated.selectedClaim?.id === lastOverflowClaim.claimId
      && activated.historySelection?.selectedId === lastOverflowClaim.claimId,
  "All-offline overflow claim activation did not select the requested claim with matching history", {
    expectedClaimId: lastOverflowClaim.claimId,
    selectedClaim: activated.selectedClaim,
    historySelection: activated.historySelection,
  });

  return {
    initiallyVisible: initiallyVisibleClaims.length,
    totalClaims: allClaims.length,
    overflowClaims: hiddenOverflowClaims.length,
    activatedClaimId: activated.selectedClaim?.id || "",
  };
}

async function inspectInitialViewportTaskPriority(runtime) {
  const probes = [
    { scene: sceneCase("single"), viewport: viewportProfile("phone320") },
    { scene: sceneCase("single"), viewport: viewportProfile("landscape844") },
    ...["interfaces-down", "resource-full", "collection-down", "all-offline", "no-snapshot"]
      .flatMap((scene) => ([
        { scene: sceneCase(scene), viewport: viewportProfile("phone320") },
        { scene: sceneCase(scene), viewport: viewportProfile("phone375") },
      ])),
  ];
  const observations = [];
  for (const probe of probes) {
    const context = `${probe.scene.id}@${probe.viewport.width}x${probe.viewport.height}:initial-task-priority`;
    let evidence = null;
    let error = null;
    try {
      evidence = await openOverview(runtime, probe.scene, probe.viewport);
      assertViewport(evidence, context);
      assertSceneTruth(probe.scene, evidence, context);
    } catch (failure) {
      error = serialiseError(failure);
    }
    observations.push({
      context,
      pass: !error,
      error,
      capability: evidence?.capability || "",
      criticalMeasurement: evidence?.selectedCriticalMeasurement || null,
      action: evidence?.action || null,
      navigation: evidence?.navigation || null,
      scrollPosition: evidence?.scrollPosition || null,
    });
  }
  const failed = observations.filter((observation) => !observation.pass);
  assert(failed.length === 0, "Optical Patrol initial-viewport task priority probes failed", { failed });
  return observations;
}

async function main() {
  const startedAt = Date.now();
  let runtime = null;
  try {
    runtime = await startOpticalPatrolRuntime();
    const checks = [];
    const runCheck = async (name, operation) => {
      try {
        checks.push({ name, pass: true, evidence: await operation() });
      } catch (error) {
        checks.push({ name, pass: false, error: serialiseError(error) });
      }
    };

    await runCheck("initial-responsive-runtime-matrix", () => inspectMatrix(runtime));
    await runCheck("seven-scene-evidence-mode-and-current-withdrawal", () => inspectSevenSceneTruth(runtime));
    await runCheck("claim-selection-back-forward-focus", () => inspectClaimSelectionHistory(runtime));
    await runCheck("object-bound-action-route-and-return-focus", () => inspectObjectBoundAction(runtime));
    await runCheck("initial-phone-critical-measurement-and-short-landscape-action", () => inspectInitialViewportTaskPriority(runtime));
    await runCheck("all-offline-overflow-expands-every-claim-and-activates", () => inspectAllOfflineOverflow(runtime));

    const identity = gitWorktreeIdentity(REPO_ROOT);
    const browserVersion = runtime.page.context().browser()?.version() || "unknown";
    const screenshots = writeArtifacts ? screenshotManifest(checks) : [];
    const report = {
      pass: checks.every((check) => check.pass),
      contract: CONTRACT,
      source: "optical-patrol-runtime",
      commit: identity.commit,
      worktreeClean: identity.worktreeClean,
      worktreeFingerprint: identity.worktreeFingerprint,
      artifactKey: identity.artifactKey,
      releaseEvidenceEligible: false,
      generatedAt: new Date().toISOString(),
      artifacts: {
        browserVersion,
        screenshotMode: "viewport",
        screenshots,
      },
      bounded: {
        globalTimeoutMs: RUN_TIMEOUT_MS,
        actionTimeoutMs: ACTION_TIMEOUT_MS,
        lifecycle: "accessibility-v2 managed browser and scenario mock",
        artifactMode: writeArtifacts ? "report-and-originals" : "stdout-only-smoke",
        configuredMatrix: matrixDescription(matrixCells({ full: fullMatrix })),
      },
      checks,
      elapsedMs: Date.now() - startedAt,
    };
    const reportPath = writeArtifacts ? writeReport(report) : null;
    process.stdout.write(`${JSON.stringify({
      pass: report.pass,
      contract: report.contract,
      reportPath,
      matrix: report.bounded.configuredMatrix.mode,
      elapsedMs: report.elapsedMs,
      checks: checks.map(({ name, pass, error }) => ({ name, pass, error: error || null })),
    }, null, 2)}\n`);
    if (!report.pass) process.exitCode = 1;
  } finally {
    if (runtime) await closeRuntime(runtime);
  }
}

runBounded("optical patrol runtime", RUN_TIMEOUT_MS, main).catch((error) => {
  const identity = gitWorktreeIdentity(REPO_ROOT);
  const report = {
    pass: false,
    contract: CONTRACT,
    source: "optical-patrol-runtime",
    commit: identity.commit,
    worktreeClean: identity.worktreeClean,
    worktreeFingerprint: identity.worktreeFingerprint,
    artifactKey: identity.artifactKey,
    releaseEvidenceEligible: false,
    generatedAt: new Date().toISOString(),
    error: serialiseError(error),
  };
  const reportPath = writeArtifacts ? writeReport(report) : null;
  process.stderr.write(`${JSON.stringify({ pass: false, contract: CONTRACT, reportPath, error: report.error }, null, 2)}\n`);
  process.exitCode = 1;
});
