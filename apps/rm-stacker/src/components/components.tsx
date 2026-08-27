import { Portal } from "@solidjs/web";
import type { JSX } from "@solidjs/web/jsx-runtime";
import { createSignal, omit, ParentProps, Show } from "solid-js";
import type { IconKind } from "../icon-kinds";
import { RGBA } from "../maths";
import { combineRefs } from "../utils/utils";
import styles from "./components.module.css";

/**********************************************************************************/
/*                                      Button                                    */
/**********************************************************************************/

interface ButtonProps extends ParentProps {
  onClick?: JSX.EventHandler<HTMLButtonElement, MouseEvent>;
  disabled?: boolean;
  title?: string;
  class?: JSX.ClassValue;
}

export const buttonStyle = styles.button;
export function Button(props: ButtonProps) {
  return <button {...props} class={[props.class, styles.button]} />;
}

/**********************************************************************************/
/*                                        Tab                                     */
/**********************************************************************************/

interface TabProps extends ButtonProps {
  selected?: boolean;
  ref?: JSX.Ref<HTMLButtonElement>;
}

export const tabStyle = styles.tab;
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

/**********************************************************************************/
/*                                      Colour                                    */
/**********************************************************************************/

export function Colour(props: { colour: RGBA }) {
  return (
    <div
      style={{
        "background-color": RGBA.toCSS(props.colour),
      }}
    />
  );
}

/**********************************************************************************/
/*                                       Icon                                     */
/**********************************************************************************/

interface IconProps {
  kind: IconKind;
}

export const iconStyle = styles.icon;
export function Icon(props: IconProps) {
  return <i class={[styles.icon, `fa-solid fa-${props.kind}`]} />;
}

/**********************************************************************************/
/*                                    Colour Tab                                  */
/**********************************************************************************/

export const colourTabStyle = styles.colourTab;
export function ColourTab(props: TabProps & { colour: RGBA; style: JSX.CSSProperties }) {
  return (
    <Tab {...props} class={[styles.colour, props.class]}>
      <Colour colour={props.colour} />
    </Tab>
  );
}

/**********************************************************************************/
/*                                     IconTab                                    */
/**********************************************************************************/

export const iconTabStyle = styles.iconTab;
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

/**********************************************************************************/
/*                                   IconButton                                   */
/**********************************************************************************/

export const iconButtonStyle = styles.iconButton;
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

/**********************************************************************************/
/*                                       Bar                                      */
/**********************************************************************************/

export const barStyle = styles.bar;
export function Bar(props: ParentProps) {
  return <div class={styles.bar}>{props.children}</div>;
}

/**********************************************************************************/
/*                                     Column                                     */
/**********************************************************************************/

export const columnStyle = styles.column;
export function Column(props: ParentProps<{ style?: JSX.CSSProperties }>) {
  return (
    <div style={props.style} class={styles.column}>
      {props.children}
    </div>
  );
}

/**********************************************************************************/
/*                                 Create Popover                                 */
/**********************************************************************************/

export interface PopoverTriggerProps extends ParentProps {
  class?: string | string[];
}

export interface PopoverProps extends ParentProps {
  class?: string | string[];
  popover?: "auto" | "manual";
  style?: JSX.CSSProperties;
  ref?: JSX.Ref<HTMLDivElement>;
}

let counter = 0;
export function createPopover() {
  let element: HTMLDivElement = null!;
  const id = `popover-${counter++}`;
  const [isOpen, setIsOpen] = createSignal(false);

  return {
    isOpen,
    open() {
      element?.showPopover();
    },
    close() {
      element?.hidePopover();
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
            ref={combineRefs(props.ref, _element => (element = _element))}
            id={id}
            popover={props.popover ?? "auto"}
            class={[props.class, styles.popover]}
            onToggle={event => {
              setIsOpen(event.newState === "open");
            }}
          >
            {props.children}
          </div>
        </Portal>
      );
    },
  };
}
