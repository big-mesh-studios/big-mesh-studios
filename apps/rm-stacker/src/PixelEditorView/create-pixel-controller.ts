import { Accessor, createSignal, untrack, useContext } from "solid-js";
import { Command } from "../command/Command";
import { OPPOSING_SIDE } from "../constants";
import { StackerContext } from "../context";
import { RGBA, Vector2D } from "../maths";
import { Dimensions2D, SideKind, Sides } from "../types";
import { pointer, screenToWorld } from "../utils";
import { createEdgeController } from "./create-edge-controller";
import { createPanScaleControl } from "./pan-scale";
import { intersectSides, SidePositions } from "./side-layout";

const getOppositePosition = (kind: SideKind, position: Vector2D, side: Dimensions2D): Vector2D => {
  if (kind === "top" || kind === "bottom") {
    return { x: position.x, y: side.height - position.y - 1 };
  }
  return { x: side.width - position.x - 1, y: position.y };
};

const getOppositePixel = (kind: SideKind, position: Vector2D, sides: Sides) => {
  const oppositePosition = getOppositePosition(kind, position, sides[kind]);
  const oppositeKind = OPPOSING_SIDE[kind];
  const oppositeSide = sides[oppositeKind];
  const oppositeOpacity =
    sides[oppositeKind].data[
      ((oppositePosition.y * oppositeSide.width + oppositePosition.x) << 2) + 3
    ];
  return {
    kind: oppositeKind,
    side: oppositeSide,
    opacity: oppositeOpacity,
    position: oppositePosition,
  };
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
  const [scale, setScale] = createSignal(8);
  const [cursorStyle, setCursorStyle] = createSignal<string>();
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

  const endPointer = (event: PointerEvent) => {
    pointerIds.delete(event.pointerId);

    // The last finger to leave is the one that finishes the stroke, since a
    // stroke drawn with more than one is still a single thing to take back.
    if (pointerIds.size === 0) {
      pushStrokeUndo();
    }
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
      // Everything this pointer raises from here on lands on the canvas even
      // once it has been taken off it, so however the gesture below ends, the
      // end is heard and the pointer can be dropped from the set again.
      event.currentTarget.setPointerCapture(event.pointerId);
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

        case "Fill": {
          const _selectedColour = selectedColour();
          const commands: Command[] = [];

          const worldPointer = eventToRoundedWorldPosition(event);

          const intersection = intersectSides({
            worldPosition: worldPointer,
            sides: sides(),
            sidePositions: sidePositions(),
          });

          if (!intersection) {
            return;
          }

          const { kind, position } = intersection;
          const opposite = getOppositePixel(kind, position, sides());

          if (_selectedColour !== undefined) {
            commands.push(Command.fillPixel(kind, position, _selectedColour));

            if (!opposite.opacity) {
              commands.push(Command.fillPixel(opposite.kind, opposite.position, _selectedColour));
            }
          }

          if (commands.length === 0) {
            return;
          }

          const command = commands.length === 1 ? commands[0] : Command.sequence(commands);
          undoCommandsReversed.push(doCommand(command));

          return;
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

            const { kind, position } = intersection;
            const opposite = getOppositePixel(kind, position, sides());

            const commands: Command[] = [];

            switch (mode()) {
              case "Erase": {
                commands.push(Command.erasePixel(kind, position));

                if (opposite.opacity) {
                  commands.push(Command.erasePixel(opposite.kind, opposite.position));
                }

                break;
              }
              case "Draw": {
                const _selectedColour = selectedColour();

                if (_selectedColour !== undefined) {
                  commands.push(Command.writePixel(kind, position, _selectedColour));

                  if (!opposite.opacity) {
                    commands.push(
                      Command.writePixel(opposite.kind, opposite.position, _selectedColour),
                    );
                  }
                }

                break;
              }
              case "Fill": {
                const _selectedColour = selectedColour();

                if (_selectedColour !== undefined) {
                  commands.push(Command.fillPixel(kind, position, _selectedColour));

                  if (!opposite.opacity) {
                    commands.push(
                      Command.fillPixel(opposite.kind, opposite.position, _selectedColour),
                    );
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
    onPointerUp(event: PointerEvent) {
      endPointer(event);
    },
    onPointerCancel(event: PointerEvent) {
      endPointer(event);
      setRoundedWorldPosition(undefined);
    },
    // The pixel under the pointer is painted on the canvas, so it has to stop
    // being painted once the pointer is no longer over it. Leaving raises this,
    // and a gesture the browser takes over raises the cancel above without the
    // pointer ever leaving.
    onPointerOut() {
      setRoundedWorldPosition(undefined);
    },
    onWheel: panScaleControl.onWheel,
  };
};
