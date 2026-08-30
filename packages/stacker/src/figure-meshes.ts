// Drawing a figure: solving each part into a volume, handing a volume to a
// material, and the group of boxes a whole figure is drawn as.
//
// Nothing here decides how a figure looks. Light, flat colour, the red of a hit
// and the depth bias under an outline are the caller's, because the same figure
// is drawn under studio light in the editor and under a moving sun in the world.
// A caller reaches the materials to say so.
import { Dimensions3D, type RGBA } from "@big-mesh-studios/maths";
import { BoxGeometry, Group, Mesh } from "@random-mesh/rmsl/scene";
import { boxSize, figurePlacement, type PartPlacement } from "./box";
import { partDimensions, type Figure, type Part } from "./data";
import { encodePalette, solveVoxels } from "./solver";
import { VoxelModelMaterial } from "./material";

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
    voxels: solveVoxels(dimensions, part.sides),
  };
}

/** Every part of `figure`, in the order it holds them. */
export function solveFigure(figure: Figure): SolvedPart[] {
  return figure.parts.map(solvePart);
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
   * placed so a voxel is the same size in all of them, carrying that part's
   * volume and the palette they all share.
   *
   * @param solved Each part's volume, in the order `figure.parts` holds them.
   */
  sync(figure: Figure, solved: SolvedPart[]): void {
    const { placements } = figurePlacement(figure);

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

      const placement = placements[index];
      entry.mesh.position.set(
        placement.position.x,
        placement.position.y,
        placement.position.z,
      );
      entry.mesh.scale.set(placement.scale, placement.scale, placement.scale);

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
  /** The box every part together fills, in voxels. */
  readonly extent: Dimensions3D;
  /**
   * The box the whole figure is drawn inside, before whoever draws it scales it
   * to the size they want it at.
   */
  readonly size: Dimensions3D;
  private readonly palette: RGBA[];

  constructor(figure: Figure) {
    const { extent, size, placements } = figurePlacement(figure);

    this.extent = extent;
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
      const { position, scale } = part.placement;
      const mesh = new Mesh(part.geometry, materials[index]);
      mesh.position.set(position.x, position.y, position.z);
      mesh.scale.set(scale, scale, scale);
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
