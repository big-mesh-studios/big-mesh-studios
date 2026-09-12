// Structure plans: the compact geometry a place's script asks the trusted
// filler to stamp into a freshly generated chunk. Shapes are named in LOD-0
// world voxels and rasterized into whatever level of detail the block being
// generated is at, so a building survives the window's coarse shell and every
// peer generating the same cell from the same plan reaches the same voxels.
// The plan is data, never code: the script composes shapes in the sandbox and
// the trusted side does the writing, which is what keeps a place's filler
// behind the same boundary as the rest of its script (ADR 0027).
import { VOXEL_SIZE, type Dim3 } from "./level-data";
import { VOXEL_AIR, isWaterId, type VoxelStore } from "./voxel-store";

/** A filled axis-aligned box, bounds inclusive, in LOD-0 world voxel indices. */
export interface PlanBox {
  kind: "box";
  min: Dim3;
  max: Dim3;
  id: number;
}

/** A road: a straight, axis-aligned street `width` voxels wide. */
export interface PlanRoad {
  kind: "road";
  /** One end of the road's centreline, in LOD-0 world voxels. */
  from: Dim3;
  /** The other end; only one horizontal axis may differ from `from`. */
  to: Dim3;
  /** How many voxels wide the road is across its run. */
  width: number;
  id: number;
}

/**
 * A hollow house: a solid floor, a shell of walls up to a roof, and a two-voxel
 * door gap in the middle of the wall facing -Z.
 */
export interface PlanHouse {
  kind: "house";
  /** The corner the house starts at, in LOD-0 world voxels. */
  at: Dim3;
  /** How far the house reaches along each axis, in voxels. */
  size: Dim3;
  wall: number;
  roof: number;
  floor: number;
}

/** A solid staircase: `steps` treads climbing along one horizontal axis. */
export interface PlanStairs {
  kind: "stairs";
  /** The bottom corner the first tread starts at, in LOD-0 world voxels. */
  at: Dim3;
  /** The horizontal axis the staircase climbs along. */
  along: "x" | "z";
  /** How many treads. */
  steps: number;
  /** How many voxels each tread rises above the one before it. */
  rise: number;
  /** How many voxels each tread runs along `along`. */
  run: number;
  /** How many voxels wide the staircase is across its run. */
  width: number;
  id: number;
}

/** A solid incline from one point to another, its top stepping one voxel at a time. */
export interface PlanRamp {
  kind: "ramp";
  /** The base of the low end, in LOD-0 world voxels. */
  from: Dim3;
  /** The top of the high end. */
  to: Dim3;
  /** How many voxels wide the incline is across its run. */
  width: number;
  id: number;
}

export type PlanShape = PlanBox | PlanRoad | PlanHouse | PlanStairs | PlanRamp;

/** Everything a script asks the filler to stamp, in the order it stamps it. */
export type StructurePlan = PlanShape[];

/** A box with its bounds sorted and being the box a shape expands into. */
const box = (min: Dim3, max: Dim3, id: number): PlanBox => ({
  kind: "box",
  min,
  max,
  id,
});

/** The boxes a house becomes: its floor and roof slabs, four walls, and the door. */
const expandHouse = ({ at, size, wall, roof, floor }: PlanHouse): PlanBox[] => {
  const [x0, y0, z0] = at;
  const [w, h, d] = size;
  const x1 = x0 + w - 1;
  const y1 = y0 + h - 1;
  const z1 = z0 + d - 1;
  const boxes: PlanBox[] = [];

  boxes.push(box([x0, y0, z0], [x1, y0, z1], floor));
  boxes.push(box([x0, y1, z0], [x1, y1, z1], roof));

  const wy0 = y0 + 1;
  const wy1 = y1 - 1;
  if (wy1 >= wy0 && w >= 3 && d >= 3) {
    // The two walls running along X are full depth; the two running along Z
    // stop between them so the corners are not written twice.
    boxes.push(box([x0, wy0, z0], [x1, wy1, z0], wall));
    boxes.push(box([x0, wy0, z1], [x1, wy1, z1], wall));
    boxes.push(box([x0, wy0, z0 + 1], [x0, wy1, z1 - 1], wall));
    boxes.push(box([x1, wy0, z0 + 1], [x1, wy1, z1 - 1], wall));

    // The door: a two-voxel gap in the middle of the -Z wall, carved by
    // stamping air over it after the wall it interrupts.
    const doorX = x0 + Math.floor(w / 2);
    const doorTop = Math.min(wy0 + 1, wy1);
    boxes.push(box([doorX, wy0, z0], [doorX, doorTop, z0], VOXEL_AIR));
  }

  return boxes;
};

/** The boxes a road becomes: one run along whichever horizontal axis it uses. */
const expandRoad = ({ from, to, width, id }: PlanRoad): PlanBox[] => {
  const [fx, fy, fz] = from;
  const [tx, , tz] = to;
  const alongX = Math.abs(tx - fx) >= Math.abs(tz - fz);
  const half = Math.floor(Math.max(1, width) / 2);
  const [lx, hx] = alongX
    ? [Math.min(fx, tx), Math.max(fx, tx)]
    : [fx - half, fx + half];
  const [lz, hz] = alongX
    ? [fz - half, fz + half]
    : [Math.min(fz, tz), Math.max(fz, tz)];
  return [box([lx, fy, lz], [hx, fy, hz], id)];
};

/**
 * The boxes a staircase becomes: one solid column per tread, each rising `rise`
 * voxels above the last, so the whole staircase is solid to walk up and onto.
 */
const expandStairs = ({
  at,
  along,
  steps,
  rise,
  run,
  width,
  id,
}: PlanStairs): PlanBox[] => {
  const [x0, y0, z0] = at;
  const boxes: PlanBox[] = [];
  for (let i = 0; i < steps; i++) {
    const top = y0 + (i + 1) * rise - 1;
    if (along === "x") {
      const sx = x0 + i * run;
      boxes.push(box([sx, y0, z0], [sx + run - 1, top, z0 + width - 1], id));
    } else {
      const sz = z0 + i * run;
      boxes.push(box([x0, y0, sz], [x0 + width - 1, top, sz + run - 1], id));
    }
  }
  return boxes;
};

/**
 * The boxes an incline becomes: one column per voxel of its run, solid from the
 * lower end's height to the top interpolated at that column, so the surface
 * climbs one voxel at a time rather than as a single sheared slab.
 */
const expandRamp = ({ from, to, width, id }: PlanRamp): PlanBox[] => {
  const [fx, fy, fz] = from;
  const [tx, ty, tz] = to;
  const alongX = Math.abs(tx - fx) >= Math.abs(tz - fz);
  const length = Math.max(1, Math.abs(alongX ? tx - fx : tz - fz));
  const base = Math.min(fy, ty);
  const half = Math.floor(Math.max(1, width) / 2);
  const boxes: PlanBox[] = [];
  for (let s = 0; s <= length; s++) {
    const top = Math.max(base, Math.round(fy + ((ty - fy) * s) / length));
    if (alongX) {
      const x = Math.min(fx, tx) + s;
      boxes.push(box([x, base, fz - half], [x, top, fz + half], id));
    } else {
      const z = Math.min(fz, tz) + s;
      boxes.push(box([fx - half, base, z], [fx + half, top, z], id));
    }
  }
  return boxes;
};

/** Every box a shape stands for, in the order it should be stamped. */
export const expandShape = (shape: PlanShape): PlanBox[] => {
  if (shape.kind === "box") {
    return [shape];
  }
  if (shape.kind === "road") {
    return expandRoad(shape);
  }
  if (shape.kind === "stairs") {
    return expandStairs(shape);
  }
  if (shape.kind === "ramp") {
    return expandRamp(shape);
  }
  return expandHouse(shape);
};

/**
 * Stamps a plan into a freshly filled `store`, writing the meshing border along
 * with the interior. Every shape is turned into boxes in LOD-0 voxel space and
 * each overlapping block voxel is written at the block's own resolution, so a
 * coarse block covers a building in whole voxels rather than losing the thin
 * walls between its samples.
 */
export const stampStructures = (
  store: VoxelStore,
  center: Dim3,
  plan: StructurePlan,
): void => {
  if (plan.length === 0) {
    return;
  }
  const scale = store.scale;
  const [nx, ny, nz] = store.voxels;
  const n: Dim3 = [nx, ny, nz];
  const p = store.padding;

  for (const shape of plan) {
    for (const part of expandShape(shape)) {
      const id = part.id;
      if (!Number.isInteger(id) || id < 0 || id > 255) {
        continue;
      }
      const lo: Dim3 = [0, 0, 0];
      const hi: Dim3 = [0, 0, 0];
      for (let axis = 0; axis < 3; axis++) {
        // The box's half-open world-unit span, then the block voxels whose own
        // span overlaps it.
        const worldLo = part.min[axis] * VOXEL_SIZE;
        const worldHi = (part.max[axis] + 1) * VOXEL_SIZE;
        lo[axis] = Math.max(
          -p,
          Math.floor((worldLo - center[axis]) / scale + n[axis] / 2),
        );
        hi[axis] = Math.min(
          n[axis] + p - 1,
          Math.ceil((worldHi - center[axis]) / scale + n[axis] / 2) - 1,
        );
      }
      for (let vz = lo[2]; vz <= hi[2]; vz++) {
        for (let vy = lo[1]; vy <= hi[1]; vy++) {
          for (let vx = lo[0]; vx <= hi[0]; vx++) {
            store.data[store.paddedIndex(vx, vy, vz)] = id;
            if (isWaterId(id)) {
              store.hasWater = true;
            } else if (id !== VOXEL_AIR) {
              store.mightHaveVoxels = true;
            }
          }
        }
      }
    }
  }
};
