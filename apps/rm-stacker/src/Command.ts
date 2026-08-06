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

  export function toJSON(command: Command): any {
    switch (command.type) {
      case "NoOperation":
        return command;
      case "Sequence":
        return {
          type: "Sequence",
          commands: command.commands.map(c => Command.toJSON(c)),
        };
      case "WritePixel": {
        let colour = command.colour;
        if (colour instanceof THREE.Color) {
          colour = colour.convertLinearToSRGB().getHex();
        }
        return { type: "WritePixel", x: command.x, y: command.y, colour };
      }
      case "ErasePixel": {
        return command;
      }
    }
  }

  export function fromJSON(command: any): Command {
    switch (command.type) {
      case "NoOperation":
        return Command.noOperation();
      case "Sequence":
        return Command.sequence(command.commands.map((c: any) => Command.fromJSON(c)));
      case "WritePixel": {
        return Command.writePixel(command.x, command.y, command.colour);
      }
      case "ErasePixel": {
        return Command.erasePixel(command.x, command.y);
      }
      default:
        throw new Error("Unknown Command");
    }
  }
}
