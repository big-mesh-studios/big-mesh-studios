import { Accessor, createSignal, untrack, useContext } from "solid-js";
import { Command } from "../command/Command";
import { OPPOSING_SIDE } from "../constants";
import { StackerContext } from "../context";
import { Bitmap, RGBA, Vector2D } from "@big-mesh-studios/maths";
import { type SideKind } from "@big-mesh-studios/stacker/renderer";
import { pointer } from "@big-mesh-studios/utils/pointer";
import { mirrorPositions, mirrorRectangles } from "../mirror";
import { screenToWorld } from "../utils/utils";
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
  doCommand: (
    command: Command,
    pushUndo?: boolean,
    description?: string,
  ) => Command;
}) => {
  const {
    sides,
    selectedPart,
    selectedColour,
    selectPaletteIndex,
    selectedPaletteIndex,
    requestRender,
    mode,
    mirror,
  } = useContext(StackerContext);

  // Read at the moment a command is built, so a stroke lands on the part that
  // was being drawn on and can be taken back against it later.
  const drawnPart = () => selectedPart().name;

  const [pan, setPan] = createSignal({ x: -10.0, y: -10.0 });
  const [scale, setScale] = createSignal(8);
  const [cursorStyle, setCursorStyle] = createSignal<string>();
  const [roundedWorldPosition, setRoundedWorldPosition] =
    createSignal<Vector2D>();

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
      index: Bitmap.get(
        sides()[oppositeKind],
        oppositePosition.x,
        oppositePosition.y,
      ),
      position: oppositePosition,
    };
  }

  /**
   * Every cell on `kind`'s panel that a mark at `position` lands on: the cell
   * itself, and its reflections where the mirror is switched on.
   */
  function strokePositions(kind: SideKind, position: Vector2D): Vector2D[] {
    return mirrorPositions(mirror(), sides()[kind], position);
  }

  /**
   * The panel `worldPosition` falls on, where that panel sits on the canvas, and
   * every cell on the canvas a mark there would cover once the mirror has
   * reflected it. Undefined where the position falls between the panels.
   */
  function hoveredPanel(worldPosition: Vector2D) {
    const intersection = intersectSides({
      sidePositions: sidePositions(),
      sides: sides(),
      worldPosition,
    });

    if (!intersection) {
      return;
    }

    const panel = sides()[intersection.kind];
    const panelPosition = sidePositions()[intersection.kind];

    return {
      panel,
      panelPosition,
      cells: mirrorPositions(mirror(), panel, intersection.position).map(
        (cell) => Vector2D.add(cell, panelPosition),
      ),
    };
  }

  /** One command running `commands` in order, or the only command there is. */
  function combine(commands: Command[]): Command {
    return commands.length === 1 ? commands[0] : Command.sequence(commands);
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

  function eventToRoundedWorldPosition(
    event: PointerEvent & { currentTarget: HTMLElement },
  ) {
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

  async function onPointerDown(
    event: PointerEvent & { currentTarget: HTMLElement },
  ) {
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

        if (_selectedPaletteIndex !== undefined) {
          for (const target of strokePositions(kind, position)) {
            commands.push(
              Command.fillPixel(
                drawnPart(),
                kind,
                target,
                _selectedPaletteIndex,
              ),
            );

            const opposite = getOppositePixel(kind, target);

            if (opposite.index === Bitmap.EMPTY) {
              commands.push(
                Command.fillPixel(
                  drawnPart(),
                  opposite.kind,
                  opposite.position,
                  _selectedPaletteIndex,
                ),
              );
            }
          }
        }

        if (commands.length === 0) {
          return;
        }

        undoCommandsReversed.push(doCommand(combine(commands)));

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

          const min = Vector2D.max(
            Vector2D.min(start.position, current),
            Vector2D.EMPTY,
          );
          const max = Vector2D.min(Vector2D.max(start.position, current), {
            x: side.width - 1,
            y: side.height - 1,
          });

          for (const block of mirrorRectangles(mirror(), side, { min, max })) {
            for (let x = block.min.x; x <= block.max.x; x++) {
              for (let y = block.min.y; y <= block.max.y; y++) {
                Bitmap.set(copy, x, y, selectedPaletteIndex());
              }
            }
          }
          requestRender();
        });

        sides()[start.kind] = original;

        const end = Vector2D.sub(
          eventToRoundedWorldPosition(finalEvent),
          sidePositions()[start.kind],
        );

        const min = Vector2D.max(
          Vector2D.min(start.position, end),
          Vector2D.EMPTY,
        );
        const max = Vector2D.min(Vector2D.max(start.position, end), {
          x: side.width - 1,
          y: side.height - 1,
        });

        undoCommandsReversed.push(
          doCommand(
            combine(
              mirrorRectangles(mirror(), side, { min, max }).map((block) =>
                Command.fillRectangle(
                  drawnPart(),
                  start.kind,
                  block.min,
                  block.max,
                  selectedPaletteIndex(),
                ),
              ),
            ),
          ),
        );

        // The pointer going up is what both ends this gesture and closes the
        // stroke, and the close runs first, while there is still nothing to
        // take back. So the rectangle closes its own stroke here, rather than
        // waiting in the list until some later stroke carries it along.
        pushStrokeUndo();

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

          const commands: Command[] = [];

          for (const target of strokePositions(kind, position)) {
            const opposite = getOppositePixel(kind, target);

            switch (mode()) {
              case "Erase": {
                commands.push(Command.erasePixel(drawnPart(), kind, target));

                if (opposite.index !== Bitmap.EMPTY) {
                  commands.push(
                    Command.erasePixel(
                      drawnPart(),
                      opposite.kind,
                      opposite.position,
                    ),
                  );
                }

                break;
              }
              case "Draw": {
                const _selectedPaletteIndex = selectedPaletteIndex();

                if (_selectedPaletteIndex !== undefined) {
                  commands.push(
                    Command.writePixel(
                      drawnPart(),
                      kind,
                      target,
                      _selectedPaletteIndex,
                    ),
                  );

                  // Only carry the colour to the far side where nothing is
                  // drawn, so drawing on one panel does not paint over the
                  // other.
                  if (opposite.index === Bitmap.EMPTY) {
                    commands.push(
                      Command.writePixel(
                        drawnPart(),
                        opposite.kind,
                        opposite.position,
                        _selectedPaletteIndex,
                      ),
                    );
                  }
                }

                break;
              }
            }
          }

          if (commands.length === 0) {
            return;
          }

          undoCommandsReversed.push(doCommand(combine(commands)));
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

      const _mirror = mirror();
      const hovered = hoveredPanel(position);

      // A panel is what a mirror reflects within, so where a stroke would land
      // is only known while the pointer is over one. Between the panels there
      // is just the cell under the pointer, wherever the mirror stands.
      const cells = hovered?.cells ?? [position];

      return (ctx: CanvasRenderingContext2D) => {
        ctx.lineWidth = 1 / scale();

        if (hovered) {
          const { panel, panelPosition } = hovered;

          ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
          ctx.beginPath();

          if (_mirror.x) {
            const x = panelPosition.x + panel.width / 2;
            ctx.moveTo(x, panelPosition.y);
            ctx.lineTo(x, panelPosition.y + panel.height);
          }

          if (_mirror.y) {
            const y = panelPosition.y + panel.height / 2;
            ctx.moveTo(panelPosition.x, y);
            ctx.lineTo(panelPosition.x + panel.width, y);
          }

          ctx.stroke();
        }

        ctx.fillStyle =
          mode() === "Erase"
            ? // var(--back)
              "oklch(23.26% .014 253.1)"
            : RGBA.toCSS(selectedColour());
        ctx.strokeStyle = "white";

        for (const cell of cells) {
          ctx.fillRect(cell.x, cell.y, 1.0, 1.0);
          ctx.strokeRect(cell.x, cell.y, 1.0, 1.0);
        }
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
