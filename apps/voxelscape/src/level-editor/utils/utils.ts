/** Calls `fn`, returning `undefined` (or `onError`'s value) where it throws. */
export function tryCatch<T, U>(fn: () => T): T | undefined;
export function tryCatch<T, U>(
  fn: () => T,
  onError: (error: unknown) => U,
): T | U;
export function tryCatch<T, U>(
  fn: () => T,
  onError?: (error: unknown) => U,
): T | U | undefined {
  try {
    return fn();
  } catch (error) {
    return onError?.(error);
  }
}

/**
 * Serializes async work: each task runs after the one queued before it, so a
 * burst of commands applies in order rather than racing.
 */
export function createEnqueue<T>() {
  let queue: Promise<unknown> = Promise.resolve();
  return function (task: () => Promise<T>): Promise<T> {
    const result = queue.then(task);
    queue = result;
    return result;
  };
}

/** A debounced callback: calling it again within `delayMs` replaces the pending call. */
export function debounce(fn: () => void, delayMs: number): () => void {
  let handle: ReturnType<typeof setTimeout> | undefined;
  return () => {
    if (handle !== undefined) {
      clearTimeout(handle);
    }
    handle = setTimeout(() => {
      handle = undefined;
      fn();
    }, delayMs);
  };
}
