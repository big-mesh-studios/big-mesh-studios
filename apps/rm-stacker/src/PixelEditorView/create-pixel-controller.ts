import { Accessor, createSignal, untrack, useContext } from "solid-js";
import { Command } from "../command/Command";
import { OPPOSING_SIDE } from "../constants";
import { StackerContext } from "../context";
import { Bitmap, RGBA, Vector2D } from "@big-mesh-studios/maths";
import { type SideKind } from "@big-mesh-studios/stacker/renderer";
import { pointer } from "@big-mesh-studios/utils/pointer";
import { mirrorBlocks, mirrorMarks, type Mark } from "../mirror";
import { keysOf, screenToWorld } from "../utils/utils";
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
   * Every cell a mark at `position` on `kind`'s panel lands on: the cell itself,
   * and its reflections where the mirror is switched on. A reflection across one
   * of the part's own axes can land on a different panel from the one drawn on.
   */
  function strokeMarks(kind: SideKind, position: Vector2D): Mark[] {
    return mirrorMarks(mirror(), sides(), { side: kind, position });
  }

  /** `marks` with each cell kept only the first time it is named. */
  function uniqueMarks(marks: Mark[]): Mark[] {
    const found = new Set<string>();

    return marks.filter((mark) => {
      const key = `${mark.side}:${mark.position.x},${mark.position.y}`;

      if (found.has(key)) {
        return false;
      }

      found.add(key);
      return true;
    });
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

    return {
      panel: sides()[intersection.kind],
      panelPosition: sidePositions()[intersection.kind],
      mirroredAxes: mirror().panel,
      cells: strokeMarks(intersection.kind, intersection.position).map((mark) =>
        Vector2D.add(mark.position, sidePositions()[mark.side]),
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
          const targets: Mark[] = [];

          for (const mark of strokeMarks(kind, position)) {
            targets.push(mark);

            const opposite = getOppositePixel(mark.side, mark.position);

            if (opposite.index === Bitmap.EMPTY) {
              targets.push({
                side: opposite.kind,
                position: opposite.position,
              });
            }
          }

          for (const target of uniqueMarks(targets)) {
            commands.push(
              Command.fillPixel(
                drawnPart(),
                target.side,
                target.position,
                _selectedPaletteIndex,
              ),
            );
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
        // Every panel as it stands, so that each move of the preview can put
        // them all back before drawing the rectangle where the pointer is now.
        // A reflection across one of the part's axes lands on another panel, so
        // more than the one being dragged on can be under the preview.
        const originals = { ...sides() };

        /** Where the rectangle reaches on `start`'s panel, given the pointer. */
        function draggedBlock(
          event: PointerEvent & { currentTarget: HTMLElement },
        ) {
          const current = Vector2D.sub(
            eventToRoundedWorldPosition(event),
            sidePositions()[start!.kind],
          );

          return {
            side: start!.kind,
            min: Vector2D.max(
              Vector2D.min(start!.position, current),
              Vector2D.EMPTY,
            ),
            max: Vector2D.min(Vector2D.max(start!.position, current), {
              x: side.width - 1,
              y: side.height - 1,
            }),
          };
        }

        function restorePanels() {
          const panels = sides();

          for (const kind of keysOf(originals)) {
            panels[kind] = originals[kind];
          }
        }

        const { event: finalEvent } = await pointer(event, ({ event }) => {
          restorePanels();

          const panels = sides();
          const copies = new Map<SideKind, Bitmap>();

          for (const block of mirrorBlocks(
            mirror(),
            panels,
            draggedBlock(event),
          )) {
            let copy = copies.get(block.side);

            if (copy === undefined) {
              copy = Bitmap.clone(originals[block.side]);
              copies.set(block.side, copy);
              panels[block.side] = copy;
            }

            for (let x = block.min.x; x <= block.max.x; x++) {
              for (let y = block.min.y; y <= block.max.y; y++) {
                Bitmap.set(copy, x, y, selectedPaletteIndex());
              }
            }
          }

          requestRender();
        });

        restorePanels();

        undoCommandsReversed.push(
          doCommand(
            combine(
              mirrorBlocks(mirror(), sides(), draggedBlock(finalEvent)).map(
                (block) =>
                  Command.fillRectangle(
                    drawnPart(),
                    block.side,
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

          const _mode = mode();
          const _selectedPaletteIndex = selectedPaletteIndex();
          const targets: Mark[] = [];

          for (const mark of strokeMarks(kind, position)) {
            targets.push(mark);

            const opposite = getOppositePixel(mark.side, mark.position);

            // Erasing reaches the far side wherever something is drawn there;
            // drawing only reaches it where nothing is, so painting one panel
            // does not paint over the other.
            const reaches =
              _mode === "Erase"
                ? opposite.index !== Bitmap.EMPTY
                : opposite.index === Bitmap.EMPTY;

            if (reaches) {
              targets.push({
                side: opposite.kind,
                position: opposite.position,
              });
            }
          }

          const commands: Command[] = [];

          for (const target of uniqueMarks(targets)) {
            if (_mode === "Erase") {
              commands.push(
                Command.erasePixel(drawnPart(), target.side, target.position),
              );
            } else if (_selectedPaletteIndex !== undefined) {
              commands.push(
                Command.writePixel(
                  drawnPart(),
                  target.side,
                  target.position,
                  _selectedPaletteIndex,
                ),
              );
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

      const hovered = hoveredPanel(position);

      // A stroke is reflected about the panel it is drawn on, so where it would
      // land is only known while the pointer is over one. Between the panels
      // there is just the cell under the pointer, wherever the mirror stands.
      const cells = hovered?.cells ?? [position];

      return (ctx: CanvasRenderingContext2D) => {
        ctx.lineWidth = 1 / scale();

        if (hovered) {
          const { panel, panelPosition, mirroredAxes } = hovered;

          ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
          ctx.beginPath();

          if (mirroredAxes.x) {
            const x = panelPosition.x + panel.width / 2;
            ctx.moveTo(x, panelPosition.y);
            ctx.lineTo(x, panelPosition.y + panel.height);
          }

          if (mirroredAxes.y) {
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
