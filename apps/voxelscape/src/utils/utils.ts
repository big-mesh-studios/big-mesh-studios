import { JSX } from "@solidjs/web/jsx-runtime";

export function combineRefs<T>(
  ...refs: Array<JSX.Ref<T> | undefined>
): JSX.Ref<T> {
  return refs.filter((ref) => ref !== undefined);
}

/**
 * Reports whether the event's target is an editable element — for example,
 * the debug console input — so global key handlers can skip it instead of
 * calling `preventDefault` on those keys, moving the player, or stealing the
 * keystroke to open the console.
 *
 * @param event - The event to check.
 * @returns True if the event originated from an editable element.
 */
export function isEditableTarget(event: Event): boolean {
  const element = event.target as HTMLElement | null;
  if (element === null) {
    return false;
  }
  const tag = element.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    element.isContentEditable
  );
}
