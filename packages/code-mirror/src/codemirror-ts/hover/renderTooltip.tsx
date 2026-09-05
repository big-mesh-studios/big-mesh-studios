import type { TooltipView } from "@codemirror/view";
import { EditorView } from "@codemirror/view";
import { render } from "@solidjs/web";
import type { HoverInfo } from "./getHover";
import { TooltipComponent } from "./TooltipComponent";

export type TooltipRenderer = (
  info: HoverInfo,
  editorView: EditorView,
) => TooltipView;

/**
 * The default tooltip renderer: the hovered symbol's signature, documentation
 * and JSDoc tags drawn as a Solid component, so the tooltip content reacts to
 * nothing on its own and is cleaned up when CodeMirror hides it.
 */
export const defaultTooltipRenderer: TooltipRenderer = (info, editorView) => {
  const div = document.createElement("div");

  const dispose = render(
    () => <TooltipComponent info={info} editorView={editorView} />,
    div,
  );

  return {
    dom: div,
    destroy: dispose,
  };
};
