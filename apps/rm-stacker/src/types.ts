import * as THREE from "three";
import { Accessor } from "solid-js";
import { Effect } from "./Effect";
import { StackerStore } from "./stacker-store";

/**********************************************************************************/
/*                                       Misc                                     */
/**********************************************************************************/

export interface Vector2D {
  x: number;
  y: number;
}

export interface Vector3D extends Vector2D {
  z: number;
}

export interface Dimensions2D {
  width: number;
  height: number;
}

export interface Dimensions3D extends Dimensions2D {
  depth: number;
}

/**********************************************************************************/
/*                                       Mode                                     */
/**********************************************************************************/

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

/**********************************************************************************/
/*                                      Sides                                     */
/**********************************************************************************/

export interface Sides {
  front: ImageData;
  left: ImageData;
  right: ImageData;
  back: ImageData;
  top: ImageData;
  bottom: ImageData;
}

export type SideKind = keyof Sides;
