import { Portal } from "@solidjs/web";
import { JSX } from "@solidjs/web/jsx-runtime";
import { ParentProps, createSignal } from "solid-js";
import { combineRefs } from "./combine-refs";

export interface PopoverTriggerProps extends ParentProps {
  class?: string | string[];
  /** The browser's own tooltip for the button, for a trigger drawn as an icon. */
  title?: string;
}

export interface PopoverProps extends ParentProps {
  class?: string | string[];
  popover?: "auto" | "manual";
  style?: JSX.CSSProperties;
  ref?: JSX.Ref<HTMLDivElement>;
  onToggle?(popover: boolean): void;
}

let counter = 0;

/**
 * A popover and the button that opens it, tied together by a generated
 * identifier so the browser anchors one to the other. The panel is rendered
 * through a portal, and carries no styling of its own — a caller passes the
 * classes it should be drawn with.
 */
export function createPopover() {
  let element: HTMLDivElement = null!;
  const id = `popover-${counter++}`;
  const [isOpen, setIsOpen] = createSignal(false);

  return {
    isOpen,
    // `togglePopover` rather than `showPopover`/`hidePopover`: those throw when
    // the popover is already in the state being asked for.
    open() {
      element?.togglePopover(true);
    },
    close() {
      element?.togglePopover(false);
    },
    Trigger(props: PopoverTriggerProps) {
      return (
        <button
          aria-selected={isOpen() ? "true" : "false"}
          style={{
            "anchor-name": `--${id}`,
          }}
          popovertarget={id}
          class={props.class}
          title={props.title}
        >
          {props.children}
        </button>
      );
    },
    PopOver(props: PopoverProps) {
      return (
        <Portal>
          <div
            style={{
              "position-anchor": `--${id}`,
              ...props.style,
            }}
            ref={combineRefs(props.ref, (_element) => (element = _element))}
            id={id}
            popover={props.popover ?? "auto"}
            class={props.class}
            onToggle={(event) => {
              const toggle = event.newState === "open";
              setIsOpen(toggle);
              props.onToggle?.(toggle);
            }}
          >
            {props.children}
          </div>
        </Portal>
      );
    },
  };
}
