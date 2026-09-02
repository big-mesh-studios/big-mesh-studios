import {
  Accessor,
  createMemo,
  createSignal,
  untrack,
  useContext,
} from "solid-js";
import { Command } from "../command/Command";
import { StackerContext } from "../context";
import { Bitmap, RGBA, Vector2D } from "@big-mesh-studios/maths";
import { type PanelKind } from "@big-mesh-studios/stacker/renderer";
import { pointer } from "@big-mesh-studios/utils/pointer";
import type { ModeKind } from "../types";
import { mirrorBlocks, mirrorMarks, type Block, type Mark } from "../mirror";
import {
  axisColour,
  blockAcrossTheRun,
  cellAcrossTheRun,
  cutFromPanelLine,
  panelTable,
  writePanel,
} from "../panels";
import { screenToWorld } from "../utils/utils";
import { createEdgeController } from "./create-edge-controller";
import { createPanScaleControl } from "./pan-scale";
import {
  intersectPanelLabels,
  intersectPanels,
  intersectSliceMarkers,
  type Box,
  type PanelLabel,
  type PanelPositions,
  type SliceLayout,
  type SliceMarker,
} from "./side-layout";

const PannableModes = new Set(["Idle", "Eyedrop"]);

/** How much of the view is left around what it is brought to look at. */
const FOCUS_MARGIN = 0.9;

/** The tools that cut, and which of a panel's image axes each of them divides. */
const KNIFE_AXES = {
  CutDown: "x",
  CutAcross: "y",
} as const satisfies Partial<Record<ModeKind, keyof Vector2D>>;

type KnifeMode = keyof typeof KNIFE_AXES;

export const createPixelEditorController = ({
  canvas,
  panelPositions,
  panelLabels,
  sliceLayouts,
  sliceMarkers,
  pushUndo,
  doCommand,
}: {
  canvas: Accessor<HTMLCanvasElement | undefined>;
  panelPositions: Accessor<PanelPositions>;
  panelLabels: Accessor<PanelLabel[]>;
  sliceLayouts: Accessor<SliceLayout[]>;
  sliceMarkers: Accessor<SliceMarker[]>;
  pushUndo: (reverseCommand: Command, description: string) => void;
  doCommand: (
    command: Command,
    pushUndo?: boolean,
    description?: string,
  ) => Command;
}) => {
  const {
    cutPart,
    selectedPart,
    selectedColour,
    selectPaletteIndex,
    selectedPaletteIndex,
    requestRender,
    dimensions,
    mode,
    mirror,
  } = useContext(StackerContext);

  // Read at the moment a command is built, so a stroke lands on the part that
  // was being drawn on and can be taken back against it later.
  const drawnPart = () => selectedPart().name;

  /** The drawings of the part being drawn on, and how each of them is turned. */
  const table = createMemo(() => panelTable(selectedPart()));

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
    sidePositions: panelPositions,
  });

  /**
   * The cell at the other end of the run `position` carves, and what is drawn
   * there, where there is such a cell.
   *
   * The two faces bounding a run carve the same voxels, so a stroke on one of
   * them is answered on the other: what one takes away leaves the other's
   * drawing with no voxel to sit on, and what one draws shows nothing unless
   * the other has something there to keep the run from being carved.
   */
  function getOppositePixel(panel: PanelKind, position: Vector2D) {
    const across = cellAcrossTheRun(table(), panel, position);
    const drawing =
      across === undefined ? undefined : table().bitmap(across.panel);

    if (across === undefined || drawing === undefined) {
      return undefined;
    }

    return {
      kind: across.panel,
      index: Bitmap.get(drawing, across.position.x, across.position.y),
      position: across.position,
    };
  }

  /**
   * Every cell a mark at `position` on `panel` lands on: the cell itself, and
   * its reflections where the mirror is switched on. A reflection across one of
   * the part's own axes can land on a different panel from the one drawn on.
   */
  function strokeMarks(panel: PanelKind, position: Vector2D): Mark[] {
    return mirrorMarks(mirror(), table(), { panel, position });
  }

  /**
   * The cut the knife would make with the pointer where it is, and the line
   * standing for it on the canvas.
   *
   * Undefined where the pointer is not over a panel, or over a place along it
   * no cut can stand: the ends of an axis, where a cut would leave nothing on
   * one side of itself. Nothing is drawn there, which is what says so.
   *
   * @param along Which of the panel's image axes the cut divides, which the
   * knife in hand says: a line down the panel divides the axis it is drawn
   * across, and a line across it divides the one it is drawn down.
   */
  function knifeAt(worldPosition: Vector2D, along: keyof Vector2D) {
    const over = intersectPanels({
      positions: panelPositions(),
      table: table(),
      worldPosition,
    });
    const drawnLike = over && table().side(over.kind);
    const drawing = over && table().bitmap(over.kind);
    const panelPosition = over && panelPositions()[over.kind];

    if (!over || !drawnLike || !drawing || !panelPosition) {
      return undefined;
    }

    const corner = Vector2D.sub(worldPosition, panelPosition);
    const cut = cutFromPanelLine({
      drawnLike,
      axis: along,
      line: along === "x" ? corner.x : corner.y,
      dimensions: dimensions(),
    });

    if (cut.at < 1 || cut.at > dimensions()[cut.axis] - 1) {
      return undefined;
    }

    return {
      cut,
      line:
        along === "x"
          ? {
              from: { x: worldPosition.x, y: panelPosition.y },
              to: { x: worldPosition.x, y: panelPosition.y + drawing.height },
            }
          : {
              from: { x: panelPosition.x, y: worldPosition.y },
              to: { x: panelPosition.x + drawing.width, y: worldPosition.y },
            },
    };
  }

  /**
   * Whether a stroke reaches the cell at the other end of the run it carves.
   *
   * Drawing reaches it where nothing is drawn there, because a run empty at
   * that end is carved away and the stroke would show nothing; it goes no
   * further than that, so drawing on one panel does not paint over the other.
   * Drawing in nothing reaches it the other way about, wherever something is
   * drawn there: the run is being taken away, and what was drawn at its far end
   * is left with no voxel to sit on.
   */
  function reachesAcross(
    takingAway: boolean,
    opposite: { index: number },
  ): boolean {
    return takingAway
      ? opposite.index !== Bitmap.EMPTY
      : opposite.index === Bitmap.EMPTY;
  }

  /**
   * What taking hold of `worldPosition` brings into view, where something
   * there is a way of reaching something else: a slice's number brings that
   * slice, and a panel's name brings that panel.
   */
  function broughtIntoViewAt(worldPosition: Vector2D): Box | undefined {
    const marker = intersectSliceMarkers(sliceMarkers(), worldPosition);

    if (marker !== undefined) {
      return sliceLayouts()[marker.cut]?.box;
    }

    return intersectPanelLabels(panelLabels(), worldPosition)?.panelBox;
  }

  /** How a block is named when it is being kept track of once only. */
  const blockKey = (block: Block) =>
    `${block.panel}:${block.min.x},${block.min.y}:${block.max.x},${block.max.y}`;

  /** `marks` with each cell kept only the first time it is named. */
  function uniqueMarks(marks: Mark[]): Mark[] {
    const found = new Set<string>();

    return marks.filter((mark) => {
      const key = `${mark.panel}:${mark.position.x},${mark.position.y}`;

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
    const intersection = intersectPanels({
      positions: panelPositions(),
      table: table(),
      worldPosition,
    });

    const panel =
      intersection === undefined
        ? undefined
        : table().bitmap(intersection.kind);
    const panelPosition =
      intersection === undefined
        ? undefined
        : panelPositions()[intersection.kind];

    if (
      intersection === undefined ||
      panel === undefined ||
      panelPosition === undefined
    ) {
      return;
    }

    return {
      panel,
      panelPosition,
      mirroredAxes: mirror().panel,
      cells: strokeMarks(intersection.kind, intersection.position).flatMap(
        (mark) => {
          const at = panelPositions()[mark.panel];
          return at === undefined ? [] : [Vector2D.add(mark.position, at)];
        },
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
      untrack(selectedPaletteIndex) === Bitmap.EMPTY
        ? "Erase Pixels"
        : "Draw Pixels",
    );
  }

  function eventToWorldPosition(event: PointerEvent) {
    return screenToWorld({ x: event.layerX, y: event.layerY }, pan(), scale());
  }

  function eventToRoundedWorldPosition(
    event: PointerEvent & { currentTarget: HTMLElement },
  ) {
    return Vector2D.round(eventToWorldPosition(event));
  }

  /** Brings `box` to the middle of the view, as large as it goes there. */
  function focusOn(box: Box) {
    const element = canvas();

    if (element === undefined) {
      return;
    }

    const fitted =
      FOCUS_MARGIN *
      Math.min(
        element.width / (box.max.x - box.min.x),
        element.height / (box.max.y - box.min.y),
      );

    setScale(fitted);
    setPan({
      x: (box.min.x + box.max.x) / 2 - element.width / (2 * fitted),
      y: (box.min.y + box.max.y) / 2 - element.height / (2 * fitted),
    });
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

    // A slice's number and a panel's name are both ways of reaching what they
    // stand for, whatever tool is in hand: what is under either of them is the
    // space around a drawing, and nothing draws there.
    const brought = broughtIntoViewAt(eventToWorldPosition(event));

    if (brought !== undefined) {
      focusOn(brought);
      return;
    }

    const _roundedWorldPosition = eventToRoundedWorldPosition(event);

    switch (untrack(mode)) {
      case "Eyedrop": {
        const intersection = intersectPanels({
          positions: panelPositions(),
          table: table(),
          worldPosition: _roundedWorldPosition,
        });

        if (!intersection) {
          return;
        }

        // An empty cell is picked up as the empty colour, so the eyedropper
        // hands back whatever is under it, drawn or not.
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
        const drawn = selectedPaletteIndex();
        const takingAway = drawn === Bitmap.EMPTY;
        const commands: Command[] = [];

        const intersection = intersectPanels({
          worldPosition: _roundedWorldPosition,
          table: table(),
          positions: panelPositions(),
        });

        if (!intersection) {
          return;
        }

        const { kind, position } = intersection;

        const targets: Mark[] = [];

        for (const mark of strokeMarks(kind, position)) {
          targets.push(mark);

          const opposite = getOppositePixel(mark.panel, mark.position);

          if (opposite !== undefined && reachesAcross(takingAway, opposite)) {
            targets.push({
              panel: opposite.kind,
              position: opposite.position,
            });
          }
        }

        for (const target of uniqueMarks(targets)) {
          commands.push(
            Command.fillPixel(
              drawnPart(),
              target.panel,
              target.position,
              drawn,
            ),
          );
        }

        if (commands.length === 0) {
          return;
        }

        undoCommandsReversed.push(doCommand(combine(commands)));

        return;
      }

      case "CutDown":
      case "CutAcross": {
        // The line follows the pointer until it is let go, so a cut can be
        // put down roughly and then carried to where it belongs — which is
        // the only way to place one where nothing hovers before it presses.
        const { event: finalEvent } = await pointer(event, ({ event }) => {
          setRoundedWorldPosition(eventToRoundedWorldPosition(event));
        });

        const knife = knifeAt(
          eventToRoundedWorldPosition(finalEvent),
          KNIFE_AXES[untrack(mode) as KnifeMode],
        );

        if (knife !== undefined) {
          cutPart(knife.cut.axis, knife.cut.at);
        }

        return;
      }

      case "Rectangle": {
        const start = intersectPanels({
          positions: panelPositions(),
          worldPosition: eventToRoundedWorldPosition(event),
          table: table(),
        });

        const side =
          start === undefined ? undefined : table().bitmap(start.kind);

        if (start === undefined || side === undefined) {
          return;
        }

        // Every drawing as it stands, so that each move of the preview can put
        // them all back before drawing the rectangle where the pointer is now.
        // A reflection across one of the part's axes lands on another panel, so
        // more than the one being dragged on can be under the preview.
        const originals = new Map(
          table().kinds.flatMap((kind) => {
            const drawing = table().bitmap(kind);
            return drawing === undefined ? [] : [[kind, drawing] as const];
          }),
        );

        /** Where the rectangle reaches on `start`'s panel, given the pointer. */
        function draggedBlock(
          event: PointerEvent & { currentTarget: HTMLElement },
        ) {
          const current = Vector2D.sub(
            eventToRoundedWorldPosition(event),
            panelPositions()[start!.kind] ?? Vector2D.EMPTY,
          );

          return {
            panel: start!.kind,
            min: Vector2D.max(
              Vector2D.min(start!.position, current),
              Vector2D.EMPTY,
            ),
            max: Vector2D.min(Vector2D.max(start!.position, current), {
              x: side!.width - 1,
              y: side!.height - 1,
            }),
          };
        }

        /**
         * Every block the rectangle covers: the block dragged out and each
         * reflection of it, then the far end of every run those carve, filled
         * in only where nothing is drawn.
         *
         * A run carved away at its far end would leave the rectangle with no
         * voxels to show it, which is why the far end is reached at all; the
         * drawing already there is what says the run is not carved, so it is
         * left alone. A block already being drawn on is listed once.
         */
        function coveredBlocks(
          event: PointerEvent & { currentTarget: HTMLElement },
        ): { block: Block; onlyWhereEmpty: boolean }[] {
          const drawn = mirrorBlocks(mirror(), table(), draggedBlock(event));
          const covered = new Set(drawn.map(blockKey));
          const blocks = drawn.map((block) => ({
            block,
            onlyWhereEmpty: false,
          }));
          // A rectangle drawn in nothing takes the far end away with it rather
          // than filling it in, and a cell already empty there is nothing to
          // take away, so it goes over the whole block.
          const onlyWhereEmpty = selectedPaletteIndex() !== Bitmap.EMPTY;

          for (const block of drawn) {
            const across = blockAcrossTheRun(table(), block);

            if (across === undefined || covered.has(blockKey(across))) {
              continue;
            }

            covered.add(blockKey(across));
            blocks.push({ block: across, onlyWhereEmpty });
          }

          return blocks;
        }

        function restorePanels() {
          for (const [kind, drawing] of originals) {
            writePanel(selectedPart(), kind, drawing);
          }
        }

        const { event: finalEvent } = await pointer(event, ({ event }) => {
          restorePanels();

          const copies = new Map<PanelKind, Bitmap>();

          for (const { block, onlyWhereEmpty } of coveredBlocks(event)) {
            let copy = copies.get(block.panel);
            const original = originals.get(block.panel);

            if (copy === undefined && original !== undefined) {
              copy = Bitmap.clone(original);
              copies.set(block.panel, copy);
              writePanel(selectedPart(), block.panel, copy);
            }

            if (copy === undefined) {
              continue;
            }

            for (let x = block.min.x; x <= block.max.x; x++) {
              for (let y = block.min.y; y <= block.max.y; y++) {
                if (onlyWhereEmpty && !Bitmap.isEmpty(copy, x, y)) {
                  continue;
                }

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
              coveredBlocks(finalEvent).map(({ block, onlyWhereEmpty }) =>
                Command.fillRectangle(
                  drawnPart(),
                  block.panel,
                  block.min,
                  block.max,
                  selectedPaletteIndex(),
                  onlyWhereEmpty,
                ),
              ),
            ),
          ),
        );

        return;
      }

      default: {
        if (pointerIds.size !== 1) {
          return;
        }

        pointer(event, ({ event }) => {
          const worldPointer = eventToRoundedWorldPosition(event);

          const intersection = intersectPanels({
            worldPosition: worldPointer,
            table: table(),
            positions: panelPositions(),
          });

          if (!intersection) {
            return;
          }

          const { kind, position } = intersection;

          const drawn = selectedPaletteIndex();
          const takingAway = drawn === Bitmap.EMPTY;
          const targets: Mark[] = [];

          for (const mark of strokeMarks(kind, position)) {
            targets.push(mark);

            const opposite = getOppositePixel(mark.panel, mark.position);

            if (opposite !== undefined && reachesAcross(takingAway, opposite)) {
              targets.push({
                panel: opposite.kind,
                position: opposite.position,
              });
            }
          }

          const commands: Command[] = [];

          for (const target of uniqueMarks(targets)) {
            commands.push(
              takingAway
                ? Command.erasePixel(drawnPart(), target.panel, target.position)
                : Command.writePixel(
                    drawnPart(),
                    target.panel,
                    target.position,
                    drawn,
                  ),
            );
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

      const knifeAxis = KNIFE_AXES[mode() as KnifeMode];

      if (knifeAxis !== undefined) {
        const position = roundedWorldPosition();
        const knife =
          position === undefined ? undefined : knifeAt(position, knifeAxis);

        if (knife === undefined) {
          return;
        }

        // The colour of the axis it would cut, which is the colour the cut is
        // drawn in once it is made.
        const colour = axisColour(knife.cut.axis);

        return (ctx: CanvasRenderingContext2D) => {
          ctx.lineWidth = 2 / scale();
          ctx.strokeStyle = colour;
          ctx.beginPath();
          ctx.moveTo(knife.line.from.x, knife.line.from.y);
          ctx.lineTo(knife.line.to.x, knife.line.to.y);
          ctx.stroke();
        };
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

        const colour = selectedColour();

        ctx.fillStyle =
          colour === undefined
            ? // var(--back)
              "oklch(23.26% .014 253.1)"
            : RGBA.toCSS(colour);
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

      // Said after the edges have had their say, so that a number standing over
      // one of them still shows what it does.
      const brought = broughtIntoViewAt(eventToWorldPosition(event));

      if (brought !== undefined) {
        setCursorStyle("pointer");
      } else if (mode() !== "Idle") {
        setCursorStyle(undefined);
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
