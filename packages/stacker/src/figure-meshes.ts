// Drawing a figure: solving each part into a volume, handing a volume to a
// material, and the group of boxes a whole figure is drawn as.
//
// Nothing here decides how a figure looks. Light, flat colour, the red of a hit
// and the depth bias under an outline are the caller's, because the same figure
// is drawn under studio light in the editor and under a moving sun in the world.
// A caller reaches the materials to say so.
import { Dimensions3D, type RGBA } from "@big-mesh-studios/maths";
import { BoxGeometry, Group, Mesh } from "@random-mesh/rmsl/scene";
import { boxSize, figurePlacement } from "./box";
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
        const size = boxSize(dimensions);
        entry.mesh.geometry = new BoxGeometry(
          size.width,
          size.height,
          size.depth,
        );
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
