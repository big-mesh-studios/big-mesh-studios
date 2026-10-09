/**
 * Runs a TypeScript tool under Vite's module runner, so that a tool can import this workspace's
 * packages.
 *
 *   node --experimental-transform-types tools/run.ts tools/make-snack-models.ts
 *
 * ## Why this exists at all
 *
 * **Because the packages resolve to TypeScript source and that source uses extensionless
 * relative imports.** `@big-mesh-studios/sdf`'s `exports` is `"./src/index.ts"`, and
 * `src/index.ts` writes `./primitives` — which `moduleResolution: "bundler"` resolves and Node's
 * ESM loader does not. So `node --experimental-transform-types tools/make-snack-models.ts`
 * fails at the first import, and not in a way that suggests anything about the model tool.
 *
 * `tools/place-reference.ts` runs under plain Node because it does not import the packages at
 * all: it reads their sources as text and hands them to the type checker. That is the better
 * design for what it does — a reference should be a function of the declarations, not of their
 * runtime — but a model generator genuinely needs `serialiseOperations` to be the one
 * implementation of the binary format rather than a copy that drifts from it, and there is no
 * honest way to get that without executing the package.
 *
 * ## Why Vite rather than `tsx`
 *
 * **`tsx` is not a dependency of this repository**, and `apps/voxelscape/tools/
 * generate-demo-model-dts.ts` documents needing it — which means adding a dependency for this
 * one job would be a change to the workspace for the sake of a tool. Vite is already here, and
 * `ssrLoadModule` is exactly a bundler-aware runner: it resolves the way the application does,
 * so a tool that runs is a tool that runs in the same module graph the app sees.
 *
 * ## What it does not do
 *
 * **It does not build a bundle on disk and it does not watch.** One process, one entry, then
 * `close()` — a tool run is a one-off and anything persistent is the tool's business.
 */

import { createServer } from "vite";

const entry = process.argv[2];

if (entry === undefined) {
  console.error(
    "usage: node --experimental-transform-types tools/run.ts <entry.ts>",
  );
  process.exit(1);
}

/**
 * **Module-level configuration, and it is the application this repository would actually build.**
 * The tool has to see the app's aliases and compiler options or the packages it imports are
 * different modules from the ones the app gets, and a generator that disagrees with the app
 * about a workspace package is worse than no generator.
 */
const server = await createServer({
  configFile: false,
  root: new URL("..", import.meta.url).pathname,
  logLevel: "warn",
  // **`watch: null` and not just `hmr: false`.** A generator writes forty files into
  // `public/` and the watcher is watching `public/`; without this the watcher queues a resolve
  // for each of them, `close()` tears the server down underneath, and the tool exits non-zero
  // having successfully written every model. A watcher this process will never use is only a
  // way to lose the run.
  server: { middlewareMode: true, hmr: false, watch: null },
  optimizeDeps: { noDiscovery: true },
});

try {
  const loaded = (await server.ssrLoadModule(entry)) as Record<string, unknown>;
  const run = loaded["run"];
  if (typeof run !== "function") {
    // **Named rather than default, and refused rather than guessed at.** A tool module is an
    // ordinary module that happens to be an entry point, and exporting a named `run` means it
    // can also be imported by a test without running anything — which is the only way a
    // generator gets checked.
    throw new Error(`${entry} exports no \`run\` function`);
  }
  await run();
} catch (error) {
  // **A non-zero exit and a printed stack**, rather than an unhandled rejection. `npm run`
  // failing is the whole of what this tool's caller relies on, and a tool that prints a stack
  // and exits zero has told `npm` the generation succeeded.
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
} finally {
  await server.close();
}
