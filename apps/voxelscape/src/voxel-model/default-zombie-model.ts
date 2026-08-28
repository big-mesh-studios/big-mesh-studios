// The built-in zombie model: a blocky undead, generated voxel by voxel so the
// world has zombies to waddle before any model zip is loaded. Drawn in a
// 24×24×24 grid (x right, y up, z toward the viewer / the model's front) and
// projected onto the six side bitmaps exactly the way the solver reads them
// back, so the two always agree. A model saved to a zip from rm-stacker can
// replace it via `/zombiemodel`.
import { Bitmap, Dimensions3D, RGBA } from "@big-mesh-studios/maths";

const N = 24;

const inBox = (
  x: number,
  y: number,
  z: number,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  z0: number,
  z1: number,
): boolean => x >= x0 && x <= x1 && y >= y0 && y <= y1 && z >= z0 && z <= z1;

/** The palette index of the voxel at (x, y, z), or null for empty space. */
const voxelAt = (x: number, y: number, z: number): number | null => {
  // Eyes, a dark pixel on each side of the head's front, checked before the
  // head so the projection keeps them.
  if (inBox(x, y, z, 9, 10, 17, 18, 15, 16)) return 0;
  if (inBox(x, y, z, 14, 15, 17, 18, 15, 16)) return 0;

  // Legs, a shade apart, standing on the grid floor.
  if (inBox(x, y, z, 8, 11, 0, 7, 10, 13)) return 3;
  if (inBox(x, y, z, 13, 16, 0, 7, 10, 13)) return 3;

  // Arms, skin-coloured, hanging at the sides of the torso.
  if (inBox(x, y, z, 5, 7, 8, 15, 10, 13)) return 1;
  if (inBox(x, y, z, 17, 19, 8, 15, 10, 13)) return 1;

  // Torso, wearing the shirt.
  if (inBox(x, y, z, 7, 17, 7, 14, 9, 15)) return 2;

  // Head, a blocky skull above the shoulders, nudged toward the front.
  if (inBox(x, y, z, 8, 16, 14, 21, 9, 16)) return 1;

  return null;
};

/** Which grid axis the projection of a side runs along, and its two fixed ones. */
type Projection = {
  axis: "x" | "y" | "z";
  /** (px, py) of the side bitmap → (x, y, z) grid point the column passes through. */
  fixed: (px: number, py: number) => [number, number, number];
  /** Where along the axis the visible (surface) voxel sits: smallest or largest. */
  limit: "min" | "max";
};

// The pixel layout matches `solveVoxels`'s views, so what is drawn on each side
// lines up with the face colour the marcher reads for that voxel.
const PROJECTIONS: Record<string, Projection> = {
  front: { axis: "z", fixed: (px, py) => [px, N - 1 - py, 0], limit: "max" },
  back: {
    axis: "z",
    fixed: (px, py) => [N - 1 - px, N - 1 - py, 0],
    limit: "min",
  },
  left: { axis: "x", fixed: (px, py) => [0, N - 1 - py, px], limit: "min" },
  right: {
    axis: "x",
    fixed: (px, py) => [0, N - 1 - py, N - 1 - px],
    limit: "max",
  },
  top: { axis: "y", fixed: (px, py) => [px, 0, py], limit: "max" },
  bottom: { axis: "y", fixed: (px, py) => [px, 0, N - 1 - py], limit: "min" },
};

/**
 * The default palette, a full row of 32 texels so the shader's
 * `(index + 0.5) / 32` sampling lands on the right colour. Slots 0-3 are the
 * zombie proper — dark for eyes/shadow, green skin, mossy shirt, grey pants —
 * and the rest ramp the skin into shadow so a model that reaches past index 3
 * still reads as zombie-coloured.
 */
export const ZOMBIE_PALETTE: RGBA[] = Array.from({ length: 32 }, (_, i) => {
  if (i === 0) return { r: 24, g: 34, b: 28, a: 255 }; // dark (eyes / shadow)
  if (i === 1) return { r: 122, g: 158, b: 90, a: 255 }; // skin
  if (i === 2) return { r: 98, g: 94, b: 60, a: 255 }; // shirt
  if (i === 3) return { r: 64, g: 72, b: 78, a: 255 }; // pants
  const t = (i - 4) / 27;
  return {
    r: Math.round(122 - (122 - 60) * t),
    g: Math.round(158 - (158 - 72) * t),
    b: Math.round(90 - (90 - 66) * t),
    a: 255,
  };
});

export const buildDefaultZombieModel = (): {
  sides: Record<string, Bitmap>;
  palette: RGBA[];
  dimensions: Dimensions3D;
} => {
  const sides = {} as Record<string, Bitmap>;

  for (const kind of Object.keys(PROJECTIONS)) {
    const { axis, fixed, limit } = PROJECTIONS[kind];
    const bitmap = Bitmap.create(N, N);

    for (let py = 0; py < N; py++) {
      for (let px = 0; px < N; px++) {
        const [fx, fy, fz] = fixed(px, py);
        const [x, y, z] =
          axis === "x" ? [0, fy, fz] : axis === "y" ? [fx, 0, fz] : [fx, fy, 0];

        // Walk the projection axis, keeping the surface voxel closest to the
        // side this bitmap looks at.
        let surface: number | null = null;
        for (let i = 0; i < N; i++) {
          const [vx, vy, vz] =
            axis === "x" ? [i, y, z] : axis === "y" ? [x, i, z] : [x, y, i];
          const colour = voxelAt(vx, vy, vz);
          if (colour !== null) {
            surface = colour;
            if (limit === "min") break;
          }
        }
        if (surface !== null) {
          bitmap.data[py * N + px] = surface;
        }
      }
    }
    sides[kind] = bitmap;
  }

  return {
    sides,
    palette: ZOMBIE_PALETTE,
    dimensions: { width: N, height: N, depth: N },
  };
};
