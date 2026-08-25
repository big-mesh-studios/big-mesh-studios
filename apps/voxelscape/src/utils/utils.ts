import { JSX } from "@solidjs/web/jsx-runtime";

export function combineRefs<T>(
  ...refs: Array<JSX.Ref<T> | undefined>
): JSX.Ref<T> {
  return refs.filter((ref) => ref !== undefined);
}
