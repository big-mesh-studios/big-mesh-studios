// The walkable route a place script asks for: a deterministic A* over the
// LOD-0 voxel grid, one cell at a time, where a cell is walkable when it has
// ground under it and a voxel of clearance above. Two peers that run the same
// script over the same terrain get the same route, because the grid, the
// neighbour order, and the tie-break are all fixed. A route is a sequence of
// world-unit waypoints at the centre of each cell walked, so a script moves a
// figure along points it could have placed itself.
import { VOXEL_SIZE } from "../world/level-data";

/** The most cells one route may visit before it gives up. */
export const MAX_PATH_NODES = 4096;
/** The furthest, in cells, a route may stray from where it started. */
export const MAX_PATH_CELLS = 128;

/** Where a route may be searched and how hard it may try. */
export interface PathfindOptions {
  /** The most cells to visit; defaults to `MAX_PATH_NODES`. */
  maxNodes?: number;
  /** The furthest from the start a cell may be, in cells; defaults to `MAX_PATH_CELLS`. */
  maxCells?: number;
}

/** The ground under a cell's centre, or null when the cell is not walkable. */
const groundAt = (
  cx: number,
  cz: number,
  getHeightAt: (x: number, z: number) => number,
  getSolidAt: (x: number, y: number, z: number) => boolean,
): number | null => {
  const x = (cx + 0.5) * VOXEL_SIZE;
  const z = (cz + 0.5) * VOXEL_SIZE;
  const ground = getHeightAt(x, z);
  if (!Number.isFinite(ground)) {
    return null;
  }
  return getSolidAt(x, ground + 1, z) ? null : ground;
};

/**
 * The nearest walkable cell to (`cx`, `cz`) within `reach` cells, searched in
 * a fixed ring order so every peer picks the same one, or null when there is
 * none. A figure standing on a prop or a slope often has an unwalkable origin
 * cell; a route still exists from the ground beside it.
 */
const nearestWalkable = (
  cx: number,
  cz: number,
  reach: number,
  getHeightAt: (x: number, z: number) => number,
  getSolidAt: (x: number, y: number, z: number) => boolean,
): [number, number] | null => {
  for (let radius = 0; radius <= reach; radius++) {
    for (let dz = -radius; dz <= radius; dz++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== radius) {
          continue;
        }
        if (groundAt(cx + dx, cz + dz, getHeightAt, getSolidAt) !== null) {
          return [cx + dx, cz + dz];
        }
      }
    }
  }
  return null;
};

interface Node {
  cx: number;
  cz: number;
  g: number;
  f: number;
}

const keyOf = (cx: number, cz: number): string => `${cx},${cz}`;

/**
 * The walkable route from `from` to `to`, as world-unit waypoints from the
 * start cell to the goal cell, or null when none exists within the bounds. The
 * route walks cell centres; a caller moves a figure point by point.
 */
export const findVoxelPath = (
  from: readonly [number, number, number],
  to: readonly [number, number, number],
  getHeightAt: (x: number, z: number) => number,
  getSolidAt: (x: number, y: number, z: number) => boolean,
  options: PathfindOptions = {},
): Array<[number, number, number]> | null => {
  const maxNodes = options.maxNodes ?? MAX_PATH_NODES;
  const maxCells = options.maxCells ?? MAX_PATH_CELLS;
  const startCell = nearestWalkable(
    Math.floor(from[0] / VOXEL_SIZE),
    Math.floor(from[2] / VOXEL_SIZE),
    3,
    getHeightAt,
    getSolidAt,
  );
  const goalCell = nearestWalkable(
    Math.floor(to[0] / VOXEL_SIZE),
    Math.floor(to[2] / VOXEL_SIZE),
    3,
    getHeightAt,
    getSolidAt,
  );
  if (startCell === null || goalCell === null) {
    return null;
  }
  const [startCx, startCz] = startCell;
  const [goalCx, goalCz] = goalCell;

  const cameFrom = new Map<string, string>();
  const best = new Map<string, number>();
  const open: Node[] = [];
  const start: Node = { cx: startCx, cz: startCz, g: 0, f: 0 };
  open.push(start);
  best.set(keyOf(startCx, startCz), 0);
  let visited = 0;

  const h = (cx: number, cz: number): number =>
    Math.abs(cx - goalCx) + Math.abs(cz - goalCz);

  // The four neighbours, in a fixed order, so two peers expand a tie the same
  // way. Diagonals are left out: a corner between two walls is never free.
  const steps: Array<[number, number]> = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  let reached: Node | null = null;
  while (open.length > 0 && visited < maxNodes) {
    // Pick the lowest f, ties by estimated remaining then by cell address.
    let pick = 0;
    for (let i = 1; i < open.length; i++) {
      const a = open[i];
      const b = open[pick];
      if (
        a.f < b.f ||
        (a.f === b.f &&
          (h(a.cx, a.cz) < h(b.cx, b.cz) ||
            (h(a.cx, a.cz) === h(b.cx, b.cz) &&
              (a.cx < b.cx || (a.cx === b.cx && a.cz < b.cz)))))
      ) {
        pick = i;
      }
    }
    const current = open.splice(pick, 1)[0];
    visited++;
    if (current.cx === goalCx && current.cz === goalCz) {
      reached = current;
      break;
    }
    for (const [dx, dz] of steps) {
      const cx = current.cx + dx;
      const cz = current.cz + dz;
      if (
        Math.abs(cx - startCx) > maxCells ||
        Math.abs(cz - startCz) > maxCells
      ) {
        continue;
      }
      if (groundAt(cx, cz, getHeightAt, getSolidAt) === null) {
        continue;
      }
      const g = current.g + 1;
      const key = keyOf(cx, cz);
      const known = best.get(key);
      if (known !== undefined && known <= g) {
        continue;
      }
      best.set(key, g);
      cameFrom.set(key, keyOf(current.cx, current.cz));
      open.push({ cx, cz, g, f: g + h(cx, cz) });
    }
  }

  if (reached === null) {
    return null;
  }
  const cells: Array<[number, number]> = [];
  let cursor: string | undefined = keyOf(reached.cx, reached.cz);
  while (cursor !== undefined) {
    const [cx, cz] = cursor.split(",").map(Number);
    cells.push([cx, cz]);
    cursor = cameFrom.get(cursor);
  }
  cells.reverse();
  return cells.map(([cx, cz]) => {
    const ground = groundAt(cx, cz, getHeightAt, getSolidAt) ?? 0;
    return [(cx + 0.5) * VOXEL_SIZE, ground, (cz + 0.5) * VOXEL_SIZE] as [
      number,
      number,
      number,
    ];
  });
};
