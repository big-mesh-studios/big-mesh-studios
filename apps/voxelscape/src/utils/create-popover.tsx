import { Portal } from "@solidjs/web";
import { JSX } from "@solidjs/web/jsx-runtime";
import { ParentProps, createSignal } from "solid-js";
import { combineRefs } from "./utils";

export interface PopoverTriggerProps extends ParentProps {
  class?: string | string[];
}

export interface PopoverProps extends ParentProps {
  class?: string | string[];
  popover?: "auto" | "manual";
  style?: JSX.CSSProperties;
  ref?: JSX.Ref<HTMLDivElement>;
  onToggle?(popover: boolean): void;
}

let counter = 0;
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
