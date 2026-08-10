import type { JSX } from "@solidjs/web/jsx-runtime";
import { createRoot, omit, onSettled, ParentProps, Ref, Show } from "solid-js";
import styles from "./components.module.css";
import type { IconKind } from "./icon-kinds";
import { RGBA } from "./types";
import { rgbaToCSS } from "./utils";

interface ButtonProps extends ParentProps {
  onClick?: JSX.EventHandler<HTMLButtonElement, MouseEvent>;
  disabled?: boolean;
  title?: string;
  class?: JSX.ClassValue;
}

export function Button(props: ButtonProps) {
  return <button {...props} class={[props.class, styles.button]} />;
}

interface TabProps extends ButtonProps {
  selected?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

export function Tab(props: TabProps) {
  return (
    <button
      ref={props.ref}
      role="tab"
      aria-selected={props.selected ? "true" : "false"}
      class={[props.class, styles.tab]}
      onClick={props.onClick}
      disabled={props.disabled}
      title={props.title}
    >
      {props.children}
    </button>
  );
}

export function ColourTab(props: TabProps & { colour: RGBA }) {
  return (
    <Tab
      selected={props.selected}
      disabled={props.disabled}
      class={[styles.colour, props.class]}
      onClick={props.onClick}
    >
      <div
        style={{
          "background-color": rgbaToCSS(props.colour),
        }}
      />
    </Tab>
  );
}

interface IconProps {
  kind: IconKind;
}

export function Icon(props: IconProps) {
  return <i class={[styles.icon, `fa-solid fa-${props.kind}`]} />;
}

export function IconTab(props: TabProps & IconProps) {
  return (
    <Tab
      ref={props.ref}
      class={[styles.icon, props.class]}
      selected={props.selected}
      onClick={props.onClick}
      disabled={props.disabled}
      title={props.title}
    >
      <Icon kind={props.kind} />
    </Tab>
  );
}

export interface IconButtonProps extends ButtonProps, IconProps {
  label?: string;
}

export function IconButton(props: IconButtonProps) {
  const buttonProps = omit(props, "children", "class");
  return (
    <Button class={[props.class, styles.icon]} {...buttonProps}>
      <Icon kind={props.kind} />
      <Show when={props.label}>
        <span>{props.label}</span>
      </Show>
    </Button>
  );
}

export function Bar(props: ParentProps) {
  return <div class={styles.bar}>{props.children}</div>;
}

export interface DropDownProps extends ParentProps {
  onClose(): void;
}

export function DropDown(props: DropDownProps) {
  return (
    <div
      ref={element =>
        createRoot(() => {
          onSettled(() => {
            const selectable = element.querySelector(
              'input, select, button, [tabindex]:not([tabindex="-1"]',
            );
            if (selectable instanceof HTMLElement) {
              selectable.focus();
            }
          });
        })
      }
      onFocusOut={event => {
        if (
          !(event.relatedTarget instanceof Node) ||
          !event.currentTarget.contains(event.relatedTarget)
        ) {
          props.onClose();
        }
      }}
      class={styles.bar}
    >
      {props.children}
    </div>
  );
}
