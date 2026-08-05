import { createEffect, createMemo, onCleanup, untrack } from "solid-js";
import { Coordinates, Mode, ModeParams, SideKind, Sides } from "../types";
import { Command } from "../Command";
import { findCollidingSide } from "../utils";

const OPPOSING_KINDS = {
  front: "back",
  back: "front",
  left: "right",
  right: "left",
  top: "bottom",
  bottom: "top",
} as const;

const getOpposingOffset = (
  kind: SideKind,
  coordinate: { x: number; y: number },
  side: ImageData,
): { x: number; y: number } => {
  if (kind === "top" || kind === "bottom") {
    const opposingY = side.height - coordinate.y - 1;
    return { x: coordinate.x, y: opposingY };
  }

  const opposingX = side.width - coordinate.x - 1;
  return { x: opposingX, y: coordinate.y };
};

export function createDrawMode({
  erase,
  modeParams: {
    mousePos,
    screenPtToWorldPt,
    pointerDownCount,
    doCommand,
    pushUndo,
    selectedColour,
    store,
    coordinates,
  },
}: {
  erase: boolean;
  modeParams: ModeParams;
}): Mode {
  const pixelPosUnderMouse = createMemo(
    () => {
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
    },
    {
      equals(prev, next) {
        if (next === undefined) {
          return prev === undefined;
        } else if (prev === undefined) {
          return false;
        } else {
          return next.x === prev.x && next.y === prev.y;
        }
      },
    },
  );

  let undoCommandsReversed: Command[] = [];

  onCleanup(() => {
    let undoCommands = undoCommandsReversed.reverse();
    undoCommandsReversed = [];
    doCommand(Command.sequence(undoCommands));
    store.render();
  });

  createEffect(pointerDownCount, pointerDownCount => {
    if (pointerDownCount !== 0 || undoCommandsReversed.length === 0) {
      return;
    }
    let undoCommands = undoCommandsReversed.reverse();
    undoCommandsReversed = [];
    pushUndo(Command.sequence(undoCommands), erase ? "Erase Pixels" : "Draw Pixels");
    store.render();
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
      const result = findCollidingSide(pt, store.sides, coordinates());
      if (!result) {
        return;
      }
      const localX = pt.x - result.coordinate.x;
      const localY = pt.y - result.coordinate.y;
      let oppositePt = getOpposingOffset(result.kind, { x: localX, y: localY }, result.side);
      let oppositeKind = OPPOSING_KINDS[result.kind];
      let oppositeSide = store.sides[oppositeKind];
      let oppositeOpacity =
        store.sides[oppositeKind].data[
          ((oppositePt.y * oppositeSide.width + oppositePt.x) << 2) + 3
        ];
      let oppositeOffset = coordinates()[oppositeKind];
      let commands: Command[] = [];
      if (erase) {
        commands.push(Command.erasePixel(pt.x, pt.y));
        if (oppositeOpacity) {
          commands.push(
            Command.erasePixel(oppositeOffset.x + oppositePt.x, oppositeOffset.y + oppositePt.y),
          );
        }
      } else {
        const _selectedColour = untrack(selectedColour);
        if (_selectedColour !== undefined) {
          commands.push(Command.writePixel(pt.x, pt.y, _selectedColour));
          if (!oppositeOpacity) {
            commands.push(
              Command.writePixel(
                oppositeOffset.x + oppositePt.x,
                oppositeOffset.y + oppositePt.y,
                _selectedColour,
              ),
            );
          }
        }
      }
      if (commands.length === 1) {
        undoCommandsReversed.push(doCommand(commands[0]));
      } else {
        undoCommandsReversed.push(doCommand(Command.sequence(commands)));
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
    activeModeButton: () => (erase ? "Erase" : "Draw"),
    overlayDrawing: overlayDrawing,
    disablePanZoom: createMemo(() => pointerDownCount() === 1),
  };
}
