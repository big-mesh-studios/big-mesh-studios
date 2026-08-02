import { Accessor } from "solid-js";
import * as THREE from "three";
import { Effect } from "./Effect";

export interface ModeParams {
  mousePos: Accessor<THREE.Vector2 | undefined>;
  pointerDownCount: Accessor<number>;
  screenPtToWorldPt: (pt: THREE.Vector2, out?: THREE.Vector2) => THREE.Vector2 | undefined;
  worldPtToScreenPt: (pt: THREE.Vector2, out?: THREE.Vector2) => THREE.Vector2 | undefined;
  images: Accessor<
    {
      pos: THREE.Vector2;
      data: ImageData;
    }[]
  >;
  doEffect: (effect: Effect) => void;
  selectedColour: Accessor<string | undefined>;
  onUpdate(): void;
}

export interface Mode {
  activeModeButton?: Accessor<"Idle" | "Draw" | "Erase" | undefined>;
  overlayDrawing?: Accessor<((ctx: CanvasRenderingContext2D) => void) | undefined>;
  disablePanZoom?: Accessor<boolean>;
}
