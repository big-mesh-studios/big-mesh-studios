// The one compiler both the editor and the world compile with comes from a
// single pinned CDN build rather than from whatever copy each bundler happens
// to own, so the authoring language service and the runtime transpile can
// never drift (ADR 0029). esm.sh is the same cache @typescript/vfs already
// fetches the standard library files from.
import type * as TS from "typescript";

/** The pinned esm.sh build of the catalog TypeScript this repository installs. */
export const TYPESCRIPT_CDN_URL = "https://esm.sh/typescript@5.9.3";

// The locally installed compiler, addressed through a variable so no bundler
// can turn it into a shipped chunk — it is only ever loaded under Node.
const LOCAL_TYPESCRIPT_SPECIFIER = "typescript";

/** The compiler module, loaded once per page. */
let typescriptPromise: Promise<typeof TS> | undefined;

/**
 * The TypeScript module: the CDN build in a browser or worker, the locally
 * installed package under Node, where the CDN would need network imports.
 */
export function loadTypeScript(): Promise<typeof TS> {
  typescriptPromise ??=
    typeof globalThis !== "undefined" && "process" in globalThis
      ? (import(LOCAL_TYPESCRIPT_SPECIFIER) as Promise<typeof TS>)
      : import(/* @vite-ignore */ TYPESCRIPT_CDN_URL).then(
          (module) =>
            (module as { default?: typeof TS }).default ??
            (module as typeof TS),
        );
  return typescriptPromise;
}
