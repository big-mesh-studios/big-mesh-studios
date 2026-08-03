import * as THREE from "three";
import { Accessor } from "solid-js";
import { Effect } from "./Effect";

export interface ModeParams {
  mousePos: Accessor<THREE.Vector2 | undefined>;
  pointerDownCount: Accessor<number>;
  screenPtToWorldPt: (pt: THREE.Vector2, out?: THREE.Vector2) => THREE.Vector2 | undefined;
  worldPtToScreenPt: (pt: THREE.Vector2, out?: THREE.Vector2) => THREE.Vector2 | undefined;
  doEffect: (effect: Effect) => void;
  selectedColour: Accessor<string | undefined>;
  store: StackerStore;
}

export interface Mode {
  activeModeButton?: Accessor<"Idle" | "Draw" | "Erase" | undefined>;
  overlayDrawing?: Accessor<((ctx: CanvasRenderingContext2D) => void) | undefined>;
  disablePanZoom?: Accessor<boolean>;
}

export type ModeFactory = (params: ModeParams) => Mode;

export interface Sides {
  front: ImageData;
  left: ImageData;
  right: ImageData;
  back: ImageData;
  top: ImageData;
  bottom: ImageData;
}

export type SideKind = keyof Sides;

export interface ImageCanvasCacheData {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

export interface StackerStore {
  dimensions: { x: number; y: number; z: number };
  sides: Sides;
}
