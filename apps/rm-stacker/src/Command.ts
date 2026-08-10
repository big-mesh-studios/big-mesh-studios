import { Vector2D } from "./maths";
import { RGBA } from "./types";
import { base64ToUint8Array, uint8ArrayToBase64 } from "./utils";

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
      position: Vector2D;
      colour: RGBA;
    }
  | {
      type: "FillPixel";
      position: Vector2D;
      colour: RGBA;
    }
  | {
      type: "ErasePixel";
      position: Vector2D;
    }
  | {
      type: "LoadData";
      data: Blob;
    }
  | {
      type: "Async";
      command: Promise<Command>;
    };

export namespace Command {
  export function noOperation(): Command {
    return { type: "NoOperation" };
  }

  export function sequence(commands: Command[]): Command {
    return { type: "Sequence", commands };
  }

  export function writePixel(position: Vector2D, colour: RGBA): Command {
    return { type: "WritePixel", position, colour };
  }

  export function fillPixel(position: Vector2D, colour: RGBA): Command {
    return { type: "FillPixel", position, colour };
  }

  export function erasePixel(position: Vector2D): Command {
    return { type: "ErasePixel", position };
  }

  export function loadData(data: Blob): Command {
    return { type: "LoadData", data };
  }

  export function async(command: Promise<Command>): Command {
    return { type: "Async", command };
  }

  export async function toJSON(command: Command): Promise<any> {
    switch (command.type) {
      case "NoOperation":
        return command;
      case "Sequence": {
        let commands = [];
        for (let command2 of command.commands) {
          commands.push(await Command.toJSON(command2));
        }
        return {
          type: "Sequence",
          commands: commands,
        };
      }
      case "WritePixel": {
        let colour = command.colour;
        return { type: "WritePixel", x: command.position.x, y: command.position.y, colour };
      }
      case "ErasePixel": {
        return { type: "ErasePixel", x: command.position.x, y: command.position.y };
      }
      case "LoadData": {
        let data = await command.data.arrayBuffer();
        let data2 = new Uint8Array(data);
        let data3 = uint8ArrayToBase64(data2);
        return { type: "LoadData", data: data3 };
      }
      case "Async": {
        let command2 = await command.command;
        return {
          type: "Async",
          command: await Command.toJSON(command2),
        };
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
        return Command.writePixel(command, command.colour);
      }
      case "ErasePixel": {
        return Command.erasePixel(command);
      }
      case "LoadData": {
        let data = command.data;
        let data2 = base64ToUint8Array(data);
        let data3 = new Uint8Array(data2);
        let data4 = new Blob([data3], { type: "application: zip" });
        return { type: "LoadData", data: data4 };
      }
      case "Async": {
        return { type: "Async", command: Promise.resolve(Command.fromJSON(command.command)) };
      }
      default:
        throw new Error("Unknown Command");
    }
  }
}
