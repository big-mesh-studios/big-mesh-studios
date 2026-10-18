import {
  createDefaultMapFromCDN,
  createSystem,
  createVirtualTypeScriptEnvironment,
} from "@typescript/vfs";
import * as Comlink from "comlink";
import { createRoot } from "solid-js";
import type TS from "typescript";
import { createWorker } from "./codemirror-ts/worker";
import type { LSPAPI } from "./types";
import { loadTypeScript } from "./typescript-cdn";
import { createDebug } from "./utils";

const debug = createDebug("code-mirror worker");

Comlink.expose(
  createRoot((): LSPAPI => {
    /**
     * The options the current environment was built with.
     *
     * **A plain variable rather than a signal read by a memo.** Compiler options are
     * baked in when the virtual environment is constructed, so changing them means
     * replacing it — and a memo's recomputation is not something `setCompilerOptions`
     * can wait on. The earlier shape updated a signal and then initialized the memo's
     * *previous* worker, while the next request read the memo's new, uninitialized
     * worker: every completion after that answered `null`. See the swap below, which
     * only takes effect once the replacement has actually initialized.
     */
    let compilerOptions: TS.CompilerOptions = {};

    /**
     * Every file the provider has pushed, so a replacement environment starts with
     * the same corpus.
     *
     * **The provider cannot replay them itself** — it pushes only paths whose content
     * changed, and a rebuilt worker looks to it like the same environment.
     */
    const files = new Map<string, string>();

    // The TypeScript libs come down from the CDN once; every environment
    // built afterwards reuses the same downloaded files and virtual system.
    function createEnvFactory() {
      const defaultMap = new Promise<{
        system: TS.System;
        ts: typeof TS;
        fs: Map<string, string>;
      }>(async (resolve) => {
        const ts = await loadTypeScript();
        const fs = await createDefaultMapFromCDN(
          {
            target: ts.ScriptTarget.ES2015,
          },
          ts.version,
          false,
          ts,
        );
        const system = createSystem(fs);
        resolve({ system, ts, fs });
      });

      return async function createEnv(compilerOptions: TS.CompilerOptions) {
        const { system, ts } = await defaultMap;
        return {
          env: createVirtualTypeScriptEnvironment(system, [], ts, {
            // The same floor `createDefaultMapFromCDN` above already
            // downloads lib files for — without it, an unset `target`
            // defaults to a TypeScript version far older than any of this
            // codebase's own output, and flags everyday ES2015+ standard
            // library members (`Math.hypot`, `Array.prototype.includes`) as
            // missing. A caller's own `target` still wins.
            target: ts.ScriptTarget.ES2015,
            ...compilerOptions,
          }),
        };
      };
    }

    const createEnv = createEnvFactory();

    let worker = createWorker(createEnv(compilerOptions));
    let ready = worker.initialize();

    /**
     * Which `setCompilerOptions` call is the latest one.
     *
     * **Two rapid calls must not race to install their environments.** A slower
     * earlier build finishing after a newer one would otherwise replace the options
     * and files the caller last asked for.
     */
    let generation = 0;

    return {
      initialize() {
        debug("initialize");
        return ready;
      },
      updateFile(params) {
        debug("updateFile", params);
        files.set(params.path, params.code);
        worker.updateFile(params);
      },
      getLints(params) {
        debug("getLints", params);
        return worker.getLints(params);
      },
      getAutocompletion(params) {
        debug("getAutocompletion", params);
        return worker.getAutocompletion(params);
      },
      getHover(params) {
        debug("getHover", params);
        return worker.getHover(params);
      },
      getEnv() {
        debug("getEnv");
        return worker.getEnv();
      },
      deleteFile(path) {
        debug("deleteFile", path);
        files.delete(path);
        return worker.getEnv().deleteFile(path);
      },
      async setCompilerOptions(options: TS.CompilerOptions) {
        compilerOptions = { ...compilerOptions, ...options };
        const build = ++generation;
        const next = createWorker(createEnv(compilerOptions));
        const nextReady = next.initialize();

        // **The old environment keeps answering until the new one is ready.** The
        // provider is not told a rebuild is happening, so requests — including file
        // pushes — can arrive during it; they belong to the environment still in
        // place, and are carried over below.
        await nextReady;
        if (build !== generation) {
          return;
        }

        worker = next;
        ready = nextReady;
        for (const [path, code] of files) {
          worker.updateFile({ path, code });
        }
      },
    };
  }),
);
