// Drawing a figure as geometry: meshing each part's volume into chunks, giving
// each chunk a mesh, and standing those meshes where the figure has its parts.
//
// Nothing here decides how a figure looks. Light and flat colour are the
// caller's, because the same figure is drawn under studio light in the editor and
// under a moving sun in the world. A caller reaches the materials to say so,
// exactly as it reaches the materials of a marched figure.
//
// A figure of several parts keeps its shape however the figure is turned, so each
// part's chunks live under a group of their own and the caller's group turns them
// all together.
import { Dimensions3D, type RGBA } from "@big-mesh-studios/maths";
import {
  BufferAttribute,
  BufferGeometry,
  Group,
  Mesh,
  Object3D,
} from "@random-mesh/rmsl/scene";
import type { FigurePlacement } from "./box";
import { partDimensions, type Figure } from "./data";
import { standAs } from "./figure-meshes";
import type { SolvedPart } from "./figure-meshes";
import { VoxelMeshMaterial } from "./material-mesh";
import {
  allChunks,
  chunkAt,
  chunkCounts,
  chunkExtent,
  chunkOrigin,
  createMeshBuilder,
  dirtyChunks,
  meshChunkFaces,
  type CellBounds,
  type ChunkIndex,
  type MeshBuilder,
} from "./mesh";
import { encodePalette, packedFaces } from "./solver";

/**
 * How long one call to `drain` spends before it leaves the rest of the work for
 * another time.
 */
export const DRAIN_BUDGET_MS = 4;

/** One part's chunks: a mesh for each, and the grid they were cut for. */
interface PartChunks {
  /** Stands where the figure has the part, which is a placement's own doing. */
  placed: Group;
  /**
   * Carries the chunk vertices' own scale and offset, inside the placement.
   *
   * The two are separate groups because a placement sets a group's scale to the
   * size a part is drawn at, which is not the same thing as the scale that turns
   * cells into that box: one is a distance in voxels and the other a fraction of
   * the box's own longest axis.
   */
  voxels: Group;
  meshes: Map<number, Mesh>;
  /** The chunks whose geometry is out of date, and which still have to be built. */
  stale: Set<number>;
  /** How many chunks along each axis the part's box is cut into. */
  counts: ChunkIndex;
  /** The box the chunking was cut for, and what a resize changes it to. */
  built: Dimensions3D | undefined;
}

/**
 * The meshes a figure is drawn as: one mesh per thirty-two cells of a part, each
 * part's gathered under a group of its own.
 *
 * Whoever holds one puts `group` into a scene, calls `place` whenever the figure
 * changes, and calls `drain` once a frame to bring the triangles in step with it.
 *
 * `place` and `drain` are separate because a part being turned moves where its
 * chunks stand without changing what is in them, and re-meshing a whole figure to
 * follow a pose would be a cost the marcher did not have.
 */
export class MeshFigureMeshes {
  readonly group = new Group();
  private readonly chunks = new Map<string, PartChunks>();
  private readonly builder: MeshBuilder = createMeshBuilder();
  private readonly material = new VoxelMeshMaterial();

  /** The material every part is drawn with, for a caller deciding how it looks. */
  get drawingMaterial(): VoxelMeshMaterial {
    return this.material;
  }

  /**
   * Stands each part's chunks where `placement` puts them, and gathers a group
   * for each part the figure now has.
   *
   * A part whose box has changed size is given a fresh grid of chunks, all of
   * them marked stale, because a key cut for the old grid names a different piece
   * of the new one. Nothing is meshed here: the volumes a chunk is built from are
   * handed to `drain` when the triangles are wanted, so a part that has been
   * turned costs a group to be stood in place and nothing more.
   */
  place(figure: Figure, placement: FigurePlacement): void {
    for (const name of [...this.chunks.keys()]) {
      if (!figure.parts.some((part) => part.name === name)) {
        this.forget(name);
      }
    }

    figure.parts.forEach((part, index) => {
      const on = this.entryFor(part.name);
      const dimensions = partDimensions(part);
      const counts = chunkCounts(dimensions);

      if (!this.sameGrid(on, dimensions, counts)) {
        this.emptyChunks(on);
        on.counts = counts;
        on.built = dimensions;
        for (const key of allChunks(dimensions)) {
          on.stale.add(key);
        }
      }

      // The chunk's vertices are in cells from the box's low corner, and a part
      // is drawn in a space where its own longest axis is one and the box's middle
      // is at the origin. Scaling and shifting by that puts cell zero's near face
      // where the marched box put it, which is the place the picker and the
      // outline already measure from.
      const normalized = Dimensions3D.normalize(dimensions);
      on.voxels.scale.set(
        normalized.width / dimensions.width,
        normalized.height / dimensions.height,
        normalized.depth / dimensions.depth,
      );
      on.voxels.position.set(
        -normalized.width / 2,
        -normalized.height / 2,
        -normalized.depth / 2,
      );

      standAs(on.placed, placement.placements[index]);
    });
  }

  /**
   * Puts a palette into the texture every part is drawn with, which is how
   * changing a colour re-uploads thirty-two texels rather than re-meshing the
   * figure: what a vertex carries is which colour it shows, not the colour.
   */
  bakePalette(palette: readonly RGBA[]): void {
    const texture = this.material.paletteTexture;
    texture.image = encodePalette(palette);
    texture.width = palette.length;
    texture.height = 1;
    texture.needsUpdate = true;
  }

  /**
   * The group the part called `name` is drawn in, in the part's own voxel space
   * — a caller tracing something round a cell of that part parents to this, and
   * not to the group the part is placed by, which is a placement's own.
   */
  groupFor(name: string): Object3D | undefined {
    return this.chunks.get(name)?.voxels;
  }

  /**
   * Marks the chunks of one part whose geometry a change covering `bounds` may
   * have altered.
   *
   * @param dimensions The part's own box, which is what the bounds are read
   * against.
   */
  dirty(name: string, bounds: CellBounds, dimensions: Dimensions3D): void {
    const on = this.chunks.get(name);

    if (on === undefined) {
      return;
    }

    for (const key of dirtyChunks(bounds, dimensions)) {
      on.stale.add(key);
    }
  }

  /** Marks every chunk of one part, which is what a resize or a load leaves. */
  dirtyAll(name: string): void {
    const on = this.chunks.get(name);

    if (on === undefined || on.built === undefined) {
      return;
    }

    for (const key of allChunks(on.built)) {
      on.stale.add(key);
    }
  }

  /** Marks every chunk of every part the figure has. */
  dirtyEverything(): void {
    for (const on of this.chunks.values()) {
      this.dirtyAllFrom(on);
    }
  }

  /**
   * Builds as many stale chunks as fit in `budgetMs`, in a fixed order so that a
   * figure fills in the same way every time it is rebuilt.
   *
   * A count of chunks rather than a length of time would be wrong across the
   * range of model sizes this draws: eight chunks of a part a few cells across is
   * a moment's work, and eight of a part two hundred across is most of a frame.
   * Meshing until a deadline has passed costs about the same either way.
   *
   * @param solved Each part's volume, in the order `figure.parts` holds them.
   * @returns Whether any chunk was built, which is false once there is nothing
   * left to do.
   */
  drain(solved: readonly SolvedPart[], budgetMs = DRAIN_BUDGET_MS): boolean {
    return this.build(solved, budgetMs);
  }

  /**
   * Builds every stale chunk and waits for it, for a caller that has to draw the
   * whole figure at once — the picture a published model carries, say.
   *
   * @param solved Each part's volume, in the order `figure.parts` holds them.
   */
  buildAll(solved: readonly SolvedPart[]): void {
    this.build(solved, Infinity);
  }

  /** How many chunks are still out of date, across every part. */
  pending(): number {
    let count = 0;
    for (const on of this.chunks.values()) {
      count += on.stale.size;
    }
    return count;
  }

  /** Whether any part of the figure has any chunk worth drawing. */
  get isEmpty(): boolean {
    for (const on of this.chunks.values()) {
      for (const mesh of on.meshes.values()) {
        if (mesh.visible) {
          return false;
        }
      }
    }
    return true;
  }

  private build(solved: readonly SolvedPart[], budgetMs: number): boolean {
    const byName = new Map(solved.map((part) => [part.name, part]));
    const until = performance.now() + budgetMs;
    let built = false;

    for (const [name, on] of this.chunks) {
      const part = byName.get(name);

      if (part === undefined) {
        continue;
      }

      for (const key of [...on.stale].sort((one, other) => one - other)) {
        this.buildChunk(on, part, key, on.counts);
        on.stale.delete(key);
        built = true;

        if (performance.now() >= until) {
          return true;
        }
      }
    }

    return built;
  }

  /**
   * Builds one chunk's triangles and puts them on the mesh drawn for that chunk.
   *
   * The geometry is replaced rather than rewritten, because a chunk's vertex count
   * changes with every stroke and a buffer sized for the last one has to be given
   * up. A chunk with nothing left in it meshes to no triangles at all, and is
   * left undrawn rather than drawn from an empty buffer: a part that has been
   * painted away should not hold a draw call.
   */
  private buildChunk(
    on: PartChunks,
    part: SolvedPart,
    key: number,
    counts: ChunkIndex,
  ): void {
    const at = chunkAt(key, counts);
    const meshed = meshChunkFaces(
      part.dimensions,
      packedFaces(part.dimensions, part.voxels),
      chunkOrigin(at),
      chunkExtent(part.dimensions, at),
      this.builder,
    );

    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(meshed.positions, 3));
    // The packed lanes are bytes scaled into 0..1, which is the form the material
    // multiplies back up out of before it reads a face or a colour out of one.
    geometry.setAttribute(
      "packed",
      new BufferAttribute(meshed.packed, 4, true),
    );
    geometry.setIndex(new BufferAttribute(meshed.indices, 1));

    const mesh = this.meshFor(on, key);
    mesh.geometry = geometry;
    mesh.visible = meshed.indices.length > 0;
  }

  private meshFor(on: PartChunks, key: number): Mesh {
    let mesh = on.meshes.get(key);

    if (mesh === undefined) {
      mesh = new Mesh(undefined, this.material);
      on.meshes.set(key, mesh);
      on.voxels.add(mesh);
    }

    return mesh;
  }

  private entryFor(name: string): PartChunks {
    let on = this.chunks.get(name);

    if (on === undefined) {
      const placed = new Group();
      const voxels = new Group();
      placed.add(voxels);

      on = {
        placed,
        voxels,
        meshes: new Map(),
        stale: new Set(),
        counts: chunkCounts({ width: 0, height: 0, depth: 0 }),
        built: undefined,
      };
      this.group.add(placed);
      this.chunks.set(name, on);
    }

    return on;
  }

  /** Whether a part's chunks are cut for the grid they are already holding. */
  private sameGrid(
    on: PartChunks,
    dimensions: Dimensions3D,
    counts: ChunkIndex,
  ): boolean {
    return (
      on.built !== undefined &&
      Dimensions3D.equals(on.built, dimensions) &&
      on.counts.x === counts.x &&
      on.counts.y === counts.y &&
      on.counts.z === counts.z
    );
  }

  private dirtyAllFrom(on: PartChunks): void {
    if (on.built === undefined) {
      return;
    }
    for (const key of allChunks(on.built)) {
      on.stale.add(key);
    }
  }

  /** Gives back the room a part's chunks were holding, and takes the part away. */
  private emptyChunks(on: PartChunks): void {
    for (const mesh of on.meshes.values()) {
      mesh.geometry.dispose();
      on.voxels.remove(mesh);
    }
    on.meshes.clear();
    on.stale.clear();
  }

  private forget(name: string): void {
    const on = this.chunks.get(name);

    if (on === undefined) {
      return;
    }
    this.emptyChunks(on);
    this.group.remove(on.placed);
    this.chunks.delete(name);
  }
}
