// The school's navigation graph for the "Baldi's Basics in Education and
// Learning" demo: a hand-authored web of points along the halls' centre lines
// and through each room's doorway, so every edge between two nodes is a
// straight run clear of walls. The cast walks it instead of `findPath`, whose
// surface sampling cannot tell a wall from a walkable plateau (ADR 0066) and
// so would route straight over the school's walls.
//
// Kept apart from `baldi-level.ts` so it carries no `"voxelscape"` import and
// can be unit-tested on its own. Keep the points in step with `ROOMS` and
// `DOORWAYS` in `baldi-level.ts`.
export interface NavNode {
  readonly id: string;
  /** World units. */
  readonly x: number;
  readonly z: number;
}

/** Every node of the school's navigation graph, in a fixed order. */
export const NAV_NODES: readonly NavNode[] = [
  { id: "hub", x: 0, z: 0 },
  // The horizontal hall's centre line, west to east.
  { id: "h-w", x: -168, z: 0 },
  { id: "h-w120", x: -120, z: 0 },
  { id: "h-w48", x: -48, z: 0 },
  { id: "h-e48", x: 48, z: 0 },
  { id: "h-e120", x: 120, z: 0 },
  { id: "h-e", x: 168, z: 0 },
  // The vertical hall's centre line, north to south.
  { id: "v-n", x: 0, z: -96 },
  { id: "v-n24", x: 0, z: -24 },
  { id: "v-s24", x: 0, z: 24 },
  { id: "v-s", x: 0, z: 96 },
  // The perimeter ring's corners.
  { id: "nw", x: -168, z: -96 },
  { id: "ne", x: 168, z: -96 },
  { id: "sw", x: -168, z: 96 },
  { id: "se", x: 168, z: 96 },
  // Each room's doorway mouth.
  { id: "d-library", x: -120, z: -12 },
  { id: "d-faculty", x: -48, z: -12 },
  { id: "d-cafeteria", x: 48, z: -12 },
  { id: "d-office", x: 120, z: -12 },
  { id: "d-classroom-a", x: -120, z: 12 },
  { id: "d-classroom-b", x: -48, z: 12 },
  { id: "d-classroom-c", x: 48, z: 12 },
  { id: "d-detention", x: 120, z: 12 },
  // Each room's centre.
  { id: "r-library", x: -120, z: -48 },
  { id: "r-faculty", x: -48, z: -48 },
  { id: "r-cafeteria", x: 48, z: -48 },
  { id: "r-office", x: 120, z: -48 },
  { id: "r-classroom-a", x: -120, z: 48 },
  { id: "r-classroom-b", x: -48, z: 48 },
  { id: "r-classroom-c", x: 48, z: 48 },
  { id: "r-detention", x: 120, z: 48 },
];

/** The straight, wall-free runs between nodes, by id. */
export const NAV_EDGES: ReadonlyArray<readonly [string, string]> = [
  // The horizontal hall.
  ["h-w", "h-w120"],
  ["h-w120", "h-w48"],
  ["h-w48", "hub"],
  ["hub", "h-e48"],
  ["h-e48", "h-e120"],
  ["h-e120", "h-e"],
  // The vertical hall.
  ["v-n", "v-n24"],
  ["v-n24", "hub"],
  ["hub", "v-s24"],
  ["v-s24", "v-s"],
  // The perimeter ring.
  ["nw", "h-w"],
  ["h-w", "sw"],
  ["ne", "h-e"],
  ["h-e", "se"],
  ["nw", "v-n"],
  ["v-n", "ne"],
  ["sw", "v-s"],
  ["v-s", "se"],
  // Each doorway mouth joins the hall at its x.
  ["d-library", "h-w120"],
  ["d-faculty", "h-w48"],
  ["d-cafeteria", "h-e48"],
  ["d-office", "h-e120"],
  ["d-classroom-a", "h-w120"],
  ["d-classroom-b", "h-w48"],
  ["d-classroom-c", "h-e48"],
  ["d-detention", "h-e120"],
  // Each room centre joins its doorway.
  ["r-library", "d-library"],
  ["r-faculty", "d-faculty"],
  ["r-cafeteria", "d-cafeteria"],
  ["r-office", "d-office"],
  ["r-classroom-a", "d-classroom-a"],
  ["r-classroom-b", "d-classroom-b"],
  ["r-classroom-c", "d-classroom-c"],
  ["r-detention", "d-detention"],
];

const NAV_INDEX = new Map(NAV_NODES.map((node, at) => [node.id, at]));

/** The neighbours of each node by index, sorted so a search is deterministic. */
const NAV_ADJACENCY: readonly (readonly number[])[] = (() => {
  const lists: number[][] = NAV_NODES.map(() => []);
  for (const [a, b] of NAV_EDGES) {
    const ai = NAV_INDEX.get(a);
    const bi = NAV_INDEX.get(b);
    if (ai === undefined || bi === undefined) {
      continue;
    }
    lists[ai].push(bi);
    lists[bi].push(ai);
  }
  return lists.map((list) => list.sort((p, q) => p - q));
})();

/** The node nearest a point, ties resolved by the earlier node in `NAV_NODES`. */
export const nearestNavNode = (x: number, z: number): number => {
  let best = 0;
  let bestDistance = Infinity;
  for (let at = 0; at < NAV_NODES.length; at++) {
    const node = NAV_NODES[at];
    const distance = Math.hypot(node.x - x, node.z - z);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = at;
    }
  }
  return best;
};

/**
 * The node indices to walk from `from` to `to`, inclusive, or an empty list
 * when no run connects them. Breadth-first over the fixed adjacency, so two
 * peers get the same route.
 */
export const navPath = (from: number, to: number): number[] => {
  if (from === to) {
    return [from];
  }
  const cameFrom = new Array<number>(NAV_NODES.length).fill(-1);
  const seen = new Array<boolean>(NAV_NODES.length).fill(false);
  const queue: number[] = [from];
  seen[from] = true;
  while (queue.length > 0) {
    const current = queue.shift() as number;
    if (current === to) {
      break;
    }
    for (const next of NAV_ADJACENCY[current]) {
      if (seen[next]) {
        continue;
      }
      seen[next] = true;
      cameFrom[next] = current;
      queue.push(next);
    }
  }
  if (!seen[to]) {
    return [];
  }
  const path: number[] = [];
  for (let at = to; at !== -1; at = cameFrom[at]) {
    path.push(at);
    if (at === from) {
      break;
    }
  }
  return path.reverse();
};
