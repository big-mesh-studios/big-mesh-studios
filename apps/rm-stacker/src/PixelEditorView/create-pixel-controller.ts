import { createPanScaleControl } from "@random-mesh/rm-pan-scale";
import { Setter } from "@solidjs/signals";
import {
  Accessor,
  createEffect,
  createMemo,
  createSignal,
  latest,
  untrack,
  useContext,
} from "solid-js";
import { Command } from "../command/Command";
import { OPPOSING_SIDE } from "../constants";
import { StackerContext } from "../context";
import { Vector2D } from "../maths";
import { ModeKind, RGBA, SideKind } from "../types";
import { createEdgeController } from "./create-edge-controller";
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
  mode,
  selectedColour,
  setSelectedColour,
  sidePositions,
  pushUndo,
  doCommand,
}: {
  canvas: Accessor<HTMLCanvasElement | undefined>;
  mode: Accessor<ModeKind>;
  selectedColour: Accessor<RGBA | undefined>;
  setSelectedColour: Setter<RGBA>;
  sidePositions: Accessor<SidePositions>;
  pushUndo: (reverseCommand: Command, description: string) => void;
  doCommand: (command: Command, pushUndo?: boolean, description?: string) => Command;
}) => {
  const { store } = useContext(StackerContext);

  const [pan, setPan] = createSignal({ x: -10.0, y: -10.0 });
  const [cursorStyle, setCursorStyle] = createSignal<string>();
  const [scale, setScale] = createSignal(8);
  const [pointerids, setPointerids] = createSignal(new Set<number>(), { equals: false });
  const [screenPointer, setCursorScreenPosition] = createSignal<Vector2D>();

  const worldPointer = createMemo<Vector2D | undefined>(() => {
    const _screenPointer = screenPointer();

    if (_screenPointer === undefined) {
      return undefined;
    }

    return screenToWorld(_screenPointer);
  });

  const panScaleControllerSetters = {
    setPanX: (value: number) => {
      setPan(p => ({ x: value, y: p.y }));
    },
    setPanY: (value: number) => {
      setPan(p => ({ x: p.x, y: value }));
    },
    setScale,
  };

  const shouldDisablePanScaleControl = createMemo(
    () => !PannableModes.has(mode()) && pointerids().size !== 0,
  );

  const panScaleControl = createPanScaleControl({
    target: canvas,
    scale,
    panX: () => pan().x,
    panY: () => pan().y,
    onUpdate: fn => fn(panScaleControllerSetters),
    disable: shouldDisablePanScaleControl,
  });

  const screenToWorld = (pt: Vector2D): Vector2D => {
    const out = { ...pt };
    Vector2D.multiplyScalar(pt, 1.0 / latest(scale), out);
    Vector2D.add(out, latest(pan), out);
    return out;
  };

  const roundedWorldPointer = createMemo<Vector2D | undefined>(previous => {
    const _worldPointer = worldPointer();

    if (_worldPointer === undefined) {
      return undefined;
    }

    return Vector2D.round(_worldPointer, previous);
  });

  const edgeController = createEdgeController({
    mouseWorldPosition: worldPointer,
    pan,
    scale,
    setCursorStyle,
    setPan,
    sidePositions,
  });

  let undoCommandsReversed: Command[] = [];
  createEffect(
    () => pointerids().size,
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

  createEffect(
    () => [roundedWorldPointer(), pointerids().size, mode()] as const,
    ([worldPointer, pointerCount, _mode]) => {
      if (_mode === "Idle") {
        return;
      }
      if (pointerCount !== 1) {
        return;
      }
      if (worldPointer === undefined) {
        return;
      }

      const intersection = intersectSides({
        position: worldPointer,
        sides: store.sides,
        sidePositions: untrack(sidePositions),
      });

      if (!intersection) {
        return;
      }

      const { side, kind, position } = intersection;

      const oppositePixel = getOppositePixel(kind, position, side);
      const oppositeKind = OPPOSING_SIDE[kind];

      const sides = untrack(() => store.sides);

      const oppositeSide = sides[oppositeKind];
      const oppositeOpacity =
        sides[oppositeKind].data[
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
          const _selectedColour = untrack(selectedColour);

          if (_selectedColour !== undefined) {
            commands.push(Command.writePixel(kind, position, _selectedColour));

            if (!oppositeOpacity) {
              commands.push(Command.writePixel(oppositeKind, oppositePixel, _selectedColour));
            }
          }

          break;
        }
        case "Fill": {
          const _selectedColour = untrack(selectedColour);

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
    },
  );

  return {
    pan,
    scale,
    cursor: cursorStyle,
    overlayDrawing() {
      if (mode() === "Idle") {
        return;
      }

      const position = roundedWorldPointer();
      if (!position) {
        return;
      }

      return (ctx: CanvasRenderingContext2D) => {
        ctx.fillStyle = "green";
        ctx.fillRect(position.x, position.y, 1.0, 1.0);
      };
    },
    onPointerDown(e: PointerEvent) {
      setPointerids(set => set.add(e.pointerId));

      switch (mode()) {
        case "Eyedrop": {
          const position = worldPointer();
          if (!position) {
            return;
          }

          const intersection = intersectSides({
            sidePositions: sidePositions(),
            sides: store.sides,
            position,
          });

          if (!intersection) {
            return;
          }

          setSelectedColour(intersection.colour);

          break;
        }
        case "Idle": {
          const edgeCollision = edgeController.onPointerDown(e);
          if (edgeCollision) {
            return;
          }

          break;
        }
      }

      panScaleControl.onPointerDown(e);
    },
    onPointerUp(e: PointerEvent) {
      setPointerids(set => {
        set.delete(e.pointerId);
        return set;
      });
      panScaleControl.onPointerUp(e);
      edgeController.onPointerEnd();
    },
    onPointerCancel(e: PointerEvent) {
      setPointerids(set => {
        set.delete(e.pointerId);
        return set;
      });
      panScaleControl.onPointerCancel(e);
      edgeController.onPointerEnd();
    },
    onPointerMove(e: PointerEvent) {
      if (mode() === "Idle") {
        edgeController.onPointerMove(e);
      }

      panScaleControl.onPointerMove(e);

      const _canvas = canvas();
      if (_canvas === undefined) {
        return;
      }

      const rect = _canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setCursorScreenPosition({ x, y });
    },
    onPointerOut(_e: PointerEvent) {
      setCursorScreenPosition();
    },
    onWheel: panScaleControl.onWheel,
  };
};
