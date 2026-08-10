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
import * as THREE from "three";
import { Command } from "../Command";
import { OPPOSING_SIDE } from "../constants";
import { Vector2D } from "../maths";
import { StackerContext } from "../stacker-context";
import { ModeKind, Origins, RGBA, SideKind } from "../types";
import { intersectSides } from "../utils";
import { createEdgeController } from "./create-edge-controller";

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
  coordinates: origins,
  pushUndo,
  doCommand,
}: {
  canvas: Accessor<HTMLCanvasElement | undefined>;
  mode: Accessor<ModeKind>;
  selectedColour: Accessor<RGBA | undefined>;
  setSelectedColour: Setter<RGBA>;
  coordinates: Accessor<Origins>;
  pushUndo: (reverseCommand: Command, description: string) => void;
  doCommand: (command: Command, pushUndo?: boolean, description?: string) => Command;
}) => {
  const { store } = useContext(StackerContext);

  const [pan, setPan] = createSignal({ x: -10.0, y: -10.0 });
  const [cursor, setCursor] = createSignal<string>();
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

  const screenToWorld = (pt: THREE.Vector2, out = new THREE.Vector2()): THREE.Vector2 => {
    out.copy(pt);
    out.multiplyScalar(1.0 / latest(scale));
    out.add(latest(pan));
    return out;
  };

  const mouseWorldPos = createMemo<THREE.Vector2 | undefined>(() => {
    const _mousePos = mousePos();
    if (_mousePos === undefined) {
      return undefined;
    }

    const worldPos = screenToWorld(_mousePos);
    if (worldPos === undefined) {
      return undefined;
    }

    return worldPos;
  });

  const roundedMouseWorldPos = createMemo<Vector2D | undefined>(() => {
    const _mouseWorldPos = mouseWorldPos();

    if (_mouseWorldPos === undefined) {
      return undefined;
    }

    return Vector2D.round(_mouseWorldPos);
  });

  const edgeController = createEdgeController({
    mouseWorldPos,
    scale,
    pan,
    setPan,
    setCursor,
  });

  let undoCommandsReversed: Command[] = [];

  const applyPixelStroke = (position: Vector2D) =>
    untrack(() => {
      const intersection = intersectSides({
        position,
        sides: store.sides,
        origins: origins(),
      });

      if (!intersection) {
        return;
      }

      const { side, kind, relativePosition } = intersection;

      const oppositePixel = getOppositePixel(kind, relativePosition, side);
      const oppositeKind = OPPOSING_SIDE[kind];
      const oppositeSide = store.sides[oppositeKind];
      const oppositeOpacity = untrack(
        () =>
          store.sides[oppositeKind].data[
            ((oppositePixel.y * oppositeSide.width + oppositePixel.x) << 2) + 3
          ],
      );
      const oppositeOffset = origins()[oppositeKind];

      let commands: Command[] = [];

      switch (mode()) {
        case "Erase": {
          commands.push(Command.erasePixel(position.x, position.y));
          if (oppositeOpacity) {
            commands.push(
              Command.erasePixel(
                oppositeOffset.x + oppositePixel.x,
                oppositeOffset.y + oppositePixel.y,
              ),
            );
          }
          break;
        }
        case "Draw": {
          const _selectedColour = selectedColour();
          if (_selectedColour !== undefined) {
            commands.push(Command.writePixel(position.x, position.y, _selectedColour));
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
          break;
        }
        case "Fill": {
          const _selectedColour = selectedColour();
          if (_selectedColour !== undefined) {
            commands.push(Command.fillPixel(position.x, position.y, _selectedColour));
            if (!oppositeOpacity) {
              commands.push(
                Command.fillPixel(
                  oppositeOffset.x + oppositePixel.x,
                  oppositeOffset.y + oppositePixel.y,
                  _selectedColour,
                ),
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
    () => [roundedMouseWorldPos(), pointerids().size, mode()] as const,
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
    cursor,
    overlayDrawing() {
      if (mode() === "Idle") {
        return;
      }

      const pixelPos = roundedMouseWorldPos();

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

      switch (mode()) {
        case "Eyedrop": {
          const position = roundedMouseWorldPos();
          if (!position) {
            return;
          }

          const intersection = intersectSides({
            origins: origins(),
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
      setMousePos(new THREE.Vector2(x, y));
    },
    onPointerOut(_e: PointerEvent) {
      setMousePos();
    },
    onWheel: panScaleControl.onWheel,
  };
};
