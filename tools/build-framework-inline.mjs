import childProcess from "node:child_process";
import { createHash } from "node:crypto";
import {
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  brotliCompressSync,
  brotliDecompressSync,
  constants as zlibConstants,
  gunzipSync,
  gzipSync,
} from "node:zlib";
import frameworkAssetIdentity from "./framework-asset-identity.js";

const { computeFrameworkInputIdentity } = frameworkAssetIdentity;

const originalExec = childProcess.exec;
childProcess.exec = function patchedExec(command, options, callback) {
  const cb = typeof options === "function" ? options : callback;
  if (String(command).trim().toLowerCase() === "net use" && typeof cb === "function") {
    queueMicrotask(() => cb(null, "", ""));
    return {
      pid: 0,
      killed: false,
      kill() { this.killed = true; return true; },
      on() { return this; },
      once() { return this; },
      stdout: null,
      stderr: null
    };
  }
  return originalExec.apply(this, arguments);
};
syncBuiltinESMExports();

const { build, defineConfig } = await import("vite");
const { build: buildStandaloneCss } = await import("esbuild");
const react = (await import("@vitejs/plugin-react")).default;
const postcss = (await import("postcss")).default;

const rootDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(rootDir, "..");
const frameworkDir = resolve(projectRoot, "public/assets/framework");
const frameworkInputsBeforeBuild = computeFrameworkInputIdentity(projectRoot);

await build(defineConfig({
  root: projectRoot,
  configFile: false,
  plugins: [react()],
  esbuild: false,
  publicDir: false,
  define: {
    "process.env.NODE_ENV": JSON.stringify("production")
  },
  build: {
    minify: "terser",
    terserOptions: {
      compress: { passes: 2 },
      format: { comments: false },
      mangle: true,
    },
    cssMinify: true,
    outDir: frameworkDir,
    emptyOutDir: false,
    lib: {
      entry: resolve(projectRoot, "src/panel-framework/main.tsx"),
      name: "PanelFramework",
      formats: ["iife"],
      fileName: () => "panel-framework.js",
      cssFileName: "style"
    }
  }
}));

const frameworkInputs = computeFrameworkInputIdentity(projectRoot);
if (frameworkInputs.digest !== frameworkInputsBeforeBuild.digest) {
  throw new Error(
    "framework build inputs changed while the bundle was being generated; retry from a stable worktree",
  );
}

const stalePattern = /^(?:panel-framework\.[0-9a-f]{12}\.js|style\.[0-9a-f]{12}\.css|desktop-overview\.[0-9a-f]{12}\.css)(?:\.(?:br|gz))?$/;
for (const name of readdirSync(frameworkDir)) {
  if (stalePattern.test(name) || name === "manifest.json") {
    rmSync(resolve(frameworkDir, name), { force: true });
  }
}

const assets = {};
const preservedFrameworkCustomProperties = new Set([
  "--mdw-muted",
  "--mdw-faint",
  "--mdw-surface",
  "--mdw-surface-tonal",
]);

function compactFrameworkCustomProperties(body) {
  const names = [...new Set(body.match(/--[A-Za-z0-9_-]+/g) || [])]
    .filter((name) => !preservedFrameworkCustomProperties.has(name));
  const countUses = (name) => {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return (body.match(new RegExp(`${escaped}(?![A-Za-z0-9_-])`, "g")) || []).length;
  };
  // Give the most frequently emitted private tokens the shortest deterministic
  // names. Keep the four diagnostic aliases reserved by
  // compactPreservedFrameworkReferences and avoid collisions with source names.
  names.sort((left, right) => {
    const useDelta = countUses(right) - countUses(left);
    if (useDelta !== 0) return useDelta;
    return left < right ? -1 : left > right ? 1 : 0;
  });
  const reservedAliases = new Set(["--m", "--n", "--o", "--p"]);
  const occupied = new Set([...names, ...reservedAliases]);
  const candidates = [
    ..."abcdefghijklmnopqrstuvwxyz".split("").map((letter) => `--${letter}`),
    ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letter) => `--${letter}`),
    ...Array.from({ length: 128 }, (_, index) => `--a${index.toString(36)}`),
  ];
  const aliases = new Map();
  for (const name of names) {
    const alias = candidates.find((candidate) => !occupied.has(candidate));
    if (!alias) throw new Error("private custom-property alias budget exhausted");
    aliases.set(name, alias);
    occupied.add(alias);
  }
  return body.replace(/--[A-Za-z0-9_-]+/g, (name) => aliases.get(name) || name);
}

function compactFrameworkSelectorCombinators(body) {
  // Only rewrite selector/at-rule preludes. Declaration values such as
  // calc(100% + 10px) require their surrounding whitespace and must remain
  // untouched.
  return body.replace(/(^|[{}])([^{}]*)(?=\{)/g, (match, boundary, prelude) =>
    `${boundary}${prelude.replace(/\s*([>+~])\s*/g, "$1")}`,
  );
}

function compactFrameworkColorKeywords(body) {
  // CSS Color 4 four-digit hex is equivalent to transparent black and is
  // supported by the browser targets of this panel. Keep this deterministic
  // reduction in the production builder rather than editing generated assets.
  return body.replace(/\btransparent\b/g, "#0000");
}

function compactFrameworkRgbaFunctions(body) {
  // The emitted stylesheet already uses modern rgb() slash-alpha notation;
  // normalize legacy rgba() spellings without changing the channel values.
  return body.replace(
    /rgba\((\d+),(\d+),(\d+),([.\d]+)\)/g,
    "rgb($1 $2 $3/$4)",
  );
}

function compactAdjacentFrameworkBlocks(body) {
  const root = postcss.parse(body);
  let changed = false;

  function visit(container, parentAtRuleName = "") {
    if (!container.nodes) return;
    for (const child of [...container.nodes]) {
      if (child.nodes) visit(child, child.type === "atrule" ? child.name : parentAtRuleName);
    }

    for (let index = 0; index < container.nodes.length - 1;) {
      const current = container.nodes[index];
      const next = container.nodes[index + 1];
      if (
        current.type === "atrule" &&
        next.type === "atrule" &&
        current.name === next.name &&
        current.params === next.params &&
        current.nodes &&
        next.nodes
      ) {
        current.append(next.nodes);
        next.remove();
        changed = true;
        continue;
      }
      if (
        parentAtRuleName !== "keyframes" &&
        parentAtRuleName !== "-webkit-keyframes" &&
        current.type === "rule" &&
        next.type === "rule" &&
        current.selector === next.selector &&
        current.nodes &&
        next.nodes
      ) {
        // Adjacent rules with the same selector have identical cascade
        // position. Joining their declaration lists removes patch sediment
        // without moving a rule across any competing selector.
        current.append(next.nodes);
        next.remove();
        changed = true;
        continue;
      }
      if (
        parentAtRuleName !== "keyframes" &&
        parentAtRuleName !== "-webkit-keyframes" &&
        current.type === "rule" &&
        next.type === "rule" &&
        current.nodes &&
        next.nodes &&
        current.nodes.toString() === next.nodes.toString()
      ) {
        current.selector = `${current.selector},${next.selector}`;
        next.remove();
        changed = true;
        continue;
      }
      index += 1;
    }
  }

  let passes = 0;
  do {
    changed = false;
    visit(root);
    passes += 1;
    if (passes > 2048) throw new Error("adjacent framework block compaction did not converge");
  } while (changed);
  return root.toString();
}

function compactFrameworkTransparentBackgrounds(body) {
  // `background:#0000` is a shorthand with the same initial image/repeat/
  // position values as `background:none`; keep the equivalence in the builder.
  return body.replace(/background:#0000/g, "background:none");
}
function compactFrameworkZeroLengths(body) {
  // A bare zero is equivalent to a zero length in ordinary CSS declarations.
  // Preserve zero units inside CSS math functions: a unit can be required by
  // the dimensional algebra there, even when its numeric value is zero.
  const mathBlocks = [];
  const protectedBody = body.replace(/(?:calc|min|max|clamp)\([^)]*\)/g, (match) => {
    if (!match.includes("0px")) return match;
    const token = "__PANEL_ZERO_LENGTH_" + mathBlocks.length + "__";
    mathBlocks.push(match);
    return token;
  });
  let compact = protectedBody.replace(/(?<![0-9A-Za-z_.-])0px(?![A-Za-z0-9_.-])/g, "0");
  for (let index = 0; index < mathBlocks.length; index += 1) {
    compact = compact.replace("__PANEL_ZERO_LENGTH_" + index + "__", mathBlocks[index]);
  }
  return compact;
}

function compactPreservedFrameworkReferences(body) {
  const aliases = new Map([
    ["--mdw-muted", "--m"],
    ["--mdw-faint", "--n"],
    ["--mdw-surface", "--o"],
    ["--mdw-surface-tonal", "--p"],
  ]);
  let compact = body;
  for (const [name, alias] of aliases) {
    compact = compact.replaceAll(`var(${name})`, `var(${alias})`);
  }
  const definitions = [...aliases]
    .map(([name, alias]) => `${alias}:var(${name})`)
    .join(";");
  const anchor = /--mdw-faint:[^;{}]+;/;
  if (!anchor.test(compact)) {
    throw new Error("preserved framework custom-property anchor missing");
  }
  return compact.replace(anchor, (match) => `${match}${definitions};`);
}

for (const definition of [
  { kind: "script", source: "panel-framework.js", prefix: "panel-framework", extension: "js" },
  { kind: "style", source: "style.css", prefix: "style", extension: "css" },
]) {
  let body = readFileSync(resolve(frameworkDir, definition.source));
  if (definition.kind === "style") {
    // Vite/esbuild leaves harmless declaration-value whitespace in a few
    // custom-property and media-query forms. Normalize only separators that
    // cannot change CSS value meaning, keeping the public byte budget stable
    // across the Windows/Linux build path.
    let cssBody = body
      .toString("utf8")
      .replace(/:\s+/g, ":")
      .replace(/,\s+/g, ",")
      .replace(/\s+\/\s+/g, "/");
    cssBody = compactFrameworkSelectorCombinators(cssBody);
    cssBody = compactFrameworkColorKeywords(cssBody);
    cssBody = compactFrameworkRgbaFunctions(cssBody);
    // The desktop overview is a separately loaded stylesheet. Keep public
    // custom-property names stable across the two assets; aliasing the main
    // bundle would make a desktop var(--do-blue) reference resolve to a name
    // that only exists inside the mobile asset's private compaction map.
    cssBody = compactAdjacentFrameworkBlocks(cssBody);
    cssBody = compactFrameworkTransparentBackgrounds(cssBody);
    cssBody = compactFrameworkZeroLengths(cssBody);
    body = Buffer.from(cssBody);
    writeFileSync(resolve(frameworkDir, definition.source), body);
  }
  const sha256 = createHash("sha256").update(body).digest("hex");
  const file = `${definition.prefix}.${sha256.slice(0, 12)}.${definition.extension}`;
  const outputPath = resolve(frameworkDir, file);
  const gzip = gzipSync(body, { level: 9 });
  // zlib writes the host OS into byte 9 of the gzip header. Normalize it so
  // committed sidecars are byte-identical on Windows and Linux builders.
  gzip[9] = 255;
  const brotli = brotliCompressSync(body, {
    params: {
      [zlibConstants.BROTLI_PARAM_MODE]: zlibConstants.BROTLI_MODE_TEXT,
      [zlibConstants.BROTLI_PARAM_QUALITY]: 11,
    },
  });
  writeFileSync(outputPath, body);
  writeFileSync(`${outputPath}.gz`, gzip);
  writeFileSync(`${outputPath}.br`, brotli);
  if (!gunzipSync(gzip).equals(body) || !brotliDecompressSync(brotli).equals(body)) {
    throw new Error(`compressed framework asset verification failed: ${file}`);
  }
  assets[definition.kind] = {
    file,
    sha256,
    bytes: body.length,
    gzipBytes: gzip.length,
    brotliBytes: brotli.length,
  };
}

const desktopOverviewBuild = await buildStandaloneCss({
  absWorkingDir: projectRoot,
  entryPoints: [resolve(projectRoot, "src/panel-framework/overview/desktop-overview/styles/desktop-overview-entry.css")],
  bundle: true,
  minify: true,
  outfile: resolve(frameworkDir, "desktop-overview.css"),
  write: false,
  logLevel: "silent",
});
const desktopOverviewOutput = desktopOverviewBuild.outputFiles?.find((file) => file.path.endsWith(".css"));
if (!desktopOverviewOutput) throw new Error("desktop overview stylesheet was not emitted");
const desktopOverviewBody = Buffer.from(desktopOverviewOutput.contents);
const desktopOverviewSha256 = createHash("sha256").update(desktopOverviewBody).digest("hex");
const desktopOverviewFile = `desktop-overview.${desktopOverviewSha256.slice(0, 12)}.css`;
const desktopOverviewPath = resolve(frameworkDir, desktopOverviewFile);
const desktopOverviewGzip = gzipSync(desktopOverviewBody, { level: 9 });
desktopOverviewGzip[9] = 255;
const desktopOverviewBrotli = brotliCompressSync(desktopOverviewBody, {
  params: {
    [zlibConstants.BROTLI_PARAM_MODE]: zlibConstants.BROTLI_MODE_TEXT,
    [zlibConstants.BROTLI_PARAM_QUALITY]: 11,
  },
});
writeFileSync(desktopOverviewPath, desktopOverviewBody);
writeFileSync(`${desktopOverviewPath}.gz`, desktopOverviewGzip);
writeFileSync(`${desktopOverviewPath}.br`, desktopOverviewBrotli);
if (!gunzipSync(desktopOverviewGzip).equals(desktopOverviewBody) || !brotliDecompressSync(desktopOverviewBrotli).equals(desktopOverviewBody)) {
  throw new Error(`compressed desktop overview stylesheet verification failed: ${desktopOverviewFile}`);
}
assets.desktopStyle = {
  file: desktopOverviewFile,
  sha256: desktopOverviewSha256,
  bytes: desktopOverviewBody.length,
  gzipBytes: desktopOverviewGzip.length,
  brotliBytes: desktopOverviewBrotli.length,
};

writeFileSync(
  resolve(frameworkDir, "manifest.json"),
  `${JSON.stringify({ version: 2, inputs: frameworkInputs, assets }, null, 2)}\n`,
  "utf8",
);

const indexPath = resolve(projectRoot, "public/index.html");
let indexSource = readFileSync(indexPath, "utf8")
  .replace(
    /<link rel="stylesheet"[^>]*data-overview-framework-asset="desktop-style"[^>]*>\s*/g,
    "",
  )
  .replace(
    /(<link rel="stylesheet"[^>]*data-overview-framework-asset="style"[^>]*>)/,
    `<link rel="stylesheet" href="/assets/framework/${assets.desktopStyle.file}" media="(min-width: 1200px)" data-overview-framework-asset="desktop-style">\n  $1`,
  )
  .replace(
    /\/assets\/framework\/style(?:\.[0-9a-f]{12})?\.css/g,
    `/assets/framework/${assets.style.file}`,
  )
  .replace(
    /\/assets\/framework\/panel-framework(?:\.[0-9a-f]{12})?\.js/g,
    `/assets/framework/${assets.script.file}`,
  );
writeFileSync(indexPath, indexSource, "utf8");

// The bundle is committed as a public runtime asset. Validate the generated
// JavaScript itself so a truncated or otherwise malformed artifact cannot pass
// a source-only TypeScript build.
for (const scriptPath of [
  resolve(frameworkDir, "panel-framework.js"),
  resolve(frameworkDir, assets.script.file),
]) {
  childProcess.execFileSync(process.execPath, ["--check", scriptPath], {
    stdio: "inherit",
  });
}
