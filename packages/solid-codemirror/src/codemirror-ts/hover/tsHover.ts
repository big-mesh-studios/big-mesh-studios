import type { Tooltip } from "@codemirror/view";
import { hoverTooltip } from "@codemirror/view";
import { createDebug } from "../../utils";
import { tsFacet } from "../facet/tsFacet";
import { type TooltipRenderer, defaultTooltipRenderer } from "./renderTooltip";
import { tooltipTheme } from "./tooltipTheme";

const debug = createDebug("codemirror-ts/tsHover");

export interface TsHoverConfig {
  renderTooltip?: TooltipRenderer;
}

/**
 * Binds CodeMirror's `hoverTooltip` method to a call that pulls the hovered
 * symbol's types and documentation from the TypeScript environment, and
 * styles the tooltip to follow the editor's theme.
 */
export function tsHover(config: TsHoverConfig = {}) {
  const { renderTooltip = defaultTooltipRenderer } = config;

  return [
    tooltipTheme,
    hoverTooltip(async (view, pos): Promise<Tooltip | null> => {
      const facet = view.state.facet(tsFacet);
      if (!facet?.worker) {
        return null;
      }

      debug("requesting hover data", { pos });
      const hoverData = await facet.worker.getHover({
        path: facet.path,
        pos,
      });

      if (!hoverData) {
        return null;
      }

      return {
        pos: hoverData.start,
        end: hoverData.end,
        create: () => renderTooltip(hoverData, view),
      };
    }),
  ];
}
