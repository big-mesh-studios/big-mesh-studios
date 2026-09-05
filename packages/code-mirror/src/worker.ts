import {
  createDefaultMapFromCDN,
  createSystem,
  createVirtualTypeScriptEnvironment,
} from "@typescript/vfs";
import * as Comlink from "comlink";
import { createMemo, createRoot, createSignal } from "solid-js";
import TS from "typescript";
import { createWorker } from "./codemirror-ts/worker";
import type { LSPAPI } from "./types";
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
        const ts = await Promise.resolve(TS);
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
          env: createVirtualTypeScriptEnvironment(
            system,
            [],
            ts,
            compilerOptions,
          ),
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
