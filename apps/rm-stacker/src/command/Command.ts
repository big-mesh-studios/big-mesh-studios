import { Vector2D, Vector3D } from "@big-mesh-studios/maths";
import { type Key, type PanelKind } from "@big-mesh-studios/stacker/renderer";
import { base64ToUint8Array, uint8ArrayToBase64 } from "../utils/utils";

/**
 * A change to the figure being drawn, in a form that can be applied, reversed,
 * and written to the undo history on disk.
 *
 * Everything that touches a drawing names the part it is drawn on and the panel
 * of that part it lands on — one of its six sides, or a face of one of its
 * cuts. An undo may be taken long after the selection has moved on, and naming
 * both is what lands it on the drawing it was made against.
 */
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
      part: string;
      panel: PanelKind;
      position: Vector2D;
      paletteIndex: number;
    }
  | {
      type: "FillPixel";
      part: string;
      panel: PanelKind;
      position: Vector2D;
      paletteIndex: number;
    }
  | {
      type: "FillRectangle";
      part: string;
      panel: PanelKind;
      min: Vector2D;
      max: Vector2D;
      paletteIndex: number;
      /**
       * Whether cells that already have something drawn on them are left as
       * they are. This is how a rectangle reaches the far end of the runs it
       * carves — filling in what would otherwise carve them away — without
       * painting over the drawing that is there.
       */
      onlyWhereEmpty: boolean;
    }
  | {
      type: "ErasePixel";
      part: string;
      panel: PanelKind;
      position: Vector2D;
    }
  | {
      type: "KeyPart";
      part: string;
      /** The frame the key stands at. */
      at: number;
      /** The pose to stand there, or null to take away the key standing there. */
      key: Key | null;
    }
  | {
      type: "MovePart";
      part: string;
      root: Vector3D;
    }
  | {
      type: "TurnPart";
      part: string;
      turn: Vector3D;
    }
  | {
      type: "ScalePart";
      part: string;
      scale: number;
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

  export function writePixel(
    part: string,
    panel: PanelKind,
    position: Vector2D,
    paletteIndex: number,
  ): Command {
    return { type: "WritePixel", part, panel, position, paletteIndex };
  }

  export function fillRectangle(
    part: string,
    panel: PanelKind,
    min: Vector2D,
    max: Vector2D,
    paletteIndex: number,
    onlyWhereEmpty = false,
  ): Command {
    return {
      type: "FillRectangle",
      part,
      panel,
      min,
      max,
      paletteIndex,
      onlyWhereEmpty,
    };
  }

  export function fillPixel(
    part: string,
    panel: PanelKind,
    position: Vector2D,
    paletteIndex: number,
  ): Command {
    return { type: "FillPixel", part, panel, position, paletteIndex };
  }

  export function erasePixel(
    part: string,
    panel: PanelKind,
    position: Vector2D,
  ): Command {
    return { type: "ErasePixel", part, panel, position };
  }

  /**
   * Stands `key` at the frame `at` of the part's motion, in place of whatever
   * stands there — or takes that key away, for a `key` of null.
   */
  export function keyPart(part: string, at: number, key: Key | null): Command {
    return { type: "KeyPart", part, at, key };
  }

  export function movePart(part: string, root: Vector3D): Command {
    return { type: "MovePart", part, root };
  }

  export function turnPart(part: string, turn: Vector3D): Command {
    return { type: "TurnPart", part, turn };
  }

  export function scalePart(part: string, scale: number): Command {
    return { type: "ScalePart", part, scale };
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
        let { part, panel, position, paletteIndex } = command;
        return {
          type: "WritePixel",
          part,
          panel,
          x: position.x,
          y: position.y,
          paletteIndex,
        };
      }
      case "FillPixel": {
        let { part, panel, position, paletteIndex } = command;
        return {
          type: "FillPixel",
          part,
          panel,
          x: position.x,
          y: position.y,
          paletteIndex,
        };
      }
      case "FillRectangle": {
        let { part, panel, min, max, paletteIndex, onlyWhereEmpty } = command;
        return {
          type: "FillRectangle",
          part,
          panel,
          minX: min.x,
          minY: min.y,
          maxX: max.x,
          maxY: max.y,
          paletteIndex,
          onlyWhereEmpty,
        };
      }
      case "ErasePixel": {
        let { part, panel, position } = command;
        return {
          type: "ErasePixel",
          part,
          panel,
          x: position.x,
          y: position.y,
        };
      }
      case "KeyPart": {
        let { part, at, key } = command;
        return { type: "KeyPart", part, at, key };
      }
      case "MovePart": {
        let { part, root } = command;
        return { type: "MovePart", part, x: root.x, y: root.y, z: root.z };
      }
      case "TurnPart": {
        let { part, turn } = command;
        return { type: "TurnPart", part, x: turn.x, y: turn.y, z: turn.z };
      }
      case "ScalePart": {
        let { part, scale } = command;
        return { type: "ScalePart", part, scale };
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
   *
   * A command written before a part had anything but its six sides to draw on
   * names a `side` rather than a panel. It is read as the panel of that name,
   * which is the same drawing.
   */
  export function fromJSON(command: any): Command {
    const panelOf = (command: any): PanelKind => command.panel ?? command.side;

    switch (command?.type) {
      case "NoOperation":
        return Command.noOperation();
      case "Sequence":
        return Command.sequence(
          command.commands.map((c: any) => Command.fromJSON(c)),
        );
      case "WritePixel":
        if (typeof command.part !== "string") {
          return Command.noOperation();
        }
        return Command.writePixel(
          command.part,
          panelOf(command),
          { x: command.x, y: command.y },
          command.paletteIndex,
        );
      case "FillRectangle":
        if (typeof command.part !== "string") {
          return Command.noOperation();
        }
        return Command.fillRectangle(
          command.part,
          panelOf(command),
          { x: command.minX, y: command.minY },
          { x: command.maxX, y: command.maxY },
          command.paletteIndex,
          command.onlyWhereEmpty === true,
        );
      case "FillPixel":
        if (typeof command.part !== "string") {
          return Command.noOperation();
        }
        return Command.fillPixel(
          command.part,
          panelOf(command),
          { x: command.x, y: command.y },
          command.paletteIndex,
        );
      case "ErasePixel":
        if (typeof command.part !== "string") {
          return Command.noOperation();
        }
        return Command.erasePixel(command.part, panelOf(command), {
          x: command.x,
          y: command.y,
        });
      case "KeyPart": {
        const key = command.key;
        const vector = (value: any) =>
          typeof value?.x === "number" &&
          typeof value?.y === "number" &&
          typeof value?.z === "number";

        if (typeof command.part !== "string" || !(command.at >= 0)) {
          return Command.noOperation();
        }

        if (key === null) {
          return Command.keyPart(command.part, command.at, null);
        }

        if (!vector(key?.root) || !vector(key?.turn) || !(key?.scale > 0)) {
          return Command.noOperation();
        }

        return Command.keyPart(command.part, command.at, {
          at: command.at,
          root: { x: key.root.x, y: key.root.y, z: key.root.z },
          turn: { x: key.turn.x, y: key.turn.y, z: key.turn.z },
          scale: key.scale,
          ease: key.ease ?? "linear",
        });
      }
      case "MovePart":
        if (typeof command.part !== "string") {
          return Command.noOperation();
        }
        return Command.movePart(command.part, {
          x: command.x,
          y: command.y,
          z: command.z,
        });
      case "TurnPart":
        if (typeof command.part !== "string") {
          return Command.noOperation();
        }
        return Command.turnPart(command.part, {
          x: command.x,
          y: command.y,
          z: command.z,
        });
      case "ScalePart":
        if (typeof command.part !== "string" || !(command.scale > 0)) {
          return Command.noOperation();
        }
        return Command.scalePart(command.part, command.scale);
      case "LoadData": {
        let data = command.data;
        let data2 = base64ToUint8Array(data);
        let data3 = new Uint8Array(data2);
        let data4 = new Blob([data3], { type: "application: zip" });
        return { type: "LoadData", data: data4 };
      }
      case "Async": {
        return {
          type: "Async",
          command: Promise.resolve(Command.fromJSON(command.command)),
        };
      }
      default:
        return Command.noOperation();
    }
  }
}
