import { Bitmap, Vector2D } from "@big-mesh-studios/maths";
import { type PanelKind } from "@big-mesh-studios/stacker/renderer";
import { SIDE_AXES } from "./constants";
import type { PanelTable } from "./panels";
import { Mirror } from "./types";

/** One cell of one of a part's drawings. */
export interface Mark {
  panel: PanelKind;
  position: Vector2D;
}

/** A block of cells on one of a part's drawings, both corners included. */
export interface Block {
  panel: PanelKind;
  min: Vector2D;
  max: Vector2D;
}

/** Nothing reflected: a stroke lands only where the pointer put it. */
export const NO_MIRROR: Mirror = Object.freeze({
  panel: Object.freeze({ x: false, y: false }),
  opposing: false,
});

/** Turns `block` back to front along one of its panel's image axes. */
function flipAlong(axis: keyof Vector2D, panel: Bitmap, block: Block): Block {
  if (axis === "x") {
    const extent = panel.width;
    return {
      panel: block.panel,
      min: { x: extent - 1 - block.max.x, y: block.min.y },
      max: { x: extent - 1 - block.min.x, y: block.max.y },
    };
  }

  const extent = panel.height;
  return {
    panel: block.panel,
    min: { x: block.min.x, y: extent - 1 - block.max.y },
    max: { x: block.max.x, y: extent - 1 - block.min.y },
  };
}

/**
 * Which of a panel's image axes run backwards on the panel opposite it. The two
 * look at the part from opposite directions, so an axis they disagree about
 * counts up one way on one and the other way on the other, and a mark carried
 * between them has to be turned back to front along it.
 */
function opposingFlips(
  here: keyof typeof SIDE_AXES,
  there: keyof typeof SIDE_AXES,
): Record<keyof Vector2D, boolean> {
  return {
    x: SIDE_AXES[here].x.flipped !== SIDE_AXES[there].x.flipped,
    y: SIDE_AXES[here].y.flipped !== SIDE_AXES[there].y.flipped,
  };
}

/**
 * `block` carried onto the panel opposite the one it sits on, at the place that
 * panel's own axes put it, or undefined where there is no panel opposite.
 *
 * A side's opposite is the side that looks the other way; a section's face has
 * the other face of the same cut opposite it, which is the other side of the
 * same plane. The two are always the same size, so a block that fits on one
 * fits on the other.
 */
function reflectOntoOpposing(
  table: PanelTable,
  block: Block,
): Block | undefined {
  const opposing = table.opposing(block.panel);
  const here = table.side(block.panel);
  const there = opposing === undefined ? undefined : table.side(opposing);
  const panel = table.bitmap(block.panel);

  if (opposing === undefined || here === undefined || there === undefined) {
    return undefined;
  }

  if (panel === undefined || table.bitmap(opposing) === undefined) {
    return undefined;
  }

  const flips = opposingFlips(here, there);
  let carried: Block = { ...block, panel: opposing };

  if (flips.x) {
    carried = flipAlong("x", panel, carried);
  }

  if (flips.y) {
    carried = flipAlong("y", panel, carried);
  }

  return carried;
}

const blockKey = ({ panel, min, max }: Block) =>
  `${panel}:${min.x},${min.y}:${max.x},${max.y}`;

/**
 * Every block a mark covers once the mirror has reflected it: the block that was
 * drawn, each reflection the mirror asks for, and the reflections of those, so
 * that two axes at once reach the corner they share. No block is listed twice,
 * so a block already lying on an axis it is reflected across is drawn once.
 */
export function mirrorBlocks(
  mirror: Mirror,
  table: PanelTable,
  block: Block,
): Block[] {
  const reflections: Array<(block: Block) => Block | undefined> = [];

  const flip = (axis: keyof Vector2D) => (block: Block) => {
    const panel = table.bitmap(block.panel);
    return panel === undefined ? undefined : flipAlong(axis, panel, block);
  };

  if (mirror.panel.x) {
    reflections.push(flip("x"));
  }

  if (mirror.panel.y) {
    reflections.push(flip("y"));
  }

  if (mirror.opposing) {
    reflections.push((block) => reflectOntoOpposing(table, block));
  }

  const blocks = [block];
  const found = new Set([blockKey(block)]);

  // Walks the blocks gathered so far, reflecting each one again, so that a
  // block reached by one axis is still offered to the others. Every reflection
  // undoes itself, so the list stops growing once each has been answered.
  for (let i = 0; i < blocks.length; i++) {
    for (const reflect of reflections) {
      const reflected = reflect(blocks[i]);

      if (reflected === undefined) {
        continue;
      }

      const key = blockKey(reflected);

      if (found.has(key)) {
        continue;
      }

      found.add(key);
      blocks.push(reflected);
    }
  }

  return blocks;
}

/** `mirrorBlocks` for a single cell rather than a block of them. */
export function mirrorMarks(
  mirror: Mirror,
  table: PanelTable,
  mark: Mark,
): Mark[] {
  return mirrorBlocks(mirror, table, {
    panel: mark.panel,
    min: mark.position,
    max: mark.position,
  }).map(({ panel, min }) => ({ panel, position: min }));
}
