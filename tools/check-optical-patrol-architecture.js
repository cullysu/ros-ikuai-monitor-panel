#!/usr/bin/env node
/* Semantic ownership gate for the selected Optical Patrol mobile Overview. */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const mobileOverviewRoot = path.join(
  root,
  "src",
  "panel-framework",
  "overview",
  "mobile-overview",
);
const opticalRoot = path.join(mobileOverviewRoot, "optical-patrol");
const mobileEntry = path.join(mobileOverviewRoot, "MobileOverviewEntry.tsx");
const issues = [];
const notes = [];

const REQUIRED_SCENES = [
  "single",
  "fleet",
  "interfaces-down",
  "resource-full",
  "collection-down",
  "all-offline",
  "no-snapshot",
];

function exists(file) {
  return fs.existsSync(file);
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function relative(file) {
  return path.relative(root, file).split(path.sep).join("/");
}

function walk(directory, predicate = () => true) {
  if (!exists(directory)) return [];
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const item = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(item, predicate));
    else if (predicate(item)) files.push(item);
  }
  return files;
}

function check(condition, message) {
  if (!condition) issues.push(message);
}

function sourceFile(file) {
  const kind = file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  return ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true, kind);
}

function visit(node, callback) {
  callback(node);
  ts.forEachChild(node, (child) => visit(child, callback));
}

function nodeName(node) {
  return node?.name && ts.isIdentifier(node.name) ? node.name.text : "";
}

function moduleSpecifiers(ast) {
  const values = [];
  visit(ast, (node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node))
      && node.moduleSpecifier
      && ts.isStringLiteralLike(node.moduleSpecifier)
    ) {
      values.push(node.moduleSpecifier.text);
      return;
    }
    if (!ts.isCallExpression(node) || node.arguments.length !== 1) return;
    const argument = node.arguments[0];
    if (!ts.isStringLiteralLike(argument)) return;
    if (node.expression.kind === ts.SyntaxKind.ImportKeyword) values.push(argument.text);
    if (ts.isIdentifier(node.expression) && node.expression.text === "require") values.push(argument.text);
  });
  return values;
}

function declaredNames(ast) {
  const names = new Set();
  visit(ast, (node) => {
    if (
      ts.isFunctionDeclaration(node)
      || ts.isClassDeclaration(node)
      || ts.isInterfaceDeclaration(node)
      || ts.isTypeAliasDeclaration(node)
      || ts.isEnumDeclaration(node)
      || ts.isVariableDeclaration(node)
    ) {
      const name = nodeName(node);
      if (name) names.add(name);
    }
  });
  return names;
}

function exportedNames(ast) {
  const names = new Set();
  for (const statement of ast.statements) {
    const modifiers = ts.canHaveModifiers(statement) ? ts.getModifiers(statement) || [] : [];
    if (!modifiers.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) continue;
    if (
      ts.isFunctionDeclaration(statement)
      || ts.isClassDeclaration(statement)
      || ts.isInterfaceDeclaration(statement)
      || ts.isTypeAliasDeclaration(statement)
      || ts.isEnumDeclaration(statement)
    ) {
      const name = nodeName(statement);
      if (name) names.add(name);
      continue;
    }
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        const name = nodeName(declaration);
        if (name) names.add(name);
      }
    }
  }
  return names;
}

function jsxTagName(node) {
  if (!node) return "";
  if (ts.isIdentifier(node)) return node.text;
  return node.getText();
}

function subtreeHasJsxTag(node, pattern) {
  let found = false;
  visit(node, (candidate) => {
    if (found) return;
    if (ts.isJsxOpeningElement(candidate) || ts.isJsxSelfClosingElement(candidate)) {
      found = pattern.test(jsxTagName(candidate.tagName));
    }
  });
  return found;
}

function hasExclusivePhoneWorkbenchBranch(ast) {
  let found = false;
  visit(ast, (node) => {
    if (found) return;
    if (ts.isConditionalExpression(node)) {
      const condition = node.condition.getText(ast);
      const trueWorkbench = subtreeHasJsxTag(node.whenTrue, /Workbench$/);
      const falseWorkbench = subtreeHasJsxTag(node.whenFalse, /Workbench$/);
      const truePhone = subtreeHasJsxTag(node.whenTrue, /Phone$/);
      const falsePhone = subtreeHasJsxTag(node.whenFalse, /Phone$/);
      found = /workbench|capability|tablet/i.test(condition)
        && ((trueWorkbench && falsePhone) || (truePhone && falseWorkbench));
      return;
    }
    if (ts.isIfStatement(node) && node.elseStatement) {
      const condition = node.expression.getText(ast);
      const thenWorkbench = subtreeHasJsxTag(node.thenStatement, /Workbench$/);
      const elseWorkbench = subtreeHasJsxTag(node.elseStatement, /Workbench$/);
      const thenPhone = subtreeHasJsxTag(node.thenStatement, /Phone$/);
      const elsePhone = subtreeHasJsxTag(node.elseStatement, /Phone$/);
      found = /workbench|capability|tablet/i.test(condition)
        && ((thenWorkbench && elsePhone) || (thenPhone && elseWorkbench));
    }
  });
  return found;
}

function jsxClassTokens(ast) {
  const tokens = [];
  visit(ast, (node) => {
    if (!ts.isJsxAttribute(node) || node.name.text !== "className" || !node.initializer) return;
    let value = "";
    if (ts.isStringLiteral(node.initializer)) value = node.initializer.text;
    if (
      ts.isJsxExpression(node.initializer)
      && node.initializer.expression
      && (ts.isStringLiteralLike(node.initializer.expression) || ts.isNoSubstitutionTemplateLiteral(node.initializer.expression))
    ) {
      value = node.initializer.expression.text;
    }
    if (value) tokens.push(...value.split(/\s+/).filter(Boolean));
  });
  return tokens;
}

function hasJsxAttribute(ast, name) {
  let found = false;
  visit(ast, (node) => {
    if (ts.isJsxAttribute(node) && node.name.text === name) found = true;
  });
  return found;
}

function stringLiterals(asts) {
  const values = new Set();
  for (const ast of asts) {
    visit(ast, (node) => {
      if (ts.isStringLiteralLike(node)) values.add(node.text);
    });
  }
  return values;
}

function namedTypeBody(ast, pattern) {
  const bodies = [];
  visit(ast, (node) => {
    if (
      (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node))
      && pattern.test(nodeName(node))
    ) {
      bodies.push(node);
    }
  });
  return bodies;
}

function propertyTypeText(typeNode, property) {
  if (ts.isInterfaceDeclaration(typeNode)) {
    const member = typeNode.members.find((candidate) => (
      ts.isPropertySignature(candidate)
      && candidate.name
      && candidate.name.getText(typeNode.getSourceFile()).replace(/["']/g, "") === property
    ));
    return member?.type?.getText(typeNode.getSourceFile()) || "";
  }
  if (ts.isTypeAliasDeclaration(typeNode) && ts.isTypeLiteralNode(typeNode.type)) {
    const member = typeNode.type.members.find((candidate) => (
      ts.isPropertySignature(candidate)
      && candidate.name
      && candidate.name.getText(typeNode.getSourceFile()).replace(/["']/g, "") === property
    ));
    return member?.type?.getText(typeNode.getSourceFile()) || "";
  }
  return "";
}

function hasTypedModelBuilder(ast) {
  let found = false;
  visit(ast, (node) => {
    let name = "";
    let parameters = [];
    if (ts.isFunctionDeclaration(node)) {
      name = nodeName(node);
      parameters = node.parameters;
    } else if (
      ts.isVariableDeclaration(node)
      && node.initializer
      && (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))
    ) {
      name = nodeName(node);
      parameters = node.initializer.parameters;
    }
    if (!/build.*OpticalPatrol.*Model/i.test(name)) return;
    const parameterTypes = parameters.map((parameter) => parameter.type?.getText(ast) || "");
    found = parameterTypes.includes("OverviewEvidenceModel")
      && parameterTypes.includes("OverviewDerivedState");
  });
  return found;
}

function hasBoundActionObject(ast) {
  let found = false;
  visit(ast, (node) => {
    if (!ts.isObjectLiteralExpression(node)) return;
    const properties = new Set(node.properties.map((property) => {
      if (
        (ts.isPropertyAssignment(property) || ts.isShorthandPropertyAssignment(property))
        && property.name
      ) return property.name.getText(ast).replace(/["']/g, "");
      return "";
    }));
    if (properties.has("route") && properties.has("objectId")) found = true;
  });
  return found;
}

function hasActionDispatch(ast) {
  let found = false;
  visit(ast, (node) => {
    if (!ts.isCallExpression(node)) return;
    const callee = node.expression.getText(ast);
    if (!/(?:open|action|navigate)/i.test(callee)) return;
    const argumentsText = node.arguments.map((argument) => argument.getText(ast)).join(" ");
    if (/\baction\b/i.test(argumentsText)) found = true;
    if (/\.route\b/.test(argumentsText) && /\.objectId\b/.test(argumentsText)) found = true;
  });
  return found;
}

function cssClassNames(source) {
  return [...source.matchAll(/\.([A-Za-z_][\w-]*)/g)].map((match) => match[1]);
}

function cssOwnershipIssues(file, source) {
  for (const match of source.matchAll(/([^{}]+)\{([^{}]*(?:backdrop-filter|box-shadow)[^{}]*)\}/gi)) {
    const selector = match[1].trim();
    const body = match[2];
    const chromeOwned = /(?:op(?:__|-)[\w-]*(?:chrome|toolbar|navigation|nav|menu|sheet|runtime))/i.test(selector);
    const focusOwned = /:focus-visible/i.test(selector);
    // A zero-offset ring is an instrument/state marker, not surface elevation.
    // Keep it legal while continuing to reject raised content panels.
    const instrumentRing = /box-shadow\s*:\s*(?:inset\s+)?0\s+0\s+0\s+/i.test(body);
    if (/backdrop-filter\s*:/i.test(body) && !chromeOwned) {
      issues.push(`backdrop-filter is owned by Optical Patrol content instead of chrome: ${relative(file)} (${selector})`);
    }
    if (/box-shadow\s*:/i.test(body) && !chromeOwned && !focusOwned && !instrumentRing) {
      issues.push(`box-shadow is owned by Optical Patrol content instead of chrome/focus: ${relative(file)} (${selector})`);
    }
  }
}

function hasWorkbenchMediaCapability(source) {
  return [...source.matchAll(/@media\s*([^{}]+)\{/gi)].some((match) => (
    /min-width\s*:\s*768px/i.test(match[1])
    && /max-width\s*:\s*1199px/i.test(match[1])
  ));
}

if (!exists(opticalRoot)) {
  issues.push(`missing selected Optical Patrol owner directory: ${relative(opticalRoot)}`);
} else {
  const codeFiles = walk(opticalRoot, (file) => /\.(?:ts|tsx)$/.test(file));
  const tsxFiles = codeFiles.filter((file) => file.endsWith(".tsx"));
  const cssFiles = walk(opticalRoot, (file) => file.endsWith(".css"));
  const parsed = new Map(codeFiles.map((file) => [file, sourceFile(file)]));
  const asts = [...parsed.values()];
  const names = new Set(asts.flatMap((ast) => [...declaredNames(ast)]));
  const literals = stringLiterals(asts);
  const allCode = codeFiles.map(read).join("\n");
  const allCss = cssFiles.map(read).join("\n");

  check(codeFiles.length > 0, `Optical Patrol owner directory contains no TypeScript implementation: ${relative(opticalRoot)}`);
  check(cssFiles.length > 0, `Optical Patrol owner directory contains no CSS capability/material owner: ${relative(opticalRoot)}`);

  const ownerFile = tsxFiles.find((file) => exportedNames(parsed.get(file)).has("OpticalPatrol"));
  check(Boolean(ownerFile), `missing exported OpticalPatrol presentation owner under ${relative(opticalRoot)}`);
  if (ownerFile) {
    const ownerAst = parsed.get(ownerFile);
    const ownerClasses = jsxClassTokens(ownerAst);
    check(
      hasJsxAttribute(ownerAst, "data-op-root") || hasJsxAttribute(ownerAst, "data-optical-patrol-root"),
      `OpticalPatrol root must expose an Optical Patrol namespaced root marker: ${relative(ownerFile)}`,
    );
    check(ownerClasses.some((token) => token === "op" || token.startsWith("op-") || token.startsWith("op__")), `OpticalPatrol root must use the op class namespace: ${relative(ownerFile)}`);
  }

  const phoneOwners = [...names].filter((name) => /Phone$/.test(name));
  const workbenchOwners = [...names].filter((name) => /Workbench$/.test(name));
  check(
    (phoneOwners.length === 0 && workbenchOwners.length === 0)
      || (phoneOwners.length > 0 && workbenchOwners.length > 0),
    "Optical Patrol must use either one CSS-composed owner or a complete Phone/Workbench owner pair",
  );
  if (ownerFile && phoneOwners.length > 0 && workbenchOwners.length > 0) {
    check(
      hasExclusivePhoneWorkbenchBranch(parsed.get(ownerFile)),
      `OpticalPatrol must mount the Phone/Workbench owner pair through one explicit capability branch: ${relative(ownerFile)}`,
    );
  }

  for (const [file, ast] of parsed) {
    for (const specifier of moduleSpecifiers(ast)) {
      check(!/(?:pocket-console|pocketconsole)/i.test(specifier), `Optical Patrol must not import Pocket ownership: ${relative(file)} -> ${specifier}`);
      check(!/(?:desktop-overview|desktopoverview)/i.test(specifier), `Optical Patrol must not import desktop Overview ownership: ${relative(file)} -> ${specifier}`);
    }

    const source = read(file);
    check(!/\.pc__|data-pocket(?:-|\b)|panelPocketConsole|PocketConsole/i.test(source), `Optical Patrol contains rejected Pocket namespace/ownership: ${relative(file)}`);
    check(!/(?:data-[\w-]*(?:comparison|object-list|selection-detail|master-detail)|\bmodel\.comparison\b)/i.test(source), `Optical Patrol contains rejected comparison/list-detail data ownership: ${relative(file)}`);

    for (const name of declaredNames(ast)) {
      check(!/(?:Comparison|ObjectList|SelectionDetail|MasterDetail)$/.test(name), `Optical Patrol declares rejected comparison/list-detail owner ${name}: ${relative(file)}`);
    }
    for (const token of jsxClassTokens(ast)) {
      check(token === "op" || token.startsWith("op-") || token.startsWith("op__"), `non-op class namespace "${token}" in ${relative(file)}`);
      check(!/(?:card|list-detail|master-detail|selection-detail|comparison)/i.test(token), `rejected content ownership class "${token}" in ${relative(file)}`);
      const chromeToken = /(?:chrome|toolbar|navigation|nav|menu|sheet|runtime)/i.test(token);
      check(!/glass/i.test(token) || chromeToken, `glass class is owned by content instead of chrome: ${relative(file)} (${token})`);
    }
  }

  for (const file of cssFiles) {
    const source = read(file);
    for (const className of cssClassNames(source)) {
      check(className === "op" || className.startsWith("op-") || className.startsWith("op__"), `non-op CSS class namespace ".${className}" in ${relative(file)}`);
      check(!/(?:card|list-detail|master-detail|selection-detail|comparison)/i.test(className), `rejected content ownership CSS class ".${className}" in ${relative(file)}`);
    }
    check(!/\.pc__|data-pocket(?:-|\b)|panelPocketConsole/i.test(source), `Optical Patrol CSS contains rejected Pocket namespace: ${relative(file)}`);
    check(!/(?:\.op(?:__|-)[\w-]*(?:phone|workbench)[\w-]*)[^{}]*\{[^{}]*(?:display\s*:\s*none|visibility\s*:\s*hidden|content-visibility\s*:\s*hidden)/i.test(source), `Phone/Workbench composition must not be implemented as CSS-hidden duplicate trees: ${relative(file)}`);
    cssOwnershipIssues(file, source);
  }

  const capabilitySource = `${allCode}\n${allCss}`;
  if (phoneOwners.length > 0 && workbenchOwners.length > 0) {
    check(
      /(?:use[A-Za-z]*Capability|matchMedia|workbenchCapability)/.test(capabilitySource),
      "Optical Patrol must derive the mutually exclusive Phone/Workbench owner pair from a media/capability signal",
    );
  }
  check(
    hasWorkbenchMediaCapability(allCss),
    "Optical Patrol CSS must declare the selected 768–1199px Workbench capability",
  );

  const typedBuilder = asts.some(hasTypedModelBuilder);
  check(typedBuilder, "Optical Patrol model builder must accept OverviewEvidenceModel and OverviewDerivedState as typed parameters");

  check(
    names.has("OpticalPatrolScene") || /OPTICAL_PATROL_SCENES/.test(allCode),
    "Optical Patrol must expose a named scene contract (OpticalPatrolScene or OPTICAL_PATROL_SCENES)",
  );
  for (const scene of REQUIRED_SCENES) {
    check(literals.has(scene), `Optical Patrol scene contract is missing "${scene}"`);
  }

  const actionTypes = asts.flatMap((ast) => namedTypeBody(ast, /Action$/));
  const boundActionType = actionTypes.some((actionType) => {
    const route = propertyTypeText(actionType, "route");
    const objectId = propertyTypeText(actionType, "objectId");
    return route === "PanelRouteId" && /\bstring\b/.test(objectId);
  });
  check(boundActionType, "Optical Patrol action contract must bind route: PanelRouteId and a typed objectId");
  check(asts.some(hasBoundActionObject), "Optical Patrol model must construct actions with route and objectId together");
  check(asts.some(hasActionDispatch), "Optical Patrol presentation must dispatch the bound action object/route and objectId");
}

if (exists(mobileEntry)) {
  const entryAst = sourceFile(mobileEntry);
  const imports = moduleSpecifiers(entryAst);
  const importsPocket = imports.some((specifier) => /(?:pocket-console|pocketconsole)/i.test(specifier));
  const importsOptical = imports.some((specifier) => /optical-patrol/i.test(specifier));
  if (importsPocket && !importsOptical) {
    notes.push("MobileOverviewEntry still mounts Pocket during the parallel owner-build step; entry switching is intentionally not part of this gate.");
  }
  check(!(importsPocket && importsOptical), "MobileOverviewEntry must not mount Pocket and Optical Patrol owners together after switching begins");
}

const limitation = "LIMITATION: static semantic architecture evidence only; runtime geometry, interaction/history, accessibility, and human visual acceptance require separate gates.";
if (issues.length) {
  console.error("Optical Patrol architecture/static contract: FAIL");
  for (const issue of issues) console.error(`- ${issue}`);
  for (const note of notes) console.error(`NOTE: ${note}`);
  console.error(limitation);
  process.exitCode = 1;
} else {
  console.log("Optical Patrol architecture/static contract: PASS");
  console.log("Verified isolated Optical Patrol ownership, typed seven-scene model, mutually exclusive Phone/Workbench composition, op namespace, content material boundaries, and route/object-bound actions.");
  for (const note of notes) console.log(`NOTE: ${note}`);
  console.log(limitation);
}
