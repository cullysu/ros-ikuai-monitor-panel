#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";

const root = resolve(import.meta.dirname, "..");
const sourcePath = resolve(root, "src", "panel-framework", "connection", "routerAddress.ts");
const source = readFileSync(sourcePath, "utf8");
const { outputText, diagnostics } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: sourcePath,
  reportDiagnostics: true,
});

if (diagnostics?.length) {
  throw new Error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: (fileName) => fileName,
    getCurrentDirectory: () => root,
    getNewLine: () => "\n",
  }));
}

const { validateRouterAddress } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);

const allowed = [
  "router.lan",
  "xn--bcher-kva.example",
  "bücher.example",
  "0.0.0.0",
  "255.255.255.255",
  "::1",
  "2001:db8::1",
  "[2001:db8::1]",
  "::ffff:192.0.2.1",
];
const rejected = [
  "256.0.0.1",
  "1.2.3.999",
  "router.lan:8728",
  "[2001:db8::1]:8728",
  "https://router.lan",
  "admin@router.lan",
  "router.lan?debug=1",
  "router.lan#fragment",
  "router.lan/rest",
];

for (const value of allowed) {
  if (validateRouterAddress(value) !== "") throw new Error(`expected address to be allowed: ${value}`);
}
for (const value of rejected) {
  if (validateRouterAddress(value) === "") throw new Error(`expected address to be rejected: ${value}`);
}

console.log("connection public contract v2 frontend: pass");
