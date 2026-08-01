import * as THREE from "three";

export type Effect =
  | {
      type: "NoOperation",
    }
  | {
      type: "WritePixel",
      x: number,
      y: number,
      colour: THREE.ColorRepresentation,
    }
  | {
      type: "ErasePixel",
      x: number,
      y: number,
    };

export namespace Effect {
  export function noOperation(): Effect {
    return { type: "NoOperation", };
  }

  export function writePixel(
    x: number,
    y: number,
    colour: THREE.ColorRepresentation,
  ): Effect {
    return { type: "WritePixel", x, y, colour, };
  }

  export function erasePixel(
    x: number,
    y: number,
  ): Effect {
    return { type: "ErasePixel", x, y, };
  }
}

