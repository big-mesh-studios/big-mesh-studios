import { Dynamic, Portal } from "@solidjs/web";
import type { JSX } from "@solidjs/web/jsx-runtime";
import { ComponentProps, omit, ParentProps, Ref, Show, ValidComponent } from "solid-js";
import type { IconKind } from "../icon-kinds";
import { RGBA } from "../types";
import { rgbaToCSS } from "../utils";
import styles from "./components.module.css";

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
      {...props}
      role="tab"
      aria-selected={props.selected ? "true" : "false"}
      class={[props.class, styles.tab]}
    >
      {props.children}
    </button>
  );
}

export function ColourTab(props: TabProps & { colour: RGBA }) {
  return (
    <Tab {...props} class={[styles.colour, props.class]}>
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
  const tabProps = omit(props, "kind");
  return (
    <Tab {...tabProps} class={[props.class, styles.iconTab]}>
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
    <Button class={[props.class, styles.iconButton]} {...buttonProps}>
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

export function Column(props: ParentProps) {
  return <div class={styles.column}>{props.children}</div>;
}

export type PopOverProps<T extends ValidComponent> = ComponentProps<T> & {
  class?: string;
  as?: T;
};

let counter = 0;
export function createPopOver() {
  let element: HTMLDivElement = null!;
  const id = `popover-${counter++}`;

  return {
    Trigger<T extends ValidComponent>(
      props: { as?: T } & Omit<ComponentProps<T>, "popovertarget" | "id">,
    ) {
      return (
        <Dynamic
          style={{
            "anchor-name": `--${id}`,
          }}
          component={props.as ?? "button"}
          {...omit(props, "as")}
          popovertarget={id}
        />
      );
    },
    PopOver<T extends ValidComponent>(props: PopOverProps<T>) {
      return (
        <Portal>
          <Dynamic
            style={{
              "position-anchor": `--${id}`,
            }}
            component={props.as ?? "div"}
            id={id}
            ref={element}
            popover={props.popover ?? "auto"}
            class={[props.class, styles.popover]}
          >
            {props.children}
          </Dynamic>
        </Portal>
      );
    },
  };
}
