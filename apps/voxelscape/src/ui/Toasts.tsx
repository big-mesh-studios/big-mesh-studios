import type { JSX } from "@solidjs/web/jsx-runtime";
import { createSignal, For, type ParentProps } from "solid-js";
import styles from "./Toasts.module.css";

let counter = 0;

interface PushedToast {
  id: number;
  content: () => JSX.Element;
}

/** One chip in the stack: a line of status shown next to the world, not in it. */
export const Toast = (props: ParentProps): JSX.Element => (
  <div class={styles.toast}>{props.children}</div>
);

/**
 * A corner stack of status chips. `Stack` renders the toasts declared as its
 * children — each deciding for itself when it has something to show — followed
 * by the ones `show` has pushed onto it.
 */
export function createToasts() {
  const [pushed, setPushed] = createSignal<PushedToast[]>([]);

  function dismiss(id: number): void {
    setPushed((toasts) => toasts.filter((toast) => toast.id !== id));
  }

  return {
    /**
     * Adds a toast to the bottom of the stack.
     *
     * @param content Rendered inside the chip; whatever it reads reactively
     *   keeps the chip up to date for as long as it is up.
     * @param duration Milliseconds to leave it up. Without one it stays until
     *   the returned function is called.
     * @returns The function that takes this toast back down.
     */
    show(content: () => JSX.Element, duration?: number): () => void {
      const id = counter++;

      setPushed((toasts) => [...toasts, { id, content }]);

      if (duration !== undefined) {
        setTimeout(() => dismiss(id), duration);
      }

      return () => dismiss(id);
    },
    Stack(props: ParentProps): JSX.Element {
      return (
        <div class={styles.stack}>
          {props.children}
          <For each={pushed()}>
            {(toast) => <Toast>{toast.content()}</Toast>}
          </For>
        </div>
      );
    },
  };
}
