import { RGBA } from "@big-mesh-studios/maths";
import { Portal } from "@solidjs/web";
import type { JSX } from "@solidjs/web/jsx-runtime";
import { createSignal, omit, ParentProps, Show } from "solid-js";
import type { IconKind } from "../icon-kinds";
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
export function ColourTab(
  props: TabProps & { colour: RGBA; style: JSX.CSSProperties },
) {
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

export const popoverStyle = styles.popover;

export const barStyle = styles.bar;
export function Bar(props: ParentProps<{ class?: JSX.ClassValue }>) {
  return <div class={[styles.bar, props.class]}>{props.children}</div>;
}

/**********************************************************************************/
/*                                  Create Dialog                                 */
/**********************************************************************************/

export interface DialogProps extends ParentProps {
  class?: JSX.ClassValue;
}

/**
 * A modal dialogue: while it is open the browser makes the rest of the page
 * inert, so nothing behind it can be clicked, typed into or tabbed to, and
 * pressing escape closes it. That is the difference from a popover, which
 * leaves everything behind it live.
 */
export function createDialog() {
  let element: HTMLDialogElement = null!;
  const [isOpen, setIsOpen] = createSignal(false);

  return {
    isOpen,
    open() {
      element?.showModal();
      setIsOpen(true);
    },
    close() {
      element?.close();
    },
    Dialog(props: DialogProps) {
      return (
        <Portal>
          <dialog
            ref={(_element) => (element = _element)}
            class={props.class}
            onClose={() => setIsOpen(false)}
            // The backdrop is part of the dialogue itself, so a click that
            // lands on the element rather than on anything inside it is a
            // click outside — which closes, as it does for a popover.
            onClick={(event) => {
              if (event.target === element) {
                element.close();
              }
            }}
          >
            {props.children}
          </dialog>
        </Portal>
      );
    },
  };
}
