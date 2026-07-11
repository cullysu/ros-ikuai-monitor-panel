const fs = require("fs");
const path = require("path");

function read(rel) {
  return fs.readFileSync(path.join(process.cwd(), rel), "utf8");
}

function readIfExists(rel) {
  const file = path.join(process.cwd(), rel);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

const failures = [];
function assert(condition, message) {
  if (!condition) failures.push(message);
}

function includesAll(haystack, tokens, label) {
  for (const token of tokens) {
    assert(haystack.includes(token), `${label} missing token: ${token}`);
  }
}

function includesAny(haystack, tokens, label) {
  assert(tokens.some((token) => haystack.includes(token)), `${label} missing one of: ${tokens.join(" | ")}`);
}

function hasAny(haystack, tokens) {
  return tokens.some((token) => haystack.includes(token));
}

function tokenGroupHas(haystack, group) {
  return group.tokens.some((token) => haystack.includes(token));
}

function includesTokenGroups(haystack, groups, label) {
  for (const group of groups) {
    assert(
      tokenGroupHas(haystack, group),
      `${label} missing ${group.label}: ${group.tokens.join(" | ")}`,
    );
  }
}

function assertSourceArtifactCurrentTokens(source, artifact, tokens, label) {
  for (const token of tokens) {
    if (source.includes(token)) {
      assert(artifact.includes(token), `${label} stale artifact missing current source token: ${token}`);
    }
  }
}

function assertTokenPresenceParity(source, artifact, tokens, label) {
  for (const token of tokens) {
    const sourceHasToken = source.includes(token);
    const artifactHasToken = artifact.includes(token);
    assert(
      sourceHasToken === artifactHasToken,
      `${label} token parity mismatch for ${token}: source=${sourceHasToken} artifact=${artifactHasToken}`,
    );
  }
}

function excludesAll(haystack, tokens, label) {
  for (const token of tokens) {
    assert(!haystack.includes(token), `${label} still contains forbidden token: ${token}`);
  }
}

function excludesPatterns(haystack, patterns, label) {
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    assert(!pattern.test(haystack), `${label} matched forbidden pattern: ${pattern}`);
  }
}

function excludesUnguardedPatterns(haystack, patterns, allowedPatterns, label) {
  for (const pattern of patterns) {
    const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
    const globalPattern = new RegExp(pattern.source, flags);
    for (const match of haystack.matchAll(globalPattern)) {
      const index = match.index || 0;
      const context = haystack.slice(Math.max(0, index - 96), Math.min(haystack.length, index + match[0].length + 96));
      const isAllowedGuard = allowedPatterns.some((allowedPattern) => {
        allowedPattern.lastIndex = 0;
        return allowedPattern.test(context);
      });
      if (!isAllowedGuard) failures.push(`${label} matched unguarded forbidden pattern: ${pattern}`);
    }
  }
}

function countOccurrences(haystack, token) {
  let count = 0;
  let index = haystack.indexOf(token);
  while (index >= 0) {
    count += 1;
    index = haystack.indexOf(token, index + token.length);
  }
  return count;
}

function countPatternMatches(haystack, pattern) {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  const globalPattern = new RegExp(pattern.source, flags);
  return [...haystack.matchAll(globalPattern)].length;
}

function extractCssTemplateExports(source, label) {
  const exports = [];
  const exportPattern = /export\s+const\s+([A-Z0-9_]+)\s*=\s*`/g;
  let match;
  while ((match = exportPattern.exec(source))) {
    const name = match[1];
    let index = exportPattern.lastIndex;
    let escaped = false;
    for (; index < source.length; index += 1) {
      const char = source[index];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === "`") break;
    }
    assert(index < source.length, `${label} ${name} CSS template literal is not closed`);
    exports.push({ name, css: source.slice(exportPattern.lastIndex, index) });
    exportPattern.lastIndex = index + 1;
  }
  return exports;
}

function validateCssPrelude(prelude, label) {
  let quote = "";
  let escaped = false;
  let squareDepth = 0;
  let parenDepth = 0;
  for (const char of prelude) {
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === "\"" || char === "'") {
      quote = char;
      continue;
    }
    if (char === "[") squareDepth += 1;
    if (char === "]") squareDepth -= 1;
    if (char === "(") parenDepth += 1;
    if (char === ")") parenDepth -= 1;
    assert(squareDepth >= 0, `${label} CSS selector has an unmatched ] near: ${prelude.slice(0, 160)}`);
    assert(parenDepth >= 0, `${label} CSS prelude has an unmatched ) near: ${prelude.slice(0, 160)}`);
  }
  assert(!quote, `${label} CSS prelude has an unclosed quote near: ${prelude.slice(0, 200)}`);
  assert(squareDepth === 0, `${label} CSS selector has an unclosed [ near: ${prelude.slice(0, 200)}`);
  assert(parenDepth === 0, `${label} CSS prelude has an unclosed ( near: ${prelude.slice(0, 200)}`);
}

function assertParseableCssTemplates(source, expectedExports, label) {
  const cssExports = extractCssTemplateExports(source, label);
  const foundExports = cssExports.map((item) => item.name);
  for (const expectedExport of expectedExports) {
    assert(foundExports.includes(expectedExport), `${label} missing CSS export: ${expectedExport}`);
  }
  for (const { name, css } of cssExports) {
    let quote = "";
    let escaped = false;
    let blockComment = false;
    let depth = 0;
    let segmentStart = 0;
    let ruleCount = 0;
    for (let index = 0; index < css.length; index += 1) {
      const char = css[index];
      const next = css[index + 1] || "";
      if (blockComment) {
        if (char === "*" && next === "/") {
          blockComment = false;
          index += 1;
        }
        continue;
      }
      if (quote) {
        if (escaped) escaped = false;
        else if (char === "\\") escaped = true;
        else if (char === quote) quote = "";
        continue;
      }
      if (char === "/" && next === "*") {
        blockComment = true;
        index += 1;
        continue;
      }
      if (char === "\"" || char === "'") {
        quote = char;
        continue;
      }
      if (char === "{") {
        const prelude = css.slice(segmentStart, index).trim();
        assert(prelude.length > 0, `${label} ${name} has an empty CSS prelude before rule ${ruleCount + 1}`);
        validateCssPrelude(prelude, `${label} ${name}`);
        depth += 1;
        ruleCount += 1;
        segmentStart = index + 1;
      } else if (char === "}") {
        depth -= 1;
        assert(depth >= 0, `${label} ${name} has an unmatched } near index ${index}`);
        segmentStart = index + 1;
      }
    }
    assert(!blockComment, `${label} ${name} has an unclosed CSS comment`);
    assert(!quote, `${label} ${name} has an unclosed CSS string`);
    assert(depth === 0, `${label} ${name} has unbalanced CSS braces`);
    assert(ruleCount > 0, `${label} ${name} did not expose any parseable CSS rules`);
  }
}

function assertPatternCountAtMost(haystack, pattern, max, label) {
  const count = countPatternMatches(haystack, pattern);
  assert(count <= max, `${label} matched ${count} times, expected at most ${max}: ${pattern}`);
}

function cssRules(haystack) {
  return haystack
    .split("}")
    .map((part) => `${part}}`)
    .filter((part) => part.includes("{"));
}

function isHiddenCssRule(rule) {
  return /display\s*:\s*none\b/i.test(rule)
    || /visibility\s*:\s*hidden\b/i.test(rule)
    || (/height\s*:\s*0\b/i.test(rule) && /overflow\s*:\s*hidden\b/i.test(rule))
    || (/width\s*:\s*0\b/i.test(rule) && /height\s*:\s*0\b/i.test(rule));
}

function visibleCssMatches(haystack, patterns) {
  const rules = cssRules(haystack);
  const matches = [];
  for (const rule of rules) {
    if (isHiddenCssRule(rule)) continue;
    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      if (pattern.test(rule)) matches.push({ pattern, rule });
    }
  }
  return matches;
}

function excludesVisibleCssPatterns(haystack, patterns, label) {
  const matches = visibleCssMatches(haystack, patterns);
  for (const match of matches) {
    failures.push(`${label} matched visible forbidden CSS pattern: ${match.pattern}`);
  }
}

function assertVisibleCssPatternCountAtMost(haystack, patterns, max, label) {
  const matches = visibleCssMatches(haystack, patterns);
  assert(matches.length <= max, `${label} matched ${matches.length} visible CSS rules, expected at most ${max}`);
}

function ruleMatchesAll(rule, patterns) {
  return patterns.every((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(rule);
  });
}

function assertHiddenCssRule(haystack, patterns, label) {
  const matches = cssRules(haystack).filter((rule) => isHiddenCssRule(rule) && ruleMatchesAll(rule, patterns));
  assert(matches.length > 0, `${label} missing hidden CSS rule matching: ${patterns.map((pattern) => pattern.toString()).join(" && ")}`);
}

function firstIndexOfAny(haystack, tokens, fromIndex = 0) {
  const indexes = tokens
    .map((token) => haystack.indexOf(token, fromIndex))
    .filter((index) => index >= 0);
  return indexes.length ? Math.min(...indexes) : -1;
}

function assertBefore(haystack, first, second, label) {
  const firstIndex = haystack.indexOf(first);
  const secondIndex = haystack.indexOf(second);
  assert(firstIndex >= 0, `${label} missing first token: ${first}`);
  assert(secondIndex >= 0, `${label} missing second token: ${second}`);
  assert(firstIndex >= 0 && secondIndex >= 0 && firstIndex < secondIndex, `${label} expected ${first} before ${second}`);
}

function activeRuntimeSlice(runtime, version) {
  const versionAttr = `"data-overview-mobile-home-version": "${version}"`;
  const minifiedVersionAttr = `"data-overview-mobile-home-version":"${version}"`;
  const rootClass = `ik-${version}-app`;
  const versionNumber = version.slice(1);
  const functionAnchor = `function V${versionNumber}StatusText`;
  const mobileHomeAnchor = "function MobileOverviewHome";
  const rootTokens = [versionAttr, minifiedVersionAttr, rootClass, `ik-${version}-home-stack`, `ik-${version}-first-screen`];
  const rootAnchorPairs = rootTokens
    .map((token) => ({ token, index: runtime.indexOf(token) }))
    .filter((pair) => pair.index >= 0);
  const anchors = [...rootTokens, functionAnchor, mobileHomeAnchor]
    .map((token) => runtime.indexOf(token))
    .filter((index) => index >= 0);
  if (!anchors.length) return runtime;
  const rootAnchor = rootAnchorPairs.length ? Math.min(...rootAnchorPairs.map((pair) => pair.index)) : Math.min(...anchors);
  const rootEnd = rootAnchorPairs.length
    ? Math.max(...rootAnchorPairs.map((pair) => pair.index + pair.token.length))
    : rootAnchor + 1;
  const versionFunction = new RegExp(`function\\s+V${versionNumber}\\w*`, "g");
  const versionFunctionIndexes = [...runtime.matchAll(versionFunction)]
    .map((match) => match.index)
    .filter((index) => index <= rootAnchor + 50000);
  const start = versionFunctionIndexes.length
    ? Math.min(...versionFunctionIndexes)
    : Math.max(0, runtime.lastIndexOf("function ", rootAnchor));
  const endCandidates = [
    firstIndexOfAny(runtime, [
      "\nconst ROUTE_UNKNOWN",
      "\n  const ROUTE_UNKNOWN",
      "\nfunction DesktopWorkspace",
      "\n  function DesktopWorkspace",
      "\nfunction OverviewPanel",
      "\n  function OverviewPanel",
    ], rootAnchor),
    runtime.indexOf(`data-overview-mobile-home-version": "v`, rootEnd),
    runtime.indexOf(`data-overview-mobile-home-version":"v`, rootEnd),
  ].filter((index) => index > rootAnchor);
  const end = endCandidates.length ? Math.min(...endCandidates) : Math.min(runtime.length, rootAnchor + 140000);
  return runtime.slice(start, end);
}

function functionBlock(source, name) {
  const exactFunction = new RegExp(`(?:^|\\n)\\s*(?:export\\s+)?function\\s+${name}\\s*\\(`);
  const match = source.match(exactFunction);
  const start = match && typeof match.index === "number"
    ? match.index + match[0].indexOf("function")
    : -1;
  if (start < 0) return "";
  const argsOpen = source.indexOf("(", start);
  let argsClose = -1;
  if (argsOpen >= 0) {
    let depth = 0;
    let quote = "";
    let escaped = false;
    for (let index = argsOpen; index < source.length; index += 1) {
      const char = source[index];
      if (quote) {
        if (escaped) {
          escaped = false;
        } else if (char === "\\") {
          escaped = true;
        } else if (char === quote) {
          quote = "";
        }
        continue;
      }
      if (char === "\"" || char === "'" || char === "`") {
        quote = char;
        continue;
      }
      if (char === "(") depth += 1;
      if (char === ")") {
        depth -= 1;
        if (depth === 0) {
          argsClose = index;
          break;
        }
      }
    }
  }
  const firstOpen = source.indexOf("{", argsClose >= 0 ? argsClose : start);
  let open = firstOpen;
  for (let candidate = firstOpen; candidate >= 0; candidate = source.indexOf("{", candidate + 1)) {
    const after = source.slice(candidate + 1, candidate + 32);
    if (/^\s*(?:\r?\n|return\b|if\b|const\b|let\b|var\b|switch\b)/.test(after)) {
      open = candidate;
      break;
    }
  }
  if (open < 0) return source.slice(start);
  let depth = 0;
  let quote = "";
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = open; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1] || "";
    if (lineComment) {
      if (char === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = "";
      }
      continue;
    }
    if (char === "/" && next === "/") {
      lineComment = true;
      index += 1;
      continue;
    }
    if (char === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }
    if (char === "\"" || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  return source.slice(start);
}

function constAssignmentBlock(source, name) {
  const start = source.indexOf(`const ${name} =`);
  if (start < 0) return "";
  const nextFunction = source.indexOf("\nfunction ", start + 1);
  const end = nextFunction >= 0 ? nextFunction : source.length;
  return source.slice(start, end);
}

function branchBlock(source, startToken, endTokens) {
  const start = source.indexOf(startToken);
  assert(start >= 0, `missing branch token: ${startToken}`);
  if (start < 0) return "";
  const end = firstIndexOfAny(source, endTokens, start + startToken.length);
  return source.slice(start, end >= 0 ? end : source.length);
}

function optionalBranchBlock(source, startToken, endTokens) {
  const start = source.indexOf(startToken);
  if (start < 0) return "";
  const end = firstIndexOfAny(source, endTokens, start + startToken.length);
  return source.slice(start, end >= 0 ? end : source.length);
}

function sourceSliceBetween(source, startToken, endToken) {
  const start = source.indexOf(startToken);
  if (start < 0) return "";
  const end = source.indexOf(endToken, start + startToken.length);
  return source.slice(start, end >= 0 ? end : source.length);
}

function currentV220MobileSurface(runtime) {
  return [
    functionBlock(runtime, "MobileOverviewHome"),
    functionBlock(runtime, "V220TopNav"),
    functionBlock(runtime, "V220Hero"),
    functionBlock(runtime, "V220ScenarioVisual"),
    functionBlock(runtime, "V220NoSnapshotLine"),
    functionBlock(runtime, "V220CollectionLine"),
    functionBlock(runtime, "V220ResourcePressureVisual"),
    functionBlock(runtime, "V220TrafficLine"),
    functionBlock(runtime, "V220PortGrid"),
    functionBlock(runtime, "V220RelationMini"),
    functionBlock(runtime, "V220ResourceStrip"),
    functionBlock(runtime, "V220InsightSection"),
    functionBlock(runtime, "V220TopList"),
    functionBlock(runtime, "V220Tabs"),
    functionBlock(runtime, "V220PrimaryReadout"),
    functionBlock(runtime, "V220ResourceLabel"),
    functionBlock(runtime, "V220FailedEndpoint"),
    functionBlock(runtime, "V220VisualKind"),
  ].join("\n");
}

const v220AppHomeDataAttrs = [
  "data-overview-mobile-v220-app-home",
  "data-overview-mobile-v220-home",
  "data-overview-mobile-home-version=\"v220\"",
  '"data-overview-mobile-home-version": "v220"',
  '"data-overview-mobile-home-version":"v220"',
  "data-overview-mobile-v220=\"ikuai40-ios-router-app-home",
  '"data-overview-mobile-v220": "ikuai40-ios-router-app-home',
  '"data-overview-mobile-v220":"ikuai40-ios-router-app-home',
];
const v220FirstScreenDataAttrs = [
  "data-overview-mobile-v220-first-screen",
  "data-overview-mobile-v220-first-screen-contract",
  "data-overview-mobile-v220-frame-model",
  "data-overview-mobile-first-screen-version=\"v220\"",
  '"data-overview-mobile-first-screen-version": "v220"',
  '"data-overview-mobile-first-screen-version":"v220"',
];
const v220HeroDataAttrs = [
  "data-overview-mobile-v220-hero",
  "data-overview-mobile-v220-main-card",
  "data-overview-mobile-v220-primary-card",
  "data-overview-mobile-v220-readout",
  "data-overview-mobile-hero-version=\"v220\"",
  '"data-overview-mobile-hero-version": "v220"',
  '"data-overview-mobile-hero-version":"v220"',
];
const v220VisualDataAttrs = [
  "data-overview-mobile-v220-hero-visual",
  "data-overview-mobile-v220-visual",
  "data-overview-mobile-v220-chart",
  "data-overview-mobile-v220-port-matrix",
  "data-overview-mobile-v220-channel-line",
  "data-overview-mobile-v220-resource",
  "data-overview-mobile-visual-version=\"v220\"",
  '"data-overview-mobile-visual-version": "v220"',
  '"data-overview-mobile-visual-version":"v220"',
];
const noFourGridDataAttrs = [
  "data-overview-mobile-v220-no-four-grid",
  "data-overview-mobile-v214-no-four-grid",
  "data-overview-mobile-v216-no-four-grid",
  "data-overview-mobile-no-kpi-card-grid",
  "data-overview-mobile-first-screen-no-four-grid",
];

function assertV220MobileDataContract(haystack, label) {
  includesAny(haystack, v220AppHomeDataAttrs, `${label} v220 app-home data attribute`);
  includesAny(haystack, v220FirstScreenDataAttrs, `${label} v220 first-screen data attribute`);
  includesAny(haystack, v220HeroDataAttrs, `${label} v220 hero data attribute`);
  includesAny(haystack, v220VisualDataAttrs, `${label} v220 primary visual data attribute`);
}

function assertNoFourGridContract(haystack, label) {
  const legacyFourGridCount = countPatternMatches(haystack, /\b(?:four-light-cards|decision-strip-object-impact-trust-success|kpi-cards-app-list|four-equal-kpi|four-kpi-grid|four-card-kpi|app-kpi-grid|kpi-grid-4)\b/gi);
  assert(
    hasAny(haystack, noFourGridDataAttrs) || legacyFourGridCount <= 0,
    `${label} missing no-four-grid data attribute and still exposes ${legacyFourGridCount} legacy four-KPI markers`,
  );
  assert(legacyFourGridCount <= 1, `${label} exposes ${legacyFourGridCount} legacy four-KPI markers, expected at most 1`);
}

const mobile = read("src/panel-framework/overview/components/MobileOverviewHome.tsx");
const mobileDecision = read("src/panel-framework/overview/components/MobileOverviewDecision.tsx");
const mobileHomeSections = read("src/panel-framework/overview/components/MobileOverviewHomeSections.tsx");
const mobileSections = read("src/panel-framework/overview/components/MobileOverviewSections.tsx");
const mobileStatusHeader = read("src/panel-framework/overview/components/StatusHeader.tsx");
const mobileTrustStrip = read("src/panel-framework/overview/components/TrustStrip.tsx");
const mobileJudgementStrip = read("src/panel-framework/overview/components/JudgementStrip.tsx");
const mobileCoreMetricRail = read("src/panel-framework/overview/components/CoreMetricRail.tsx");
const mobileHomeSurface = read("src/panel-framework/overview/components/HomeSurface.tsx");
const mobileBottomTabs = read("src/panel-framework/overview/components/BottomTabs.tsx");
const mobileTypes = read("src/panel-framework/overview/components/MobileOverviewTypes.ts");
const mobileModel = read("src/panel-framework/overview/mobileOverviewModel.ts");
const mobileDataModel = read("src/panel-framework/overview/mobileOverviewData.ts");
const mobileChartModel = read("src/panel-framework/overview/mobileOverviewChartModel.ts");
const mobileListModel = read("src/panel-framework/overview/mobileOverviewListModel.ts");
const mobileTokenSource = read("src/panel-framework/overview/mobileOverviewTokens.ts");
const mobilePolicy = read("src/panel-framework/overview/mobileOverviewPolicy.ts");
const mobileHero = read("src/panel-framework/overview/components/IncidentHero.tsx");
const mobileStyles = read("src/panel-framework/overview/components/MobileOverviewStyles.tsx");
const mobileBaseStyles = read("src/panel-framework/overview/components/MobileOverviewBaseStyles.ts");
const resourceTrendCheck = read("tools/check-resource-trend-balance.js");
const mobileAppHomeRuntimeCheck = read("tools/check-mobile-app-home-runtime.js");
const desktopNoSnapshotRuntimeCheck = read("tools/check-desktop-no-snapshot-runtime.js");
const desktopV1030RuntimeCheck = read("tools/check-desktop-v1030-runtime.js");
const mobileReleaseStyles = read("src/panel-framework/overview/components/MobileOverviewReleaseStyles.ts");
const mobileDecisionStyles = read("src/panel-framework/overview/components/MobileOverviewDecisionStyles.ts");
const mobileAppPolishStyles = read("src/panel-framework/overview/components/MobileOverviewAppPolishStyles.ts");
const mobileRefinementStyles = read("src/panel-framework/overview/components/MobileOverviewRefinementStyles.ts");
const desktopRefinementStyles = read("src/panel-framework/overview/OverviewPanelDesktopRefinement.css");
const desktopReleaseStyles = read("src/panel-framework/overview/OverviewPanelRelease.css");
const buildFrameworkInline = read("tools/build-framework-inline.mjs");
const overviewPanel = [
  read("src/panel-framework/overview/OverviewPanel.tsx"),
  readIfExists("src/panel-framework/overview/components/DesktopConsole.tsx"),
  readIfExists("src/panel-framework/overview/components/DesktopDecisionRail.tsx"),
  readIfExists("src/panel-framework/overview/desktopOverviewScenes.tsx"),
  readIfExists("src/panel-framework/overview/desktopOverviewHelpers.tsx"),
  readIfExists("src/panel-framework/overview/desktopOverviewHelpers.ts"),
  readIfExists("src/panel-framework/overview/desktopOverviewRows.ts"),
  readIfExists("src/panel-framework/overview/desktopOverviewTrafficRows.ts"),
  readIfExists("src/panel-framework/overview/desktopOverviewNetworkRows.tsx"),
  readIfExists("src/panel-framework/overview/desktopOverviewCredibilityRows.tsx"),
  readIfExists("src/panel-framework/overview/desktopOverviewTerminalRows.ts"),
  readIfExists("src/panel-framework/overview/desktopResourceRows.ts"),
  readIfExists("src/panel-framework/overview/desktopEvidenceRows.ts"),
  readIfExists("src/panel-framework/overview/desktopOverviewVisuals.tsx"),
].join("\n");
const deriveOverview = read("src/panel-framework/overview/deriveOverviewState.ts");
const scenariosSource = read("src/panel-framework/overview/scenarios.ts");
const css = read("src/panel-framework/overview/OverviewPanel.css");
const desktopStyleStack = [css, desktopRefinementStyles, desktopReleaseStyles].join("\n");
const publicRuntime = read("public/assets/framework/panel-framework.js");
const publicCss = read("public/assets/framework/style.css");
const splitMobileSource = [mobile, mobileDecision, mobileHomeSections, mobileSections, mobileTypes, mobileStatusHeader, mobileCoreMetricRail, mobileHomeSurface, mobileBottomTabs, mobileHero, mobileStyles, mobileModel, mobileDataModel, mobileChartModel, mobileListModel, mobileTokenSource, mobilePolicy].join("\n");
const splitMobileRuntimeSource = [mobile, mobileDecision, mobileHomeSections, mobileSections, mobileTypes, mobileStatusHeader, mobileCoreMetricRail, mobileHomeSurface, mobileBottomTabs, mobileHero, mobileModel, mobileDataModel, mobileChartModel, mobileListModel, mobilePolicy].join("\n");
const mobileLegacyStyleStack = [mobileBaseStyles, mobileRefinementStyles, mobileReleaseStyles, mobileStyles].join("\n");
const mobileStyleStack = [mobileBaseStyles, mobileRefinementStyles, mobileReleaseStyles, mobileDecisionStyles, mobileStyles].join("\n");
const activePublicRuntime = activeRuntimeSlice(publicRuntime, "v240");
const distRuntime = readIfExists("dist/assets/framework/panel-framework.js");
const distCss = readIfExists("dist/assets/framework/style.css");

assertParseableCssTemplates(
  mobileBaseStyles,
  ["V420_MOBILE_STYLES"],
  "mobile v420 base CSS parse guard",
);
assertParseableCssTemplates(
  mobileRefinementStyles,
  [
    "V960_PRODUCT_REFINEMENTS",
    "V970_TRUST_MODEL_REFINEMENTS",
    "V980_APP_IA_REFINEMENTS",
    "V990_NORMAL_APP_HOME_REFINEMENTS",
  ],
  "mobile v960-v990 refinement CSS parse guard",
);
assertParseableCssTemplates(
  mobileReleaseStyles,
  ["V1000_PUBLIC_RELEASE_REFINEMENTS"],
  "mobile v1000 release CSS parse guard",
);
assertParseableCssTemplates(
  mobileDecisionStyles,
  ["V1080_DECISION_HOME_REFINEMENTS"],
  "mobile v1080 decision-home CSS parse guard",
);
assertParseableCssTemplates(
  mobileAppPolishStyles,
  [
    "V1010_MOBILE_NATIVE_APP_POLISH",
    "V1020_PUBLIC_PRODUCT_POLISH",
    "V1030_NATIVE_TRUST_SPINE",
  ],
  "mobile v1010-v1030 app-polish CSS parse guard",
);

includesAll(buildFrameworkInline, [
  "cssMinify: true",
], "framework build release-size guard");
assert(Buffer.byteLength(publicCss, "utf8") <= 3_000_000, "public framework CSS must stay under 3MB after minification");
assert(!fs.existsSync(path.join(process.cwd(), "src/panel-framework/overview/components/MobileOverviewProductStyles.ts")), "dead mobile product style split must not remain as an unwired 100KB source file");

includesAll(mobileBaseStyles, [
  "V420_MOBILE_STYLES",
  ".ik-v420-nav",
  ".ik-v420-hero",
  ".ik-v420-resource",
  ".ik-v420-tabs",
], "mobile v420 base style split");
excludesAll(mobileStyles, [
  "const V420_MOBILE_STYLES",
  "MOBILE_OVERVIEW_TOKEN_CSS",
], "main mobile style entry must import base styles instead of embedding them");

includesAll(mobileRefinementStyles, [
  "V960_PRODUCT_REFINEMENTS",
  "V970_TRUST_MODEL_REFINEMENTS",
  "V980_APP_IA_REFINEMENTS",
  "V990_NORMAL_APP_HOME_REFINEMENTS",
  "ik-v960-judgement-strip",
  "ik-v910-trust-strip",
  "data-overview-mobile-normal-app-home",
], "mobile v960-v990 refinement style split");
excludesAll(mobileStyles, [
  "const V960_PRODUCT_REFINEMENTS",
  "const V970_TRUST_MODEL_REFINEMENTS",
  "const V980_APP_IA_REFINEMENTS",
  "const V990_NORMAL_APP_HOME_REFINEMENTS",
], "main mobile style stack must import refinement polish instead of embedding it");
assert(Buffer.byteLength(mobileStyles, "utf8") <= 12_000, "main mobile style entry should stay below 12KB after base/refinement/release split");

includesAll(`${mobileReleaseStyles}\n${mobileTokenSource}`, [
  "V1000_PUBLIC_RELEASE_REFINEMENTS",
  "data-overview-mobile-v1000-release-polish",
  "--ik-v1000-blue",
], "mobile v1000 release style split");

includesAll(`${mobileAppPolishStyles}\n${mobileDecisionStyles}\n${mobileTokenSource}`, [
  "V1010_MOBILE_NATIVE_APP_POLISH",
  "V1020_PUBLIC_PRODUCT_POLISH",
  "native-readout-rail",
  "no-ellipsis-subtle-tabbar",
  "ios-rhythm-low-noise-grouped-surfaces-router-native-tabs",
  "grid-template-rows: auto auto auto auto minmax(20px, 1fr) auto",
  "height: 100dvh",
  "position: static",
  "position: fixed",
  "html:has",
  "ik-v1020-impact-scope",
], "mobile v1010 native app polish style split");

includesAll(mobile, [
  "ik-mobile-public-home",
  "data-overview-mobile-design-token-system",
  "data-overview-mobile-impact-scope",
  "data-overview-mobile-impact-plane",
], "mobile product app semantic contract");

includesAll(read("src/panel-framework/overview/components/IncidentHero.tsx"), [
  "data-overview-mobile-chart-layout=\"native-readout-rail-current-peak-window-threshold-sample-anomaly\"",
  "data-overview-mobile-chart-readout-rail=\"current-peak-window-threshold-sample-anomaly\"",
  "data-overview-mobile-v1012-product-chart=\"window-current-peak-threshold-sample-breach\"",
  "data-overview-mobile-v1045-product-chart-decision",
  "data-overview-mobile-v1045-chart-readouts",
  "window-current-peak-threshold-sample-anomaly-source",
  "data-overview-mobile-chart-threshold",
  "data-overview-mobile-chart-breach",
  "data-overview-mobile-chart-anomaly",
  "data-overview-mobile-chart-decision",
  "ik-v1012-threshold-label",
  "ik-v1012-breach-line",
  "data-overview-mobile-v1072-chart=\"decision-plot-two-series-three-by-two-readout\"",
  "data-overview-mobile-v1072-series-legend=\"download-upload\"",
  "data-overview-mobile-v1072-readout-grid=\"three-columns-two-rows-six-decisions\"",
], "mobile product chart readout rail and threshold contract");
includesAll(`${mobileModel}\n${mobileHero}\n${mobileAppPolishStyles}\n${resourceTrendCheck}`, [
  "decisionContract: \"window-current-peak-threshold-sample-anomaly-source\"",
  "decisionLabel",
  "anomalyLabel",
  "anomalyTone",
  "{ label: \"异常\"",
  "grid-template-columns: repeat(3, minmax(0, 1fr))",
  "grid-template-rows: repeat(2, 27px)",
  "productChartProductized",
  "productChartDecision",
  "productChartAnomaly",
  "['当前', '峰值', '窗口', '阈值', '采样', '异常']",
], "mobile v1045 product chart must expose window/current/peak/threshold/sample/anomaly/source decision signals");

includesAll(read("src/panel-framework/overview/components/JudgementStrip.tsx"), [
  "data-overview-mobile-v1010-no-ellipsis-label",
  "textOverflow: \"clip\"",
], "mobile judgement strip no-ellipsis runtime guard");
includesAll(desktopReleaseStyles, [
  "v1000 public-console polish",
  "ro-desktop-grid[data-overview-desktop-v1042-no-snapshot-floor] .ro-col.is-bottom.ro-no-snapshot-floor",
  "--ik-v1000-desktop-line",
], "desktop v1000 release style split");

includesAll(desktopRefinementStyles, [
  "Codex v700 desktop product-console polish",
  "Codex v812 desktop density pass",
  "Codex v817 desktop control-console density",
  "v960 public-console refinement",
], "desktop v700-v960 refinement style split");

includesAll(read("src/panel-framework/overview/OverviewPanel.tsx"), [
  'import "./OverviewPanel.css";',
  'import "./OverviewPanelDesktopRefinement.css";',
  'import "./OverviewPanelRelease.css";',
], "desktop style import order");

assert(!css.includes("Codex v700 desktop product-console polish"), "main desktop CSS must import v700+ refinement polish instead of embedding it");
assert(!css.includes("v960 public-console refinement"), "main desktop CSS must import v960 public-console refinement instead of embedding it");
assert(!desktopReleaseStyles.includes("v960 public-console refinement"), "desktop release CSS must stay focused on v1000 release polish");
assert(Buffer.byteLength(css, "utf8") <= 2_750_000, "main overview CSS should stay below 2.75MB after desktop refinement split");
assert(Buffer.byteLength(desktopStyleStack, "utf8") <= 3_050_000, "combined desktop style stack should stay below 3.05MB after split");
excludesAll(mobile, [
  "const V1000_PUBLIC_RELEASE_REFINEMENTS",
], "main mobile style stack must import release polish instead of embedding it");
excludesAll(css, [
  "v1000 public-console polish",
], "main desktop CSS must import release polish instead of embedding it");
assert(Buffer.byteLength(mobileStyleStack, "utf8") <= 230_000, "combined semantic mobile style stack should stay below 230KB");
assert(Boolean(distRuntime) === Boolean(distCss), "dist framework artifacts must include both runtime and css when either is present");
const buildArtifactSurfaces = [
  {
    label: "public build artifact",
    runtime: publicRuntime,
    css: publicCss,
    activeRuntime: activePublicRuntime,
  },
  ...(distRuntime && distCss
    ? [{
      label: "dist build artifact",
      runtime: distRuntime,
      css: distCss,
      activeRuntime: activeRuntimeSlice(distRuntime, "v240"),
    }]
    : []),
];

includesAll(mobile, [
  "JudgementStrip",
  "TrustStrip",
  "<JudgementStrip",
  "<TrustStrip",
], "v960 mobile first-screen judgement/trust strips");
assertBefore(mobile, "<JudgementStrip", "<IncidentHero", "mobile judgement strip must precede incident hero");
assertBefore(mobile, "<TrustStrip", "<IncidentHero", "mobile trust strip must precede incident hero");
includesAll(`${mobileModel}\n${mobileListModel}`, [
  "wanDisplayTotal",
  "resource-incident",
  "resourceIncidentRows",
  "role = total <= 1 || index === 0 ? \"default\"",
  "layout: \"matrix\"",
  "MobileImpactScope",
  "export function buildMobileImpactScope(",
  "export function buildMobilePrimaryList(",
  "const scope = buildMobileImpactScope(network)",
  "const list = buildMobilePrimaryList(snapshot, state, network, scope, resourceFacts(state))",
  "resource-constrained",
  "carrier-unknown",
  "collection-only",
], "v960 mobile RouterOS view model separation and incident priority");
assert(
  !mobileModel.includes('if (priority === "resource-full") return { kind: "terminal-ranking"'),
  "resource-full mobile primary list must not default to terminal ranking",
);
includesAll(mobileHero, [
  "<b>{port.name}</b>",
  "{port.roleLabel} · {port.carrier}",
], "v960 mobile WAN matrix labels interface name before port code");
includesAll(mobileHomeSurface, [
  "data-overview-mobile-impact-scope",
  "data-overview-mobile-impact-plane",
  "data-overview-mobile-impact-scope-line",
  "ik-v1020-impact-scope",
], "mobile impact-scope list header contract");
includesAll(mobile + "\n" + mobileSections + "\n" + mobileTypes + "\n" + mobileStatusHeader + "\n" + mobileTrustStrip + "\n" + mobileJudgementStrip + "\n" + mobileCoreMetricRail + "\n" + mobileHomeSurface + "\n" + mobileHero + "\n" + mobileModel, [
  "MobileOverviewResolvedProps",
  "const resolvedProps = { ...props, model }",
  "<StatusHeader {...resolvedProps} />",
  "export function StatusHeader({ model }: MobileOverviewResolvedProps)",
  "model.header.deviceName",
  "model.header.versionText",
  "model.header.recent",
  "model.header.statusLabel",
  "model.header.tone",
  "function headerModel(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): MobileOverviewModel[\"header\"]",
  "header: headerModel(snapshot, state)",
  "<TrustStrip {...resolvedProps} />",
  "export function TrustStrip({ model }: MobileOverviewResolvedProps)",
  "model.trustPlanes.map",
  "export function JudgementStrip({ model }: MobileOverviewResolvedProps)",
  "<CoreMetricRail {...resolvedProps} />",
  "<IncidentHero {...resolvedProps} />",
  "<HomeSurface {...resolvedProps} />",
], "mobile v1050 single resolved view-model handoff contract");
assertPatternCountAtMost(
  mobileStatusHeader + "\n" + mobileTrustStrip + "\n" + mobileJudgementStrip + "\n" + mobileCoreMetricRail + "\n" + mobileHomeSurface + "\n" + mobileHero,
  /buildMobileOverviewModel\s*\(/g,
  0,
  "mobile v1050 child components must not rebuild the app-home view model",
);
excludesAll(mobileStatusHeader, [
  "latestSuccess(",
  "statusLabel(",
  "screenTone(",
  "snapshot.",
  "state.",
], "mobile v1050 status header must render resolved model header only");
includesAll(mobile, [
  "ik-mobile-public-home",
  "mobileOverviewTokens:color-type-space-radius-state-chart",
], "mobile native trust-spine semantic contract");
includesAll(mobileStyles, [
  "MOBILE_OVERVIEW_STYLE_LAYERS",
  "MOBILE_OVERVIEW_FOUNDATION_STYLES",
  "MOBILE_OVERVIEW_INFORMATION_ARCHITECTURE_STYLES",
  "MOBILE_OVERVIEW_RELEASE_STYLES",
  "MOBILE_OVERVIEW_NATIVE_PRODUCT_STYLES",
  "MOBILE_OVERVIEW_DECISION_HOME_STYLES",
  "foundation",
  "information-architecture",
  "release-contract",
  "native-product",
  "decision-home",
  "useInsertionEffect",
  "MOBILE_OVERVIEW_STYLE_STACK",
  "data-overview-mobile-style-stack",
  "data-overview-mobile-style-layers",
  "v1030-head-injected-parseable",
  "document.head.appendChild",
  "return null",
], "mobile semantic style composition contract");
excludesAll(mobileStyles, [
  "return <style>",
], "mobile style stack must be head-injected and not pollute overview text");
includesAll(mobileAppPolishStyles, [
  "V1030_NATIVE_TRUST_SPINE",
  "grouped-trust-spine-low-card-noise",
  "--ik-v1030-separator",
  ".ik-v910-trust-strip",
  ".ik-v420-surface",
  ".ik-v420-timeline-row",
  "box-shadow: none",
], "mobile v1030 native trust-spine low-noise style contract");
includesAll(resourceTrendCheck, [
  "nativeTrustSpinePolished",
  "mobileOverviewTokens:color-type-space-radius-state-chart",
  "surfaceBorderRadius",
  "heroBoxShadow",
  "styleTextLeakedIntoOverview",
], "mobile native trust-spine runtime gate contract");
includesAll(mobileStyleStack, [
  "V960_PRODUCT_REFINEMENTS",
  "ik-v960-judgement-strip",
  "ik-v910-trust-strip",
  "is-ranking-suppressed",
], "v960 mobile product refinement CSS redlines");
includesAll(desktopStyleStack, [
  "v960 public-console refinement",
  "flatter status bus",
  "lower table noise",
  "ro-ledger-row[data-tone=\"danger\"] .ro-ledger-cell:first-child",
  "data-overview-desktop-scene=\"no-snapshot\"",
], "v960 desktop status bus and evidence refinement CSS redlines");
includesAll(`${overviewPanel}\n${desktopReleaseStyles}`, [
  'module="evidence-boundary"',
  "data-overview-desktop-v1042-no-snapshot-floor",
  "single-collapsed-raw-evidence",
  "Desktop no-snapshot floor: keep raw fields available without turning absence into another dashboard.",
  "ro-no-snapshot-floor",
], "desktop no-snapshot collapsed raw-evidence floor contract");
includesAll(overviewPanel + "\n" + desktopReleaseStyles + "\n" + resourceTrendCheck, [
  "Desktop no-snapshot floor: keep raw fields available without turning absence into another dashboard.",
  "data-overview-desktop-v1042-no-snapshot-floor",
  "single-collapsed-raw-evidence",
  "data-overview-desktop-v1042-no-snapshot-floor-rail",
  "data-overview-desktop-v1042-no-snapshot-floor-module",
  "collapsed-raw-evidence-only",
  "noSnapshotFloorProductized",
  "noSnapshotFloorRowCount",
], "desktop no-snapshot floor keeps one collapsed audit disclosure");
includesAll(overviewPanel, [
  "DesktopWanIntegratedVisual",
  "data-overview-desktop-wan-integrated=\"trend-current-peak-top-outlet-route-sampling\"",
  "data-overview-ikuai-wan-chart-integrated=\"trend-current-peak-top-outlet-route-sampling\"",
  "data-overview-desktop-v1073-wan-single-surface=\"trend-decision-top3-no-duplicate-summary-or-ledger\"",
  "data-overview-desktop-v1073-visual-only",
  "visualOnly",
  "business-summary-primary",
  "raw-field-mode\": \"hidden-secondary\"",
], "desktop WAN integrated chart and business-first route evidence contract");
includesAll(desktopRefinementStyles, [
  "v1015 desktop WAN chart integration",
  "v1020 public-product polish",
  ".ro-wan-integrated-summary",
  ".ro-wan-integrated-top",
  "v1030 desktop short nav",
  ".ro-desktop-nav",
  "grid-template-columns: 96px",
], "desktop WAN integrated chart styling contract");
includesAll(overviewPanel, [
  "data-overview-desktop-v1020-public-product-polish",
  "flat-status-bus-low-line-noise-integrated-wan-reading",
  "data-overview-desktop-v1068-status-bus=\"control-console-summary-bus-flat-critical-value-rail\"",
  "data-overview-desktop-v1068-status-bus-no-table-header=\"true\"",
  "data-overview-desktop-v1068-status-bus-value-rail=\"conclusion-first-low-noise\"",
  "data-overview-desktop-v1068-status-cell=\"label-value-note\"",
  "data-overview-desktop-v1020-integrated-product-chart",
  "data-overview-desktop-v1073-wan-single-surface",
  "data-overview-module-body-policy={visualOnly ? \"visual-only\" : collapsedEvidence ? \"collapsed-secondary-evidence\" : \"content-sized\"}",
  "DESKTOP_IKUAI_SHORT_NAV_CONTRACT",
  "data-overview-desktop-nav=\"ikuai-short-left-rail\"",
  "data-overview-desktop-nav-labels=\"状态总览/多出口/接口/VLAN/在线终端/采集日志\"",
  "data-overview-desktop-v1069-nav-active=\"neutral-console-ink-no-blue-glow\"",
  "data-overview-desktop-v1030-nav-polish",
  "data-routeros-presentation-contract=\"collection-facts/routeros-semantics/user-conclusion\"",
], "desktop v1020 public-product polish contract");
includesAll(`${overviewPanel}\n${desktopRefinementStyles}\n${desktopReleaseStyles}\n${resourceTrendCheck}`, [
  "v1068 desktop status bus",
  "v1071 desktop conclusion rail",
  "topbarV1072Hierarchy",
  "topbarRoleOrder",
  "expectedTopbarRoleOrder",
  "conclusion-device-object-impact-collection-snapshot",
  "conclusion-device-routeros-rest-ssh-recent-success",
  "control-console-summary-bus-flat-critical-value-rail",
  "topbarV1068ControlBus",
  "data-overview-desktop-v1068-status-bus-no-table-header",
  "conclusion-first-low-noise",
  "rgba(18,34,55,.44)",
  "rgba(18, 34, 55, .028)",
  "box-shadow: inset 2px 0 0 rgba(18, 34, 55, .44)",
], "desktop v1068 status bus must read as flat control-console summary rail, not table header boxes");
includesAll(overviewPanel, [
  'const topbarFixedSix = isNoSnapshot ? "conclusion-device-routeros-rest-ssh-recent-success" : "conclusion-device-object-impact-collection-snapshot"',
  'const topbarHierarchy = isNoSnapshot ? "primary-conclusion-device-routeros-rest-ssh-recent-success" : "primary-conclusion-device-object-impact-collection-snapshot"',
  'const topbarPriorityContract = isNoSnapshot ? "conclusion-first-device-routeros-rest-ssh-recent-success" : "conclusion-first-device-object-impact-collection-snapshot"',
], "desktop v1072 status bus hierarchy contract must render the conclusion rail first");
assert(
  !desktopReleaseStyles.includes("rgba(20, 115, 230"),
  "desktop v1071 release-tail conclusion rail must not reintroduce legacy blue paint",
);
assert(
  ![
    "box-shadow: inset 2px 0 0 rgba(20, 115, 230, .55)",
    "box-shadow: inset 2px 0 0 rgba(20, 115, 230, .54)",
    "box-shadow: inset 2px 0 0 rgba(20, 115, 230, .58)",
    "box-shadow: inset 3px 0 0 var(--ik-v950-blue)",
  ].some((token) => desktopRefinementStyles.includes(token)),
  "desktop v1071 historical conclusion layers must not override the neutral status rail",
);
includesAll(`${desktopRefinementStyles}\n${resourceTrendCheck}`, [
  "neutral-console-ink-no-blue-glow",
  "desktopNavActiveNeutral",
  "activeNavPaint",
  "rgba(18,34,55,.44)",
  "rgba(18,34,55,.035)",
], "desktop v1069 left rail active state must be neutral console ink, not blue H5 accent");
assert(
  !desktopStyleStack.includes(".ro-sr-contract"),
  "desktop styles must not preserve a hidden presentation-contract layer",
);
includesAll(resourceTrendCheck, [
  "nodeIsVisiblyReadable",
  "visibleText",
  "desktopNoSnapshotText",
  "desktopVisibleText",
  "visibleText(topbar)",
  "visibleText(workspace)",
  "desktopNoSnapshot",
  "no-snapshot-summary",
  "no-snapshot-module-visibility",
  "no-snapshot-recent-success",
  "evidence-boundary",
  "single-collapsed-raw-evidence",
  "collapsed-raw-evidence-only",
  "native-details-collapsed-secondary",
  "forbiddenModules",
  "visiblePrimaryCount === 3",
], "desktop no-snapshot runtime gate contract");
includesAll(resourceTrendCheck, [
  "desktopV1030",
  "data-overview-desktop-nav=\"ikuai-short-left-rail\"",
  "status-overview/multi-wan/interface-vlan/online-terminals/collection-log",
  "syntheticGateTextAbsent",
  "syntheticGateTextCount",
  "visibleModules.length >= 6",
], "desktop v1030 runtime gate contract");
includesAll(desktopNoSnapshotRuntimeCheck, [
  "desktopNoSnapshot",
  "codex_tmp_desktopNoSnapshot.json",
  "codex_tmp_desktopNoSnapshot.png",
  "--width",
  "1528",
  "--height",
  "980",
  "--max-old-space-size=2048",
], "desktop no-snapshot dedicated runtime wrapper");
includesAll(desktopV1030RuntimeCheck, [
  "desktopV1030",
  "CODEX_RUNTIME_ARTIFACT_STEM",
  "CODEX_KEEP_RUNTIME_ARTIFACTS",
  "'codex_tmp_desktopV1030'",
  "`${outputStem}.json`",
  "`${outputStem}.png`",
  "--width",
  "1528",
  "--height",
  "980",
  "--max-old-space-size=2048",
], "desktop v1030 dedicated runtime wrapper");





const mobileTablePatterns = [
  /\b<table\b/i,
  /\b<\/?(?:thead|tbody|tr|th|td)\b/i,
  /\brole=["'](?:table|row|cell|columnheader|rowheader)["']/i,
];
const mobileFirstScreenDomTablePatterns = [
  /<\s*(?:table|thead|tbody|tr|th|td)\b/i,
  /\brole=["'](?:table|row|cell|columnheader|rowheader)["']/i,
];
const desktopCompressionLeakPatterns = [
  /DesktopWorkspace/i,
  /ro-desktop-grid/i,
  /desktop[-_\s]*(?:grid|layout|table)/i,
];
const focusEllipsisPatterns = [
  /关注/i,
  /text-overflow\s*:\s*ellipsis/i,
  /\bellipsis\b/i,
  /…/,
];
const fourKpiPatterns = [
  /four[-_\s]?kpi/i,
  /kpi[-_\s]?grid/i,
  /\b2x2\b/i,
  /grid-template-columns\s*:\s*repeat\(\s*4\s*,/i,
];
const englishResourcePatterns = [
  /\bCPU\s*(?:\/|、|,|·|\+)\s*(?:MEM|Memory)\b/i,
  /\bCPU\s*\/\s*MEM\s*\/\s*DISK\b/i,
  /\bMEM\s*\/\s*DISK\b/i,
  /(?:>|["'])\s*(?:CPU|MEM|DISK)\s*(?:<|["'])/,
  /(?:label|title|value|note|aria-label)\s*[:=]\s*["'][^"']*\b(?:CPU|MEM|DISK)\b[^"']*["']/i,
];
const mobilePrimaryStatusFocusPatterns = [
  /(?:label|value|status|title)\s*:\s*["']关注["']/i,
  /(?:className|data-[\w-]+)=["'][^"']*(?:status|verdict|primary)[^"']*["'][\s\S]{0,160}>\s*关注\s*</i,
  /data-overview-mobile-[\w-]*(?:status|verdict|primary)[\w-]*=["'][^"']*关注[^"']*["']/i,
];
const mobileTitleStatusCollisionStylePatterns = [
  /(?:title|status|nav)[^{]*position\s*:\s*absolute/i,
  /(?:title|status|nav)[^{]*text-overflow\s*:\s*ellipsis/i,
];
const mobileFirstScreenTableCssPatterns = [
  /display\s*:\s*table/i,
  /table-layout\s*:/i,
  /\b(?:table|thead|tbody|tr|th|td)\b/i,
];
const mobileFirstScreenDisplayTableCssPatterns = [
  /display\s*:\s*(?:inline-)?table(?:-[a-z]+)?\b/i,
  /table-layout\s*:/i,
];
const mobileV223CardStackPatterns = [
  /data-overview-mobile-home-version=["']v223["']/i,
  /data-overview-mobile-v223-(?:app-home|design|first-screen|frame-model)/i,
  /\bik-v223-(?:app|home-stack|card-stack|section-card|summary-card)\b/i,
  /single-hero-summary-rail-native-list-no-card-pile/i,
  /card[-_\s]*(?:stack|pile)/i,
];
const mobileMultiKpiCardStackPatterns = [
  /(?:four|4|2x2|multi|many)[-_\s]*(?:kpi|metric|readout)[-_\s]*(?:card[-_\s]*)?(?:stack|pile|grid)/i,
  /(?:kpi|metric|readout)[-_\s]*(?:card[-_\s]*)?(?:stack|pile|grid)[-_\s]*(?:four|4|2x2|multi|many)/i,
  /data-overview-mobile-[^=]*(?:kpi|metric|readout)[^=]*=["'][^"']*(?:stack|pile|2x2|four|many|multi)/i,
];
const mobileKpiGridRedlinePatterns = [
  /(?<!no[-_])(?:four|4|2x2)[-_\s]*(?:equal[-_\s]*)?kpi/i,
  /(?<!no[-_])(?<!not[-_])(?:kpi|metric|readout)[-_\s]*(?:card[-_\s]*)?grid/i,
  /grid-template-columns\s*:\s*repeat\(\s*2\s*,[\s\S]{0,220}grid-template-rows\s*:\s*repeat\(\s*2\s*,/i,
  /data-overview-mobile-(?:kpi|metric|readout)-grid=["'][^"']*(?:2x2|four|card)/i,
];
const mobileThickProgressCssPatterns = [
  /(?:progress|meter[-_\s]*(?:bar|track|fill))[\s\S]{0,180}(?:height|min-height)\s*:\s*(?:[8-9]|[1-9]\d)px/i,
  /(?:height|min-height)\s*:\s*(?:[8-9]|[1-9]\d)px[\s\S]{0,180}(?:progress|meter[-_\s]*(?:bar|track|fill))/i,
];
const mobileV225TitleCollisionPatterns = [
  /\.ik-v225-hero-copy\s+b[\s\S]{0,500}text-overflow\s*:\s*ellipsis/i,
  /\.ik-v225-hero-copy\s+b[\s\S]{0,500}white-space\s*:\s*nowrap/i,
  /\.ik-v225-hero-copy\s+b[\s\S]{0,500}overflow\s*:\s*hidden/i,
  /\.ik-v225-hero-head[\s\S]{0,500}position\s*:\s*absolute/i,
];
const mobileDesktopLeakCssPatterns = [
  /ro-desktop-grid/i,
  /desktop-only/i,
  /desktop-workspace/i,
];
const mobileDesktopTableClassLeakPatterns = [
  /\bro-ledger-(?:table|row|cell|head)\b/i,
  /\bik-home-evidence-list\b/i,
  /\bik-overview-module-cell\b/i,
  /\bro-module\b/i,
  /data-overview-density-module=/i,
  /data-overview-desktop-tier=/i,
  /data-overview-table-evidence-wrap=/i,
  /data-overview-side-table-mode=/i,
];
const noSnapshotPseudoRatePatterns = [
  /\b0\s*(?:B|KB|MB|GB|Bytes)(?:\/s|ps)\b/i,
  /\b(?:trafficTotals|rateMetric|formatRate|V220ShortRate)\s*\(/i,
];
const noSnapshotZeroThroughputTextPatterns = [
  /\b0\s*(?:B|KB|MB|GB|Bytes)(?:\/s|ps)\b/i,
  /\b0\s*(?:Byte|Bytes)\s*\/\s*s\b/i,
];
const desktopNoSnapshotForbiddenWanRatePatterns = [
  /module=["'](?:wan-trend|normal-wan-evidence|traffic-trend|normal-traffic|traffic-ledger|wan-rate|wan-throughput)["']/i,
  /(?:title|subtitle)=["'][^"']*(?:WAN趋势|实时流量|下载|上传|当前\s*\/\s*峰值\s*\/\s*均值)[^"']*["']/i,
  /\bformatRate\s*\(/i,
];
const desktopNoSnapshotFailedEndpointZeroPatterns = [
  /(?:失败端点|端点失败)[^"`'\n]{0,32}(?:0\b|["']0["'])/i,
];
const primaryConclusionTruncationPatterns = [
  /\.ik-v222-hero\s+h1[\s\S]{0,500}text-overflow\s*:\s*ellipsis/i,
  /\.ik-v222-hero\s+h1[\s\S]{0,500}white-space\s*:\s*nowrap/i,
  /\.ik-v222-hero\s+h1[\s\S]{0,500}overflow\s*:\s*hidden/i,
];
const mobileShellSelectorPattern = /(?:\.ro-mobile-first-screen|\.ik-v222-app|\.ik-v222-first-screen|\[data-overview-mobile-first-screen|\[data-overview-mobile-home-version)/i;
const desktopShellSelectorPattern = /(?:\.ro-desktop|\.ro-desktop-grid|\[data-overview-desktop)/i;
const desktopContentTabLeakCssPatterns = [
  /(?:\.ro-desktop|\[data-overview-desktop)[^{]*(?:tabbar|bottom[-_\s]*tab|mobile[-_\s]*tab)/i,
  /(?:tabbar|bottom[-_\s]*tab|mobile[-_\s]*tab)[^{]*(?:\.ro-desktop|\[data-overview-desktop)/i,
];

const exportIndex = mobile.indexOf("export function MobileOverviewHome");
assert(exportIndex >= 0, "source missing active MobileOverviewHome export");
const activeMobileExport = splitMobileRuntimeSource;
const activeMobileVersionMatch = activeMobileExport.match(/data-overview-mobile-home-version="(v\d+)"/);
assert(Boolean(activeMobileVersionMatch), "active source mobile export must declare data-overview-mobile-home-version");
const activeMobileVersion = activeMobileVersionMatch?.[1] || "v230";
const activeMobileVersionNumber = Number(activeMobileVersion.slice(1));
const activeMobileFunctionPrefix = "SplitMobile";
const activeMobileClassPrefix = "ik-v420";
const activeMobileDataPrefix = "data-overview-mobile-v420";
assert(activeMobileVersionNumber >= 230, `active source mobile version must be v230 or newer, got ${activeMobileVersion}`);
const sourceV222Surface = [
  functionBlock(mobile, "MobileOverviewHome"),
  functionBlock(mobile, "V222TopBar"),
  functionBlock(mobile, "V222Hero"),
  functionBlock(mobile, "V222MetricReadouts"),
  functionBlock(mobile, "V222HeroVisual"),
  functionBlock(mobile, "V222LineChart"),
  functionBlock(mobile, "V222PortGrid"),
  functionBlock(mobile, "V222Channels"),
  functionBlock(mobile, "V222ResourceVisual"),
  functionBlock(mobile, "V222InterfaceChain"),
  functionBlock(mobile, "V222ResourceStrip"),
  functionBlock(mobile, "V222SignalStrip"),
  functionBlock(mobile, "V222ExceptionLine"),
  functionBlock(mobile, "V222TopList"),
  functionBlock(mobile, "V222Tabs"),
  functionBlock(mobile, "V222MobileStyles"),
].join("\n");
const sourceV222Runtime = `${activeMobileExport}\n${sourceV222Surface}`;
const sourceV223Surface = [
  functionBlock(mobile, "MobileOverviewHome"),
  functionBlock(mobile, "V223Conclusion"),
  functionBlock(mobile, "V223Nav"),
  functionBlock(mobile, "V223Hero"),
  functionBlock(mobile, "V223PrimaryStats"),
  functionBlock(mobile, "V223SummaryItems"),
  functionBlock(mobile, "V223HeroVisual"),
  functionBlock(mobile, "V223LineChart"),
  functionBlock(mobile, "V223PortRail"),
  functionBlock(mobile, "V223ChannelRail"),
  functionBlock(mobile, "V223ResourceMeters"),
  functionBlock(mobile, "V223InterfaceFlow"),
  functionBlock(mobile, "V223Summary"),
  functionBlock(mobile, "V223Rows"),
  functionBlock(mobile, "V223NativeList"),
  functionBlock(mobile, "V223Tabs"),
  functionBlock(mobile, "V223MobileStyles"),
].join("\n");
const sourceV223Runtime = `${activeMobileExport}\n${sourceV223Surface}`;
const publicV222Surface = [
  functionBlock(publicRuntime, "MobileOverviewHome"),
  functionBlock(publicRuntime, "V222TopBar"),
  functionBlock(publicRuntime, "V222Hero"),
  functionBlock(publicRuntime, "V222MetricReadouts"),
  functionBlock(publicRuntime, "V222HeroVisual"),
  functionBlock(publicRuntime, "V222LineChart"),
  functionBlock(publicRuntime, "V222PortGrid"),
  functionBlock(publicRuntime, "V222Channels"),
  functionBlock(publicRuntime, "V222ResourceStrip"),
  functionBlock(publicRuntime, "V222SignalStrip"),
  functionBlock(publicRuntime, "V222ExceptionLine"),
  functionBlock(publicRuntime, "V222TopList"),
  functionBlock(publicRuntime, "V222Tabs"),
].join("\n");
const sourceV222MobileStyles = constAssignmentBlock(mobile, "V222_MOBILE_STYLES");
const sourceV222HeroVisualBlock = functionBlock(mobile, "V222HeroVisual");
const sourceV222MetricReadoutsBlock = functionBlock(mobile, "V222MetricReadouts");
const sourceV222HeroNumberBlock = functionBlock(mobile, "V222HeroNumber");
const sourceV222PortGridBlock = functionBlock(mobile, "V222PortGrid");
const sourceV222ResourceStripBlock = functionBlock(mobile, "V222ResourceStrip");
const sourceV222ExceptionLineBlock = functionBlock(mobile, "V222ExceptionLine");
const sourceV222NoSnapshotMetricBranch = optionalBranchBlock(sourceV222MetricReadoutsBlock, 'if (state.scenario === "no-snapshot")', ["const totals = trafficTotals"]);
const sourceV222ResourceFullImpactBranch = optionalBranchBlock(sourceV222ExceptionLineBlock, 'state.scenario === "resource-full"', [": state.facts.wan.allOffline"]);
const sourceV223MobileStyles = constAssignmentBlock(mobile, "V223_MOBILE_STYLES");
const sourceV223HeroVisualBlock = functionBlock(mobile, "V223HeroVisual");
const sourceV223PrimaryStatsBlock = functionBlock(mobile, "V223PrimaryStats");
const sourceV223RowsBlock = functionBlock(mobile, "V223Rows");
const sourceV223NoSnapshotStatsBranch = optionalBranchBlock(sourceV223PrimaryStatsBlock, 'if (state.scenario === "no-snapshot")', ['if (state.scenario === "collection-down")']);
const sourceV223NoSnapshotRowsBranch = optionalBranchBlock(sourceV223RowsBlock, 'if (state.scenario === "no-snapshot")', ['if (state.scenario === "resource-full")']);
const sourceV223CollectionRowsBranch = optionalBranchBlock(sourceV223RowsBlock, 'if (state.scenario === "collection-down")', ["const rows = V220AppRows"]);
const activeMobileSurfaceFunctionSuffixes = [
  "MobileStyles",
  "Nav",
  "Hero",
  "HeroVisual",
  "LineChart",
  "HeroMetric",
  "MetricPair",
  "StripItems",
  "StatusStrip",
  "StatusCards",
  "StatusDock",
  "PortMatrix",
  "ChannelRail",
  "InterfaceFlow",
  "ResourceDock",
  "Resource",
  "Ring",
  "Resources",
  "Exception",
  "Impact",
  "TrafficList",
  "Rows",
  "List",
  "HomeSurface",
  "Tabs",
];
const sourceV225Surface = [
  functionBlock(mobile, "MobileOverviewHome"),
  ...activeMobileSurfaceFunctionSuffixes.map((suffix) => functionBlock(mobile, `${activeMobileFunctionPrefix}${suffix}`)),
  functionBlock(mobile, "heroReadings"),
  functionBlock(mobile, "compactCards"),
  functionBlock(mobile, "resourceMetrics"),
  functionBlock(mobile, "appListRows"),
  functionBlock(mobile, "channelStatus"),
  functionBlock(mobile, "HeroVisual"),
  functionBlock(mobile, "TrafficSpark"),
  functionBlock(mobile, "PortMatrix"),
  functionBlock(mobile, "ChannelLine"),
  functionBlock(mobile, "InterfaceFlow"),
].join("\n");
const sourceV225Runtime = splitMobileRuntimeSource;
const sourceV225MobileStyles = mobileStyleStack;
const sourceV225MobileStylesWithoutAllowedFactGrid = sourceV225MobileStyles.replace(
  /\[data-overview-mobile-v1080-decision-home\]\s+\.ik-v1080-core-facts\s*\{[\s\S]*?\}/g,
  "",
);
const sourceV225HeroBlock = functionBlock(mobile, "IncidentHero");
const sourceV225StatusDockBlock = [splitMobileSource,
  functionBlock(mobile, "heroReadings"),
  functionBlock(mobile, "compactCards"),
  functionBlock(mobile, "appListRows"),
  functionBlock(mobile, `${activeMobileFunctionPrefix}StripItems`),
  functionBlock(mobile, "JudgementStrip"),
  functionBlock(mobile, "TrustStrip"),
].join("\n");
const sourceV230RowsBlock = [splitMobileSource,
  functionBlock(mobile, "appListRows"),
  functionBlock(mobile, `${activeMobileFunctionPrefix}Rows`),
].join("\n");
const sourceDesktopWorkspaceBlock = sourceSliceBetween(overviewPanel, "function DesktopWorkspace", "function MobileDetail");
const sourceDesktopPanelGroupsBlock = sourceSliceBetween(overviewPanel, "function compactDesktopPanelGroups", "function desktopPanelGroups");
const sourceDesktopNoSnapshotBranch = branchBlock(sourceDesktopPanelGroupsBlock, 'if (state.scenario === "no-snapshot")', ['if (state.scenario === "resource-full")']);

assert(activeMobileExport.includes(`${activeMobileClassPrefix}-app`), `active source ${activeMobileVersion} mobile root must use ${activeMobileClassPrefix}-app`);
includesAll(activeMobileExport, [
  `data-overview-mobile-home-version="${activeMobileVersion}"`,
  `${activeMobileDataPrefix}-app-home=`,
  'data-overview-mobile-first-screen="app-home"',
  'data-overview-mobile-first-screen-no-table="true"',
  'data-overview-mobile-first-screen-uses-microchart="true"',
  'data-overview-mobile-no-kpi-card-grid="true"',
  'data-overview-mobile-no-red-orange="true"',
], `active source ${activeMobileVersion} mobile root contract`);
assert(activeMobileExport.includes(`${activeMobileDataPrefix}-first-screen-contract=`), `active source ${activeMobileVersion} missing first-screen contract`);
assert(activeMobileExport.includes(`${activeMobileDataPrefix}-frame-model=`), `active source ${activeMobileVersion} missing frame-model contract`);
assert(activeMobileExport.includes(`${activeMobileDataPrefix}-visual-contract=`), `active source ${activeMobileVersion} missing visual contract`);

includesAll(sourceV225Runtime, [
  "StatusHeader",
  "IncidentHero",
  "BottomTabs",
  "data-overview-mobile-v420-nav",
  "data-overview-mobile-v420-hero",
  "data-overview-mobile-bottom-tab=\"home-wan-interface-terminal-log\"",
  "wan-eight-port-matrix",
], `source ${activeMobileVersion} required app-home landmarks`);
includesAll(sourceV225Runtime + "\n" + sourceV225MobileStyles + "\n" + resourceTrendCheck, [
  "v1042 mobile WAN port matrix",
  "data-overview-mobile-v1042-wan-port-matrix",
  "compact-router-port-matrix-interface-state-carrier-no-toy-capsules",
  "data-overview-mobile-wan-port-cell",
  "data-overview-mobile-wan-port-interface",
  "data-overview-mobile-wan-port-carrier",
  "data-overview-mobile-wan-port-state",
  "wanPortMatrixProductized",
  "wanPortCellNoise",
], `source ${activeMobileVersion} mobile WAN port matrix must read like router interface state, not toy capsules`);
includesAny(sourceV225Runtime, [
  "thin-wan-sparkline",
  "normal-thin-sparkline",
  "data-overview-mobile-first-microchart",
], `source ${activeMobileVersion} thin/mini visual landmark`);
includesAny(sourceV225Runtime, [
  "JudgementStrip",
  "TrustStrip",
  "HomeSurface",
  "HomeSurface",
], `source ${activeMobileVersion} status/surface landmark`);
includesAny(sourceV225Runtime, [
  "ResourceVisual",
  "ResourceVisual",
  "ResourceVisual",
], `source ${activeMobileVersion} resource landmark`);
includesAny(sourceV225Runtime, [
  "RankingList",
  "RankingList",
  "data-overview-mobile-rank-list",
], `source ${activeMobileVersion} list landmark`);
includesAny(sourceV225Runtime, [
  "routeros-rest-ssh-snapshot-status-line",
  "data-overview-mobile-first-visual",
], `source ${activeMobileVersion} no-snapshot mini visual landmark`);
includesAll(sourceV225Runtime, [
  "appHomeContract",
  "data-overview-mobile-severity",
  "data-overview-mobile-ranking-policy",
  "data-overview-mobile-trust-boundary",
  "data-overview-mobile-first-question",
  "data-overview-mobile-hero-ranking-policy",
  "data-overview-mobile-trust-boundary-line",
  "data-overview-mobile-design-token-system",
  "data-overview-mobile-abnormal-ia",
  "data-overview-mobile-terminal-ranking-state",
  "data-overview-mobile-p0-first-screen",
], `source ${activeMobileVersion} mobile trust-model app-home contract`);

includesAll(mobilePolicy, [
  "MOBILE_OVERVIEW_POLICY",
  "resolveMobileOverviewPolicy",
  "informationArchitecture",
  "\"snapshot-missing\"",
  "\"wan-offline\"",
  "\"interface-down\"",
  "\"resource-full\"",
  "\"collection-degraded\"",
  "normal:",
  "wan-offline-default-route-collection-success-first",
  "trust-boundary-no-business-data",
  "resource-pressure-evidence-first",
  "terminalRanking",
  "not-mounted",
  "supporting-evidence",
  "decision-spine",
  "showCoreMetricRail",
  "surfaceOrder",
  "surfaceRanking",
  "operations-five-rows",
  "view-model-one-supporting-list-no-duplicate-status",
], `source ${activeMobileVersion} mobile app-home policy table contract`);
includesAll(mobileModel, [
  "resolveMobileOverviewPolicy",
  "const policy = resolveMobileOverviewPolicy(priority, list.kind",
  "appHomeContract: policy.appHomeContract",
  "surface: policy.surface",
], `source ${activeMobileVersion} mobile app-home policy wiring contract`);

includesAll(read("src/panel-framework/overview/mobileOverviewTokens.ts"), [
  "--ik-danger-text",
  "--ik-warn-text",
  "--ik-chart-current",
  "--ik-chart-threshold",
  "--ik-chart-sample",
  "--ik-native-bg-top",
  "--ik-native-surface",
  "--ik-native-separator",
  "--ik-native-risk-marker",
  "--ik-native-shell-contract",
  "native-console-tokenized-rhythm-low-noise-trust-first",
], `source ${activeMobileVersion} mobile design token contract`);
includesAll(`${activeMobileExport}\n${mobileAppPolishStyles}\n${mobileTokenSource}\n${resourceTrendCheck}`, [
  "data-overview-mobile-design-token-system=\"mobileOverviewTokens:color-type-space-radius-state-chart\"",
  "grouped-trust-spine-low-card-noise + native-console-tokenized-rhythm-low-noise-trust-first",
  "--ik-v1030-native-contract: var(--ik-native-shell-contract)",
  "gap: var(--ik-native-rhythm-gap)",
  "padding-left: var(--ik-native-screen-pad-x)",
  "min-height: var(--ik-native-nav-height)",
  "box-shadow: inset 0 -1px 0 var(--ik-native-tab-active)",
  "nativeTokenContract",
], `source ${activeMobileVersion} mobile native-console tokenized rhythm contract`);
includesAll(resourceTrendCheck, [
  "mobileNormalHome",
  "mobileAppHome",
  "mobileNoSnapshotHome",
  "mobileResourceHome",
  "mobileInterfaceHome",
  "mobileCollectionHome",
  "normal-operations-first",
  "compact-conclusion-chart-ops",
  "operations-five-rows",
  "visibleTerminalRows.length >= 1",
  "visibleTerminalRows.length <= 5",
  "wan-offline-default-route-collection-success-first",
  "trust-boundary-no-business-data",
  "collection-boundary-first",
  "collection-only",
  "data-overview-mobile-terminal-ranking-mounted",
  "data-overview-mobile-impact-scope",
  "data-overview-mobile-impact-plane",
  "data-overview-mobile-impact-scope-line",
  "resource-constrained",
  "carrier-unknown",
  "terminal-total-traffic-list",
  "hasHorizontalOverflow",
  "mobileOverviewTokens:color-type-space-radius-state-chart",
], `source ${activeMobileVersion} mobile app-home runtime gate contract`);
includesAll(`${resourceTrendCheck}\n${read("src/panel-framework/overview/OverviewPanel.tsx")}\n${readIfExists("src/panel-framework/overview/OverviewPanelRelease.css")}`, [
  "data-overview-desktop-v1040-status-bus",
  "flat-summary-bus-key-value-no-field-boxes",
  "topbarFlatSummaryBus",
  "topbarCellsNotFieldBoxes",
  "topbarCellNoise",
  ".ro-topbar-cell:not(:last-child)::after",
], "desktop v1040 flat status-bus runtime/static contract");
includesAll(`${resourceTrendCheck}\n${readIfExists("src/panel-framework/overview/OverviewPanelDesktopRefinement.css")}`, [
  "v1040 desktop ledger quieting",
  "ledgerLineNoiseLow",
  "ledgerNoiseSample",
  "ledgerDangerNonFirstSample",
  "border-bottom-color: rgba(226, 235, 244, .28)",
  "risk color stays on first/business fields only",
], "desktop v1040 quiet ledger runtime/static contract");
includesAll(`${overviewPanel}\n${resourceTrendCheck}\n${readIfExists("src/panel-framework/overview/OverviewPanelDesktopRefinement.css")}`, [
  "v1041 desktop WAN readable product chart",
  "data-overview-desktop-v1041-wan-readable-chart=\"current-peak-mean-window-threshold-readout-visible-not-table-noise\"",
  "wanReadableProductChart",
  "wanChartRect.height >= 104",
  "wanChartRows.length >= 3",
  ".ro-module[data-overview-density-module=\"wan-trend\"] .ro-wan-integrated-visual .ro-judgement-chart",
  "max-height: none",
], "desktop v1041 WAN trend chart readability runtime/static contract");
includesAll(mobileAppHomeRuntimeCheck, [
  "mobileNormalHome",
  "mobileAppHome",
  "mobileNoSnapshotHome",
  "mobileResourceHome",
  "mobileInterfaceHome",
  "normal compact app home",
  "wan offline p0 app home",
  "no snapshot trust boundary app home",
  "resource pressure p1 app home",
  "interface carrier p1 app home",
  "collection degraded p2 app home",
  "--width",
  "390",
  "--height",
  "844",
  "--max-old-space-size=2048",
], `source ${activeMobileVersion} mobile app-home dedicated runtime gate`);
includesAll(`${mobileStyleStack}\n${splitMobileSource}`, [
  "V990_NORMAL_APP_HOME_REFINEMENTS",
  "compact-conclusion-chart-ops",
  "operations-five-rows",
  "V1080_DECISION_HOME_REFINEMENTS",
  "decision-home",
], `source ${activeMobileVersion} mobile normal app-home visual refinement`);
includesAll(`${mobileModel}\n${mobileListModel}`, [
  "WAN / 默认路由证据",
  "if (network.priority === \"normal\") return \"WAN / 默认路由证据\"",
  "网络证据链",
  "默认路由 · 采集 · 快照 · 终端辅助",
], `source ${activeMobileVersion} mobile normal state must not use oversized good-news headline`);

includesAll(`${mobileStyleStack}\n${splitMobileSource}\n${resourceTrendCheck}`, [
  "data-overview-mobile-v1040-resource-pressure",
  "low-noise-threshold-ledger-no-red-blue-race",
  "neutral-bars-risk-label-only",
  "data-overview-mobile-v1056-resource-visual",
  "view-model-resource-threshold-sustained-risk-cells",
  "resourceVisualModelBacked",
  "resourceTrackNoiseLow",
  "resourceTrackFills.every",
], `source ${activeMobileVersion} mobile resource pressure must avoid red-blue monitor bars`);

includesAll(`${mobileModel}\n${mobileChartModel}\n${read("src/panel-framework/overview/components/IncidentHero.tsx")}\n${resourceTrendCheck}`, [
  "export interface MobileTrendChartPlotModel",
  "plot: MobileTrendChartPlotModel",
  "function trendChartPlot(",
  "plot: trendChartPlot(down, up, referenceRatio)",
  "export function buildMobileTrendChart(",
  "trend: buildMobileTrendChart(snapshot, state)",
  "const plot = chart.plot",
  "data-overview-mobile-v1057-chart-plot-model=\"view-model-svg-points-threshold-peak-breach\"",
  "modelBackedChartPlot",
], `source ${activeMobileVersion} mobile trend chart geometry must be model-backed`);

excludesAll(read("src/panel-framework/overview/components/IncidentHero.tsx"), [
  "sparkPoints(",
  "lastSparkPoint(",
  "const peakValue = Math.max(...down)",
  "const thresholdValue = max",
  "const breachIndex = down.findIndex",
], `source ${activeMobileVersion} mobile trend chart geometry must not be derived inside JSX`);

includesAll(sourceV225Runtime, [
  "首页",
  "WAN",
  "接口",
  "资源",
  "日志",
  "处理器",
  "内存",
  "磁盘",
  "最近成功",
], `source ${activeMobileVersion} mobile labels`);

includesAll(activeMobileExport, [
  "ik-v420-shell",
  "<StatusHeader {...resolvedProps} />",
  "<JudgementStrip {...resolvedProps} />",
  "<TrustStrip {...resolvedProps} />",
  "<CoreMetricRail {...resolvedProps} />",
  "<IncidentHero {...resolvedProps} />",
  "<HomeSurface {...resolvedProps} />",
  "<BottomTabs />",
  'data-overview-mobile-v1080-decision-home="compact-conclusion-trust-four-facts-scenario-evidence-one-supporting-list"',
  'data-overview-mobile-v1090-first-screen-order="conclusion-trust-four-facts-priority-incident-supporting-list"',
], `active source ${activeMobileVersion} mobile 390x844 app shell and hero`);
assertBefore(activeMobileExport, "<StatusHeader", "<JudgementStrip", `active source ${activeMobileVersion} status header must precede compact conclusion`);
assertBefore(activeMobileExport, "<JudgementStrip", "<TrustStrip", `active source ${activeMobileVersion} compact conclusion must precede trust strip`);
assertBefore(activeMobileExport, "<JudgementStrip", "<CoreMetricRail", `active source ${activeMobileVersion} compact conclusion must precede metric grid`);
assertBefore(activeMobileExport, "<TrustStrip", "<CoreMetricRail", `active source ${activeMobileVersion} trust strip must precede metric grid`);
assertBefore(activeMobileExport, "<CoreMetricRail", "<IncidentHero", `active source ${activeMobileVersion} metric grid must precede priority hero`);
assertBefore(activeMobileExport, "<IncidentHero", "<HomeSurface", `active source ${activeMobileVersion} priority hero must precede supporting list`);
assertBefore(activeMobileExport, "<HomeSurface", "<BottomTabs", `active source ${activeMobileVersion} supporting list must precede tabs`);
includesAll(`${splitMobileSource}\n${mobileAppPolishStyles}\n${resourceTrendCheck}`, [
  "CoreMetricRail",
  "<CoreMetricRail {...resolvedProps} />",
  "data-overview-mobile-v1044-metric-grid=\"wan-collection-resource-snapshot-four-core-facts\"",
  "data-overview-mobile-v1044-judgement-strip=\"compact-conclusion-only\"",
  "model.coreMetrics.slice(1, 5)",
  "ik-v1044-metric-grid",
  "grid-template-columns: repeat(4, minmax(0, 1fr))",
  "metricGridProductized",
  "metricLabels",
  "expectedConfig.mode === 'normal'",
  "metricCells.length === 4",
  "['WAN', '采集', '资源', '快照']",
], `source ${activeMobileVersion} all-mode four-core metric grid contract`);
assert(
  activeMobileExport.includes("ik-v420-screen"),
  `active source ${activeMobileVersion} must expose an active mobile first-screen shell`,
);

includesAll(sourceV225Runtime, [
  "data-overview-mobile-v420-hero",
  "data-overview-mobile-first-visual",
  "data-overview-mobile-first-microchart",
], `source ${activeMobileVersion} mobile first-screen hero visual contract`);
includesAny(sourceV225Runtime, [
  "HeroVisual({ ...props, model })",
  "HeroVisual",
  "<TrafficSpark",
  "data-overview-mobile-first-visual",
], `source ${activeMobileVersion} mobile first-screen mini visual implementation`);
includesAny(activeMobileExport + sourceV225HeroBlock, [
  `${activeMobileDataPrefix}-visual-contract="thin-wan-sparkline wan-eight-port-matrix`,
  'data-overview-mobile-first-microchart="true"',
  'data-overview-chart-type="mini-line"',
  'data-overview-chart-type="matrix"',
], `source ${activeMobileVersion} mobile first-screen chart-or-port-matrix contract`);
includesAny(sourceV225Runtime, [
  "HeroVisual",
  "IncidentHero",
  "data-overview-mobile-first-visual",
], `source ${activeMobileVersion} scene visual router landmark`);
includesAll(sourceV225Runtime, [
  "LineChart",
  "PortMatrix",
  "ChannelRail",
  "InterfaceFlow",
], `source ${activeMobileVersion} must keep scene visual variants: sparkline / port matrix / channel / flow`);
excludesPatterns(sourceV225Runtime, mobileFirstScreenDomTablePatterns, `source ${activeMobileVersion} mobile first-screen table/td/th visual redline`);

includesAll(sourceV225StatusDockBlock, [
  'state.scenario === "no-snapshot"',
  '"不展示"',
  '"业务快照"',
], `source ${activeMobileVersion} no-snapshot must hide rates instead of rendering fake 0 B/s`);
assert(
  !/(?:失败端点|端点失败)[\s\S]{0,80}(?:^|[^\d])0(?:[^\d]|$)/.test(sourceV230RowsBlock || sourceV225Runtime),
  `source ${activeMobileVersion} no-snapshot must not turn failed endpoint into 0`,
);
excludesPatterns(sourceV225StatusDockBlock + sourceV225HeroBlock + sourceV230RowsBlock, noSnapshotZeroThroughputTextPatterns, `source ${activeMobileVersion} no-snapshot zero-throughput text redline`);

excludesPatterns(sourceV225Runtime, [
  ...mobileTablePatterns,
  ...desktopCompressionLeakPatterns,
  ...mobilePrimaryStatusFocusPatterns,
  ...englishResourcePatterns,
  ...mobileDesktopTableClassLeakPatterns,
], `source ${activeMobileVersion} mobile redlines`);

assert(sourceV225MobileStyles, `source missing ${activeMobileFunctionPrefix} mobile inline styles`);
includesAll(sourceV225MobileStyles, [
  `.${activeMobileClassPrefix}-nav`,
  `.${activeMobileClassPrefix}-hero`,
  `.${activeMobileClassPrefix}-resource`,
  `.${activeMobileClassPrefix}-tabs`,
  "stroke-width",
], `source ${activeMobileVersion} style landmarks`);
includesAny(sourceV225MobileStyles, [
  `.${activeMobileClassPrefix}-strip`,
  `.${activeMobileClassPrefix}-dock`,
  `.${activeMobileClassPrefix}-status-cards`,
  `.${activeMobileClassPrefix}-surface`,
  ".ik-v970-trust-boundary",
], `source ${activeMobileVersion} status/surface style landmark`);
includesAny(sourceV225MobileStyles, [
  `.${activeMobileClassPrefix}-list`,
  `.${activeMobileClassPrefix}-traffic`,
], `source ${activeMobileVersion} list style landmark`);
excludesPatterns(sourceV225MobileStyles, [
  ...mobileFirstScreenDisplayTableCssPatterns,
  ...mobileMultiKpiCardStackPatterns,
  ...mobileThickProgressCssPatterns,
  ...mobileV225TitleCollisionPatterns,
  ...mobileTitleStatusCollisionStylePatterns,
  ...mobileDesktopTableClassLeakPatterns,
], `source ${activeMobileVersion} mobile style redlines`);
excludesPatterns(
  sourceV225MobileStylesWithoutAllowedFactGrid,
  mobileKpiGridRedlinePatterns,
  `source ${activeMobileVersion} mobile style KPI-grid redlines outside the four-fact rail`,
);
includesAll(mobileDecisionStyles, [
  ".ik-v1080-core-facts",
  "grid-template-columns: repeat(2, minmax(0, 1fr))",
  "grid-template-rows: repeat(2, minmax(0, 1fr))",
], `source ${activeMobileVersion} intentional four-fact rail`);
assertPatternCountAtMost(
  mobileLegacyStyleStack,
  /\bborder(?:-(?:top|right|bottom|left))?\s*:\s*(?!0\b)/i,
  96,
  `source ${activeMobileVersion} legacy mobile first-screen border density redline`,
);
assertPatternCountAtMost(
  mobileDecisionStyles,
  /\bborder(?:-(?:top|right|bottom|left))?\s*:\s*(?!0\b)/i,
  24,
  `source ${activeMobileVersion} decision-home border density redline`,
);

if (activeMobileExport.includes('data-overview-mobile-home-version="v223"')) {
includesAll(sourceV223Runtime, [
  "V223Nav",
  "V223Hero",
  "V223Summary",
  "V223NativeList",
  "V223Tabs",
  "ios-router-single-status-home",
  "download-upload-latency-connections",
  "thin-wan-sparkline",
  "wan-eight-port-matrix",
  "routeros-rest-ssh-snapshot-status-line",
  "processor-memory-disk-rings",
  "scene-specific-top3",
], "source v223 mobile app architecture");

includesAll(sourceV223Runtime, [
  "下载",
  "上传",
  "处理器",
  "内存",
  "磁盘",
  "最近成功",
  "业务快照",
], "source v223 mobile business labels");

includesAll(sourceV223Runtime, [
  "state.scenario === \"no-snapshot\"",
  "state.scenario === \"resource-full\"",
  "state.scenario === \"interfaces-down\"",
  "props.state.facts.wan.allOffline",
  "V223PortRail",
  "V223ChannelRail",
  "V223ResourceMeters",
  "V223InterfaceFlow",
  "V223LineChart",
], "source v223 scenario visual routing");

includesAll(sourceV223HeroVisualBlock, [
  'props.state.scenario === "no-snapshot"',
  'props.state.scenario === "collection-down"',
  "props.state.facts.wan.allOffline",
  'props.state.scenario === "resource-full"',
  'props.state.scenario === "interfaces-down"',
  "<V223ChannelRail",
  "<V223PortRail",
  "<V223ResourceMeters",
  "<V223InterfaceFlow",
  "<V223LineChart",
], "source v223 scenario visual must branch to dedicated visuals");

includesAll(sourceV223Runtime, [
  'data-overview-mobile-v223-visual="routeros-rest-ssh-snapshot-status-line"',
  'data-overview-mobile-v223-visual="wan-eight-port-matrix"',
  'data-overview-mobile-v223-visual="processor-memory-disk-rings"',
  'data-overview-mobile-v223-visual="interface-parent-carrier-route-chain"',
  'data-overview-mobile-v223-visual="thin-wan-sparkline"',
], "source v223 scenario visual data contracts");

includesAll(sourceV223Runtime, [
  'data-overview-chart-type="mini-line"',
  'data-overview-chart-type="matrix"',
  'data-overview-mobile-first-screen-uses-microchart="true"',
], "source v223 first-screen visual must use explicit mini-chart or matrix contracts");

includesAll(sourceV223NoSnapshotStatsBranch, [
  "业务快照",
  "最近成功",
], "source v223 no-snapshot must show collection boundary instead of rates");
excludesPatterns(sourceV223NoSnapshotStatsBranch, noSnapshotPseudoRatePatterns, "source v223 no-snapshot pseudo-rate redline");

includesAll(sourceV223NoSnapshotRowsBranch, [
  "端点失败",
  "state.facts.collection.failedEndpointText",
], "source v223 no-snapshot must record failed endpoints");
includesAll(sourceV223CollectionRowsBranch, [
  "端点失败",
  "state.facts.collection.failedEndpointText",
], "source v223 collection-down must record failed endpoints");
excludesPatterns(sourceV223NoSnapshotRowsBranch + sourceV223CollectionRowsBranch, [
  /端点失败\s*未记录/i,
  /failedEndpointText\s*\|\|\s*["']未记录["']/i,
], "source v223 failed-endpoint-unrecorded redline");

includesAll(scenariosSource, [
  "realtimeEndpointFailures",
  "staticEndpointFailures",
  "detailEndpointFailures",
], "overview scenario fixtures must carry failed endpoint evidence");

excludesPatterns(sourceV223Runtime, [
  ...mobileTablePatterns,
  ...desktopCompressionLeakPatterns,
  ...focusEllipsisPatterns,
  ...fourKpiPatterns,
  ...englishResourcePatterns,
  /\b0\s*(?:B|KB|MB|GB|Bytes)(?:\/s|ps)\b/i,
], "source v223 mobile redlines");

assert(sourceV223MobileStyles, "source missing V223 mobile inline styles");
excludesPatterns(sourceV223MobileStyles, mobileFirstScreenDisplayTableCssPatterns, "source v223 mobile first screen display-table redline");
includesAll(sourceV223MobileStyles, [
  ".ik-v223-hero h1",
  "white-space: normal",
], "source v223 key conclusion must not be truncated");
excludesPatterns(sourceV223MobileStyles, [
  /\.ik-v223-hero\s+h1[\s\S]{0,500}text-overflow\s*:\s*ellipsis/i,
  /\.ik-v223-hero\s+h1[\s\S]{0,500}white-space\s*:\s*nowrap/i,
  /\.ik-v223-hero\s+h1[\s\S]{0,500}overflow\s*:\s*hidden/i,
], "source v223 key conclusion truncation redline");
assertPatternCountAtMost(sourceV223MobileStyles, /\bborder(?:-(?:top|right|bottom|left))?\s*:/i, 36, "source v223 mobile border density redline");
assertPatternCountAtMost(sourceV223Runtime, /\bdata-severity=/i, 6, "source v223 mobile status tag density redline");
assertPatternCountAtMost(sourceV223Runtime, /\bdata-tone=/i, 8, "source v223 mobile tone tag density redline");
}

if (activeMobileExport.includes('data-overview-mobile-home-version="v222"')) {
includesAll(sourceV222Runtime, [
  "V222TopBar",
  "V222Hero",
  "V222SignalStrip",
  "V222ResourceStrip",
  "V222ExceptionLine",
  "V222TopList",
  "V222Tabs",
  "ios-router-main-card-four-metrics-visual",
  "download-upload-latency-connections",
  "thin-wan-sparkline",
  "wan-eight-port-matrix",
  "routeros-rest-ssh-snapshot-status-line",
  "processor-memory-disk-light-inline",
  "native-router-app-list-top3",
], "source v222 mobile app architecture");

includesAll(sourceV222Runtime, [
  "下载",
  "上传",
  "延迟",
  "连接",
  "处理器",
  "内存",
  "磁盘",
  "最近成功",
  "业务快照",
], "source v222 mobile business labels");

includesAll(sourceV222Runtime, [
  "state.scenario === \"no-snapshot\"",
  "state.scenario === \"resource-full\"",
  "state.scenario === \"interfaces-down\"",
  "props.state.facts.wan.allOffline",
  "V222PortGrid",
  "V222Channels",
  "V222ResourceVisual",
  "V222InterfaceChain",
  "V222LineChart",
], "source v222 scenario visual routing");

includesAll(sourceV222HeroVisualBlock, [
  'props.state.scenario === "no-snapshot"',
  'props.state.scenario === "collection-down"',
  "props.state.facts.wan.allOffline",
  'props.state.scenario === "resource-full"',
  'props.state.scenario === "interfaces-down"',
  "<V222Channels",
  "<V222PortGrid",
  "<V222ResourceVisual",
  "<V222InterfaceChain",
  "<V222LineChart",
], "source v222 scenario visual must branch to dedicated visuals");

includesAll(sourceV222Runtime, [
  'data-overview-mobile-v222-visual="routeros-rest-ssh-snapshot-status-line"',
  'data-overview-mobile-v222-visual="wan-eight-port-matrix"',
  'data-overview-mobile-v222-resource-inline="processor-memory-disk"',
  'data-overview-mobile-v222-visual="interface-parent-carrier-route-chain"',
  'data-overview-mobile-v222-visual="thin-wan-sparkline"',
], "source v222 scenario visual data contracts");

includesAll(sourceV222Runtime, [
  "if (state.scenario === \"no-snapshot\") return null",
  "no-rate-no-resource-ring",
  "RouterOS",
  "REST",
  "SSH",
  "快照",
  "业务不展示",
], "source v222 no-snapshot boundary");

includesAll(sourceV222NoSnapshotMetricBranch, [
  "RouterOS",
  "REST",
  "SSH",
  "快照",
  "业务不展示",
], "source v222 no-snapshot must show collection status instead of rates");

excludesPatterns(sourceV222NoSnapshotMetricBranch, noSnapshotPseudoRatePatterns, "source v222 no-snapshot pseudo-rate redline");
assert(
  /state\.scenario\s*===\s*"no-snapshot"\)\s*return\s*\{\s*value:\s*"无"\s*,\s*label:\s*"业务快照"\s*\}/.test(sourceV222HeroNumberBlock),
  'source v222 no-snapshot hero number must use "无 / 业务快照" instead of a fake rate',
);
includesAll(sourceV222ResourceStripBlock, [
  'if (state.scenario === "no-snapshot") return null',
  "处理器 / 内存 / 磁盘",
], "source v222 resource strip no-snapshot/resource labels");

includesAll(sourceV222ResourceFullImpactBranch, [
  "处理器",
  "内存",
  "磁盘",
], "source v222 resource-full impact must name processor/memory/disk in Chinese");

includesAll(sourceV222PortGridBlock, [
  "Math.max(8",
  ".slice(0, 8)",
  'data-overview-mobile-v222-visual="wan-eight-port-matrix"',
  "P{index + 1}",
], "source v222 WAN-all-offline must render an 8-port matrix");

excludesPatterns(sourceV222Runtime, [
  ...mobileTablePatterns,
  ...desktopCompressionLeakPatterns,
  ...focusEllipsisPatterns,
  ...fourKpiPatterns,
  ...englishResourcePatterns,
  /\b0\s*(?:B|KB|MB|GB|Bytes)(?:\/s|ps)\b/i,
], "source v222 mobile redlines");

assert(sourceV222MobileStyles, "source missing V222 mobile inline styles");
excludesPatterns(sourceV222MobileStyles, mobileFirstScreenDisplayTableCssPatterns, "source v222 mobile first screen display-table redline");
includesAll(sourceV222MobileStyles, [
  ".ik-v222-hero h1",
  "white-space: normal",
  "overflow: visible",
  "text-overflow: clip",
], "source v222 key conclusion must not be truncated");
excludesPatterns(sourceV222MobileStyles, primaryConclusionTruncationPatterns, "source v222 key conclusion truncation redline");
if (activeMobileExport.includes('data-overview-mobile-home-version="v222"')) {
  assertPatternCountAtMost(sourceV222MobileStyles, /\bborder(?:-(?:top|right|bottom|left))?\s*:/i, 14, "source v222 mobile border density redline");
  assertPatternCountAtMost(sourceV222Runtime, /\bdata-severity=/i, 12, "source v222 mobile status tag density redline");
  assertPatternCountAtMost(sourceV222Runtime, /\bdata-tone=/i, 16, "source v222 mobile tone tag density redline");
  assertPatternCountAtMost(sourceV222Runtime, /className="[^"]*(?:pill|tag|badge|chip)/i, 1, "source v222 mobile status badge/tag redline");
}

excludesAll(mobile, [
  'data-overview-mobile-home-version="v223"',
  'data-overview-mobile-home-version="v221"',
  'data-overview-mobile-home-version="v220"',
  'data-overview-mobile-home-version="v214"',
  "ik-v223-app",
  "<V223",
  "ik-v221-app",
  "ik-v220",
  "ik-v214-app",
  "<V221",
  "<V220",
  "<V214",
  "<DetailList",
], "active source export must not mount legacy mobile implementations");

includesAll(css + mobile, [
  "ik-v222-app",
  "ik-v222-hero",
  "ik-v222-line-chart",
  "ik-v222-port-grid",
  "ik-v222-tabbar",
], "source v222 style/runtime layer");

excludesPatterns(sourceV222Runtime, [
  ...mobileTablePatterns,
  ...desktopCompressionLeakPatterns,
], "source v222 mobile runtime table/desktop leakage");
}
assertHiddenCssRule(css, [/@media/i, mobileShellSelectorPattern], "source css must hide mobile shell in a media-scoped desktop/wide rule");
assertHiddenCssRule(css, [/@media/i, desktopShellSelectorPattern], "source css must hide desktop shell in a media-scoped mobile/narrow rule");

if (/"data-overview-mobile-home-version"\s*:\s*"v222"/.test(activePublicRuntime)
  || /data-overview-mobile-home-version=["']v222["']/.test(activePublicRuntime)) {
  includesAll(activePublicRuntime, [
    "v222",
    "apple-ios-ikuai40-router-home",
    "ios-router-main-card-four-metrics-visual",
    "download-upload-latency-connections",
    "thin-wan-sparkline",
    "wan-eight-port-matrix",
    "routeros-rest-ssh-snapshot-status-line",
    "processor-memory-disk-light-inline",
  ], "public active runtime v222 contract");
  includesAll(activePublicRuntime, ["下载", "上传", "延迟", "连接", "处理器", "内存", "磁盘"], "public active runtime v222 labels");
  excludesPatterns(activePublicRuntime, [
    ...mobileTablePatterns,
    ...desktopCompressionLeakPatterns,
    ...focusEllipsisPatterns,
    ...fourKpiPatterns,
    ...englishResourcePatterns,
    /\b0\s*(?:B|KB|MB|GB|Bytes)(?:\/s|ps)\b/i,
  ], "public active runtime v222 redlines");
}

if (activePublicRuntime.includes("v223")) {
  includesAll(activePublicRuntime, [
    "v223",
    "apple-ios-ikuai40-router-home",
    "ios-router-single-status-home",
    "download-upload-latency-connections",
    "thin-wan-sparkline",
    "wan-eight-port-matrix",
    "routeros-rest-ssh-snapshot-status-line",
    "processor-memory-disk-rings",
  ], "public active runtime v223 contract");
  includesAll(activePublicRuntime, ["下载", "上传", "处理器", "内存", "磁盘"], "public active runtime v223 labels");
  excludesPatterns(activePublicRuntime, [
    ...mobileTablePatterns,
    ...desktopCompressionLeakPatterns,
    ...focusEllipsisPatterns,
    ...fourKpiPatterns,
    ...englishResourcePatterns,
    /\b0\s*(?:B|KB|MB|GB|Bytes)(?:\/s|ps)\b/i,
  ], "public active runtime v223 redlines");
}

for (const artifact of buildArtifactSurfaces) {
  if (!artifact.activeRuntime.includes("v223")) continue;
  excludesPatterns(artifact.activeRuntime, [
    ...mobileTablePatterns,
    ...desktopCompressionLeakPatterns,
    ...focusEllipsisPatterns,
    ...fourKpiPatterns,
    ...englishResourcePatterns,
    ...mobileFirstScreenDisplayTableCssPatterns,
    /\b0\s*(?:B|KB|MB|GB|Bytes)(?:\/s|ps)\b/i,
  ], `${artifact.label} active v223 regression redlines`);
  includesAll(artifact.activeRuntime, [
    "routeros-rest-ssh-snapshot-status-line",
    "wan-eight-port-matrix",
    "processor-memory-disk",
    "interface-parent-carrier-route-chain",
    "thin-wan-sparkline",
    "处理器",
    "内存",
    "磁盘",
    "no-rate-no-resource-ring",
  ], `${artifact.label} active v223 hardened visual/no-snapshot/resource contracts`);
  assertPatternCountAtMost(artifact.activeRuntime, /\bborder(?:-(?:top|right|bottom|left))?\s*:/i, 42, `${artifact.label} active v223 border density redline`);
}

includesAll(sourceDesktopNoSnapshotBranch, [
  'module="no-snapshot-summary"',
  'module="no-snapshot-module-visibility"',
  'module="no-snapshot-recent-success"',
  'module="evidence-boundary"',
  'title="采集链路"',
  'title="业务可信边界"',
  'title="恢复线索"',
], "desktop no-snapshot must use collection/visibility modules instead of a WAN rate main module");
excludesPatterns(sourceDesktopNoSnapshotBranch, [
  /module="no-snapshot-readonly-boundary"/,
  /module="no-snapshot-degraded-modules"/,
  /不可展示模块矩阵/,
  /页面可信度/,
], "desktop no-snapshot must not duplicate credibility or unavailable-module matrices");
excludesPatterns(sourceDesktopNoSnapshotBranch, [
  ...desktopNoSnapshotForbiddenWanRatePatterns,
  ...desktopNoSnapshotFailedEndpointZeroPatterns,
], "desktop no-snapshot WAN-rate/failure-zero redlines");
assertPatternCountAtMost(sourceDesktopNoSnapshotBranch, /只读边界/g, 1, "desktop no-snapshot duplicate read-only-boundary wording redline");
includesAll(sourceDesktopWorkspaceBlock, [
  'data-overview-no-snapshot-grid={state.scenario === "no-snapshot" ?',
  'data-overview-no-snapshot-detail={state.scenario === "no-snapshot" ?',
  'data-overview-no-snapshot-no-wan-rate-placeholder={state.scenario === "no-snapshot" ? "business-rates-hidden" : undefined}',
], "desktop no-snapshot runtime redline markers");

includesAll(overviewPanel, [
  'data-overview-desktop-mobile-leakage-guard="hide-mobile-shell-on-desktop"',
  "data-overview-desktop-toy-nav-leak-guard",
  "desktop-hides-content-icon-tabs",
  "function routeFactRows",
  "ROUTEROS_ROUTE_EVIDENCE_CONTRACT",
  "data-routeros-route-evidence-contract",
  "data-routeros-raw-field-policy",
  "data-routeros-evidence-role",
], "desktop route/leakage wording");

includesAll(overviewPanel, [
  'data-overview-desktop-effective-content-height="760"',
  'data-overview-desktop-fixed-skeleton="left-network-wan-right-resource-collection-bottom-interface-events"',
], "desktop effective-height and duplicate-module guard contract");
const desktopEffectiveHeightMatch = overviewPanel.match(/data-overview-desktop-effective-content-height="(\d+)"/);
assert(desktopEffectiveHeightMatch && Number(desktopEffectiveHeightMatch[1]) >= 720, "desktop effective content height must be declared at least 720px");
const desktopRedlineMarkersMatch = overviewPanel.match(/data-overview-desktop-redline-markers="([^"]+)"/);
assert(
  desktopRedlineMarkersMatch
    && /no-(?:empty|continuous-blank)/.test(desktopRedlineMarkersMatch[1])
    && desktopRedlineMarkersMatch[1].includes("no-duplicate-boundary")
    && desktopRedlineMarkersMatch[1].includes("no-nosnapshot-wan-rate"),
  "desktop redline markers must cover empty/blank, duplicate boundary, and no-snapshot WAN-rate redlines",
);
assertPatternCountAtMost(sourceDesktopWorkspaceBlock, /只读边界/g, 1, "desktop duplicate read-only-boundary wording redline");
includesAll(read("src/panel-framework/overview/routerosEvidenceModel.ts"), [
  "ROUTEROS_ROUTE_EVIDENCE_CONTRACT",
  "business-summary-first/raw-route-fields-secondary/table-gateway-distance-active-disabled",
  "contract: typeof ROUTEROS_ROUTE_EVIDENCE_CONTRACT",
], "routeros evidence model contract");
includesAll(read("src/panel-framework/overview/routerosNetworkViewModel.ts"), [
  "RouterOsPresentationViewModel",
  "RouterOsDesktopPresentation",
  "buildRouterOsPresentationViewModel",
  "user-conclusion-first-routeros-raw-secondary",
  "navLabels: [\"状态总览\", \"多出口\", \"接口/VLAN\", \"在线终端\", \"采集日志\"]",
], "routeros presentation view model contract");
includesAll(overviewPanel, [
  "buildRouterOsPresentationViewModel",
  "desktopPresentation(snapshot, state)",
  "presentation-model-object-impact-trust-recent-readonly",
], "overview desktop must consume routeros presentation view model");
assert(
  !overviewPanel.includes("data-overview-desktop-core-text") &&
    !overviewPanel.includes("ro-sr-contract"),
  "overview desktop must not feed release gates with hidden presentation text",
);
assert(
  !overviewPanel.includes("type OverviewRawRoute"),
  "overview desktop must not type/import raw route rows directly; use routerosEvidenceModel",
);
assert(
  !overviewPanel.includes("function routeRows"),
  "overview desktop must not keep local raw route extraction; use routerosEvidenceModel",
);
assert(
  overviewPanel.includes('"data-routeros-evidence-role": "business-summary-primary"') &&
    overviewPanel.includes('"data-routeros-raw-field-mode": "hidden-secondary"'),
  "routeros business summary row must hide raw route fields behind secondary evidence",
);
const sourceV1047RouteFactRowsBlock = functionBlock(overviewPanel, "routeFactRows");
const sourceV1047RouteBusinessRowsBlock = functionBlock(overviewPanel, "routeBusinessRows");
const sourceV1047RouteRawRowsBlock = functionBlock(overviewPanel, "routeRawEvidenceRows");
includesAll(overviewPanel + "\n" + css + "\n" + resourceTrendCheck, [
  "business-route-main-raw-route-fields-secondary-collapsed-low-noise",
  "data-routeros-v1047-raw-evidence-contract",
  "data-routeros-v1047-business-route-copy",
  "gateway-priority-status-no-routeros-raw-fields",
  "data-routeros-v1047-raw-secondary-rail",
  "bottom-collapsed-low-noise",
  "routeRawEvidenceSecondaryProductized",
  "data-overview-desktop-v1074-collapsed-evidence",
  "native-details-business-first-raw-secondary",
  "data-overview-desktop-v1074-raw-evidence-disclosure",
  "native-details-collapsed-secondary",
  "ro-secondary-evidence-disclosure",
  "rawEvidenceDisclosureProductized",
], "desktop v1047 raw route evidence secondary hierarchy contract");
assert(
  !sourceV1047RouteFactRowsBlock.includes('"data-routeros-raw-table": route.rawFields') &&
    !sourceV1047RouteFactRowsBlock.includes('"data-routeros-raw-gateway": route.rawFields') &&
    !sourceV1047RouteBusinessRowsBlock.includes('"data-routeros-raw-table": route.rawFields') &&
    !sourceV1047RouteBusinessRowsBlock.includes('"data-routeros-raw-gateway": route.rawFields'),
  "desktop v1047 business route rows must not expose RouterOS raw attrs",
);
includesAll(sourceV1047RouteRawRowsBlock, [
  '"data-routeros-evidence-role": "raw-secondary"',
  '"data-routeros-raw-field-mode": "secondary-collapsed-evidence"',
  '"data-routeros-raw-field-contract": "table-gateway-distance-active-disabled-secondary"',
  '"data-routeros-v1047-raw-secondary-rail": "bottom-collapsed-low-noise"',
  '"data-routeros-raw-table": item.rawFields?.table || ""',
  '"data-routeros-raw-gateway": item.rawFields?.gateway || ""',
  '"data-routeros-raw-distance": item.rawFields?.distance || ""',
], "desktop v1047 raw route fields must live only in secondary raw rows");
assertPatternCountAtMost(
  overviewPanel,
  /data-routeros-evidence-role[\s\S]{0,240}data-routeros-raw-field-mode/g,
  4,
  "routeros raw fields must stay scoped to model-backed evidence rows",
);
assertPatternCountAtMost(
  overviewPanel,
  /data-routeros-raw-table/g,
  3,
  "routeros raw table fields must only exist on translated evidence rows",
);

excludesPatterns(overviewPanel, [/ik-v222-tabbar/i, /data-overview-mobile-v222-bottom-tab/i], "desktop source must not mount mobile tabbar");
excludesPatterns(overviewPanel, [
  /data-overview-density-module=["'](?:toy|demo|placeholder|sample)["']/i,
  /(?:toy|demo|placeholder|sample)[-_\s]*(?:module|panel|card)/i,
  /(?:module|panel|card)[-_\s]*(?:toy|demo|placeholder|sample)/i,
  /(?:desktop|content)[-_\s]*(?:big|large)[-_\s]*icon[-_\s]*(?:tab|tabs|tabbar)/i,
  /(?:big|large)[-_\s]*icon[-_\s]*(?:tab|tabs|tabbar)[-_\s]*(?:desktop|content)/i,
  /data-overview-desktop-content-icon-tabs=["']true["']/i,
], "desktop source toy-module/content-icon-tab redlines");

const sourceV1046MobileHome = read("src/panel-framework/overview/components/MobileOverviewHome.tsx");
const sourceV1046IncidentHero = read("src/panel-framework/overview/components/IncidentHero.tsx");
const sourceV1046AppPolish = read("src/panel-framework/overview/components/MobileOverviewAppPolishStyles.ts");
const sourceV1046RuntimeProbe = read("tools/check-resource-trend-balance.js");

includesAll(sourceV1046MobileHome, [
  "ik-mobile-public-home",
  "data-overview-mobile-abnormal-ia",
  "data-overview-mobile-priority",
], "mobile abnormal decision semantic root contract");

includesAll(sourceV1046IncidentHero, [
  "function AbnormalDecisionRail",
  "model.abnormalDecision",
  "data-overview-mobile-v1046-abnormal-decision-rail=\"object-impact-evidence-next-action\"",
  "data-overview-mobile-v1046-abnormal-decision-scope",
], "source v1046 mobile abnormal decision rail");

const sourceV1122Decision = read("src/panel-framework/overview/components/MobileOverviewDecision.tsx");
const sourceV1122RepairStyles = read("src/panel-framework/overview/components/MobileOverviewPublicDecisionRepairStyles.ts");

includesAll(`${sourceV1046MobileHome}\n${sourceV1122Decision}`, [
  "data-overview-mobile-console",
  "ik-mobile-public-home",
  "data-overview-mobile-v1122-channel-verdict",
  "object-impact-credibility-next-action-no-channel-grid",
  "data-overview-mobile-v1046-abnormal-decision-rail=\"object-impact-credibility-next-action\"",
  "model.priority === \"normal\"",
], "source v1122 mobile readable abnormal verdict");

includesAll(sourceV1122RepairStyles, [
  "grid-template-columns: repeat(2, minmax(0, 1fr))",
  "grid-template-rows: repeat(2, 60px)",
  ".ik-mobile-supporting-surface",
  "height: 82px",
  "font-size: 12.5px",
], "source v1122 mobile readable abnormal layout");

includesAll(`${mobileModel}\n${mobileListModel}\n${mobilePolicy}`, [
  "carrier: string;",
  "stateText: string;",
  "portState: \"up\" | \"down\";",
  "roleLabel:",
  "impact: \"default-route-affected\"",
  "businessImpact:",
  "routeBinding:",
  "export interface MobileAbnormalDecisionCell",
  "export interface MobileHeroTrustCell",
  "export interface MobileHeroInterfaceCell",
  "export interface MobileHeroChannelCell",
  "export interface MobileHeroResourceCell",
  "abnormalDecision: MobileAbnormalDecisionCell[]",
  "trustRail: MobileHeroTrustCell[]",
  "interfaceCells: MobileHeroInterfaceCell[]",
  "channelCells: MobileHeroChannelCell[]",
  "resourceCells: MobileHeroResourceCell[]",
  "function abnormalDecisionCells(",
  "function abnormalDecisionNextAction",
  "function abnormalDecisionActionNote",
  "function abnormalDecisionEvidenceTone",
  "export interface MobileAppHomeContract",
  "export interface MobileHomeSurface",
  "MOBILE_OVERVIEW_POLICY",
  "resolveMobileOverviewPolicy",
  "function heroTrustRail(",
  "function splitHeroPill",
  "function heroPillTone",
  "function heroInterfaceCells(",
  "function heroChannelCells(",
  "function heroResourceCells(",
  "label: \"对象\"",
  "label: \"影响\"",
  "label: \"证据\"",
  "label: \"下一步\"",
  "abnormalDecision: abnormalDecisionCells(priority, policy.appHomeContract, scope, network, heroTitle, list.title)",
  "trustRail: heroTrustRail(pills)",
  "interfaceCells: heroInterfaceCells(snapshot, state)",
  "channelCells: heroChannelCells(state)",
  "resourceCells: heroResourceCells(state)",
  "coreBlock?:",
  "MobileEvidenceLayer",
  "evidenceLayer:",
  "evidenceSource:",
  "evidenceRole:",
  "evidenceKey:",
  "withListEvidence(",
  "primaryImpactEvidence(",
  "secondaryEvidence(",
  "operationalEvidence(",
  "withSurfaceCoreBlocks(",
  "surfaceOrder",
  "surfaceRanking",
  "surface: policy.surface",
], "source v1051 abnormal decision view-model contract");

excludesAll(read("src/panel-framework/overview/components/HomeSurface.tsx"), [
  "function statusCoreBlock",
  "model.appHomeContract.terminalRanking ===",
  "model.primaryList.kind === \"terminal-ranking\"",
  "model.priority === \"normal\"",
  "incidentFirst ?",
], "source v1060 home surface must consume model-backed slots and ranking policy");

excludesAll(sourceV1046IncidentHero, [
  "function abnormalDecisionNextAction",
  "function abnormalDecisionActionNote",
  "function firstDownInterface",
  "function splitHeroPill",
  "function heroPillTone",
  "contract.trustBoundary.split",
  "model.appHomeContract.trustBoundary.split",
  "interfaceRows(snapshot)",
  "OverviewRawInterfaceRow",
  "state.facts.interfaces.down",
  "port.note.split",
  "const offline = port.tone",
  "const [carrier",
  "const portState = offline",
  "channelStatus(state)",
  "channelStatus,",
  "resourceMetrics(state)",
  "resourceMetrics,",
  "const peakKey",
  "item.value > max.value",
  "持续{item.tone",
  "model.hero.pills.slice",
  "splitHeroPill(",
  "heroPillTone(",
], "source v1051 abnormal decision rail must render model cells only");

includesAll(`${sourceV1046IncidentHero}\n${mobileTrustStrip}`, [
  "model.collectionTrust.map",
  "model.trustPlanes.map",
  "model.hero.interfaceCells",
  "model.hero.channelCells.map",
  "model.hero.resourceCells",
  "data-overview-mobile-v1053-interface-flow=\"view-model-interface-carrier-state-cells\"",
  "data-overview-mobile-v1054-wan-port-model=\"view-model-carrier-state-no-jsx-note-split\"",
  "data-overview-mobile-v1062-wan-role-model=\"default-backup-member-impact-route-binding\"",
  "data-overview-mobile-v1062-wan-role",
  "data-overview-mobile-v1062-wan-impact",
  "data-overview-mobile-v1062-wan-business-impact",
  "data-overview-mobile-v1062-wan-route-binding",
  "data-overview-mobile-v1055-channel-rail=\"view-model-routeros-rest-ssh-snapshot-trust-cells\"",
  "data-overview-mobile-v1056-resource-visual=\"view-model-resource-threshold-sustained-risk-cells\"",
], "source v1052 hero and separated trust rail must render model cells only");

includesAll(sourceV1046AppPolish, [
  "ik-v1046-abnormal-decision-rail",
  "grid-template-columns: repeat(4, minmax(0, 1fr))",
  "box-shadow: inset 0 0 0 .5px var(--ik-native-hairline)",
], "source v1046 mobile abnormal decision low-noise styles");

includesAll(sourceV1046RuntimeProbe, [
  "abnormalDecisionRailProductized",
  "abnormalDecisionCellNoise",
  "wanPortModelBacked",
  "wanPortRoleSemantics",
  "channelRailModelBacked",
  "resourceVisualModelBacked",
  "data-overview-mobile-v1054-wan-port-model",
  "data-overview-mobile-v1122-channel-verdict",
  "data-overview-mobile-v1056-resource-visual",
  "data-overview-mobile-v1046-abnormal-decision-rail=\"object-impact-credibility-next-action\"",
  "object-impact-credibility-next-action-low-noise-console",
], "runtime v1046 abnormal decision rail probe");

includesAll(`${mobileModel}\n${mobilePolicy}\n${sourceV1046MobileHome}\n${read("src/panel-framework/overview/components/HomeSurface.tsx")}\n${read("src/panel-framework/overview/components/TrustStrip.tsx")}\n${sourceV1046AppPolish}\n${sourceV1046RuntimeProbe}`, [
  "collectionTrust: MobileHeroChannelCell[]",
  "collectionTrustSeparation:",
  "function collectionTrustSeparation(",
  "collectionTrustSeparation: collectionTrustSeparation(priority, scope)",
  "function collectionTrustCells(",
  "collectionTrust: collectionTrustCells(state)",
  "function CollectionTrustRail",
  "model.collectionTrust.map",
  "data-overview-mobile-v1058-collection-trust=\"routeros-rest-ssh-snapshot-fixed-abnormal-first-screen\"",
  "data-overview-mobile-collection-policy",
  "data-overview-mobile-v1059-plane=\"collection\"",
  "data-overview-mobile-v1058-collection-trust-policy",
  "data-overview-mobile-v1058-collection-channel",
  "V1058_COLLECTION_TRUST_RAIL_POLISH",
  "collectionTrustRailFixed",
  "collectionTrustSeparatedFromImpact",
  "collectionTrustLabels",
  "data-overview-mobile-v1060-surface-policy",
  "view-model-one-supporting-list-no-duplicate-status",
  "surfacePolicyModelBacked",
  "statusCoreBlocksModelBacked",
  'slots: ["list"]',
  'model.surface.slots.join("/")',
  'data-overview-mobile-core-block="ios-router-home-surface"',
  'normalRanking: priority === "normal" ? "operations-five-rows" : undefined',
  "data-overview-mobile-v1061-evidence-layer",
  "data-overview-mobile-v1061-evidence-source",
  "primaryListEvidenceStandardized",
  "listEvidence",
  "RouterOS",
  "REST",
  "SSH",
  "快照",
], "source v1058 fixed abnormal collection trust rail contract");

includesAll(`${overviewPanel}\n${css}\n${resourceTrendCheck}`, [
  "function desktopWanDecisionRail(",
  "DesktopWanDecisionItem",
  "data-overview-desktop-v1063-wan-decision-rail=\"current-peak-top-default-sampling-single-surface\"",
  "data-overview-desktop-v1063-wan-decision-source=\"desktopWanDecisionRail\"",
  "data-overview-desktop-v1063-decision={item.id}",
  "ro-wan-integrated-decision",
  "wanDecisionRailProductized",
  "wanDecisionLabels",
  "Top出口",
  "默认出口",
  "采样",
], "desktop v1063 WAN chart must read as one integrated decision rail");

includesAll(`${overviewPanel}\n${css}\n${read("src/panel-framework/overview/mobileOverviewTokens.ts")}\n${resourceTrendCheck}`, [
  "OVERVIEW_LOW_NOISE_CONSOLE_TOKEN_CONTRACT",
  "OVERVIEW_LOW_NOISE_CONSOLE_TOKEN_CSS",
  "low-noise-console-tokens-color-type-space-radius-state-chart",
  "data-overview-low-noise-console-token-contract",
  "--ik-console-ink",
  "--ik-console-line",
  "--ik-console-panel",
  "--ik-console-danger",
  "lowNoiseConsoleTokensApplied",
  "lowNoiseConsoleTokenValues",
], "v1064 shared low-noise console token contract must drive mobile and desktop");

includesAll(`${mobile}\n${mobileModel}\n${mobileStatusHeader}\n${mobileAppPolishStyles}\n${mobileStyles}\n${resourceTrendCheck}`, [
  "normalSummary",
  "MobileNormalSummaryCell",
  "separate-conclusion-trust-four-facts-chart-first",
  "data-overview-mobile-v1090-first-screen-order",
  "conclusion-trust-four-facts-priority-incident-supporting-list",
  "data-overview-mobile-compact-conclusion",
  "conclusion-trust-wan-collection-resource-snapshot",
  "data-overview-mobile-v1044-metric-grid",
  "V1065_NORMAL_NATIVE_SUMMARY",
  "normalNativeFirstScreen",
  "normalChartLabelText",
  "normalHeroHeadlineDisplay",
], "v1065-v1090 mobile normal first screen must separate conclusion, trust, four facts, chart, and supporting list");

includesAll(`${read("src/panel-framework/overview/components/BottomTabs.tsx")}\n${mobileAppPolishStyles}\n${mobileStyles}\n${resourceTrendCheck}`, [
  "MOBILE_BOTTOM_NAV_CONTRACT",
  "MOBILE_BOTTOM_NAV_ITEMS",
  "home-wan-interface-terminal-log-router-monitor-low-noise",
  "data-overview-mobile-v1066-router-tabs",
  "data-overview-mobile-v1066-router-tab-order",
  "data-overview-mobile-v1066-router-tab-semantics",
  "status-overview",
  "multi-wan",
  "interface-vlan",
  "online-terminals",
  "collection-log",
  "V1066_ROUTER_BOTTOM_TABS",
  "routerBottomTabsProductized",
  "routerTabSemantics",
  "routerTabLabels",
  "routerTabActiveNeutral",
  "var(--ik-console-ink, #122237)",
  "rgba(18,34,55,.44)",
], "v1066 mobile bottom tabs must use router-monitor semantics and neutral console active state, not generic H5 nav");

includesAll(`${mobileStatusHeader}\n${mobileAppPolishStyles}\n${mobileStyles}\n${resourceTrendCheck}`, [
  "routeros-device-state-header-context-action-low-noise",
  "data-overview-mobile-v1067-status-header",
  "data-overview-mobile-v1067-header-action=\"router-context\"",
  "device-collection-route-context",
  "打开 RouterOS 采集链路与设备上下文",
  "V1067_ROUTER_STATUS_HEADER_ACTION",
  "routerStatusHeaderProductized",
  "statusHeaderActionLabel",
], "v1067 mobile status header action must be router-context, not generic hamburger menu");

excludesAll(mobileStatusHeader, [
  "打开菜单",
], "v1067 mobile status header must not expose generic app menu copy");

includesAll(`${mobile}\n${read("src/panel-framework/overview/components/HomeSurface.tsx")}\n${mobileAppPolishStyles}\n${mobileStyles}\n${resourceTrendCheck}`, [
  "ik-mobile-public-home",
  "data-overview-mobile-v1070-grouped-surface",
  "separator-only-status-list-no-card-stack",
  "V1070_GROUPED_SURFACE_LOW_BORDER",
  "mobileGroupedSurfaceLowBorder",
  "groupedSurfaceNoise",
  "groupedSeparatorNoise",
], "v1070 mobile first screen must use grouped surfaces with separator-only rows, not bordered card stacks");

if (failures.length) {
    console.error("overview ikuai static gate active-mobile-redlines: FAIL");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log("overview ikuai static gate active-mobile-redlines: PASS");
  process.exit(0);
