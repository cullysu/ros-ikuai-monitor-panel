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
  startIncidentLensRuntime,
  viewportProfile,
  waitForSelectedClaim,
  waitForSelectedClaimChange,
  writeReport,
} = require("./lib/incident-lens-runtime/runtime");
const { gitWorktreeIdentity } = require("./worktree-runtime-identity");

const RUN_TIMEOUT_MS = 150_000;
const args = new Set(process.argv.slice(2));
const fullMatrix = args.has("--full");
const smoke = args.has("--smoke");
const writeArtifacts = !smoke && !args.has("--no-artifacts");

// Migration assertion only: the rejected presentation must not co-render with the new owner.
const LEGACY_OWNER = "[data-optical-patrol-root]";

async function inspectIncidentSplitLensCoreContract(runtime) {
  const { page } = runtime;
  const probes = [
    { scene: sceneCase("single"), viewport: viewportProfile("phone390") },
    { scene: sceneCase("resource-full"), viewport: viewportProfile("phone320") },
    { scene: sceneCase("resource-full"), viewport: viewportProfile("phone390") },
    { scene: sceneCase("resource-full"), viewport: viewportProfile("tablet768") },
    { scene: sceneCase("resource-full"), viewport: viewportProfile("landscape844") },
  ];
  const results = [];
  for (const probe of probes) {
    const context = `${probe.scene.id}@${probe.viewport.width}x${probe.viewport.height}`;
    await openOverview(runtime, probe.scene, probe.viewport);
    const evidence = await page.evaluate((selectors) => {
      const root = document.querySelector(selectors.root);
      const rect = (node) => {
        const bounds = node?.getBoundingClientRect();
        return bounds ? { left: bounds.left, top: bounds.top, right: bounds.right, bottom: bounds.bottom, width: bounds.width, height: bounds.height } : null;
      };
      const present = (node) => node instanceof HTMLElement
        && getComputedStyle(node).display !== "none"
        && node.getBoundingClientRect().width > 0
        && node.getBoundingClientRect().height > 0;
      const controls = root ? [...root.querySelectorAll("button,a")].filter(present).map((node) => ({
        label: node.getAttribute("aria-label") || node.textContent?.trim() || "",
        rect: rect(node),
      })) : [];
      return {
        viewport: { width: innerWidth, height: innerHeight },
        surface: root?.getAttribute("data-incident-lens-surface") || "",
        legacyOwnerPresent: Boolean(document.querySelector(selectors.legacy)),
        patrol: rect(root?.querySelector(selectors.patrol)),
        incident: rect(root?.querySelector(selectors.incident)),
        risk: rect(root?.querySelector(selectors.risk)),
        impact: rect(root?.querySelector(selectors.impact)),
        evidence: rect(root?.querySelector(selectors.evidence)),
        workspace: rect(root?.querySelector(selectors.workspace)),
        inspector: rect(root?.querySelector(selectors.inspector)),
        controls,
        overflowX: Math.max(0, Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0) - innerWidth),
      };
    }, {
      root: ROOT,
      legacy: LEGACY_OWNER,
      patrol: "[data-incident-lens-patrol]",
      incident: "[data-incident-lens-incident]",
      risk: "[data-incident-lens-risk-identity]",
      impact: '[data-incident-lens-lens="impact"], [data-incident-lens-resource-geometry], [data-incident-lens-dependency-chain], [data-incident-lens-recovery-sequence], [data-incident-lens-known-unknown]',
      evidence: '[data-incident-lens-lens="evidence"], [data-incident-lens-proof], [data-incident-lens-recovery-sequence], [data-incident-lens-known-unknown]',
      workspace: "[data-incident-lens-object-worklist]",
      inspector: "[data-incident-lens-evidence-deck]",
    });
    assert(!evidence.legacyOwnerPresent, "Rejected mobile owner remains mounted", { context });
    assert(evidence.overflowX <= 1, "Incident Split Lens has horizontal viewport overflow", { context, evidence });
    const undersized = evidence.controls.filter((control) => !control.label || !control.rect || control.rect.width < 44 || control.rect.height < 44);
    assert(undersized.length === 0, "Incident Split Lens control violates the 44px contract", { context, undersized });
    if (probe.scene.id === "single") {
      assert(evidence.surface === "patrol" && evidence.patrol && !evidence.incident,
        "Normal scene must use Patrol Lens rather than incident presentation", { context, evidence });
    } else {
      assert(evidence.surface === "incident" && evidence.incident,
        "Risk scene must use Incident Split Lens", { context, evidence });
      if ([320, 390].includes(probe.viewport.width)) {
        assert(evidence.risk && evidence.impact && evidence.evidence,
          "Phone incident first screen needs risk, impact, and evidence anchors", { context, evidence });
        assert(evidence.risk.top >= 0 && evidence.risk.top < evidence.viewport.height
          && evidence.impact.top >= 0 && evidence.impact.top < evidence.viewport.height
          && evidence.evidence.top >= 0 && evidence.evidence.top < evidence.viewport.height,
        "Phone incident anchors must begin in the initial viewport", { context, evidence });
        assert(evidence.risk.top <= evidence.impact.top && evidence.risk.top <= evidence.evidence.top,
          "Phone incident must lead with risk before its scene-specific evidence", { context, evidence });
      }
      if (probe.viewport.id === "tablet768" || probe.viewport.id === "landscape844") {
        assert(evidence.workspace && evidence.inspector,
          "768/844 requires populated workspace and inspector", { context, evidence });
        const overlap = Math.max(0, Math.min(evidence.workspace.right, evidence.inspector.right)
          - Math.max(evidence.workspace.left, evidence.inspector.left));
        assert(Math.min(evidence.workspace.width, evidence.inspector.width) > 160
          && overlap / Math.min(evidence.workspace.width, evidence.inspector.width) < 0.35,
        "768/844 must not create an empty or overlapping work column", { context, evidence, overlap });
      }
    }
    results.push({ context, pass: true });
  }
  await openOverview(runtime, sceneCase("resource-full"), viewportProfile("phone390"));
  const scale = await page.evaluate(() => {
    const original = document.documentElement.style.fontSize;
    document.documentElement.style.fontSize = "200%";
    const overflowX = Math.max(0, Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0) - innerWidth);
    document.documentElement.style.fontSize = original;
    return { overflowX };
  });
  assert(scale.overflowX <= 1, "200% text scale introduced horizontal overflow", { scale });
  return { probes: results, renderedTextScale: "200%", scale };
}

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
  assert(undersized.length === 0, "Incident Split Lens exposed a visible target below 44px", {
    context,
    undersized,
  });
  const unlabeled = evidence.controls.filter((control) => !control.label);
  assert(unlabeled.length === 0, "Incident Split Lens exposed an unlabeled interactive control", {
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
  assert(bounds && visibleBounds, `Incident Split Lens ${label} is absent from the initial visible viewport`, {
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
    `Incident Split Lens ${label} is clipped in the initial visible viewport`,
    { context, bounds, visibleBounds },
  );
}

function assertInitialScrollPosition(evidence, context) {
  const position = evidence.scrollPosition || {};
  assert((position.windowY || 0) <= 1 && (position.rootY || 0) <= 1,
    "Incident Split Lens did not begin the task in its initial scroll position", {
      context,
      scrollPosition: position,
    });
}

function assertSmallPhoneCriticalMeasurement(evidence, context) {
  if (evidence.viewport.width !== 320 || evidence.viewport.height !== 568 || evidence.scenario !== "single") return;
  assertInitialScrollPosition(evidence, context);
  const measurement = evidence.selectedCriticalMeasurement;
  assert(measurement, "320px normal Incident Split Lens must expose the selected route critical measurement", {
    context,
    selectedClaim: evidence.selectedClaim,
  });
  assertFullyVisibleInInitialViewport(measurement?.rect, measurement?.visibleRect, context, "selected route critical measurement");
  assert(!rectanglesIntersect(measurement?.rect, evidence.navigation?.rect),
    "320px normal Incident Split Lens lets fixed navigation obscure the selected route critical measurement", {
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
    "320px Incident Split Lens primary object action is smaller than the 44px touch target", {
      context,
      action: evidence.action,
    });
  assert(!rectanglesIntersect(evidence.action?.rect, evidence.navigation?.rect),
    "320px Incident Split Lens lets fixed navigation obscure the primary object action", {
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
  assert(evidence.capability === "short-landscape", "Short-landscape Incident Split Lens must use the short-landscape phone capability", {
    context,
    capability: evidence.capability,
    viewport: evidence.viewport,
  });
  assertInitialScrollPosition(evidence, context);
  assert(evidence.action?.rect, "Short-landscape Incident Split Lens must retain a selected object action", { context, action: evidence.action });
  assertFullyVisibleInInitialViewport(
    evidence.action?.rect,
    evidence.action?.visibleRect,
    context,
    "short-landscape primary object action",
  );
  assert(evidence.selectedDecisiveGeometry?.rect,
    "Short-landscape Incident Split Lens must expose decisive evidence before its selected object action", {
      context,
      selectedClaim: evidence.selectedClaim,
    });
  const followsVertically = evidence.action.rect.top >= evidence.selectedDecisiveGeometry.rect.bottom - 1;
  const followsBeside = evidence.selectedDecisiveGeometry.rect.right <= evidence.action.rect.left + 1;
  assert(
    followsVertically || followsBeside,
    "Short-landscape Incident Split Lens presents the selected object action before or over decisive evidence", {
      context,
      action: evidence.action,
      decisiveGeometry: evidence.selectedDecisiveGeometry,
    },
  );
  assert(!rectanglesIntersect(evidence.action?.rect, evidence.navigation?.rect),
    "Short-landscape Incident Split Lens lets fixed navigation obscure the selected object action", {
      context,
      action: evidence.action,
      navigation: evidence.navigation,
    });
  if (evidence.scenario === "all-offline") {
    assert(evidence.recoveryItems?.length === 3,
      "Short-landscape all-offline scene must expose all three recovery decisions", {
        context,
        recoveryItems: evidence.recoveryItems,
      });
    for (const [index, item] of evidence.recoveryItems.entries()) {
      assertFullyVisibleInInitialViewport(item.rect, item.visibleRect, context, `all-offline recovery decision ${index + 1}`);
    }
  }
  if (evidence.scenario === "single") {
    assert((evidence.tabletEvidenceDeck?.rows || []).length >= 3,
      "Short-landscape patrol must use its detail plane for three selected-object evidence facts", {
        context,
        rows: evidence.tabletEvidenceDeck?.rows,
      });
  }
}

function assertPhoneNavigationClearance(evidence, context) {
  if (evidence.viewport.width >= 768 || !evidence.navigation?.rect) return;
  const navigation = evidence.navigation.rect;
  const conflicts = [["selected-action", evidence.action?.visibleRect]]
    .filter(([, bounds]) => rectanglesIntersect(bounds, navigation));
  assert(conflicts.length === 0, "Initial Incident Split Lens task content intersects the fixed navigation material", {
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
  assert(broken.length === 0, "Incident Split Lens broke a semantic CJK phrase across title lines", {
    context,
    lines,
    broken,
  });
}

function assertTabletNovelEvidence(evidence, context) {
  const rows = evidence.tabletEvidenceDeck?.rows || [];
  assert(rows.length >= 4, "Tablet evidence workspace must expose at least four impact/evidence rows", { context, rows });
  const labels = rows.map((row) => row.label).filter(Boolean);
  assert(new Set(labels).size >= 4, "Tablet evidence workspace must not fill its second column with repeated labels", { context, rows });
  if (evidence.scenario !== "single" && evidence.scenario !== "fleet") {
    assert(evidence.tabletRelationRows?.length === 3,
      "Tablet incident support workspace must expose three recovery or decision-boundary records", {
        context,
        tabletRelationRows: evidence.tabletRelationRows,
      });
    const implementationPath = /(?:meta\.|overview\.history|defaultRoutes\[|interfaces\[)/;
    assert(!evidence.tabletRelationRows.some((row) => implementationPath.test(row.text)),
      "Tablet incident support workspace must not expose implementation paths as operator evidence", {
        context,
        tabletRelationRows: evidence.tabletRelationRows,
      });
  }
}

function assertViewport(evidence, context) {
  assert(evidence.rootPresent, "Incident Split Lens root was not rendered", { context, evidence });
  assert(evidence.runtimeManaged === "true", "Runtime overview must use managed Incident Split Lens chrome", {
    context,
    runtimeManaged: evidence.runtimeManaged,
  });
  assert(evidence.overflowX <= 1, "Incident Split Lens introduced horizontal viewport overflow", {
    context,
    overflowX: evidence.overflowX,
    viewport: evidence.viewport,
    rootRect: evidence.rootRect,
  });
  assert(evidence.evidenceBoundary?.visible, "Incident Split Lens evidence boundary must remain visible", {
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
  if (evidence.viewport.width === 320) {
    assert(evidence.runtimeDeviceName?.lines?.length === 1 && !evidence.runtimeDeviceName?.clipped, "320px runtime brand must remain one complete stable scan line", {
      context,
      runtimeDeviceName: evidence.runtimeDeviceName,
    });
  }
  if (evidence.capability === "short-landscape") {
    const wrappedFollowups = (evidence.followupTitleLines || []).filter((entry) => entry.lines.length > 1);
    assert(wrappedFollowups.length === 0, "Short-landscape follow-up labels must remain single-line scan targets", {
      context,
      wrappedFollowups,
    });
  }
}

function assertSceneTruth(descriptor, evidence, context) {
  assert(evidence.scenario === descriptor.id, "Rendered Incident Split Lens scenario did not match its mock contract", {
    context,
    expected: descriptor.id,
    actual: evidence.scenario,
  });
  assert(evidence.scene === descriptor.expectedScene, "Rendered Incident Split Lens scene did not match its scene contract", {
    context,
    expected: descriptor.expectedScene,
    actual: evidence.scene,
    risk: evidence.risk,
  });
  assert(evidence.selectedClaim, "Incident Split Lens must expose a selected claim", { context, evidence });
  assert(evidence.selectedClaim.kind === descriptor.expectedKind, "The scene did not select its evidence-leading claim kind", {
    context,
    expected: descriptor.expectedKind,
    selectedClaim: evidence.selectedClaim,
  });
  if (descriptor.id !== "single" && descriptor.id !== "fleet") {
    assert(evidence.routeTitle?.lines?.[0] === "事故检查" && evidence.routeTitle?.text.startsWith("事故检查"), "Incident scenes must render the complete investigation title prefix", {
      context,
      routeTitle: evidence.routeTitle,
    });
  }
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
    if (evidence.viewport.width < 600) {
      assert(evidence.scopeFacts.length === 0 && /WAN 范围\s+\d+.*运行记录\s+\d+.*待确认\s+\d+/.test(evidence.fleetSummary || ""),
        "Phone fleet must compress scale into one visible summary so all four patrol objects remain in the first viewport", {
          context,
          scopeFacts: evidence.scopeFacts,
          fleetSummary: evidence.fleetSummary,
        });
    } else {
      assert(evidence.scopeFacts.length === 3, "Wide fleet must expose WAN scope facts in its comparison workspace", {
        context,
        scopeFacts: evidence.scopeFacts,
      });
      assert(evidence.scopeFacts.map((fact) => fact.label).join("|") === "WAN 范围|运行记录|待确认",
        "Fleet scope facts must preserve the operational comparison order", {
          context,
          scopeFacts: evidence.scopeFacts,
        });
    }
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
      if (observation.selectedIdentity) {
        assert(observation.selectedIdentity?.categoryLines?.length > 0
          && observation.selectedIdentity.categoryLines.length <= 2
          && observation.selectedIdentity?.titleLines?.length > 0
          && observation.selectedIdentity.titleLines.length <= 2,
        "Incident identity must remain horizontally scannable rather than stacking one glyph per line", {
          context,
          selectedIdentity: observation.selectedIdentity,
        });
      }
      if (cell.viewport.id === "tablet768") {
        assert(observation.tabletEvidenceDeck?.visible, "Tablet Incident Split Lens must expose its evidence deck", {
          context,
          tabletEvidenceDeck: observation.tabletEvidenceDeck,
        });
        assertTabletNovelEvidence(observation, context);
        if (cell.scene.id === "single" || cell.scene.id === "fleet") {
          assert(observation.tabletCrosscheckRows?.length >= 4, "Tablet patrol workspace must expose four novel cross-object checks below the list/detail pair", {
            context,
            tabletCrosscheckRows: observation.tabletCrosscheckRows,
          });
        } else {
          assert(observation.allFollowups?.length >= 2, "Tablet incident master list must retain at least two adjacent objects beside the selected evidence", {
            context,
            allFollowups: observation.allFollowups,
          });
          assert(new Set(observation.allFollowups.map((row) => row.label)).size === observation.allFollowups.length,
            "Tablet incident master list must not repeat adjacent-object labels", {
            context,
            allFollowups: observation.allFollowups,
          });
        }
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
  assert(evidence.length === cells.length, "Incident Split Lens runtime matrix did not complete every configured cell", {
    expected: cells.length,
    actual: evidence.length,
  });
  const failed = evidence.filter((cell) => !cell.pass);
  assert(failed.length === 0, "Incident Split Lens runtime matrix contained failing cells", {
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
  assert(failed.length === 0, "One or more Incident Split Lens scenes violated runtime truth", { failed });
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
  assert(outlined || shadowed, "Focused Incident Split Lens claim lacks a visible focus indicator", {
    context,
    focus,
  });
}

async function inspectClaimSelectionHistory(runtime) {
  const { page } = runtime;
  const before = await openOverview(runtime, sceneCase("single"), DEFAULT_VIEWPORT);
  assert(before.followups.length > 0, "Single scene requires a follow-up claim for selection history", { before });
  const initialId = before.selectedClaim.id;
  await page.locator(`${CLAIM_CONTROL}[aria-pressed="false"]:visible`).first().focus();
  await page.keyboard.press("Enter");
  const selectedId = await waitForSelectedClaimChange(page, initialId);
  const selected = await inspectRoot(page);
  assert(selected.selectedClaim.id === selectedId, "Claim selection did not update the expanded claim", {
    initialId,
    selectedId,
    selected: selected.selectedClaim,
  });
  if (selected.navigation?.rect && selected.selectedClaim?.visibleRect) {
    assert(!rectanglesIntersect(selected.navigation.rect, selected.selectedClaim.visibleRect),
      "Focused selected claim must remain clear of fixed navigation", {
        navigation: selected.navigation.rect,
        selectedClaim: selected.selectedClaim,
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
  assert(before.action.actionTarget && before.action.actionTarget === destination.objectId,
    "Object action destination does not match the selected claim's explicit domain target", {
    selectedId,
    action: before.action,
    destination,
  });
  assert(before.action.actionRoute === destination.section,
    "Object action destination does not match the selected claim's explicit domain route", {
      selectedId,
      action: before.action,
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

async function inspectAllOfflineSecondaryObjects(runtime) {
  const { page } = runtime;
  const viewport = viewportProfile("phone390");
  const before = await openOverview(runtime, sceneCase("all-offline"), viewport);
  const allClaims = before.allFollowups;
  assert(allClaims.length >= 2, "All-offline Incident Split Lens must retain the two bounded affected-object checks", { viewport, allClaims });
  const lastClaim = allClaims.at(-1);
  assert(lastClaim?.claimId && lastClaim.tag === "button" && !lastClaim.disabled,
    "All-offline secondary evidence must remain an enabled native object control", { lastClaim, allClaims });
  await page.locator(CLAIM_CONTROL).last().scrollIntoViewIfNeeded();
  await page.locator(CLAIM_CONTROL).last().click();
  await waitForSelectedClaim(page, lastClaim.claimId);
  const activated = await inspectRoot(page);
  assert(activated.selectedClaim?.id === lastClaim.claimId
      && activated.historySelection?.selectedId === lastClaim.claimId,
  "All-offline secondary object activation did not select the requested evidence with matching history", {
    expectedClaimId: lastClaim.claimId,
    selectedClaim: activated.selectedClaim,
    historySelection: activated.historySelection,
  });

  return {
    totalClaims: allClaims.length,
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
  assert(failed.length === 0, "Incident Split Lens initial-viewport task priority probes failed", { failed });
  return observations;
}

async function main() {
  const startedAt = Date.now();
  let runtime = null;
  try {
    runtime = await startIncidentLensRuntime();
    const checks = [];
    const runCheck = async (name, operation) => {
      try {
        checks.push({ name, pass: true, evidence: await operation() });
      } catch (error) {
        checks.push({ name, pass: false, error: serialiseError(error) });
      }
    };

    await runCheck("initial-responsive-runtime-matrix", () => inspectMatrix(runtime));
    await runCheck("incident-risk-impact-evidence-patrol-tablet-200pct-contract", () => inspectIncidentSplitLensCoreContract(runtime));
    await runCheck("seven-scene-evidence-mode-and-current-withdrawal", () => inspectSevenSceneTruth(runtime));
    await runCheck("claim-selection-back-forward-focus", () => inspectClaimSelectionHistory(runtime));
    await runCheck("object-bound-action-route-and-return-focus", () => inspectObjectBoundAction(runtime));
    await runCheck("initial-phone-critical-measurement-and-short-landscape-action", () => inspectInitialViewportTaskPriority(runtime));
    await runCheck("all-offline-secondary-objects-remain-reachable-and-activatable", () => inspectAllOfflineSecondaryObjects(runtime));

    const identity = gitWorktreeIdentity(REPO_ROOT);
    const browserVersion = runtime.page.context().browser()?.version() || "unknown";
    const screenshots = writeArtifacts ? screenshotManifest(checks) : [];
    const report = {
      pass: checks.every((check) => check.pass),
      contract: CONTRACT,
      source: "incident-lens-runtime",
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

runBounded("incident split lens runtime", RUN_TIMEOUT_MS, main).catch((error) => {
  const identity = gitWorktreeIdentity(REPO_ROOT);
  const report = {
    pass: false,
    contract: CONTRACT,
    source: "incident-lens-runtime",
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
