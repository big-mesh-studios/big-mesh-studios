import { createEffect, createMemo, untrack } from "solid-js";
import { Mode, ModeParams } from "../types";
import { Effect } from "../Effect";

export function createDrawMode({
  erase,
  modeParams: { mousePos, screenPtToWorldPt, pointerDownCount, doEffect, selectedColour },
}: {
  erase: boolean;
  modeParams: ModeParams;
}): Mode {
  const pixelPosUnderMouse = createMemo(() => {
    const _mousePos = mousePos();
    if (_mousePos === undefined) {
      return undefined;
    }

    const worldPos = screenPtToWorldPt(_mousePos);
    if (worldPos === undefined) {
      return undefined;
    }

    worldPos.x = Math.round(worldPos.x - 0.5);
    worldPos.y = Math.round(worldPos.y - 0.5);

    return worldPos;
  });

  createEffect(
    () => [pixelPosUnderMouse(), pointerDownCount()] as const,
    ([pt, pointerDownCount]) => {
      if (pt === undefined) {
        return;
      }

      if (pointerDownCount !== 1) {
        return;
      }

      if (erase) {
        doEffect(Effect.erasePixel(pt.x, pt.y));
      } else {
        const _selectedColour = untrack(selectedColour);
        if (_selectedColour !== undefined) {
          doEffect(Effect.writePixel(pt.x, pt.y, _selectedColour));
        }
      }
    },
  );

  const overlayDrawing = createMemo(() => {
    const pt = pixelPosUnderMouse();

    if (pt === undefined) {
      return undefined;
    }

    return (ctx: CanvasRenderingContext2D) => {
      ctx.fillStyle = "green";
      ctx.fillRect(pt.x, pt.y, 1.0, 1.0);
    };
  });

  return {
    overlayDrawing: overlayDrawing,
    disablePanZoom: createMemo(() => pointerDownCount() === 1),
  };
}
