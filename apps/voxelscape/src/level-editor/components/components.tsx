import type { JSX } from "@solidjs/web/jsx-runtime";
import { omit, type ParentProps } from "solid-js";
import styles from "./components.module.css";

interface ButtonProps extends ParentProps {
  onClick?: JSX.EventHandler<HTMLButtonElement, MouseEvent>;
  disabled?: boolean;
  title?: string;
  class?: JSX.ClassValue;
  id?: string;
}

export const buttonStyle = styles.button;

/** A small labelled control. */
export function Button(props: ButtonProps) {
  const rest = omit(props, "children", "class");
  return (
    <button {...rest} class={[props.class, styles.button]}>
      {props.children}
    </button>
  );
}

interface TabProps extends ButtonProps {
  selected?: boolean;
  ref?: JSX.Ref<HTMLButtonElement>;
}

export const tabStyle = styles.tab;

/** A toggle in a row of toggles. */
export function Tab(props: TabProps) {
  const rest = omit(props, "children", "class", "selected", "ref");
  return (
    <button
      {...rest}
      ref={props.ref}
      role="tab"
      aria-selected={props.selected ? "true" : "false"}
      class={[props.class, styles.tab]}
    >
      {props.children}
    </button>
  );
}

export const barStyle = styles.bar;

/** A row of controls. */
export function Bar(props: ParentProps<{ class?: JSX.ClassValue }>) {
  return <div class={[styles.bar, props.class]}>{props.children}</div>;
}
