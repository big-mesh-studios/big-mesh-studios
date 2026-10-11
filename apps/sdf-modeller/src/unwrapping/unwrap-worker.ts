/**
 * What a worker is asked to unwrap, what it says back, and the code in between.
 *
 * ## Why this is a file rather than part of the client
 *
 * **Because the client runs on the main thread and this is where the expensive thing lives.** An
 * unwrap takes about a second for a coarse figure and over ten for a fine one — see the table in
 * `./unwrap` — and the whole reason for a worker is that the page must not stop while it happens.
 * The two ends need to agree on a shape, and a type is the agreement, so it lives where both can
 * reach it and neither drags the other's dependencies along.
 *
 * The pattern is the one `./print/print-worker.ts` already uses: this module is the tested one and
 * `./print.worker.ts` is four lines that exist only to give Vite a file to point a worker URL at.
 *
 * ## Why the module is passed in rather than loaded here
 *
 * **So this file imports nothing at runtime and can be tested without the WebAssembly.** Loading
 * it is a quarter-megabyte parse, and a test that only wants to check the shape of the reply
 * should not pay that. The worker entry passes the real loader; a test passes something that
 * answers with a stub.
 */
import type { UnwrapResult, XAtlasModule } from "./unwrap";

/** What the main thread asks a worker for. */
export interface UnwrapRequest {
  /** The reference mesh, positions flat xyz. */
  readonly positions: Float32Array;
  /** The reference mesh's indices, three a triangle. */
  readonly indices: Uint32Array;
  /** How many vertices, which the two arrays above describe in two different ways. */
  readonly vertexCount: number;
  /** Overrides for the atlas scale, the gutter and the chart iterations. */
  readonly options?: {
    readonly resolution: number;
    readonly padding: number;
    readonly maxIterations: number;
  };
}

/**
 * What a worker says back.
 *
 * **Three kinds rather than a result and an error channel**, for the same reason as the print
 * protocol: nothing here is exceptional enough to need its own machinery. A mesh with no
 * triangles is a model with no parts in it, which is a state rather than a failure.
 */
export type UnwrapReply =
  | { readonly kind: "progress"; readonly fraction: number }
  | { readonly kind: "atlas"; readonly result: UnwrapResult }
  | { readonly kind: "empty" }
  | { readonly kind: "failed"; readonly reason: string };

/** Hands back the unwrapper module. Injected so this file has no runtime dependency of its own. */
export type XAtlasLoader = () => Promise<XAtlasModule>;

/**
 * Answers one request.
 *
 * **A throw becomes a message rather than an `error` event**, for the reason
 * `./print/print-worker.ts` gives: a worker that throws leaves the caller waiting on a promise
 * nobody will ever settle, and the reason for the failure is the one thing worth having. Carried
 * as a `failed` reply instead.
 */
export const runUnwrap = async (
  request: UnwrapRequest,
  post: (reply: UnwrapReply) => void,
  load: XAtlasLoader,
): Promise<void> => {
  try {
    const { unwrapMesh } = await import("./unwrap");
    const xatlas = await load();

    post({ kind: "progress", fraction: 0.25 });

    const result = unwrapMesh(
      xatlas,
      {
        positions: request.positions,
        indices: request.indices,
        vertexCount: request.vertexCount,
      },
      request.options,
    );

    post(result === undefined ? { kind: "empty" } : { kind: "atlas", result });
  } catch (reason) {
    post({
      kind: "failed",
      reason: reason instanceof Error ? reason.message : String(reason),
    });
  }
};
