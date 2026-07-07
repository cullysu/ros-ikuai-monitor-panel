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
  const exactFunction = new RegExp(`(?:^|\\n)\\s*function\\s+${name}\\s*\\(`);
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
const overviewPanel = read("src/panel-framework/overview/OverviewPanel.tsx");
const deriveOverview = read("src/panel-framework/overview/deriveOverviewState.ts");
const scenariosSource = read("src/panel-framework/overview/scenarios.ts");
const css = read("src/panel-framework/overview/OverviewPanel.css");
const publicRuntime = read("public/assets/framework/panel-framework.js");
const publicCss = read("public/assets/framework/style.css");
const activeSourceV214 = activeRuntimeSlice(mobile, "v214");
const activePublicRuntime = activeRuntimeSlice(publicRuntime, "v240");
const distRuntime = readIfExists("dist/assets/framework/panel-framework.js");
const distCss = readIfExists("dist/assets/framework/style.css");
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
  /(?:four|4|2x2)[-_\s]*(?:equal[-_\s]*)?kpi/i,
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
const activeMobileExport = exportIndex >= 0 ? mobile.slice(exportIndex) : "";
const activeMobileVersionMatch = activeMobileExport.match(/data-overview-mobile-home-version="(v\d+)"/);
assert(Boolean(activeMobileVersionMatch), "active source mobile export must declare data-overview-mobile-home-version");
const activeMobileVersion = activeMobileVersionMatch?.[1] || "v230";
const activeMobileVersionNumber = Number(activeMobileVersion.slice(1));
const activeMobileFunctionPrefix = `V${activeMobileVersionNumber}`;
const activeMobileClassPrefix = `ik-${activeMobileVersion}`;
const activeMobileDataPrefix = `data-overview-mobile-${activeMobileVersion}`;
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
  functionBlock(mobile, "SceneVisual"),
  functionBlock(mobile, "TrafficSpark"),
  functionBlock(mobile, "PortMatrix"),
  functionBlock(mobile, "ChannelLine"),
  functionBlock(mobile, "InterfaceFlow"),
].join("\n");
const sourceV225Runtime = `${activeMobileExport}\n${sourceV225Surface}`;
const sourceV225MobileStyles = constAssignmentBlock(mobile, `${activeMobileFunctionPrefix}_MOBILE_STYLES`);
const sourceV225HeroBlock = functionBlock(mobile, `${activeMobileFunctionPrefix}Hero`);
const sourceV225StatusDockBlock = [
  functionBlock(mobile, "heroReadings"),
  functionBlock(mobile, "compactCards"),
  functionBlock(mobile, "appListRows"),
  functionBlock(mobile, `${activeMobileFunctionPrefix}StripItems`),
  functionBlock(mobile, `${activeMobileFunctionPrefix}StatusStrip`),
  functionBlock(mobile, `${activeMobileFunctionPrefix}StatusDock`),
].join("\n");
const sourceV230RowsBlock = [
  functionBlock(mobile, "appListRows"),
  functionBlock(mobile, `${activeMobileFunctionPrefix}Rows`),
].join("\n");
const sourceDesktopWorkspaceBlock = sourceSliceBetween(overviewPanel, "function DesktopWorkspace", "function MobileDetail");
const sourceDesktopPanelGroupsBlock = sourceSliceBetween(overviewPanel, "function desktopPanelGroups", "function DesktopWorkspace");
const sourceDesktopNoSnapshotBranch = branchBlock(sourceDesktopPanelGroupsBlock, 'if (state.scenario === "no-snapshot")', ['if (state.scenario === "resource-full")']);

assert(activeMobileExport.includes(`className="${activeMobileClassPrefix}-app"`), `active source ${activeMobileVersion} mobile root must use ${activeMobileClassPrefix}-app`);
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
  `${activeMobileFunctionPrefix}Nav`,
  `${activeMobileFunctionPrefix}Hero`,
  `${activeMobileFunctionPrefix}Tabs`,
  `${activeMobileDataPrefix}-nav=`,
  `${activeMobileDataPrefix}-hero=`,
  "data-overview-mobile-bottom-tab=\"home-wan-interface-resource-log\"",
  "wan-eight-port-matrix",
], `source ${activeMobileVersion} required app-home landmarks`);
includesAny(sourceV225Runtime, [
  "thin-wan-sparkline",
  "normal-thin-sparkline",
  "data-overview-mobile-first-microchart=\"true\"",
], `source ${activeMobileVersion} thin/mini visual landmark`);
includesAny(sourceV225Runtime, [
  `${activeMobileFunctionPrefix}StatusStrip`,
  `${activeMobileFunctionPrefix}StatusDock`,
  `${activeMobileFunctionPrefix}StatusCards`,
  `${activeMobileFunctionPrefix}HomeSurface`,
], `source ${activeMobileVersion} status/surface landmark`);
includesAny(sourceV225Runtime, [
  `${activeMobileFunctionPrefix}Resources`,
  `${activeMobileFunctionPrefix}Resource`,
  `${activeMobileFunctionPrefix}ResourceDock`,
], `source ${activeMobileVersion} resource landmark`);
includesAny(sourceV225Runtime, [
  `${activeMobileFunctionPrefix}List`,
  `${activeMobileFunctionPrefix}TrafficList`,
  "data-overview-mobile-rank-list=\"app-device-list\"",
], `source ${activeMobileVersion} list landmark`);
includesAny(sourceV225Runtime, [
  "routeros-rest-ssh-snapshot-status-line",
  "data-overview-mobile-first-visual=\"scenario-specific\"",
], `source ${activeMobileVersion} no-snapshot mini visual landmark`);

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
  `<div className="${activeMobileClassPrefix}-shell">`,
  `<${activeMobileFunctionPrefix}Hero {...props} />`,
], `active source ${activeMobileVersion} mobile 390x844 app shell and hero`);
assert(
  activeMobileExport.includes(`className="${activeMobileClassPrefix}-screen"`)
    || activeMobileExport.includes(`className="${activeMobileClassPrefix}-first-screen"`),
  `active source ${activeMobileVersion} must expose an active mobile first-screen shell`,
);

includesAll(sourceV225HeroBlock, [
  `${activeMobileDataPrefix}-hero=`,
  'data-overview-mobile-first-visual="scenario-specific"',
  'data-overview-mobile-first-microchart="true"',
], `source ${activeMobileVersion} mobile first-screen hero visual contract`);
includesAny(sourceV225HeroBlock, [
  "HeroVisual(props)",
  `${activeMobileFunctionPrefix}ScenarioVisual(props)`,
  "<TrafficSpark",
  "data-overview-mobile-first-visual=\"scenario-specific\"",
], `source ${activeMobileVersion} mobile first-screen mini visual implementation`);
includesAny(activeMobileExport + sourceV225HeroBlock, [
  `${activeMobileDataPrefix}-visual-contract="thin-wan-sparkline wan-eight-port-matrix`,
  'data-overview-mobile-first-microchart="true"',
  'data-overview-chart-type="mini-line"',
  'data-overview-chart-type="matrix"',
], `source ${activeMobileVersion} mobile first-screen chart-or-port-matrix contract`);
includesAny(sourceV225Runtime, [
  "SceneVisual",
  `${activeMobileFunctionPrefix}HeroVisual`,
  `${activeMobileFunctionPrefix}ScenarioVisual`,
], `source ${activeMobileVersion} scene visual router landmark`);
includesAll(sourceV225Runtime, [
  `${activeMobileFunctionPrefix}LineChart`,
  `${activeMobileFunctionPrefix}PortMatrix`,
  `${activeMobileFunctionPrefix}ChannelRail`,
  `${activeMobileFunctionPrefix}InterfaceFlow`,
], `source ${activeMobileVersion} must keep scene visual variants: sparkline / port matrix / channel / flow`);
excludesPatterns(sourceV225Runtime, mobileFirstScreenDomTablePatterns, `source ${activeMobileVersion} mobile first-screen table/td/th visual redline`);

includesAll(sourceV225StatusDockBlock, [
  'state.scenario === "no-snapshot"',
  '"不展示"',
  '"无业务快照"',
], `source ${activeMobileVersion} no-snapshot must hide rates instead of rendering fake 0 B/s`);
assert(
  /(?:失败端点|端点失败)[\s\S]{0,140}(?:未记录|不等于\s*0)/.test(sourceV230RowsBlock || sourceV225Runtime),
  `source ${activeMobileVersion} no-snapshot must not turn failed endpoint into 0`,
);
excludesPatterns(sourceV225StatusDockBlock + sourceV225HeroBlock + sourceV230RowsBlock, noSnapshotZeroThroughputTextPatterns, `source ${activeMobileVersion} no-snapshot zero-throughput text redline`);

excludesPatterns(sourceV225Runtime, [
  ...mobileTablePatterns,
  ...desktopCompressionLeakPatterns,
  ...focusEllipsisPatterns,
  ...mobilePrimaryStatusFocusPatterns,
  ...englishResourcePatterns,
  ...mobileMultiKpiCardStackPatterns,
  ...mobileKpiGridRedlinePatterns,
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
], `source ${activeMobileVersion} status/surface style landmark`);
includesAny(sourceV225MobileStyles, [
  `.${activeMobileClassPrefix}-list`,
  `.${activeMobileClassPrefix}-traffic`,
], `source ${activeMobileVersion} list style landmark`);
excludesPatterns(sourceV225MobileStyles, [
  ...mobileFirstScreenDisplayTableCssPatterns,
  ...mobileKpiGridRedlinePatterns,
  ...mobileMultiKpiCardStackPatterns,
  ...mobileThickProgressCssPatterns,
  ...mobileV225TitleCollisionPatterns,
  ...mobileTitleStatusCollisionStylePatterns,
  ...mobileDesktopTableClassLeakPatterns,
], `source ${activeMobileVersion} mobile style redlines`);
assertPatternCountAtMost(
  sourceV225MobileStyles,
  /\bborder(?:-(?:top|right|bottom|left))?\s*:\s*(?!0\b)/i,
  18,
  `source ${activeMobileVersion} mobile first-screen border density redline`,
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

excludesAll(activeMobileExport, [
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
  'module="no-snapshot-channel-status"',
  "不使用零速率撑版面",
  "业务字段不裸露",
], "desktop no-snapshot must use collection/visibility modules instead of a WAN rate main module");
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

excludesPatterns(overviewPanel, [/ik-v222-tabbar/i, /data-overview-mobile-v222-bottom-tab/i], "desktop source must not mount mobile tabbar");
excludesPatterns(overviewPanel, [
  /data-overview-density-module=["'](?:toy|demo|placeholder|sample)["']/i,
  /(?:toy|demo|placeholder|sample)[-_\s]*(?:module|panel|card)/i,
  /(?:module|panel|card)[-_\s]*(?:toy|demo|placeholder|sample)/i,
  /(?:desktop|content)[-_\s]*(?:big|large)[-_\s]*icon[-_\s]*(?:tab|tabs|tabbar)/i,
  /(?:big|large)[-_\s]*icon[-_\s]*(?:tab|tabs|tabbar)[-_\s]*(?:desktop|content)/i,
  /data-overview-desktop-content-icon-tabs=["']true["']/i,
], "desktop source toy-module/content-icon-tab redlines");

if (failures.length) {
    console.error("overview ikuai static gate active-mobile-redlines: FAIL");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log("overview ikuai static gate active-mobile-redlines: PASS");
  process.exit(0);
