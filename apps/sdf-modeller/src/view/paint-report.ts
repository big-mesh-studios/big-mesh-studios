/**
 * Saying what the paint path is doing, to a file somebody else can read.
 *
 * ## Why this exists
 *
 * **Because the paint path can only be watched in a browser, and the person holding the browser
 * is the only person who can produce the evidence.** Four rounds of work on this feature went
 * wrong the same way: something silently did nothing, the app looked inert, and by the time
 * anyone looked at a console there was nothing in it. One of those was a brush raycasting the
 * viewport mesh instead of tracing the field — two lines from the version that worked — and it
 * was found by reading the source, not by watching the app.
 *
 * So the app posts what it is doing to the dev server, and the dev server writes it to a file.
 *
 * ## Why it never throws and never awaits
 *
 * **Because a diagnostic that can break the thing it is diagnosing is worse than no diagnostic.**
 * `post` is fire-and-forget: no await, so nothing can block a pointer move; no throw, so a
 * missing route — which is what happens in a production build, where the plugin is not there —
 * cannot take the paint tool down with it.
 *
 * ## Why it is a function and not a class
 *
 * **Because it holds no state.** Every event is a fact about one moment, and there is nothing to
 * accumulate, sequence, or retry.
 */

/** One thing that happened, as the server will write it. */
export type PaintEvent = Record<string, unknown> & {
  /** What happened. A short kebab-case verb: `stroke-start`, `hit`, `rasterise`. */
  readonly what: string;
};

/**
 * Posts one event, if there is somewhere to post it to.
 *
 * **Silent in every failure mode**, which is the only safe shape for this. A rejected fetch is
 * dropped; a JSON body that will not serialise is dropped; a page opened from a static host has
 * no route at all and every call is dropped. None of that is allowed to reach the caller.
 */
export const report = (event: PaintEvent): void => {
  try {
    void fetch("/__paint-log", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(event),
      // **Explicitly not kept alive**, because the dev server holds the connection for a POST
      // that is answered with 204 and a kept-alive body would sit in the browser's pool until
      // it timed out. This is a diagnostic; it has no business consuming a socket.
      keepalive: false,
    }).catch(() => undefined);
  } catch {
    // **Nothing.** Reported here would be reported nowhere.
  }
};

/** A round-trip-safe summary of a vector, small enough to read in a log. */
export const at = (point: { x: number; y: number; z: number }): string =>
  `${point.x.toFixed(3)},${point.y.toFixed(3)},${point.z.toFixed(3)}`;
