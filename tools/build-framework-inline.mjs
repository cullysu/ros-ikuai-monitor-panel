import childProcess from "node:child_process";
import { syncBuiltinESMExports } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

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
    outDir: resolve(projectRoot, "public/assets/framework"),
    emptyOutDir: false,
    lib: {
      entry: resolve(projectRoot, "src/panel-framework/main.tsx"),
      name: "PanelFramework",
      formats: ["iife"],
      fileName: () => "panel-framework.js"
    }
  }
}));
