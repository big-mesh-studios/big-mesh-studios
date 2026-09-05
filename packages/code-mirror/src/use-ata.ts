import { setupTypeAcquisition } from "@typescript/ata";
import { createEffect, createSignal, onSettled } from "solid-js";
import type TS from "typescript";
import { createDebug } from "./utils";

const debug = createDebug("useATA");

export interface UseATAConfig {
  ts: Promise<typeof TS> | typeof TS;
  name?: string;
  /** The files the caller keeps, watched so new content is handed to ATA. */
  files: Record<string, string>;
  /** How a downloaded type file is written back into `files`. */
  setFiles(path: string, code: string): void;
}

/**
 * Feeds the open files' source to TypeScript's automatic type acquisition, so
 * the imports a script pulls from npm have their declarations downloaded and
 * written back into `config.files` for the language worker to use.
 */
export function useATA(config: UseATAConfig) {
  // The handler is not reactive itself, so it lives in a plain variable and a
  // `ready` flag tells the watching effect below that files can be handed over.
  let acquire: ((source: string) => Promise<void>) | null = null;
  const [ready, setReady] = createSignal(false);

  onSettled(() => {
    let stopped = false;
    Promise.resolve(config.ts).then((typescript) => {
      if (stopped) {
        return;
      }
      acquire = setupTypeAcquisition({
        projectName: config.name ?? "Default ATA Project",
        typescript,
        delegate: {
          receivedFile: (code: string, path: string) => {
            debug("received file", { code, path });
          },
          started: () => {
            debug("started");
          },
          progress: (downloaded: number, total: number) => {
            debug(`downloaded ${downloaded} of ${total}`);
          },
          finished: (files) => {
            for (const [path, code] of files) {
              const normalizedPath = path.replace(/^./, "");
              config.setFiles(normalizedPath, code);
            }
          },
        },
      });
      setReady(true);
    });
    return () => {
      stopped = true;
    };
  });

  // ATA is handed each file's code exactly once per content change, so a
  // finished download that only adds files does not re-trigger downloads.
  const handed = new Map<string, string>();
  createEffect(
    () => {
      if (!ready()) {
        return undefined;
      }
      return Object.keys(config.files).map(
        (path) => [path, config.files[path] ?? ""] as const,
      );
    },
    (files) => {
      if (!files) {
        return;
      }
      for (const [path, code] of files) {
        if (handed.get(path) === code) {
          continue;
        }
        handed.set(path, code);
        void acquire?.(code);
      }
    },
  );
}
