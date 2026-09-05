/**
 * A logger that does nothing unless its subject is enabled, so the
 * language-feature code can keep its tracing calls without spamming the
 * console in a normal build.
 */
export function createDebug(subject: string, enabled = false) {
  return (message: string, extra?: unknown) => {
    if (!enabled) {
      return;
    }
    console.log(
      `%c[${subject}]`,
      "color: grey;",
      message,
      ...(extra === undefined ? [] : [extra]),
    );
  };
}

/**
 * Reads every reachable value of `value`, so a reactive computation that
 * calls it re-runs when any nested store field inside changes.
 *
 * @param value the object whose fields should be tracked
 * @returns the same object, for convenience in a `createEffect` compute
 */
export function trackDeep<T extends object>(value: T): T {
  traverse(value, new Set());
  return value;
}

function traverse(value: unknown, seen: Set<unknown>): void {
  const plain =
    Array.isArray(value) ||
    (value !== null &&
      typeof value === "object" &&
      (Object.getPrototypeOf(value) === Object.prototype ||
        Object.getPrototypeOf(value) === null));
  if (!plain || seen.has(value)) {
    return;
  }
  seen.add(value);
  for (const child of Object.values(value)) {
    traverse(child, seen);
  }
}
