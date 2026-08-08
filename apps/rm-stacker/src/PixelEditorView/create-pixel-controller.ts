import { createPanScaleControl } from "@random-mesh/rm-pan-scale";
import {
  Accessor,
  createEffect,
  createMemo,
  createSignal,
  latest,
  untrack,
  useContext,
} from "solid-js";
import * as THREE from "three";
import { Command } from "../Command";
import { OPPOSING_SIDE } from "../constants";
import { StackerContext } from "../stacker-context";
import { Coordinates, ModeKind, SideKind, Vector2D } from "../types";
import { findCollidingSide } from "../utils";

const getOppositePixel = (kind: SideKind, position: Vector2D, side: ImageData): Vector2D => {
  if (kind === "top" || kind === "bottom") {
    return { x: position.x, y: side.height - position.y - 1 };
  }
  return { x: side.width - position.x - 1, y: position.y };
};

export const createPixelEditorController = ({
  canvas,
  mode,
  selectedColour,
  coordinates,
  pushUndo,
  doCommand,
}: {
  canvas: Accessor<HTMLCanvasElement | undefined>;
  mode: Accessor<ModeKind>;
  selectedColour: Accessor<string | undefined>;
  coordinates: Accessor<Coordinates>;
  pushUndo: (reverseCommand: Command, description: string) => void;
  doCommand: (command: Command, pushUndo?: boolean, description?: string) => Command;
}) => {
  const { store } = useContext(StackerContext);

  const [pan, setPan] = createSignal(new THREE.Vector2(-10.0, -10.0));
  const [scale, setScale] = createSignal(8);
  const [pointerids, setPointerids] = createSignal(new Set<number>(), { equals: false });
  const [mousePos, setMousePos] = createSignal<THREE.Vector2>();

  const panScaleControllerSetters = {
    setPanX: (value: number) => {
      setPan(p => new THREE.Vector2(value, p.y));
    },
    setPanY: (value: number) => {
      setPan(p => new THREE.Vector2(p.x, value));
    },
    setScale,
  };

  const panScaleControl = createPanScaleControl({
    target: canvas,
    scale,
    panX: () => pan().x,
    panY: () => pan().y,
    onUpdate: fn => fn(panScaleControllerSetters),
    disable: createMemo(() => mode() !== "Idle" && pointerids().size !== 0),
  });

  const screenToWorld = (pt: THREE.Vector2, out = new THREE.Vector2()): THREE.Vector2 => {
    out.copy(pt);
    out.multiplyScalar(1.0 / latest(scale));
    out.add(latest(pan));
    return out;
  };

  const mouseWorldPos = createMemo<THREE.Vector2 | undefined>(previous => {
    if (previous && mode() === "Idle") {
      return previous;
    }

    const _mousePos = mousePos();
    if (_mousePos === undefined) {
      return undefined;
    }

    const worldPos = screenToWorld(_mousePos);
    if (worldPos === undefined) {
      return undefined;
    }

    worldPos.x = Math.round(worldPos.x - 0.5);
    worldPos.y = Math.round(worldPos.y - 0.5);

    return worldPos;
  });

  let undoCommandsReversed: Command[] = [];

  const applyPixelStroke = (pos: { x: number; y: number }) => {
    const result = findCollidingSide(pos, store.sides, coordinates());
    if (!result) {
      return;
    }

    const { coordinate, side, kind } = result;
    const localX = pos.x - coordinate.x;
    const localY = pos.y - coordinate.y;
    const oppositePixel = getOppositePixel(kind, { x: localX, y: localY }, side);
    const oppositeKind = OPPOSING_SIDE[kind];
    const oppositeSide = store.sides[oppositeKind];
    const oppositeOpacity =
      store.sides[oppositeKind].data[
        ((oppositePixel.y * oppositeSide.width + oppositePixel.x) << 2) + 3
      ];
    const oppositeOffset = coordinates()[oppositeKind];

    let commands: Command[] = [];
    if (mode() === "Erase") {
      commands.push(Command.erasePixel(pos.x, pos.y));
      if (oppositeOpacity) {
        commands.push(
          Command.erasePixel(
            oppositeOffset.x + oppositePixel.x,
            oppositeOffset.y + oppositePixel.y,
          ),
        );
      }
    } else {
      const _selectedColour = untrack(selectedColour);
      if (_selectedColour !== undefined) {
        commands.push(Command.writePixel(pos.x, pos.y, _selectedColour));
        if (!oppositeOpacity) {
          commands.push(
            Command.writePixel(
              oppositeOffset.x + oppositePixel.x,
              oppositeOffset.y + oppositePixel.y,
              _selectedColour,
            ),
          );
        }
      }
    }

    if (commands.length === 0) {
      return;
    }

    const command = commands.length === 1 ? commands[0] : Command.sequence(commands);
    undoCommandsReversed.push(doCommand(command));
  };

  createEffect(
    () => pointerids().size,
    count => {
      if (count !== 0 || undoCommandsReversed.length === 0) {
        return;
      }
      const undoCommands = undoCommandsReversed.reverse();
      undoCommandsReversed = [];
      pushUndo(Command.sequence(undoCommands), mode() === "Erase" ? "Erase Pixels" : "Draw Pixels");
    },
  );

  createEffect(
    () => [mouseWorldPos(), pointerids().size, mode()] as const,
    ([pos, pointerCount, _mode]) => {
      if (_mode === "Idle") {
        return;
      }
      if (pointerCount !== 1) {
        return;
      }
      if (pos === undefined) {
        return;
      }
      applyPixelStroke(pos);
    },
  );

  return {
    pan,
    scale,
    overlayDrawing() {
      if (mode() === "Idle") {
        return;
      }

      const pixelPos = mouseWorldPos();

      if (!pixelPos) {
        return;
      }

      return (ctx: CanvasRenderingContext2D) => {
        ctx.fillStyle = "green";
        ctx.fillRect(pixelPos.x, pixelPos.y, 1.0, 1.0);
      };
    },
    onPointerDown(e: PointerEvent) {
      setPointerids(set => set.add(e.pointerId));
      panScaleControl.onPointerDown(e);
    },
    onPointerUp(e: PointerEvent) {
      setPointerids(set => {
        set.delete(e.pointerId);
        return set;
      });
      panScaleControl.onPointerUp(e);
    },
    onPointerCancel(e: PointerEvent) {
      setPointerids(set => {
        set.delete(e.pointerId);
        return set;
      });
      panScaleControl.onPointerCancel(e);
    },
    onPointerMove(e: PointerEvent) {
      panScaleControl.onPointerMove(e);
      const _canvas = canvas();
      if (_canvas === undefined) {
        return;
      }
      const rect = _canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setMousePos(new THREE.Vector2(x, y));
    },
    onPointerOut(_e: PointerEvent) {
      setMousePos();
    },
    onWheel: panScaleControl.onWheel,
  };
};
