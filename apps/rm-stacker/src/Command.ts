import * as THREE from "three";

export type Command =
  | {
      type: "NoOperation";
    }
  | {
      type: "Sequence";
      commands: Command[];
    }
  | {
      type: "WritePixel";
      x: number;
      y: number;
      colour: THREE.ColorRepresentation;
    }
  | {
      type: "ErasePixel";
      x: number;
      y: number;
    };

export namespace Command {
  export function noOperation(): Command {
    return { type: "NoOperation" };
  }

  export function sequence(commands: Command[]): Command {
    return { type: "Sequence", commands };
  }

  export function writePixel(x: number, y: number, colour: THREE.ColorRepresentation): Command {
    return { type: "WritePixel", x, y, colour };
  }

  export function erasePixel(x: number, y: number): Command {
    return { type: "ErasePixel", x, y };
  }
}
