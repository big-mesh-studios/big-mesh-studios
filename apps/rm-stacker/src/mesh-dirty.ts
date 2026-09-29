// Which parts of the figure a command has drawn differently, and where in each
// part's box its new geometry is.
//
// A preview draws a model as geometry, so the question a change asks is which
// triangles it altered. What a change covered is not in the command — a command
// names a part and a panel and a cell of that panel — so it is worked out here
// from the part's own drawings, through the same tables the solver uses.
//
// A command is read for this on the way back, not on the way in. A command says
// what it is about to do, and the part it names may not exist by the time it
// runs, or may have been replaced while it waited its turn; its reverse says what
// was actually undone, which is what the geometry now has to agree with.
import {
  panelCellBounds,
  type CellBounds,
  type PanelKind,
  type PanelRect,
  type Part,
} from "@big-mesh-studios/stacker/renderer";
import type { Command } from "./command/Command";

/** One part's drawing changed, over the cells of its box that could have changed. */
export interface ChangedPart {
  part: string;
  box: CellBounds;
}

/** What a command has altered about the figure's geometry. */
export type ChangedGeometry =
  /** The figure itself is different, and which parts it holds is not to be read here. */
  { everything: true } | { parts: ChangedPart[] };

/**
 * What `command` has altered about the figure's geometry, or undefined where it
 * has altered none.
 *
 * @param find The part called `name`, for the box a panel's cells are measured
 * against. A command read off the undo stack may name a part taken since.
 */
export const changedGeometry = (
  command: Command,
  find: (name: string) => Part | undefined,
): ChangedGeometry | undefined => {
  switch (command.type) {
    case "WritePixel":
    case "FillPixel":
    case "ErasePixel":
      return drawnOn(command.part, command.panel, find, {
        min: command.position,
        max: command.position,
      });

    case "FillRectangle":
      return drawnOn(command.part, command.panel, find, {
        min: command.min,
        max: command.max,
      });

    // A stroke across several panels is several commands, and the figure has to
    // be drawn again for all of them. Their boxes are gathered per part rather
    // than per command, because what is stale is a part's geometry: a stroke that
    // crossed two panels of one part left one hole in it, not two.
    case "Sequence": {
      const gathered: ChangedPart[] = [];

      for (const one of command.commands) {
        const changed = changedGeometry(one, find);

        if (changed === undefined) {
          continue;
        }
        if ("everything" in changed) {
          return { everything: true };
        }
        gathered.push(...changed.parts);
      }

      return gathered.length === 0
        ? undefined
        : { parts: gatheredByPart(gathered) };
    }

    // A pose stands a part somewhere else without changing what is in it, so the
    // triangles are the ones the part was already drawn with and none are stale.
    case "KeyPart":
    case "MovePart":
    case "TurnPart":
    case "ScalePart":
    case "NoOperation":
    case "Async":
      return undefined;

    // A load brings a whole figure from somewhere else, and nothing about which
    // parts it will hold can be read from the blob it is written in.
    case "LoadData":
      return { everything: true };
  }
};

const drawnOn = (
  part: string,
  panel: PanelKind,
  find: (name: string) => Part | undefined,
  rect: PanelRect,
): ChangedGeometry | undefined => {
  const on = find(part);

  // A part the figure no longer holds describes no box to rebuild.
  return on === undefined
    ? undefined
    : { parts: [{ part, box: panelCellBounds(on, panel, rect) }] };
};

/** The boxes covering each part named, as one box holding all of that part's. */
const gatheredByPart = (parts: ChangedPart[]): ChangedPart[] => {
  const byName = new Map<string, CellBounds>();

  for (const { part, box } of parts) {
    const held = byName.get(part);

    byName.set(
      part,
      held === undefined
        ? box
        : {
            low: {
              x: Math.min(held.low.x, box.low.x),
              y: Math.min(held.low.y, box.low.y),
              z: Math.min(held.low.z, box.low.z),
            },
            high: {
              x: Math.max(held.high.x, box.high.x),
              y: Math.max(held.high.y, box.high.y),
              z: Math.max(held.high.z, box.high.z),
            },
          },
    );
  }

  return [...byName].map(([part, box]) => ({ part, box }));
};
