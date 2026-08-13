import { Accessor, createSignal, untrack, useContext } from "solid-js";
import { Command } from "../command/Command";
import { OPPOSING_SIDE } from "../constants";
import { StackerContext } from "../context";
import { Bitmap, RGBA, Vector2D } from "../maths";
import { SideKind } from "../types";
import { pointer, screenToWorld } from "../utils";
import { createEdgeController } from "./create-edge-controller";
import { createPanScaleControl } from "./pan-scale";
import { intersectSides, SidePositions } from "./side-layout";

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
  const { sides, selectedColour, selectPaletteIndex, selectedPaletteIndex, requestRender, mode } =
    useContext(StackerContext);

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

  function getOppositePosition(kind: SideKind, position: Vector2D): Vector2D {
    const side = sides()[kind];
    if (kind === "top" || kind === "bottom") {
      return { x: position.x, y: side.height - position.y - 1 };
    }
    return { x: side.width - position.x - 1, y: position.y };
  }

  function getOppositePixel(kind: SideKind, position: Vector2D) {
    const oppositePosition = getOppositePosition(kind, position);
    const oppositeKind = OPPOSING_SIDE[kind];
    return {
      kind: oppositeKind,
      index: Bitmap.get(sides()[oppositeKind], oppositePosition.x, oppositePosition.y),
      position: oppositePosition,
    };
  }

  // Every pixel a stroke has changed so far, so that the whole stroke can be
  // taken back in one step rather than a pixel at a time.
  let undoCommandsReversed: Command[] = [];
  function pushStrokeUndo() {
    if (undoCommandsReversed.length === 0) {
      return;
    }
    const undoCommands = undoCommandsReversed.reverse();
    undoCommandsReversed = [];
    pushUndo(
      Command.sequence(undoCommands),
      untrack(mode) === "Erase" ? "Erase Pixels" : "Draw Pixels",
    );
  }

  function eventToRoundedWorldPosition(event: PointerEvent & { currentTarget: HTMLElement }) {
    const screenPointer = { x: event.layerX, y: event.layerY };
    return Vector2D.round(screenToWorld(screenPointer, pan(), scale()));
  }

  function endPointer(event: PointerEvent) {
    pointerIds.delete(event.pointerId);

    // The last finger to leave is the one that finishes the stroke, since a
    // stroke drawn with more than one is still a single thing to take back.
    if (pointerIds.size === 0) {
      pushStrokeUndo();
    }
  }

  async function onPointerDown(event: PointerEvent & { currentTarget: HTMLElement }) {
    // Everything this pointer raises from here on lands on the canvas even
    // once it has been taken off it, so however the gesture below ends, the
    // end is heard and the pointer can be dropped from the set again.
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerIds.add(event.pointerId);

    const _roundedWorldPosition = eventToRoundedWorldPosition(event);

    switch (untrack(mode)) {
      case "Eyedrop": {
        const intersection = intersectSides({
          sidePositions: sidePositions(),
          sides: sides(),
          worldPosition: _roundedWorldPosition,
        });

        if (!intersection || intersection.index === Bitmap.EMPTY) {
          return;
        }

        selectPaletteIndex(intersection.index);

        break;
      }
      case "Idle": {
        // A resize is the work of the one finger that started it. There is
        // nothing for a later finger to join, and letting it through would
        // either grab a second edge or start a drag underneath the resize.
        if (edgeController.active()) {
          break;
        }

        // A drag does take the fingers that arrive while it runs, so that a
        // second one turns it into a pinch instead of grabbing an edge it
        // happens to have landed on.
        if (!panScaleControl.active() && edgeController.onPointerDown(event)) {
          return;
        }

        panScaleControl.onPointerDown(event);
        break;
      }

      case "Fill": {
        const _selectedPaletteIndex = selectedPaletteIndex();
        const commands: Command[] = [];

        const intersection = intersectSides({
          worldPosition: _roundedWorldPosition,
          sides: sides(),
          sidePositions: sidePositions(),
        });

        if (!intersection) {
          return;
        }

        const { kind, position } = intersection;
        const opposite = getOppositePixel(kind, position);

        if (_selectedPaletteIndex !== undefined) {
          commands.push(Command.fillPixel(kind, position, _selectedPaletteIndex));

          if (opposite.index === Bitmap.EMPTY) {
            commands.push(
              Command.fillPixel(opposite.kind, opposite.position, _selectedPaletteIndex),
            );
          }
        }

        if (commands.length === 0) {
          return;
        }

        const command = commands.length === 1 ? commands[0] : Command.sequence(commands);
        undoCommandsReversed.push(doCommand(command));

        return;
      }

      case "Rectangle": {
        const start = intersectSides({
          sidePositions: sidePositions(),
          worldPosition: eventToRoundedWorldPosition(event),
          sides: sides(),
        });

        if (!start) {
          return;
        }

        const side = sides()[start.kind];
        const original = sides()[start.kind];

        const { event: finalEvent } = await pointer(event, ({ event }) => {
          const copy = Bitmap.clone(original);
          sides()[start.kind] = copy;

          const current = Vector2D.sub(
            eventToRoundedWorldPosition(event),
            sidePositions()[start.kind],
          );

          const min = Vector2D.max(Vector2D.min(start.position, current), Vector2D.create());
          const max = Vector2D.min(Vector2D.max(start.position, current), {
            x: side.width - 1,
            y: side.height - 1,
          });

          for (let x = min.x; x <= max.x; x++) {
            for (let y = min.y; y <= max.y; y++) {
              Bitmap.set(copy, x, y, selectedPaletteIndex());
            }
          }
          requestRender();
        });

        sides()[start.kind] = original;

        const end = Vector2D.sub(
          eventToRoundedWorldPosition(finalEvent),
          sidePositions()[start.kind],
        );

        const min = Vector2D.max(Vector2D.min(start.position, end), Vector2D.create());
        const max = Vector2D.min(Vector2D.max(start.position, end), {
          x: side.width - 1,
          y: side.height - 1,
        });

        undoCommandsReversed.push(
          doCommand(Command.fillRectangle(start.kind, min, max, selectedPaletteIndex())),
        );
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
          const opposite = getOppositePixel(kind, position);

          const commands: Command[] = [];

          switch (mode()) {
            case "Erase": {
              commands.push(Command.erasePixel(kind, position));

              if (opposite.index !== Bitmap.EMPTY) {
                commands.push(Command.erasePixel(opposite.kind, opposite.position));
              }

              break;
            }
            case "Draw": {
              const _selectedPaletteIndex = selectedPaletteIndex();

              if (_selectedPaletteIndex !== undefined) {
                commands.push(Command.writePixel(kind, position, _selectedPaletteIndex));

                // Only carry the colour to the far side where nothing is drawn,
                // so drawing on one panel does not paint over the other.
                if (opposite.index === Bitmap.EMPTY) {
                  commands.push(
                    Command.writePixel(opposite.kind, opposite.position, _selectedPaletteIndex),
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
  }

  return {
    pan,
    scale,
    cursor: cursorStyle,
    overlayDrawing() {
      if (mode() === "Idle") {
        return;
      }

      const position = roundedWorldPosition();

      if (!position) {
        return;
      }

      return (ctx: CanvasRenderingContext2D) => {
        ctx.fillStyle =
          mode() === "Erase"
            ? // var(--back)
              "oklch(23.26% .014 253.1)"
            : RGBA.toCSS(selectedColour());
        ctx.fillRect(position.x, position.y, 1.0, 1.0);
        ctx.strokeStyle = "white";
        ctx.lineWidth = 1 / scale();
        ctx.strokeRect(position.x, position.y, 1.0, 1.0);
      };
    },
    onPointerDown,
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
    onPointerOut() {
      setRoundedWorldPosition(undefined);
    },
    onWheel: panScaleControl.onWheel,
  };
};
