import { Bitmap, Vector2D } from "@big-mesh-studios/maths";
import { type SideKind, type Sides } from "@big-mesh-studios/stacker/renderer";
import { OPPOSING_SIDE, SIDE_AXES } from "./constants";
import { Mirror } from "./types";

/** One cell of one of a part's panels. */
export interface Mark {
  side: SideKind;
  position: Vector2D;
}

/** A block of cells on one of a part's panels, both corners included. */
export interface Block {
  side: SideKind;
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
      side: block.side,
      min: { x: extent - 1 - block.max.x, y: block.min.y },
      max: { x: extent - 1 - block.min.x, y: block.max.y },
    };
  }

  const extent = panel.height;
  return {
    side: block.side,
    min: { x: block.min.x, y: extent - 1 - block.max.y },
    max: { x: block.max.x, y: extent - 1 - block.min.y },
  };
}

/**
 * Which of `side`'s image axes run backwards on the panel facing it. The two
 * panels see the part from opposite directions, so an axis they disagree about
 * counts up one way on one and the other way on the other, and a mark carried
 * between them has to be turned back to front along it.
 */
function opposingFlips(side: SideKind): Record<keyof Vector2D, boolean> {
  const here = SIDE_AXES[side];
  const there = SIDE_AXES[OPPOSING_SIDE[side]];

  return {
    x: here.x.flipped !== there.x.flipped,
    y: here.y.flipped !== there.y.flipped,
  };
}

/**
 * `block` carried onto the panel opposite the one it sits on, at the place that
 * panel's own axes put it. The two panels are always the same size, so a block
 * that fits on one fits on the other.
 */
function reflectOntoOpposing(sides: Sides, block: Block): Block {
  const flips = opposingFlips(block.side);
  const panel = sides[block.side];

  let carried: Block = { ...block, side: OPPOSING_SIDE[block.side] };

  if (flips.x) {
    carried = flipAlong("x", panel, carried);
  }

  if (flips.y) {
    carried = flipAlong("y", panel, carried);
  }

  return carried;
}

const blockKey = ({ side, min, max }: Block) =>
  `${side}:${min.x},${min.y}:${max.x},${max.y}`;

/**
 * Every block a mark covers once the mirror has reflected it: the block that was
 * drawn, each reflection the mirror asks for, and the reflections of those, so
 * that two axes at once reach the corner they share. No block is listed twice,
 * so a block already lying on an axis it is reflected across is drawn once.
 */
export function mirrorBlocks(
  mirror: Mirror,
  sides: Sides,
  block: Block,
): Block[] {
  const reflections: Array<(block: Block) => Block> = [];

  if (mirror.panel.x) {
    reflections.push((block) => flipAlong("x", sides[block.side], block));
  }

  if (mirror.panel.y) {
    reflections.push((block) => flipAlong("y", sides[block.side], block));
  }

  if (mirror.opposing) {
    reflections.push((block) => reflectOntoOpposing(sides, block));
  }

  const blocks = [block];
  const found = new Set([blockKey(block)]);

  // Walks the blocks gathered so far, reflecting each one again, so that a
  // block reached by one axis is still offered to the others. Every reflection
  // undoes itself, so the list stops growing once each has been answered.
  for (let i = 0; i < blocks.length; i++) {
    for (const reflect of reflections) {
      const reflected = reflect(blocks[i]);
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
export function mirrorMarks(mirror: Mirror, sides: Sides, mark: Mark): Mark[] {
  return mirrorBlocks(mirror, sides, {
    side: mark.side,
    min: mark.position,
    max: mark.position,
  }).map(({ side, min }) => ({ side, position: min }));
}
