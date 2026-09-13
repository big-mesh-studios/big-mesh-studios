import type { JSX } from "@solidjs/web/jsx-runtime";

/**
 * Renders `children` once and keeps it mounted for as long as `Activity`
 * itself is, hiding it with `display: none` instead of a `<Show>`'s
 * mount/unmount when `when` is false — so state a real unmount would reset
 * (a CodeMirror scroll position, an open popover) survives the toggle.
 * `display: contents` when active keeps the wrapper itself out of layout,
 * so it doesn't interfere with sizing that assumes `children` sits directly
 * in its real parent. Solid has no built-in equivalent of this (React's
 * `Activity`/`Offscreen`), so this is the repo's own.
 */
export function Activity(props: {
  when: boolean;
  children: JSX.Element;
}): JSX.Element {
  return (
    <div style={{ display: props.when ? "contents" : "none" }}>
      {props.children}
    </div>
  );
}
