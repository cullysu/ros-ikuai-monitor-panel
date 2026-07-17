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
const react = (await import("@vitejs/plugin-react")).default;

const rootDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(rootDir, "..");
const frameworkDir = resolve(projectRoot, "public/assets/framework");

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
    minify: false,
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

const stalePattern = /^(?:panel-framework\.[0-9a-f]{12}\.js|style\.[0-9a-f]{12}\.css)(?:\.(?:br|gz))?$/;
for (const name of readdirSync(frameworkDir)) {
  if (stalePattern.test(name) || name === "manifest.json") {
    rmSync(resolve(frameworkDir, name), { force: true });
  }
}

const assets = {};
for (const definition of [
  { kind: "script", source: "panel-framework.js", prefix: "panel-framework", extension: "js" },
  { kind: "style", source: "style.css", prefix: "style", extension: "css" },
]) {
  const body = readFileSync(resolve(frameworkDir, definition.source));
  const sha256 = createHash("sha256").update(body).digest("hex");
  const file = `${definition.prefix}.${sha256.slice(0, 12)}.${definition.extension}`;
  const outputPath = resolve(frameworkDir, file);
  const gzip = gzipSync(body, { level: 9 });
  const brotli = brotliCompressSync(body, {
    params: {
      [zlibConstants.BROTLI_PARAM_MODE]: zlibConstants.BROTLI_MODE_TEXT,
      [zlibConstants.BROTLI_PARAM_QUALITY]: 9,
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

writeFileSync(
  resolve(frameworkDir, "manifest.json"),
  `${JSON.stringify({ version: 1, assets }, null, 2)}\n`,
  "utf8",
);

const indexPath = resolve(projectRoot, "public/index.html");
const indexSource = readFileSync(indexPath, "utf8")
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
