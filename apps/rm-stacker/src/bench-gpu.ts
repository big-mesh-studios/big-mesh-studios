/**
 * Measures the ray marcher with each way of answering "is there a voxel here".
 * Every variant draws the same model from the same camera through the same
 * scene renderer, so the only difference between them is the lookup.
 *
 * Benchmark scaffolding, not part of the app.
 */

import type { Builder } from "@random-mesh/rmsl/scene";
import {
  BoxGeometry,
  DataTexture,
  Mesh,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from "@random-mesh/rmsl/scene";
import { AtlasSolver, atlasLayout, runBehind, type PanelTextureSet } from "./bench-atlas";
import { solveVoxels } from "./legacy-voxel-solver";
import { Bitmap, Dimensions3D, Matrix3x3, Vector3D } from "./maths";
import { toPanelTextures } from "./panel-textures";
import {
  atlasCellSource,
  columnCellSource,
  legacyVolumeCellSource,
  mirroredPanelCellSource,
  packedPairCellSource,
  panelCellSource,
  volumeCellSource,
  type CellSource,
  type Panels,
} from "./shaders-shared";
import { sideKindSet, type SideKind, type Sides } from "./types";
import { keysOf } from "./utils";
import { VoxelPreviewMaterial } from "./voxel-preview-material";
import { boxSize, FAR, FOV, NEAR, rotateMesh } from "./voxel-preview-scene";

const SIDE_KINDS = keysOf(sideKindSet);
const LIGHT_DIR = Vector3D.normalize(Vector3D.create(0.4, 0.7, 0.8));
const COLOUR = 5;

/* -------------------------------------------------------------------------- */
/*                                   Fixture                                  */
/* -------------------------------------------------------------------------- */

// A shape with holes through it, so rays walk past carved cells before they hit
// one, rather than stopping on the first cell they meet.
const panel = (width: number, height: number): Bitmap => {
  const bitmap = Bitmap.create(width, height);
  bitmap.data.fill(COLOUR);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if ((x + y) % 7 === 0) bitmap.data[y * width + x] = Bitmap.EMPTY;
    }
  }
  return bitmap;
};

/** Mirrors emptiness onto the opposing panel, the invariant the editor keeps. */
const mirrorEmptiness = (sides: Sides, { width, height, depth }: Dimensions3D) => {
  const pairs: Array<[SideKind, SideKind, (x: number, y: number) => [number, number]]> = [
    ["front", "back", (x, y) => [width - 1 - x, y]],
    ["left", "right", (x, y) => [depth - 1 - x, y]],
    ["top", "bottom", (x, y) => [x, depth - 1 - y]],
  ];
  for (const [near, far, map] of pairs) {
    const a = sides[near];
    const b = sides[far];
    for (let y = 0; y < a.height; y++) {
      for (let x = 0; x < a.width; x++) {
        const [fx, fy] = map(x, y);
        const aEmpty = a.data[y * a.width + x] === Bitmap.EMPTY;
        const bEmpty = b.data[fy * b.width + fx] === Bitmap.EMPTY;
        if (aEmpty || bEmpty) {
          a.data[y * a.width + x] = Bitmap.EMPTY;
          b.data[fy * b.width + fx] = Bitmap.EMPTY;
        }
      }
    }
  }
};

const makeSides = (dimensions: Dimensions3D): Sides => {
  const { width, height, depth } = dimensions;
  const sides: Sides = {
    front: panel(width, height),
    back: panel(width, height),
    left: panel(depth, height),
    right: panel(depth, height),
    top: panel(width, depth),
    bottom: panel(width, depth),
  };
  mirrorEmptiness(sides, dimensions);
  return sides;
};

/** Opposing panels packed into one texture: near in red, far in green. */
const packPairs = (sides: Sides, { width, height, depth }: Dimensions3D) => {
  const pack = (
    near: Bitmap,
    far: Bitmap,
    map: (x: number, y: number) => [number, number],
  ): { data: Uint8Array; width: number; height: number } => {
    const data = new Uint8Array(near.width * near.height * 4);
    for (let y = 0; y < near.height; y++) {
      for (let x = 0; x < near.width; x++) {
        const offset = (y * near.width + x) << 2;
        const [fx, fy] = map(x, y);
        data[offset] = near.data[y * near.width + x];
        data[offset + 1] = far.data[fy * far.width + fx];
      }
    }
    return { data, width: near.width, height: near.height };
  };
  return {
    frontBack: pack(sides.front, sides.back, (x, y) => [width - 1 - x, y]),
    leftRight: pack(sides.left, sides.right, (x, y) => [depth - 1 - x, y]),
    topBottom: pack(sides.top, sides.bottom, (x, y) => [x, depth - 1 - y]),
  };
};

/* -------------------------------------------------------------------------- */
/*                                  Materials                                 */
/* -------------------------------------------------------------------------- */

class MirroredMaterial extends VoxelPreviewMaterial {
  protected buildCellSource(_b: Builder, panels: Panels): CellSource {
    return mirroredPanelCellSource(panels);
  }
}

class PackedMaterial extends VoxelPreviewMaterial {
  pairTextures = {
    frontBack: new DataTexture(new Uint8Array(4), 1, 1),
    leftRight: new DataTexture(new Uint8Array(4), 1, 1),
    topBottom: new DataTexture(new Uint8Array(4), 1, 1),
  };
  protected buildCellSource(b: Builder, _panels: Panels): CellSource {
    return packedPairCellSource({
      frontBack: b.sampler("uFrontBack", "usampler2D", () => this.pairTextures.frontBack),
      leftRight: b.sampler("uLeftRight", "usampler2D", () => this.pairTextures.leftRight),
      topBottom: b.sampler("uTopBottom", "usampler2D", () => this.pairTextures.topBottom),
    });
  }
}

class VolumeMaterial extends VoxelPreviewMaterial {
  volumeTexture = new DataTexture(new Uint8Array(4), 1, 1, 1);
  protected buildCellSource(b: Builder, panels: Panels): CellSource {
    return volumeCellSource(
      b.sampler("uVolume", "usampler3D", () => this.volumeTexture),
      panels,
    );
  }
}

/**
 * The renderer as it stood before the panels: one lookup into a CPU-solved
 * volume that carries the face colours packed into it, so nothing is read from
 * the panels at all.
 */
class LegacyMaterial extends VoxelPreviewMaterial {
  legacyTexture = new DataTexture(new Uint8Array(4), 1, 1, 1);
  protected buildCellSource(b: Builder, _panels: Panels): CellSource {
    return legacyVolumeCellSource(b.sampler("uLegacy", "usampler3D", () => this.legacyTexture));
  }
}

/**
 * The solved volume with its slices stacked in one column, read without a
 * division. Paired with an `AtlasMaterial` over the same layout, which keeps the
 * dividing reader, so the two together separate the cost of the arithmetic from
 * the cost of the layout.
 */
class ColumnMaterial extends VoxelPreviewMaterial {
  columnTexture = new DataTexture(new Uint8Array(4), 1, 1);
  protected buildCellSource(b: Builder, panels: Panels): CellSource {
    return columnCellSource(
      b.sampler("uColumn", "usampler2D", () => this.columnTexture),
      panels,
    );
  }
}

class AtlasMaterial extends VoxelPreviewMaterial {
  atlasTexture = new DataTexture(new Uint8Array(4), 1, 1);
  tilesPerRow = 1;
  protected buildCellSource(b: Builder, panels: Panels): CellSource {
    return atlasCellSource(
      b.sampler("uAtlas", "usampler2D", () => this.atlasTexture),
      b.materialUniform("uTiles", "int", () => this.tilesPerRow),
      panels,
    );
  }
}

/* -------------------------------------------------------------------------- */
/*                                    Scene                                   */
/* -------------------------------------------------------------------------- */

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const renderer = new WebGLRenderer(canvas, { antialias: false, depth: true });
renderer.setClearColor(0x000000, 0);
const gl = renderer.gl;
const scene = new Scene();
const camera = new PerspectiveCamera(FOV, 1, NEAR, FAR);
camera.position.set(0, 0, 3);
camera.lookAt(0, 0, 0);

const materials = {
  legacy: new LegacyMaterial(),
  panels: new VoxelPreviewMaterial(),
  mirrored: new MirroredMaterial(),
  packed: new PackedMaterial(),
  atlas: new AtlasMaterial(),
  column: new ColumnMaterial(),
  columnDiv: new AtlasMaterial(),
  volume: new VolumeMaterial(),
};
type Variant = keyof typeof materials;

const mesh = new Mesh(undefined, materials.panels);
scene.add(mesh);

const palette = new Uint8Array(32 * 4);
for (let i = 0; i < 32; i++) {
  palette[i * 4] = 40 + i * 6;
  palette[i * 4 + 1] = 200 - i * 4;
  palette[i * 4 + 2] = 120;
  palette[i * 4 + 3] = 255;
}
for (const material of Object.values(materials)) {
  material.paletteTexture.image = palette;
  material.paletteTexture.width = 32;
  material.paletteTexture.height = 1;
  material.paletteTexture.needsUpdate = true;
  material.lightColour = [1, 0.97, 0.9];
  material.ambientColour = [0.35, 0.35, 0.4];
  material.unlit = false;
}

let dimensions: Dimensions3D = { width: 15, height: 15, depth: 15 };
let sides = makeSides(dimensions);
let variant: Variant = "panels";
const solver = new AtlasSolver(gl);
// The same solve, filling a single column of slices instead of a square grid.
const columnSolver = new AtlasSolver(gl, 1);
// The solve pass reads the panels through plain WebGL, so it keeps its own
// copies rather than reaching into the ones the scene renderer owns.
const solvePanels: PanelTextureSet = Object.fromEntries(
  SIDE_KINDS.map(kind => [kind, gl.createTexture()!]),
) as PanelTextureSet;

const uploadSolvePanels = () => {
  const panels = toPanelTextures(sides);
  for (const kind of SIDE_KINDS) {
    const panel = panels[kind];
    gl.bindTexture(gl.TEXTURE_2D, solvePanels[kind]);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA8UI,
      panel.width,
      panel.height,
      0,
      gl.RGBA_INTEGER,
      gl.UNSIGNED_BYTE,
      panel.data,
    );
  }
};

/** The GPU texture the scene renderer made for a material's data texture. */
const glTextureOf = (texture: DataTexture): WebGLTexture => {
  const owned = (renderer as unknown as { textures: Map<DataTexture, WebGLTexture> }).textures;
  const found = owned.get(texture);
  if (!found) throw new Error("the renderer has not created this texture yet");
  return found;
};

const draw = () => {
  gl.bindVertexArray(null);
  renderer.render(scene, camera);
};

const uploadPanels = () => {
  const panels = toPanelTextures(sides);
  for (const material of Object.values(materials)) {
    for (const kind of SIDE_KINDS) {
      const texture = material.panelTextures[kind];
      texture.image = panels[kind].data;
      texture.width = panels[kind].width;
      texture.height = panels[kind].height;
      texture.needsUpdate = true;
    }
  }
  const pairs = packPairs(sides, dimensions);
  for (const [name, packed] of Object.entries(pairs)) {
    const texture = materials.packed.pairTextures[name as keyof typeof pairs];
    texture.image = packed.data;
    texture.width = packed.width;
    texture.height = packed.height;
    texture.needsUpdate = true;
  }
};

// The same answer the panels give, worked out once per voxel on the CPU and
// held in a 3D texture: the arrangement the port replaced, minus the packed
// face colours it no longer needs.
const prepareVolume = () => {
  const { width, height, depth } = dimensions;
  const data = new Uint8Array(width * height * depth * 4);
  const drawn = (bitmap: Bitmap, x: number, y: number) =>
    bitmap.data[y * bitmap.width + x] !== Bitmap.EMPTY;
  for (let z = 0; z < depth; z++) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const solid =
          drawn(sides.front, x, height - 1 - y) &&
          drawn(sides.back, width - 1 - x, height - 1 - y) &&
          drawn(sides.left, z, height - 1 - y) &&
          drawn(sides.right, depth - 1 - z, height - 1 - y) &&
          drawn(sides.top, x, z) &&
          drawn(sides.bottom, x, depth - 1 - z);
        if (solid) data[((z * height + y) * width + x) << 2] = 255;
      }
    }
  }
  const texture = materials.volume.volumeTexture;
  texture.image = data;
  texture.width = width;
  texture.height = height;
  texture.depth = depth;
  texture.needsUpdate = true;
};

const prepareAtlas = () => {
  const { tilesPerRow, atlasWidth, atlasHeight } = atlasLayout(dimensions);
  materials.atlas.tilesPerRow = tilesPerRow;
  const texture = materials.atlas.atlasTexture;
  texture.image = new Uint8Array(atlasWidth * atlasHeight * 4);
  texture.width = atlasWidth;
  texture.height = atlasHeight;
  texture.needsUpdate = true;
  // Draw once so the renderer allocates the texture, then fill it here.
  const previous = mesh.material;
  mesh.material = materials.atlas;
  draw();
  uploadSolvePanels();
  solver.solveAll(glTextureOf(texture), solvePanels, dimensions);
  mesh.material = previous;
};

// The pre-panels volume, solved on the CPU exactly as it was then: silhouettes
// carved out of a solid block, then every surviving voxel packed with the six
// face colours the panels looking at it give.
const prepareLegacy = () => {
  const { width, height, depth } = dimensions;
  const texture = materials.legacy.legacyTexture;
  texture.image = solveVoxels(dimensions, sides);
  texture.width = width;
  texture.height = height;
  texture.depth = depth;
  texture.needsUpdate = true;
};

// Both readers of the stacked-column layout, over their own copy of it: the one
// that finds a slice by multiplying and the one that finds it by dividing.
const prepareColumn = () => {
  const { atlasWidth, atlasHeight } = atlasLayout(dimensions, 1);
  materials.columnDiv.tilesPerRow = 1;
  const targets: Array<[VoxelPreviewMaterial, DataTexture]> = [
    [materials.column, materials.column.columnTexture],
    [materials.columnDiv, materials.columnDiv.atlasTexture],
  ];
  for (const [, texture] of targets) {
    texture.image = new Uint8Array(atlasWidth * atlasHeight * 4);
    texture.width = atlasWidth;
    texture.height = atlasHeight;
    texture.needsUpdate = true;
  }
  const previous = mesh.material;
  uploadSolvePanels();
  for (const [material, texture] of targets) {
    // Draw once so the renderer allocates the texture, then fill it here.
    mesh.material = material;
    draw();
    columnSolver.solveAll(glTextureOf(texture), solvePanels, dimensions);
  }
  mesh.material = previous;
};

const setModel = (size: number) => {
  dimensions = { width: size, height: size, depth: size };
  sides = makeSides(dimensions);
  uploadPanels();
  const normalized = Dimensions3D.normalize(dimensions);
  const worldToModel = Matrix3x3.multiply(Matrix3x3.rotationY(-0.6), Matrix3x3.rotationX(-0.4));
  const light = Matrix3x3.transform(worldToModel, LIGHT_DIR, Vector3D.create());
  for (const material of Object.values(materials)) {
    material.dimensions = [normalized.width, normalized.height, normalized.depth];
    material.voxelCount = [size, size, size];
    material.lightDir = [light.x, light.y, light.z];
  }
  const box = boxSize(dimensions);
  mesh.geometry = new BoxGeometry(box.width, box.height, box.depth);
  rotateMesh(mesh, 0.6, 0.4, 0);
  prepareLegacy();
  prepareVolume();
  prepareAtlas();
  prepareColumn();
};

const setVariant = (next: Variant) => {
  variant = next;
  mesh.material = materials[next];
  draw();
};

const setSize = (pixels: number) => {
  canvas.style.width = `${pixels / (window.devicePixelRatio || 1)}px`;
  canvas.style.height = `${pixels / (window.devicePixelRatio || 1)}px`;
  renderer.setSize(pixels, pixels);
  camera.aspect = 1;
  camera.updateProjectionMatrix();
};

/* -------------------------------------------------------------------------- */
/*                                  Measuring                                 */
/* -------------------------------------------------------------------------- */

const timer = gl.getExtension("EXT_disjoint_timer_query_webgl2") as any;

/** GPU time for one piece of work, one presented frame per sample. */
const timeGpu = async (samples: number, work: () => void) => {
  const times: number[] = [];
  for (let i = 0; i < samples; i++) {
    const query = gl.createQuery()!;
    gl.beginQuery(timer.TIME_ELAPSED_EXT, query);
    work();
    gl.endQuery(timer.TIME_ELAPSED_EXT);
    await new Promise(resolve => requestAnimationFrame(resolve));
    while (!gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE)) {
      await new Promise(resolve => requestAnimationFrame(resolve));
    }
    if (!gl.getParameter(timer.GPU_DISJOINT_EXT)) {
      times.push(gl.getQueryParameter(query, gl.QUERY_RESULT) / 1e6);
    }
    gl.deleteQuery(query);
  }
  times.sort((a, b) => a - b);
  return { median: times[times.length >> 1], samples: times.length };
};

/** The pixels the current variant draws, for comparing variants against each other. */
const readPixels = () => {
  draw();
  const pixels = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
  gl.readPixels(
    0,
    0,
    gl.drawingBufferWidth,
    gl.drawingBufferHeight,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    pixels,
  );
  return pixels;
};

Object.assign(window, {
  __setModel: setModel,
  __setVariant: setVariant,
  __setSize: setSize,
  __benchFrame: (samples: number) => timeGpu(samples, draw),
  __benchSolveAll: (samples: number) =>
    timeGpu(samples, () =>
      solver.solveAll(glTextureOf(materials.atlas.atlasTexture), solvePanels, dimensions),
    ),
  /**
   * What an edit cost before the panels: the CPU pass over every voxel, timed in
   * the browser rather than under node, so it is the same engine that runs the
   * app. Wall clock, not a GPU timer — this pass never touched the GPU.
   */
  __benchLegacySolve: (samples: number) => {
    const out = new Uint8Array(dimensions.width * dimensions.height * dimensions.depth * 4);
    for (let i = 0; i < 10; i++) solveVoxels(dimensions, sides, out);
    const times: number[] = [];
    for (let i = 0; i < samples; i++) {
      const start = performance.now();
      solveVoxels(dimensions, sides, out);
      times.push(performance.now() - start);
    }
    times.sort((a, b) => a - b);
    return { median: times[times.length >> 1], samples: times.length };
  },
  __benchSolveColumn: (samples: number) =>
    timeGpu(samples, () =>
      columnSolver.solveAll(
        glTextureOf(materials.column.columnTexture),
        solvePanels,
        dimensions,
      ),
    ),
  /** One stroke's worth of edits: `cells` panel cells, each redrawing its run. */
  __benchSolveCells: (samples: number, cells: number) => {
    const voxels: number[] = [];
    for (let i = 0; i < cells; i++) {
      const run = runBehind("front", i % dimensions.width, (i * 3) % dimensions.height, dimensions);
      voxels.push(...run);
    }
    const data = new Float32Array(voxels);
    return timeGpu(samples, () =>
      solver.solveCells(glTextureOf(materials.atlas.atlasTexture), solvePanels, dimensions, data),
    );
  },
  /** How many pixels differ between the current variant and the six-panel one. */
  __compareWithPanels: () => {
    const mine = readPixels();
    const remember = variant;
    setVariant("panels");
    const reference = readPixels();
    setVariant(remember);
    let differing = 0;
    let worst = 0;
    for (let i = 0; i < mine.length; i += 4) {
      let delta = 0;
      for (let c = 0; c < 4; c++) delta = Math.max(delta, Math.abs(mine[i + c] - reference[i + c]));
      if (delta > 0) differing++;
      worst = Math.max(worst, delta);
    }
    return { differing, worst, total: mine.length / 4 };
  },
  __glError: () => gl.getError(),
  /**
   * The whole matrix in one call: every variant at every size, each checked
   * against the six-panel render before it is timed, so a variant that has
   * drifted is reported rather than quietly benchmarked. Returns rows ready to
   * be written down, which is what the earlier hand-driven runs never produced.
   */
  __benchAll: async (samples = 40, sizes = [15, 32, 64]) => {
    const rows: Array<Record<string, unknown>> = [];
    for (const size of sizes) {
      setModel(size);
      for (const name of Object.keys(materials) as Variant[]) {
        setVariant(name);
        const { differing, worst, total } = (
          window as unknown as {
            __compareWithPanels: () => { differing: number; worst: number; total: number };
          }
        ).__compareWithPanels();
        const { median, samples: taken } = await timeGpu(samples, draw);
        rows.push({
          size,
          variant: name,
          ms: Number(median.toFixed(3)),
          samples: taken,
          identical: differing === 0,
          differing,
          worst,
          total,
        });
      }
    }
    console.table(rows);
    return rows;
  },
});

setSize(1024);
setModel(15);
setVariant("panels");
