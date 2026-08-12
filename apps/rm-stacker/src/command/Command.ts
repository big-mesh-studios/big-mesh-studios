import { Vector2D } from "../maths";
import { SideKind } from "../types";
import { base64ToUint8Array, uint8ArrayToBase64 } from "../utils";

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
      side: SideKind;
      position: Vector2D;
      paletteIndex: number;
    }
  | {
      type: "FillPixel";
      side: SideKind;
      position: Vector2D;
      paletteIndex: number;
    }
  | {
      type: "ErasePixel";
      side: SideKind;
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

  export function writePixel(side: SideKind, position: Vector2D, paletteIndex: number): Command {
    return { type: "WritePixel", side, position, paletteIndex };
  }

  export function fillPixel(side: SideKind, position: Vector2D, paletteIndex: number): Command {
    return { type: "FillPixel", side, position, paletteIndex };
  }

  export function erasePixel(side: SideKind, position: Vector2D): Command {
    return { type: "ErasePixel", side, position };
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
        let { side, position, paletteIndex } = command;
        return { type: "WritePixel", side, x: position.x, y: position.y, paletteIndex };
      }
      case "FillPixel": {
        let { side, position, paletteIndex } = command;
        return { type: "FillPixel", side, x: position.x, y: position.y, paletteIndex };
      }
      case "ErasePixel": {
        let { side, position } = command;
        return { type: "ErasePixel", side, x: position.x, y: position.y };
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

  /**
   * Rebuilds a command from its JSON form. Returns a no-op for anything that
   * doesn't match a known, current command shape (e.g. history persisted
   * before a command shape change) so one stale entry can't take down the
   * rest of a loaded undo/redo stack.
   */
  export function fromJSON(command: any): Command {
    switch (command?.type) {
      case "NoOperation":
        return Command.noOperation();
      case "Sequence":
        return Command.sequence(command.commands.map((c: any) => Command.fromJSON(c)));
      case "WritePixel":
        return Command.writePixel(
          command.side,
          { x: command.x, y: command.y },
          command.paletteIndex,
        );
      case "FillPixel":
        return Command.fillPixel(
          command.side,
          { x: command.x, y: command.y },
          command.paletteIndex,
        );
      case "ErasePixel":
        return Command.erasePixel(command.side, { x: command.x, y: command.y });
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
        return Command.noOperation();
    }
  }
}
