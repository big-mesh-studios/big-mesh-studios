import { Accessor, createSignal, untrack, useContext } from "solid-js";
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
    // Only ever asked at the moment a gesture starts, so it reads the mode and
    // the pointers that are down as they are right then. A memo here would
    // never see the set change, since a plain set is nothing to track.
    disable: () => !PannableModes.has(mode()) && pointerIds.size !== 0,
  });

  const edgeController = createEdgeController({
    pan,
    scale,
    setCursorStyle,
    setPan,
    sidePositions,
  });

  // Every pixel a stroke has changed so far, so that the whole stroke can be
  // taken back in one step rather than a pixel at a time.
  let undoCommandsReversed: Command[] = [];
  const pushStrokeUndo = () => {
    if (undoCommandsReversed.length === 0) {
      return;
    }
    const undoCommands = undoCommandsReversed.reverse();
    undoCommandsReversed = [];
    pushUndo(
      Command.sequence(undoCommands),
      untrack(mode) === "Erase" ? "Erase Pixels" : "Draw Pixels",
    );
  };

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

      // Whatever the mode below goes on to do with this pointer, the set has to
      // lose it again when it ends, and the last one to leave closes the stroke.
      pointer(event).then(() => {
        pointerIds.delete(event.pointerId);

        if (pointerIds.size === 0) {
          pushStrokeUndo();
        }
      });

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
          // A gesture that is already running claims the fingers that join it.
          // A resize is the work of the one finger that started it, so later
          // ones have nothing to do; a drag takes them so that a second finger
          // turns it into a pinch rather than grabbing an edge it happens to
          // have landed on.
          if (edgeController.active()) {
            break;
          }

          if (!panScaleControl.active() && edgeController.onPointerDown(event)) {
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
          });
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
    // The pixel under the pointer is painted on the canvas, so it has to stop
    // being painted once the pointer is no longer over it. Leaving raises the
    // first of these, and a gesture the browser takes over raises the second
    // without the pointer ever leaving.
    onPointerOut() {
      setRoundedWorldPosition(undefined);
    },
    onPointerCancel() {
      setRoundedWorldPosition(undefined);
    },
    onWheel: panScaleControl.onWheel,
  };
};
