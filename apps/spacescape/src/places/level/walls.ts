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
 * along the wall's own length axis, its thickness across, and its height up. A centred wall
 * joins its neighbours with a small notch, which is what a hand-drawn plan's corners are and
 * what softness blends; a wall on a chosen side extends at an outside corner until the boxes
 * meet, because otherwise the side of the line would have a thickness-sized hole in it.
 *
 * **The box is turned, not axis-aligned.** A wall running north-east is not an axis-aligned
 * box, and describing it as one would be a wall four times its size that selects and highlights
 * wrongly. The turn is a quaternion built from the wall's own three axes — along the segment,
 * up, and across — which is the one place this file does arithmetic rather than bookkeeping.
 *
 * **The base sits on the drawing plane and the wall goes up from it**, not half buried. A
 * centred wall's base straddles the line; a side wall's base is beside it, with the line as its
 * opposite face. Both stand on the plane because a person drawing on the ground means a wall
 * standing on the ground.
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

import type { LevelWalls, WallSide } from "./types";
import type { Vec3Like } from "../guest/place-api";

/** One straight run of a wall, and where it sits in the item's whole list of runs. */
export interface WallSegment {
  readonly a: Vec3;
  readonly b: Vec3;
  /** Position in the item's own sequence, across every line. Also the derived id's suffix. */
  readonly index: number;
  /** Which polyline the run belongs to, so a segment pick can name its line's side. */
  readonly lineIndex: number;
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
  for (let lineIndex = 0; lineIndex < item.lines.length; lineIndex++) {
    const line = item.lines[lineIndex]!;
    for (let i = 0; i + 1 < line.length; i++) {
      segments.push({
        a: pointOf(line[i]!),
        b: pointOf(line[i + 1]!),
        index,
        lineIndex,
      });
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
 * The lines and sides left after deleting one segment from a stored walls item.
 *
 * **The side array has to move with the lines**, because it is parallel to them. Deleting a
 * whole line removes its entry, and splitting a line in the middle gives both halves the
 * side the original had — the two new runs still stand on the same side of the same traced
 * line. An end segment leaves the line and its entry where they were.
 *
 * The generic `deleteWallSegment` remains the draft's own operation: a draft has no stored
 * sides yet, and a live item's sides are the one thing this extra step is for.
 */
export const deleteWallSegmentFrom = (
  item: Pick<LevelWalls, "lines" | "sides">,
  segmentIndex: number,
): Pick<LevelWalls, "lines" | "sides"> | undefined => {
  const lines = deleteWallSegment(item.lines, segmentIndex);
  if (lines === undefined) return undefined;
  if (item.sides === undefined) return { lines };

  let seen = 0;
  for (let lineIndex = 0; lineIndex < item.lines.length; lineIndex++) {
    const line = item.lines[lineIndex]!;
    const segmentsInLine = line.length - 1;
    if (segmentIndex >= seen + segmentsInLine) {
      seen += segmentsInLine;
      continue;
    }

    const position = segmentIndex - seen;
    const sides = [...item.sides];
    if (line.length <= 2) {
      sides.splice(lineIndex, 1);
    } else if (position > 0 && position < line.length - 2) {
      sides.splice(lineIndex, 0, item.sides[lineIndex] ?? "centre");
    }
    return { lines, sides };
  }
  return undefined;
};

/** The side of one line, defaulting to centred when the item carries no sides. */
export const wallSideAt = (
  item: Pick<LevelWalls, "sides">,
  lineIndex: number,
): WallSide => item.sides?.[lineIndex] ?? "centre";

/**
 * The item with one line's side changed, and the array dropped when every line is centred.
 *
 * **One entry per line, because the file's array is parallel to `lines`.** A centre written into
 * the file is the same as no entry at all, so when the last line comes back to centre the array
 * goes rather than becoming a row of the default. An index that names no line leaves the item as
 * it was, so a stale pick cannot invent a side.
 */
export const withWallSide = (
  item: LevelWalls,
  lineIndex: number,
  side: WallSide,
): LevelWalls => {
  if (
    !Number.isInteger(lineIndex) ||
    lineIndex < 0 ||
    lineIndex >= item.lines.length
  )
    return item;
  const sides = item.lines.map((_, index) =>
    index === lineIndex ? side : wallSideAt(item, index),
  );
  return sides.every((each) => each === "centre")
    ? { ...item, sides: undefined }
    : { ...item, sides };
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

/** A box before it is an operation or a pick target, with the basis its corners need. */
interface WallBox {
  /** Position in the item's own sequence, across every line. Also the derived id's suffix. */
  readonly index: number;
  readonly at: Vec3;
  /** Half-extents along `ex`, `ey` and `ez`. */
  readonly len: Vec3;
  readonly ex: Vec3;
  readonly ey: Vec3;
  readonly ez: Vec3;
}

/**
 * The longest a side wall may run past a corner to close it, in thicknesses.
 *
 * **A miter is exact until the turn gets shallow.** The distance along a segment to the
 * outside corner is `thickness / tan(turn / 2)`, which is one thickness at a right angle and
 * grows without bound as the turn straightens. A hand-drawn curve is a chain of shallow turns,
 * so an uncapped miter would spike a wall far out at every vertex. Two thicknesses keeps a
 * square corner exact and leaves a small outside notch on a curve, which is the forgiving
 * direction: the drawn line stays the wall's face.
 */
const MAX_SIDE_EXTENSION = 2;

/** A tiny turn is not a corner; an exact reversal has no outside to close. */
const TURN_EPSILON = 1e-6;

/**
 * How far a side wall has to run past a shared vertex to close the outside of a corner.
 *
 * **Only the outside needs closing.** A left wall on a left turn is on the inside, where the
 * two boxes already overlap; extending it there would push wall into the space the line
 * bounds. A left wall on a right turn is on the outside, where the two boxes meet only at the
 * line vertex and leave a square notch the size of the thickness. That is the case this
 * fills.
 */
const sideExtension = (
  incoming: Vec3,
  outgoing: Vec3,
  side: Exclude<WallSide, "centre">,
  up: Vec3,
  thickness: number,
): number => {
  const turn = dot(cross(incoming, outgoing), up);
  const outside =
    (side === "left" && turn < -TURN_EPSILON) ||
    (side === "right" && turn > TURN_EPSILON);
  if (!outside) return 0;

  const cosine = Math.max(-1, Math.min(1, dot(incoming, outgoing)));
  const angle = Math.acos(cosine);
  if (!(angle > TURN_EPSILON) || angle > Math.PI - TURN_EPSILON) return 0;

  const extension = thickness / Math.tan(angle / 2);
  return Math.min(extension, thickness * MAX_SIDE_EXTENSION);
};

/** Whether two points are the same to the precision a drawn line is stored at. */
const samePoint = (a: Vec3, b: Vec3): boolean =>
  Math.abs(a.x - b.x) < TURN_EPSILON &&
  Math.abs(a.y - b.y) < TURN_EPSILON &&
  Math.abs(a.z - b.z) < TURN_EPSILON;

/**
 * Every box a walls item stands as, including the side offset and the corner extensions.
 *
 * **A line's side is one answer for the whole line**, because it was traced as one run. The
 * box for each segment is pushed by half the thickness onto that side, so the line becomes its
 * opposite face. `centre` pushes nothing and keeps the item's original geometry.
 *
 * **A side wall extends only at an outside corner**, and only along its own line, so the
 * extension fills the corner without crossing to the other side of the drawn face. The
 * closing vertex of a closed line is a corner like any other, which is why the first segment
 * looks at the last one when the line comes back to its start.
 */
const wallBoxes = (item: WallsGeometry): readonly WallBox[] => {
  const up = normalize(pointOf(item.up));
  const halfHeight = item.height / 2;
  const halfThickness = item.thickness / 2;
  const centreUp = scale(up, halfHeight);
  const boxes: WallBox[] = [];
  let index = 0;

  for (let lineIndex = 0; lineIndex < item.lines.length; lineIndex++) {
    const line = item.lines[lineIndex]!;
    const points = line.map(pointOf);
    const segmentCount = points.length - 1;
    const closed =
      points.length > 2 && samePoint(points[0]!, points[points.length - 1]!);
    const side = item.sides?.[lineIndex] ?? "centre";

    // **One direction per segment, already forced into the drawing's plane.** Reusing these
    // for the corner turns as well as the boxes keeps a segment drawn slightly off the plane
    // from turning the wall that stands on it.
    const directions: (Vec3 | undefined)[] = [];
    for (let i = 0; i < segmentCount; i++) {
      const run = sub(points[i + 1]!, points[i]!);
      const along = sub(run, scale(up, dot(run, up)));
      directions.push(length(along) <= 0 ? undefined : normalize(along));
    }

    for (let i = 0; i < segmentCount; i++) {
      const a = points[i]!;
      const b = points[i + 1]!;
      const ex = directions[i];
      if (ex === undefined) {
        index++;
        continue;
      }

      const runLength = length(sub(b, a));
      if (runLength <= 0) {
        index++;
        continue;
      }

      const ey = up;
      const ez = normalize(cross(ex, ey));
      let extensionAtStart = 0;
      let extensionAtEnd = 0;

      if (side !== "centre") {
        const previous =
          i > 0
            ? directions[i - 1]
            : closed
              ? directions[segmentCount - 1]
              : undefined;
        if (previous !== undefined) {
          extensionAtStart = sideExtension(
            previous,
            ex,
            side,
            up,
            item.thickness,
          );
        }
        const next =
          i + 1 < segmentCount
            ? directions[i + 1]
            : closed
              ? directions[0]
              : undefined;
        if (next !== undefined) {
          extensionAtEnd = sideExtension(ex, next, side, up, item.thickness);
        }
      }

      // **Left is `-ez` and right is `+ez`**, because `ez` is the run's own right-hand side.
      // The line is therefore the wall's opposite face, exactly as the field's name says.
      const sideOffset =
        side === "left" ? -halfThickness : side === "right" ? halfThickness : 0;
      const alongShift = (extensionAtEnd - extensionAtStart) / 2;
      const middle = {
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2,
        z: (a.z + b.z) / 2,
      };

      boxes.push({
        index,
        at: {
          x: middle.x + centreUp.x + ez.x * sideOffset + ex.x * alongShift,
          y: middle.y + centreUp.y + ez.y * sideOffset + ex.y * alongShift,
          z: middle.z + centreUp.z + ez.z * sideOffset + ex.z * alongShift,
        },
        len: {
          x: runLength / 2 + (extensionAtStart + extensionAtEnd) / 2,
          y: halfHeight,
          z: halfThickness,
        },
        ex,
        ey,
        ez,
      });
      index++;
    }
  }

  return boxes;
};

/**
 * A walls item as the boxes the fold evaluates and the boxes a click tests.
 *
 * **The same function serves both**, which is the point: an operation the mesher never sees and
 * a box the picker does would be a wall you can click and cannot see, or the other way round.
 */
export const wallParts = (item: LevelWalls): readonly WallPart[] =>
  wallBoxes(item).map((box) => ({
    id: `${item.id}#${box.index}`,
    at: box.at,
    shape: {
      type: "Box",
      len: box.len,
    },
    orientation: quatFromBasis(box.ex, box.ey, box.ez),
  }));

/**
 * The part of a walls item the bounds are a function of.
 *
 * **A shape the reader, the store and a drawn draft all satisfy**, so "the box these walls
 * occupy" can be asked before an item exists — which is what lets `addWalls` derive the item's
 * `at` from the same function `apply-level.ts` places its operations with.
 */
export type WallsGeometry = Pick<
  LevelWalls,
  "up" | "height" | "lines" | "thickness" | "sides"
>;

/**
 * The world box a walls item reaches, height and thickness included.
 *
 * **The eight corners of every wall box, not the line's points.** A wall is a solid standing
 * beside its line, so a box over the line alone would miss the thickness on every side and
 * the whole wall on the side of a `left` or `right` run. The boxes here are the same ones
 * `wallParts` hands the fold, so a click can hit exactly what was built.
 */
export const wallsBounds = (item: WallsGeometry): Bounds => {
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;

  for (const box of wallBoxes(item)) {
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        for (const sz of [-1, 1]) {
          const point = {
            x:
              box.at.x +
              box.ex.x * box.len.x * sx +
              box.ey.x * box.len.y * sy +
              box.ez.x * box.len.z * sz,
            y:
              box.at.y +
              box.ex.y * box.len.x * sx +
              box.ey.y * box.len.y * sy +
              box.ez.y * box.len.z * sz,
            z:
              box.at.z +
              box.ex.z * box.len.x * sx +
              box.ey.z * box.len.y * sy +
              box.ez.z * box.len.z * sz,
          };
          minX = Math.min(minX, point.x);
          minY = Math.min(minY, point.y);
          minZ = Math.min(minZ, point.z);
          maxX = Math.max(maxX, point.x);
          maxY = Math.max(maxY, point.y);
          maxZ = Math.max(maxZ, point.z);
        }
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
