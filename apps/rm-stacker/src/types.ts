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

export const sideKindSet = {
  front: true,
  left: true,
  right: true,
  back: true,
  top: true,
  bottom: true,
} as const;

export type SideKind = keyof typeof sideKindSet;

export type Sides = {
  [k in SideKind]: ImageData;
};

export interface ImageCanvasCacheData {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

export interface StackerStore {
  dimensions: { x: number; y: number; z: number };
  sides: Sides;
}
