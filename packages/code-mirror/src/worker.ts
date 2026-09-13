import {
  createDefaultMapFromCDN,
  createSystem,
  createVirtualTypeScriptEnvironment,
} from "@typescript/vfs";
import * as Comlink from "comlink";
import { createMemo, createRoot, createSignal } from "solid-js";
import type TS from "typescript";
import { createWorker } from "./codemirror-ts/worker";
import type { LSPAPI } from "./types";
import { loadTypeScript } from "./typescript-cdn";
import { createDebug } from "./utils";

const debug = createDebug("code-mirror worker");

Comlink.expose(
  createRoot((): LSPAPI => {
    const [compilerOptions, setCompilerOptions] =
      createSignal<TS.CompilerOptions>({});

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

    const worker = createMemo(() => createWorker(createEnv(compilerOptions())));

    return {
      initialize() {
        debug("initialize");
        return worker().initialize();
      },
      updateFile(params) {
        debug("updateFile", params);
        return worker().updateFile(params);
      },
      getLints(params) {
        debug("getLints", params);
        return worker().getLints(params);
      },
      getAutocompletion(params) {
        debug("getAutocompletion", params);
        return worker().getAutocompletion(params);
      },
      getHover(params) {
        debug("getHover", params);
        return worker().getHover(params);
      },
      getEnv() {
        debug("getEnv");
        return worker().getEnv();
      },
      deleteFile(path) {
        debug("deleteFile", path);
        return worker().getEnv().deleteFile(path);
      },
      async setCompilerOptions(options: TS.CompilerOptions) {
        setCompilerOptions((current) => ({
          ...current,
          ...options,
        }));
        await worker().initialize();
      },
    };
  }),
);
