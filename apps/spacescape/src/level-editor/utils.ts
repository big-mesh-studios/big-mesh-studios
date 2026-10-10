/**
 * Two small things the editor needs that are about *when* rather than about what.
 */

/**
 * Chains async tasks so they run in the order they were asked for.
 *
 * **Not a mutex, and the difference matters.** A mutex would make each task wait for
 * everything before it to finish; this makes each task wait only for the ones queued ahead
 * of it to *start*, which in practice is the same chain and half the waiting. Either way
 * the property is the one wanted: a burst of edits applies in the order it was made rather
 * than in the order its promises happened to settle.
 *
 * That property is not cosmetic. Without it two clicks a moment apart can apply in the
 * wrong order, and the symptom is an undo that undoes the wrong edit — later, in a
 * different session, with no way to reproduce it.
 *
 * **One queue per editor**, because the ordering is a property of one level. A shared
 * queue would interleave two editors' edits into a single chain, which guarantees nothing
 * useful about either.
 */
export const createEnqueue = <T>() => {
  let queue: Promise<unknown> = Promise.resolve();
  return (task: () => Promise<T>): Promise<T> => {
    const result = queue.then(task);
    /**
     * **The chain is continued from a settled promise, not from `result`.**
     *
     * Passing `result` straight on would make the queue a chain of fates: one task's
     * failure becomes the chain's state, and every edit after it rejects with a message
     * about something else — so the editor would stop applying changes and stop undoing
     * them, with no error anywhere near the cause. One task's failure should cost that
     * task and nothing else; the caller still sees the rejection on `result`, which is
     * where it belongs.
     */
    const settled = () => undefined;
    queue = result.then(settled, settled);
    return result;
  };
};

/**
 * Runs a function and gives back its failure instead of its throw.
 *
 * **For reading a file a person chose.** A malformed JSON should say so on the editor's
 * notice line, not leave an exception where a click handler used to be — which is the
 * difference between a message somebody can act on and a blank panel.
 */
export const tryCatch = <A extends unknown[], R>(
  run: (...args: A) => R,
): ((
  ...args: A
) =>
  | { readonly ok: true; readonly value: R }
  | { readonly ok: false; readonly error: string }) => {
  return (...args: A) => {
    try {
      return { ok: true, value: run(...args) };
    } catch (cause) {
      return { ok: false, error: (cause as Error).message };
    }
  };
};
