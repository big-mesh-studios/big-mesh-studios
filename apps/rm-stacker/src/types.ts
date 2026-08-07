import * as THREE from "three";
import { Accessor } from "solid-js";
import { Command } from "./Command";
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

export type Axis = "x" | "y" | "z";

/**********************************************************************************/
/*                                       Mode                                     */
/**********************************************************************************/

export type ModeKind = "Draw" | "Erase" | "Idle";

export type Coordinates = Record<keyof Sides, { x: number; y: number }>;

export interface ModeParams {
  mousePos: Accessor<THREE.Vector2 | undefined>;
  pointerDownCount: Accessor<number>;
  selectedColour: Accessor<string | undefined>;
  coordinates: Accessor<Coordinates>;
  store: StackerStore;
  doCommand: (command: Command, pushUndo?: boolean, description?: string) => Promise<Command>;
  pushUndo: (reverseCommand: Command, description: string) => void;
}

/**********************************************************************************/
/*                                      Sides                                     */
/**********************************************************************************/

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
