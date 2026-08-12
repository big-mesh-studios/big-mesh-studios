import { Accessor, createEffect, createMemo, createSignal, untrack, useContext } from "solid-js";
import { Command } from "../command/Command";
import { OPPOSING_SIDE } from "../constants";
import { StackerContext } from "../context";
import { RGBA, Vector2D } from "../maths";
import { SideKind } from "../types";
import { pointer, screenToWorld } from "../utils";
import { createEdgeController } from "./create-edge-controller";
import { createPanScaleControl } from "./pan-scale";
import { intersectSides, SidePositions } from "./side-layout";

const getOppositePixel = (kind: SideKind, position: Vector2D, side: ImageData): Vector2D => {
  if (kind === "top" || kind === "bottom") {
    return { x: position.x, y: side.height - position.y - 1 };
  }
  return { x: side.width - position.x - 1, y: position.y };
};

const PannableModes = new Set(["Idle", "Eyedrop"]);

export const createPixelEditorController = ({
  canvas,
  sidePositions,
  pushUndo,
  doCommand,
}: {
  canvas: Accessor<HTMLCanvasElement | undefined>;
  sidePositions: Accessor<SidePositions>;
  pushUndo: (reverseCommand: Command, description: string) => void;
  doCommand: (command: Command, pushUndo?: boolean, description?: string) => Command;
}) => {
  const { sides, selectedColour, selectPaletteIndex, palette, mode } = useContext(StackerContext);

  const [pan, setPan] = createSignal({ x: -10.0, y: -10.0 });
  const [cursorStyle, setCursorStyle] = createSignal<string>();
  const [scale, setScale] = createSignal(8);

  const [roundedWorldPosition, setRoundedWorldPosition] = createSignal<Vector2D>();

  const pointerIds = new Set<number>();

  const panScaleControl = createPanScaleControl({
    target: canvas,
    scale,
    pan,
    onUpdate(pan, scale) {
      setPan(pan);
      setScale(scale);
    },
    disable: createMemo(() => !PannableModes.has(mode()) && pointerIds.size !== 0),
  });

  const edgeController = createEdgeController({
    pan,
    scale,
    setCursorStyle,
    setPan,
    sidePositions,
  });

  let undoCommandsReversed: Command[] = [];
  createEffect(
    () => pointerIds.size,
    count => {
      if (count !== 0 || undoCommandsReversed.length === 0) {
        return;
      }
      const undoCommands = undoCommandsReversed.reverse();
      undoCommandsReversed = [];
      pushUndo(
        Command.sequence(undoCommands),
        untrack(mode) === "Erase" ? "Erase Pixels" : "Draw Pixels",
      );
    },
  );

  const eventToRoundedWorldPosition = (event: PointerEvent & { currentTarget: HTMLElement }) => {
    const screenPointer = { x: event.layerX, y: event.layerY };
    return Vector2D.round(screenToWorld(screenPointer, pan(), scale()));
  };

  return {
    pan,
    scale,
    cursor: cursorStyle,
    overlayDrawing() {
      const position = roundedWorldPosition();

      if (mode() === "Idle") {
        return;
      }

      if (!position) {
        return;
      }

      return (ctx: CanvasRenderingContext2D) => {
        ctx.fillStyle = "green";
        ctx.fillRect(position.x, position.y, 1.0, 1.0);
      };
    },
    onPointerDown(event: PointerEvent & { currentTarget: HTMLElement }) {
      pointerIds.add(event.pointerId);

      const roundedWorldPosition = eventToRoundedWorldPosition(event);

      switch (untrack(mode)) {
        case "Eyedrop": {
          const intersection = intersectSides({
            sidePositions: sidePositions(),
            sides: sides(),
            worldPosition: roundedWorldPosition,
          });

          if (!intersection) {
            return;
          }

          const index = palette().findIndex(colour => RGBA.equals(colour, intersection.colour));

          // The picked pixel can hold a colour that is not in the palette, in
          // which case there is nothing to select.
          if (index === -1) {
            break;
          }

          selectPaletteIndex(index);

          break;
        }
        case "Idle": {
          if (edgeController.onPointerDown(event)) {
            return;
          }
          panScaleControl.onPointerDown(event);
          break;
        }

        default: {
          if (pointerIds.size !== 1) {
            return;
          }

          pointer(event, ({ event }) => {
            const worldPointer = eventToRoundedWorldPosition(event);

            const intersection = intersectSides({
              worldPosition: worldPointer,
              sides: sides(),
              sidePositions: sidePositions(),
            });

            if (!intersection) {
              return;
            }

            const { side, kind, position } = intersection;

            const oppositePixel = getOppositePixel(kind, position, side);
            const oppositeKind = OPPOSING_SIDE[kind];

            const _sides = sides();

            const oppositeSide = _sides[oppositeKind];
            const oppositeOpacity =
              _sides[oppositeKind].data[
                ((oppositePixel.y * oppositeSide.width + oppositePixel.x) << 2) + 3
              ];

            const commands: Command[] = [];

            switch (mode()) {
              case "Erase": {
                commands.push(Command.erasePixel(kind, position));

                if (oppositeOpacity) {
                  commands.push(Command.erasePixel(oppositeKind, oppositePixel));
                }

                break;
              }
              case "Draw": {
                const _selectedColour = selectedColour();

                if (_selectedColour !== undefined) {
                  commands.push(Command.writePixel(kind, position, _selectedColour));

                  if (!oppositeOpacity) {
                    commands.push(Command.writePixel(oppositeKind, oppositePixel, _selectedColour));
                  }
                }

                break;
              }
              case "Fill": {
                const _selectedColour = selectedColour();

                if (_selectedColour !== undefined) {
                  commands.push(Command.fillPixel(kind, position, _selectedColour));

                  if (!oppositeOpacity) {
                    commands.push(Command.fillPixel(oppositeKind, oppositePixel, _selectedColour));
                  }
                }

                break;
              }
            }

            if (commands.length === 0) {
              return;
            }

            const command = commands.length === 1 ? commands[0] : Command.sequence(commands);
            undoCommandsReversed.push(doCommand(command));
          }).then(() => pointerIds.delete(event.pointerId));
        }
      }
    },
    onPointerMove(event: PointerEvent & { currentTarget: HTMLElement }) {
      setRoundedWorldPosition(eventToRoundedWorldPosition(event));
      switch (mode()) {
        case "Idle": {
          edgeController.onPointerMove(event);
        }
      }
    },
    onWheel: panScaleControl.onWheel,
  };
};
