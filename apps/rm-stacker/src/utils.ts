export function tryCatch<T, U>(fn: () => T, onError: (error: unknown) => U) {
  try {
    return fn();
  } catch (error) {
    return onError(error);
  }
}
