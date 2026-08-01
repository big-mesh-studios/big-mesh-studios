import { createEffect, createMemo, untrack } from "solid-js";
import { Mode, ModeParams } from "../Mode";
import { Effect } from "../Effect";

export function createDrawMode(params: {
  erase: boolean,
  modeParams: ModeParams,
}): Mode {
  let modeParams = params.modeParams;
  let pixelPosUnderMouse = createMemo(() => {
    let pt = modeParams.mousePos();
    if (pt === undefined) {
      return undefined;
    }
    let pt2 = modeParams.screenPtToWorldPt(pt);
    if (pt2 === undefined) {
      return undefined;
    }
    pt2.x = Math.round(pt2.x - 0.5);
    pt2.y = Math.round(pt2.y - 0.5);
    return pt2;
  });
  createEffect(
    () => [
      pixelPosUnderMouse(),
      modeParams.pointerDownCount(),
    ] as const,
    ([ pt, pointerDownCount, ]) => {
      if (pt === undefined) {
        return;
      }
      if (pointerDownCount !== 1) {
        return;
      }
      if (params.erase) {
        modeParams.doEffect(Effect.erasePixel(pt.x, pt.y));
      } else {
        let selectedColour = untrack(modeParams.selectedColour);
        if (selectedColour !== undefined) {
          modeParams.doEffect(Effect.writePixel(pt.x, pt.y, selectedColour));
        }
      }
    },
  );
  let overlayDrawing = createMemo(() => {
    let pt = pixelPosUnderMouse();
    if (pt === undefined) {
      return undefined;
    }
    return (ctx: CanvasRenderingContext2D) => {
      ctx.fillStyle = "green";
      ctx.fillRect(
        pt.x,
        pt.y,
        1.0,
        1.0,
      );
    };
  });
  return {
    activeModeButton: () => params.erase ? "Erase" : "Draw",
    overlayDrawing: overlayDrawing,
    disablePanZoom: createMemo(() => modeParams.pointerDownCount() === 1),
  };
}

