/**
 * A walls item, as geometry: the segments it is made of, the box each segment stands as, and
 * the box the whole thing occupies.
 *
 * ## Why this is a module of its own
 *
 * **Because three questions are asked of a drawn wall and they have to agree.** `apply-level.ts`
 * has to turn it into operations the fold can evaluate, `view/picking.ts` has to give it a box a
 * click can hit, and `view/highlight.ts` has to draw a box around it — and a picking box that
 * disagreed with the geometry would be a wall that selects somewhere it is not. The positions,
 * the turn and the bounds are computed here once, and every caller reads the same answer.
 *
 * ## How a polyline becomes a solid
 *
 * **One oriented box per segment**, standing on the plane and reaching `height` up it. A wall
 * is a straight run between two points, so a box is exactly its shape: the segment's length
 * along the wall's own length axis, its thickness across, and its height up. Joining two
 * segments of one polyline at a corner leaves a small notch, which is what a hand-drawn plan's
 * corners are and what softness blends.
 *
 * **The box is turned, not axis-aligned.** A wall running north-east is not an axis-aligned
 * box, and describing it as one would be a wall four times its size that selects and highlights
 * wrongly. The turn is a quaternion built from the wall's own three axes — along the segment,
 * up, and across — which is the one place this file does arithmetic rather than bookkeeping.
 *
 * **The base is on the line and the wall goes up from it**, not centred on the line: a person
 * drawing on the ground means a wall standing on the ground, and a wall centred on its line
 * would be half buried.
 */

import {
  cross,
  dot,
  length,
  normalize,
  scale,
  sub,
  type Bounds,
  type Quat,
  type Vec3,
} from "@big-mesh-studios/core";
import type { OperationShape } from "@big-mesh-studios/sdf";

import type { LevelWalls } from "./types";
import type { Vec3Like } from "../guest/place-api";

/** One straight run of a wall, and where it sits in the item's whole list of runs. */
export interface WallSegment {
  readonly a: Vec3;
  readonly b: Vec3;
  /** Position in the item's own sequence, across every line. Also the derived id's suffix. */
  readonly index: number;
}

/** A point from the file's array form, as the maths here speaks. */
const pointOf = (at: Vec3Like): Vec3 => ({ x: at[0], y: at[1], z: at[2] });

/**
 * Every straight run of every polyline, in order.
 *
 * **Consecutive points, and a single-point line makes none.** A walls item is validated to have
 * two points per line, so this cannot be empty for a real item; the loop is written so a
 * degenerate line contributes nothing rather than a zero-length wall.
 */
export const wallSegments = (item: WallsGeometry): readonly WallSegment[] => {
  const segments: WallSegment[] = [];
  let index = 0;
  for (const line of item.lines) {
    for (let i = 0; i + 1 < line.length; i++) {
      segments.push({ a: pointOf(line[i]), b: pointOf(line[i + 1]), index });
      index++;
    }
  }
  return segments;
};

/**
 * The lines a walls item has left after deleting the one segment `segmentIndex` names.
 *
 * **One way to remove an edge from a polyline: drop the edge and keep every point.** An edge in
 * the middle severs the run into two, and an edge at either end shortens it by one point — the
 * drawing stays where it was and only the segment asked for goes. Deleting the only edge of a
 * two-point line removes the line, and a caller that finds no lines left removes the item; a
 * walls item with no segments is not a wall and the reader refuses it.
 *
 * `segmentIndex` is the global index `wallSegments` hands out, across every line in order, so a
 * picker that tested those segments can pass its answer straight back here.
 *
 * **Generic over the point type**, because the live draft's chains are `Vec3` objects while a
 * stored item's lines are the file's `[x, y, z]` tuples — and the same slicing applies to both,
 * so the draft delete and the item delete cannot disagree about what removing an edge means.
 *
 * @returns The new lines, or `undefined` when the index names no segment.
 */
export const deleteWallSegment = <T>(
  lines: readonly (readonly T[])[],
  segmentIndex: number,
): (readonly T[])[] | undefined => {
  if (!Number.isInteger(segmentIndex) || segmentIndex < 0) return undefined;

  let seen = 0;
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex]!;
    const segmentsInLine = line.length - 1;
    if (segmentIndex >= seen + segmentsInLine) {
      seen += segmentsInLine;
      continue;
    }

    const position = segmentIndex - seen;
    const next = [...lines];
    // **The line's only edge takes the whole line with it.**
    if (line.length <= 2) {
      next.splice(lineIndex, 1);
    } else if (position === 0) {
      next[lineIndex] = line.slice(1);
    } else if (position === line.length - 2) {
      next[lineIndex] = line.slice(0, -1);
    } else {
      // **An interior edge severs the run in two.** Both halves keep at least two points,
      // because an interior position is never the first or last edge.
      next.splice(
        lineIndex,
        1,
        line.slice(0, position + 1),
        line.slice(position + 1),
      );
    }
    return next;
  }
  return undefined;
};

/**
 * The turn that carries a box's own axes onto the wall's.
 *
 * **Built from the basis rather than from angles**, because a wall on a planet has no world
 * yaw and the box has to stand up along the local vertical. `ex`, `ey` and `ez` are the images
 * of the box's local +X, +Y and +Z, so the rotation matrix's columns are those three vectors
 * and this is the standard matrix-to-quaternion extraction. The trace branch handles the
 * common case; the three diagonal branches handle a turn near half a revolution, where the
 * trace is near zero and the division would lose the angle it is meant to recover.
 */
export const quatFromBasis = (ex: Vec3, ey: Vec3, ez: Vec3): Quat => {
  const m00 = ex.x;
  const m01 = ey.x;
  const m02 = ez.x;
  const m10 = ex.y;
  const m11 = ey.y;
  const m12 = ez.y;
  const m20 = ex.z;
  const m21 = ey.z;
  const m22 = ez.z;

  const trace = m00 + m11 + m22;
  if (trace > 0) {
    const s = Math.sqrt(trace + 1) * 2;
    return {
      w: 0.25 * s,
      x: (m21 - m12) / s,
      y: (m02 - m20) / s,
      z: (m10 - m01) / s,
    };
  }
  if (m00 > m11 && m00 > m22) {
    const s = Math.sqrt(1 + m00 - m11 - m22) * 2;
    return {
      w: (m21 - m12) / s,
      x: 0.25 * s,
      y: (m01 + m10) / s,
      z: (m02 + m20) / s,
    };
  }
  if (m11 > m22) {
    const s = Math.sqrt(1 + m11 - m00 - m22) * 2;
    return {
      w: (m02 - m20) / s,
      x: (m01 + m10) / s,
      y: 0.25 * s,
      z: (m12 + m21) / s,
    };
  }
  const s = Math.sqrt(1 + m22 - m00 - m11) * 2;
  return {
    w: (m10 - m01) / s,
    x: (m02 + m20) / s,
    y: (m12 + m21) / s,
    z: 0.25 * s,
  };
};

/** One segment as it reaches the fold: where its box stands, what it is, and how it is turned. */
export interface WallPart {
  /** Unique within the level, derived from the item's id so a rebuild is deterministic. */
  readonly id: string;
  /** The middle of the segment's box. */
  readonly at: Vec3;
  readonly shape: OperationShape;
  readonly orientation: Quat;
}

/**
 * A walls item as the boxes the fold evaluates and the boxes a click tests.
 *
 * **The same function serves both**, which is the point: an operation the mesher never sees and
 * a box the picker does would be a wall you can click and cannot see, or the other way round.
 */
export const wallParts = (item: LevelWalls): readonly WallPart[] => {
  const up = normalize(pointOf(item.up));
  const halfHeight = item.height / 2;
  const halfThickness = item.thickness / 2;
  const centreUp = scale(up, halfHeight);

  const parts: WallPart[] = [];
  for (const segment of wallSegments(item)) {
    const run = sub(segment.b, segment.a);
    const runLength = length(run);
    if (runLength <= 0) continue;

    // The box's length axis, forced perpendicular to up so a segment drawn slightly off the
    // plane still produces a wall standing square rather than one leaning with the drawing.
    const along = sub(run, scale(up, dot(run, up)));
    const ex = normalize(along);
    const ey = up;
    const ez = normalize(cross(ex, ey));

    parts.push({
      id: `${item.id}#${segment.index}`,
      at: {
        x: (segment.a.x + segment.b.x) / 2 + centreUp.x,
        y: (segment.a.y + segment.b.y) / 2 + centreUp.y,
        z: (segment.a.z + segment.b.z) / 2 + centreUp.z,
      },
      shape: {
        type: "Box",
        len: {
          x: runLength / 2,
          y: halfHeight,
          z: halfThickness,
        },
      },
      orientation: quatFromBasis(ex, ey, ez),
    });
  }
  return parts;
};

/**
 * The part of a walls item the bounds are a function of.
 *
 * **A shape the reader, the store and a drawn draft all satisfy**, so "the box these walls
 * occupy" can be asked before an item exists — which is what lets `addWalls` derive the item's
 * `at` from the same function `apply-level.ts` places its operations with.
 */
export type WallsGeometry = Pick<LevelWalls, "up" | "height" | "lines">;

/**
 * The world box a walls item reaches, height included.
 *
 * **Every point, and every point lifted by the height**, because a wall stands up from its line
 * rather than around it — an axis-aligned box over the lines alone would be a box a storey
 * short. Rotation about `up` is not accounted for, which for a hand-drawn plan is exact and for
 * a wall at an angle is a box slightly larger than the wall, which is the forgiving direction a
 * hit test wants.
 */
export const wallsBounds = (item: WallsGeometry): Bounds => {
  const up = normalize(pointOf(item.up));
  const lift = scale(up, item.height);
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;

  for (const segment of wallSegments(item)) {
    for (const base of [segment.a, segment.b]) {
      for (const point of [
        base,
        { x: base.x + lift.x, y: base.y + lift.y, z: base.z + lift.z },
      ]) {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        minZ = Math.min(minZ, point.z);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
        maxZ = Math.max(maxZ, point.z);
      }
    }
  }

  return {
    min: { x: minX, y: minY, z: minZ },
    max: { x: maxX, y: maxY, z: maxZ },
  };
};

/** The middle of `wallsBounds`, which is what the item stores as its own `at`. */
export const wallsCentre = (item: WallsGeometry): Vec3 => {
  const bounds = wallsBounds(item);
  return {
    x: (bounds.min.x + bounds.max.x) / 2,
    y: (bounds.min.y + bounds.max.y) / 2,
    z: (bounds.min.z + bounds.max.z) / 2,
  };
};
