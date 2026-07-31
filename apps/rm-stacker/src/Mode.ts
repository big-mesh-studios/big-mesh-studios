import { Accessor } from "solid-js";
import * as THREE from "three";

export interface ModeParams {
  screenPtToWorldPt: (pt: THREE.Vector2, out?: THREE.Vector2) => THREE.Vector2 | undefined,
  worldPtToScreenPt: (pt: THREE.Vector2, out?: THREE.Vector2) => THREE.Vector2 | undefined,
  images: Accessor<{
    pos: THREE.Vector2,
    data: ImageData,
  }[]>,
}

export interface Mode {
  activeModeButton?: "Idle" | "Draw" | undefined,
}

