// Drawing a figure: solving each part into a volume, handing a volume to a
// material, and the group of boxes a whole figure is drawn as.
//
// Nothing here decides how a figure looks. Light, flat colour, the red of a hit
// and the depth bias under an outline are the caller's, because the same figure
// is drawn under studio light in the editor and under a moving sun in the world.
// A caller reaches the materials to say so.
import { Dimensions3D, Vector3D, type RGBA } from "@big-mesh-studios/maths";
import {
  BoxGeometry,
  Group,
  Matrix4,
  Mesh,
  Object3D,
} from "@random-mesh/rmsl/scene";
import {
  boxSize,
  figurePlacement,
  type FigureBounds,
  type FigureFraming,
  type FigurePlacement,
  type PartPlacement,
} from "./box";
import { composeRoot, partDimensions, type Figure, type Part } from "./data";
import { VoxelModelMaterial } from "./material";
import { encodePalette, solveVoxels } from "./solver";

/** One part's volume as the graphics card reads it, and the box it fills. */
export interface SolvedPart {
  name: string;
  dimensions: Dimensions3D;
  voxels: Uint8Array;
}

/** `part`'s drawings packed into the volume a material marches. */
export function solvePart(part: Part): SolvedPart {
  const dimensions = partDimensions(part);
  return {
    name: part.name,
    dimensions,
    voxels: solveVoxels(dimensions, part.sides, part.sections),
  };
}

/** Every part of `figure`, in the order it holds them. */
export function solveFigure(figure: Figure): SolvedPart[] {
  return figure.parts.map(solvePart);
}

/**
 * How far the voxels drawn in `figure` reach from `from`, in the voxels the
 * figure is drawn in: the distance to the furthest corner of the furthest voxel
 * that has anything in it, and no reach at all for a figure nothing has been
 * drawn in.
 *
 * The reach is measured over the voxels that were actually drawn rather than
 * over the boxes they sit in. A part rarely fills its box, and measuring the
 * boxes would leave the figure a speck in the middle of a lot of nothing.
 *
 * Whoever frames a figure turns it about one point of it, so a figure measured
 * from that point stays inside a sphere of this reach however it is turned.
 *
 * @param solved Each part's volume, in the order `figure.parts` holds them.
 * @param from The point it is measured from, in voxels from the figure's
 * origin, which is the point the figure is turned about.
 */
export function voxelReach(
  figure: Figure,
  solved: SolvedPart[],
  from: Vector3D = Vector3D.EMPTY,
): number {
  let furthest = 0;

  figure.parts.forEach((part, index) => {
    const { dimensions, voxels } = solved[index];
    const { width, height, depth } = dimensions;
    // Where the part's low corner sits in the figure, which is what turns a
    // voxel's place in its own box into its place in the whole drawing.
    const low = Vector3D.subtract(composeRoot(figure, part), part.pivot);

    for (let z = 0; z < depth; z++) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (voxels[((z * width * height + y * width + x) << 2) + 3] === 0) {
            continue;
          }

          // The far corner of the voxel rather than its middle, so the one at
          // the edge of the figure is inside the picture and not half out of it.
          const px = Math.abs(low.x + x + 0.5 - from.x) + 0.5;
          const py = Math.abs(low.y + y + 0.5 - from.y) + 0.5;
          const pz = Math.abs(low.z + z + 0.5 - from.z) + 0.5;

          furthest = Math.max(furthest, Math.hypot(px, py, pz));
        }
      }
    }
  });

  return furthest;
}

/**
 * Hands `material` a volume to march and the palette it addresses.
 *
 * The volume is walked in the space `boxSize` builds its box in, where the
 * model's own longest axis is one, so the extent given here is the model's
 * measured against that axis rather than in voxels — `voxelCount` carries the
 * voxels. Scaling the mesh is what brings the result to whatever size it is
 * wanted at.
 */
export function bakeVolume(
  material: VoxelModelMaterial,
  dimensions: Dimensions3D,
  voxels: Uint8Array,
  palette: RGBA[],
): void {
  const volume = material.voxelTexture;
  volume.image = voxels;
  volume.width = dimensions.width;
  volume.height = dimensions.height;
  volume.depth = dimensions.depth;
  volume.needsUpdate = true;

  const colours = material.paletteTexture;
  colours.image = encodePalette(palette);
  colours.width = palette.length;
  colours.height = 1;
  colours.needsUpdate = true;

  const normalized = Dimensions3D.normalize(dimensions);
  material.dimensions = [normalized.width, normalized.height, normalized.depth];
  material.voxelCount = [dimensions.width, dimensions.height, dimensions.depth];
}

/**
 * Puts `object` where `framing` draws the figure standing inside it: the focus
 * brought to the origin, and a voxel drawn at the size the framing gives it.
 *
 * Parts are placed in voxels from the figure's origin, so this is the whole of
 * what turns those into the size and the place the figure is seen at.
 */
export function applyFraming(object: Object3D, framing: FigureFraming): void {
  const { focus, voxelSize } = framing;
  object.scale.set(voxelSize, voxelSize, voxelSize);
  object.position.set(
    -focus.x * voxelSize,
    -focus.y * voxelSize,
    -focus.z * voxelSize,
  );
}

/**
 * Stands `object` where `placement` puts it: at the middle of the part's box,
 * turned as the part is turned, and scaled to the voxels the figure is drawn
 * in.
 *
 * The turn arrives as the three axes it turns to, which is what the maths this
 * package is written in carries a turn as; what draws it wants a quaternion, so
 * it is read off those axes here.
 */
export function standAs(object: Object3D, placement: PartPlacement): void {
  const { position, turn, scale } = placement;

  object.position.set(position.x, position.y, position.z);
  object.scale.set(scale, scale, scale);
  object.quaternion.setFromRotationMatrix(
    TURN.set(
      turn[0],
      turn[3],
      turn[6],
      0,
      turn[1],
      turn[4],
      turn[7],
      0,
      turn[2],
      turn[5],
      turn[8],
      0,
      0,
      0,
      0,
      1,
    ),
  );
}

/** Reused between the parts, a turn being read off it and not kept. */
const TURN = new Matrix4();

/** The box a part's volume is marched inside, at the size `boxSize` gives it. */
function partGeometry(dimensions: Dimensions3D): BoxGeometry {
  const size = boxSize(dimensions);
  return new BoxGeometry(size.width, size.height, size.depth);
}

/** The mesh drawing one part, and the material it is drawn with. */
interface PartMesh {
  name: string;
  mesh: Mesh;
  material: VoxelModelMaterial;
  /**
   * The box the mesh's geometry was last built for, or undefined before it has
   * been built at all. A part keeps its geometry until it is re-framed, which is
   * what stops a fresh box being built for every part on every frame.
   */
  builtFor: Dimensions3D | undefined;
}

/**
 * The meshes a figure is drawn as: one box per part, in a group that turns as a
 * whole so the parts keep their places against each other however it is turned.
 *
 * Whoever holds one puts `group` into a scene, moves and turns that group
 * however they like, calls `sync` whenever the figure changes, and lights the
 * parts through `materials`.
 */
export class FigureMeshes {
  readonly group = new Group();
  private entries: PartMesh[] = [];

  /** The materials the parts are drawn with, for a caller deciding how they look. */
  get materials(): readonly VoxelModelMaterial[] {
    return this.entries.map((entry) => entry.material);
  }

  /** The mesh drawing the part called `name`, if the figure still holds it. */
  meshFor(name: string): Mesh | undefined {
    return this.entries.find((entry) => entry.name === name)?.mesh;
  }

  /**
   * Brings the meshes in step with the figure: a mesh for each part, sized and
   * placed in voxels so a voxel is the same size in all of them, carrying that
   * part's volume and the palette they all share.
   *
   * @param solved Each part's volume, in the order `figure.parts` holds them.
   * @param placement Where the parts stand, for a caller that has already
   * measured the figure and would rather not have it measured again. Left out,
   * it is measured here.
   */
  sync(
    figure: Figure,
    solved: SolvedPart[],
    placement: FigurePlacement = figurePlacement(figure),
  ): void {
    const { placements } = placement;

    while (this.entries.length > figure.parts.length) {
      this.group.remove(this.entries.pop()!.mesh);
    }

    figure.parts.forEach((part, index) => {
      const { dimensions, voxels } = solved[index];
      let entry = this.entries[index];

      if (entry === undefined) {
        const material = new VoxelModelMaterial();
        const mesh = new Mesh(undefined, material);
        this.group.add(mesh);
        entry = { name: part.name, mesh, material, builtFor: undefined };
        this.entries[index] = entry;
      }

      entry.name = part.name;

      if (
        entry.builtFor === undefined ||
        !Dimensions3D.equals(entry.builtFor, dimensions)
      ) {
        entry.mesh.geometry = partGeometry(dimensions);
        entry.builtFor = dimensions;
      }

      const partPlacement = placements[index];
      standAs(entry.mesh, partPlacement);

      bakeVolume(entry.material, dimensions, voxels, figure.palette);
    });
  }
}

/** One part of a baked figure: the box drawing it, and where that box stands. */
export interface BakedPart {
  name: string;
  dimensions: Dimensions3D;
  voxels: Uint8Array;
  /** The box the part's volume is marched inside, shared by every copy. */
  geometry: BoxGeometry;
  placement: PartPlacement;
}

/**
 * A figure baked for drawing many times over: every part solved into a volume
 * and given a box, once, however many copies of the figure are drawn.
 *
 * `FigureMeshes` draws one figure and keeps it in step with each edit, which is
 * what an editor wants. A world draws the same figure once per monster, and
 * monsters come and go as a player walks: solving the volumes, building the
 * boxes and uploading the textures again for each of them would be that work
 * repeated per monster, at the moment one walks into view. Baking does it once,
 * and `copy` hands back a group of meshes wearing what is already made.
 */
export class BakedFigure {
  readonly parts: readonly BakedPart[];
  /** The box every part together fills, in voxels from the figure's origin. */
  readonly bounds: FigureBounds;
  /**
   * The box the whole figure is drawn inside, in voxels, which is what whoever
   * draws it measures against to scale it to the size they want it at.
   */
  readonly size: Dimensions3D;
  private readonly palette: RGBA[];

  constructor(figure: Figure) {
    const { bounds, size, placements } = figurePlacement(figure);

    this.bounds = bounds;
    this.size = size;
    this.palette = figure.palette;
    this.parts = figure.parts.map((part, index) => {
      const { name, dimensions, voxels } = solvePart(part);
      return {
        name,
        dimensions,
        voxels,
        geometry: partGeometry(dimensions),
        placement: placements[index],
      };
    });
  }

  /**
   * One material per part, each carrying that part's volume and the palette the
   * whole figure is drawn in.
   *
   * A caller wanting the same figure drawn two ways — plainly, and flashed red
   * where a monster was hit — takes a set for each and says on the materials
   * how the two differ. Every copy wearing a set shares its textures, so the
   * volumes are uploaded once per way the figure is drawn rather than once per
   * copy of it.
   */
  createMaterials(): VoxelModelMaterial[] {
    return this.parts.map((part) => {
      const material = new VoxelModelMaterial();
      bakeVolume(material, part.dimensions, part.voxels, this.palette);
      return material;
    });
  }

  /** A fresh group of meshes drawing the figure, wearing `materials`. */
  copy(materials: readonly VoxelModelMaterial[]): FigureCopy {
    return new FigureCopy(this.parts, materials);
  }
}

/**
 * The meshes drawing one copy of a baked figure: a mesh per part in a group
 * that whoever holds it moves and turns as a whole, so the parts keep their
 * places against each other wherever the copy is put.
 *
 * Made by `BakedFigure.copy`, which is what gives it the boxes to draw.
 */
export class FigureCopy {
  readonly group = new Group();
  private readonly meshes: Mesh[];

  constructor(
    parts: readonly BakedPart[],
    materials: readonly VoxelModelMaterial[],
  ) {
    this.meshes = parts.map((part, index) => {
      const mesh = new Mesh(part.geometry, materials[index]);
      standAs(mesh, part.placement);
      this.group.add(mesh);
      return mesh;
    });
  }

  /** Draws every part with the material standing beside it in `materials`. */
  wear(materials: readonly VoxelModelMaterial[]): void {
    this.meshes.forEach((mesh, index) => {
      mesh.material = materials[index];
    });
  }
}
