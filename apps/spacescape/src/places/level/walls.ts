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
 * **One oriented box per segment, plus a mitre wedge at a shared corner.** A wall is a
 * straight run between two points, so a box is exactly its shape: the segment's length along
 * the wall's own length axis, its thickness across, and its height up. The boxes stop at the
 * drawn vertex; where two runs meet, the outside of the turn is filled by a small prism whose
 * corners are the vertex, the two outer corners of the boxes, and the point where their outer
 * faces cross. That is the mitre: the intersection of the two half-infinite walls that continue
 * past the vertex on the outside of the turn. A straight pair's halves point away from each
 * other and meet only on the end line, so there is no area to add.
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

/** One solid as it reaches the fold: where it stands, what it is, and how it is turned. */
export interface WallPart {
  /** Unique within the level, derived from the item's id so a rebuild is deterministic. */
  readonly id: string;
  /** The middle of the solid. */
  readonly at: Vec3;
  readonly shape: OperationShape;
  readonly orientation: Quat;
}

/** A box or a mitre wedge before it is an operation or a pick target. */
interface WallSolid {
  /** The part of the derived id after the item's own id and `#`. */
  readonly suffix: string;
  readonly at: Vec3;
  readonly shape: OperationShape;
  readonly ex: Vec3;
  readonly ey: Vec3;
  readonly ez: Vec3;
}

/** A corner where two runs meet, with the two directions as the wall runs through it. */
interface Corner {
  readonly point: Vec3;
  /** The direction of the run arriving at `point`, pointing towards it. */
  readonly incoming: Vec3;
  /** The direction of the run leaving `point`, pointing away from it. */
  readonly outgoing: Vec3;
  readonly side: WallSide;
  readonly suffix: string;
}

/** A free end of an open line, for joining to another line's free end at the same point. */
interface FreeEnd {
  readonly lineIndex: number;
  readonly pointIndex: number;
  readonly point: Vec3;
  /** The line's own direction at this end: away from a start, towards an end. */
  readonly direction: Vec3;
  readonly kind: "start" | "end";
  readonly side: WallSide;
}

/**
 * The longest a mitre may reach from the shared vertex, in thicknesses.
 *
 * **A mitre is exact until the turn gets close to a reversal.** The distance from the vertex
 * to the miter point is `offset / cos(turn / 2)`, which is about one offset at a gentle turn
 * and grows without bound as the turn approaches half a revolution. Four thicknesses leaves
 * every ordinary room corner and every shallow curve exact and only clips a hairpin, which is
 * the one case where a long spike would be worse than a small cut.
 */
const MAX_MITER_DISTANCE = 4;

/** A tiny turn is not a corner; an exact reversal has no outside to mitre. */
const TURN_EPSILON = 1e-6;

/** Whether two points are the same to the precision a drawn line is stored at. */
const samePoint = (a: Vec3, b: Vec3): boolean =>
  Math.abs(a.x - b.x) < TURN_EPSILON &&
  Math.abs(a.y - b.y) < TURN_EPSILON &&
  Math.abs(a.z - b.z) < TURN_EPSILON;

/** Where two lines in the outline plane cross, or nothing when they are parallel. */
const intersectOutline = (
  p: { readonly x: number; readonly z: number },
  d: { readonly x: number; readonly z: number },
  q: { readonly x: number; readonly z: number },
  e: { readonly x: number; readonly z: number },
): { readonly x: number; readonly z: number } | undefined => {
  const denominator = d.x * e.z - d.z * e.x;
  if (Math.abs(denominator) <= TURN_EPSILON) return undefined;
  const t = ((q.x - p.x) * e.z - (q.z - p.z) * e.x) / denominator;
  return { x: p.x + d.x * t, z: p.z + d.z * t };
};

/**
 * The mitre wedge at one corner, or nothing when the corner needs no fill.
 *
 * **The four corners are the vertex, the two outside corners of the boxes, and the point
 * where the two outer faces cross.** That region is the intersection of the two half-infinite
 * walls that continue past the vertex on the outside of the turn, so it is the extra bit a
 * mitre adds and nothing the boxes already cover. A centred wall offsets by half the thickness;
 * a wall on a side offsets by the whole thickness and fills only the outside of the turn,
 * because on the inside the boxes already overlap.
 *
 * **A straight joint and an exact reversal get no wedge.** A straight joint's two continued
 * halves point away from each other and meet only on the end line, so they have no area; in an
 * exact reversal the outer faces are parallel and there is no miter point. A near-reversal is
 * clipped to the bevel triangle rather than sent out to a spike.
 */
const cornerSolid = (
  corner: Corner,
  up: Vec3,
  height: number,
  thickness: number,
): WallSolid | undefined => {
  const turn = dot(cross(corner.incoming, corner.outgoing), up);
  const cosine = Math.max(
    -1,
    Math.min(1, dot(corner.incoming, corner.outgoing)),
  );
  if (cosine > 1 - TURN_EPSILON || cosine < -1 + TURN_EPSILON) return undefined;
  if (Math.abs(turn) <= TURN_EPSILON) return undefined;

  const rightIncoming = normalize(cross(corner.incoming, up));
  const rightOutgoing = normalize(cross(corner.outgoing, up));

  let n0: Vec3;
  let n1: Vec3;
  let offset: number;
  if (corner.side === "centre") {
    // **A left turn puts the outside on the right**, which is the sign `right` already has.
    const sign = turn > 0 ? 1 : -1;
    n0 = scale(rightIncoming, sign);
    n1 = scale(rightOutgoing, sign);
    offset = thickness / 2;
  } else {
    const outside =
      (corner.side === "left" && turn < -TURN_EPSILON) ||
      (corner.side === "right" && turn > TURN_EPSILON);
    if (!outside) return undefined;
    const sign = corner.side === "right" ? 1 : -1;
    n0 = scale(rightIncoming, sign);
    n1 = scale(rightOutgoing, sign);
    offset = thickness;
  }

  const p0World = {
    x: corner.point.x + n0.x * offset,
    y: corner.point.y + n0.y * offset,
    z: corner.point.z + n0.z * offset,
  };
  const p1World = {
    x: corner.point.x + n1.x * offset,
    y: corner.point.y + n1.y * offset,
    z: corner.point.z + n1.z * offset,
  };

  const ex = corner.incoming;
  const ez = normalize(cross(ex, up));
  const local = (point: Vec3) => ({
    x: dot(sub(point, corner.point), ex),
    z: dot(sub(point, corner.point), ez),
  });
  const p0 = local(p0World);
  const p1 = local(p1World);
  const miter = intersectOutline(p0, { x: 1, z: 0 }, p1, {
    x: dot(corner.outgoing, ex),
    z: dot(corner.outgoing, ez),
  });
  if (miter === undefined) return undefined;

  const points =
    Math.hypot(miter.x, miter.z) <= thickness * MAX_MITER_DISTANCE
      ? [{ x: 0, z: 0 }, p0, miter, p1]
      : [{ x: 0, z: 0 }, p0, p1];

  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const point of points) {
    if (point.x < minX) minX = point.x;
    if (point.x > maxX) maxX = point.x;
    if (point.z < minZ) minZ = point.z;
    if (point.z > maxZ) maxZ = point.z;
  }
  const centreX = (minX + maxX) / 2;
  const centreZ = (minZ + maxZ) / 2;
  const outline = points.map((point) => ({
    x: point.x - centreX,
    z: point.z - centreZ,
  }));

  let twiceArea = 0;
  for (let i = 0, j = outline.length - 1; i < outline.length; j = i, i++) {
    twiceArea += outline[j]!.x * outline[i]!.z - outline[i]!.x * outline[j]!.z;
  }
  if (Math.abs(twiceArea) <= thickness * thickness * 1e-9) return undefined;

  const origin = {
    x: corner.point.x + ex.x * centreX + ez.x * centreZ,
    y: corner.point.y + ex.y * centreX + ez.y * centreZ,
    z: corner.point.z + ex.z * centreX + ez.z * centreZ,
  };
  const halfHeight = height / 2;

  return {
    suffix: corner.suffix,
    at: {
      x: origin.x + up.x * halfHeight,
      y: origin.y + up.y * halfHeight,
      z: origin.z + up.z * halfHeight,
    },
    shape: { type: "Polygon", points: outline, len: height },
    ex,
    ey: up,
    ez,
  };
};

/**
 * Every box and mitre wedge a walls item stands as.
 *
 * **A line's side is one answer for the whole line**, because it was traced as one run. The
 * box for each segment is pushed by half the thickness onto that side, so the line becomes its
 * opposite face. `centre` pushes nothing and keeps the item's original geometry.
 *
 * **Corners are found in two places.** An interior vertex of a line is a corner within that
 * line, including the seam where a closed line comes back to its start. A free end of an open
 * line is a corner when exactly one other free end is snapped to the same point; that is what
 * makes separate strokes drawn corner to corner meet cleanly. A point with three or more free
 * ends is a junction, not a corner, and is left alone for now.
 */
const wallSolids = (item: WallsGeometry): readonly WallSolid[] => {
  const up = normalize(pointOf(item.up));
  const halfHeight = item.height / 2;
  const halfThickness = item.thickness / 2;
  const centreUp = scale(up, halfHeight);
  const solids: WallSolid[] = [];
  const corners: Corner[] = [];
  const freeEnds: FreeEnd[] = [];
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

      // **Left is `-ez` and right is `+ez`**, because `ez` is the run's own right-hand side.
      // The line is therefore the wall's opposite face, exactly as the field's name says.
      const sideOffset =
        side === "left" ? -halfThickness : side === "right" ? halfThickness : 0;
      const middle = {
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2,
        z: (a.z + b.z) / 2,
      };

      solids.push({
        suffix: `${index}`,
        at: {
          x: middle.x + centreUp.x + ez.x * sideOffset,
          y: middle.y + centreUp.y + ez.y * sideOffset,
          z: middle.z + centreUp.z + ez.z * sideOffset,
        },
        shape: {
          type: "Box",
          len: { x: runLength / 2, y: halfHeight, z: halfThickness },
        },
        ex,
        ey,
        ez,
      });
      index++;
    }

    for (let i = 1; i < segmentCount; i++) {
      const incoming = directions[i - 1];
      const outgoing = directions[i];
      if (incoming === undefined || outgoing === undefined) continue;
      corners.push({
        point: points[i]!,
        incoming,
        outgoing,
        side,
        suffix: `j${lineIndex}-${i}`,
      });
    }

    if (closed) {
      const incoming = directions[segmentCount - 1];
      const outgoing = directions[0];
      if (incoming !== undefined && outgoing !== undefined) {
        corners.push({
          point: points[0]!,
          incoming,
          outgoing,
          side,
          suffix: `j${lineIndex}-0`,
        });
      }
    }

    if (!closed && segmentCount > 0) {
      const start = directions[0];
      if (start !== undefined) {
        freeEnds.push({
          lineIndex,
          pointIndex: 0,
          point: points[0]!,
          direction: start,
          kind: "start",
          side,
        });
      }
      const end = directions[segmentCount - 1];
      if (end !== undefined) {
        freeEnds.push({
          lineIndex,
          pointIndex: segmentCount,
          point: points[segmentCount]!,
          direction: end,
          kind: "end",
          side,
        });
      }
    }
  }

  // **Pair free ends that snapped to the same point, and only one other end there.** The
  // directions are reordered into an incoming run and an outgoing run so the same turn sign
  // that a within-line corner uses answers this corner too.
  const paired = new Set<number>();
  for (let i = 0; i < freeEnds.length; i++) {
    if (paired.has(i)) continue;
    const first = freeEnds[i]!;
    const group: number[] = [];
    for (let j = i; j < freeEnds.length; j++) {
      if (paired.has(j)) continue;
      if (samePoint(first.point, freeEnds[j]!.point)) group.push(j);
    }
    for (const at of group) paired.add(at);
    if (group.length !== 2) continue;

    const other = freeEnds[group[1]!]!;
    const bothCentre = first.side === "centre" && other.side === "centre";
    // **A side wall needs the runs to form a continuous path.** When one line ends where
    // the next starts and both name the same side, the corner is the same one a single
    // polyline would have. Two starts or two ends are a different shape: reversing one run
    // to make a path would flip its side, and the two boxes may already overlap on the
    // side the join would fill. Those are left alone.
    const sameSide =
      first.kind !== other.kind && first.side === other.side
        ? first.side
        : undefined;
    if (!bothCentre && sameSide === undefined) continue;

    let incoming: Vec3;
    let outgoing: Vec3;
    let side: WallSide;
    if (first.kind === "end" && other.kind === "start") {
      incoming = first.direction;
      outgoing = other.direction;
      side = bothCentre ? "centre" : first.side;
    } else if (first.kind === "start" && other.kind === "end") {
      incoming = other.direction;
      outgoing = first.direction;
      side = bothCentre ? "centre" : first.side;
    } else if (bothCentre && first.kind === "end") {
      incoming = first.direction;
      outgoing = scale(other.direction, -1);
      side = "centre";
    } else if (bothCentre) {
      incoming = scale(first.direction, -1);
      outgoing = other.direction;
      side = "centre";
    } else {
      continue;
    }

    corners.push({
      point: first.point,
      incoming,
      outgoing,
      side,
      suffix: `j${first.lineIndex}-${first.pointIndex}`,
    });
  }

  for (const corner of corners) {
    const solid = cornerSolid(corner, up, item.height, item.thickness);
    if (solid !== undefined) solids.push(solid);
  }

  return solids;
};

/**
 * A walls item as the solids the fold evaluates and a click tests.
 *
 * **The same function serves both**, which is the point: an operation the mesher never sees and
 * a box the picker does would be a wall you can click and cannot see, or the other way round.
 */
export const wallParts = (item: LevelWalls): readonly WallPart[] =>
  wallSolids(item).map((solid) => ({
    id: `${item.id}#${solid.suffix}`,
    at: solid.at,
    shape: solid.shape,
    orientation: quatFromBasis(solid.ex, solid.ey, solid.ez),
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
 * The world corners of one solid, which is all `wallsBounds` needs from it.
 *
 * **A box is eight corners; a polygon prism is two for each outline point.** Every corner is
 * the shape's origin plus its own axes scaled by its half-extents, so this is the same
 * arithmetic the old box-only bounds used, widened to the one other shape a wall part can be.
 */
const solidCorners = (solid: WallSolid): readonly Vec3[] => {
  const { at, ex, ey, ez, shape } = solid;
  if (shape.type === "Box") {
    const corners: Vec3[] = [];
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        for (const sz of [-1, 1]) {
          corners.push({
            x:
              at.x +
              ex.x * shape.len.x * sx +
              ey.x * shape.len.y * sy +
              ez.x * shape.len.z * sz,
            y:
              at.y +
              ex.y * shape.len.x * sx +
              ey.y * shape.len.y * sy +
              ez.y * shape.len.z * sz,
            z:
              at.z +
              ex.z * shape.len.x * sx +
              ey.z * shape.len.y * sy +
              ez.z * shape.len.z * sz,
          });
        }
      }
    }
    return corners;
  }

  if (shape.type !== "Polygon") return [];

  const halfHeight = shape.len / 2;
  const corners: Vec3[] = [];
  for (const point of shape.points) {
    for (const sy of [-1, 1]) {
      corners.push({
        x: at.x + ex.x * point.x + ez.x * point.z + ey.x * halfHeight * sy,
        y: at.y + ex.y * point.x + ez.y * point.z + ey.y * halfHeight * sy,
        z: at.z + ex.z * point.x + ez.z * point.z + ey.z * halfHeight * sy,
      });
    }
  }
  return corners;
};

/**
 * The world box a walls item reaches, height and thickness included.
 *
 * **The corners of every wall solid, not the line's points.** A wall is a solid standing
 * beside its line, so a box over the line alone would miss the thickness on every side and
 * the whole wall on the side of a `left` or `right` run. The solids here are the same ones
 * `wallParts` hands the fold, so a click can hit exactly what was built.
 */
export const wallsBounds = (item: WallsGeometry): Bounds => {
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;

  for (const solid of wallSolids(item)) {
    for (const point of solidCorners(solid)) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      minZ = Math.min(minZ, point.z);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
      maxZ = Math.max(maxZ, point.z);
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
