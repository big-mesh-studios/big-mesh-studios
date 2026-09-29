// The model's geometry in the scene: one mesh per chunk, all drawn with one
// material, rebuilt as the chunks are marked dirty.
//
// A model is drawn as triangles rather than marched, so the cost of it is paid
// when the model changes instead of once a frame for every pixel covering it.
// What is spent here is bookkeeping rather than the sweep itself: which chunks
// exist, which of them are waiting to be rebuilt, and how much of that is done
// before the next frame is drawn.
//
// The chunks are drained a few at a time rather than all at once. A load marks
// every chunk of a model dirty, and meshing a large one in a single go would
// hold up the first frame that shows it; draining a few per frame lets the model
// appear at once and fill in, and costs a stroke nothing, since a stroke dirties
// one or two chunks in the first place.
import { Dimensions3D } from "@big-mesh-studios/maths";
import {
  chunkAt,
  chunkCounts,
  chunkExtent,
  chunkOrigin,
  createMeshBuilder,
  meshChunk,
} from "@big-mesh-studios/stacker/mesh";
import type { Volume } from "@big-mesh-studios/stacker/volume";
import {
  BufferAttribute,
  BufferGeometry,
  Group,
  Mesh,
} from "@random-mesh/rmsl/scene";
import type { VoxelMeshMaterial } from "./voxel-mesh-material";

/** How many chunks are re-meshed before the next frame is drawn. */
const CHUNKS_PER_FRAME = 8;

export class ModelMeshes {
  /** The chunk meshes, seated in the model's own space, under this group. */
  readonly group = new Group();

  private readonly meshes = new Map<number, Mesh>();
  private readonly builder = createMeshBuilder();

  constructor(private readonly material: VoxelMeshMaterial) {}

  /**
   * Puts the group's own transform in place: the vertices are counted in cells
   * from the box's low corner, and this is what makes them cells of the
   * normalized box the rest of the preview is built in — one unit across on its
   * longest axis, centred on the origin, with cell 0 anchored at minus half of
   * it. The chunk meshes then sit at the origin with no place of their own.
   */
  place(dimensions: Dimensions3D): void {
    const normalized = Dimensions3D.normalize(dimensions);
    this.group.scale.set(
      normalized.width / dimensions.width,
      normalized.height / dimensions.height,
      normalized.depth / dimensions.depth,
    );
    this.group.position.set(
      -normalized.width / 2,
      -normalized.height / 2,
      -normalized.depth / 2,
    );
  }

  /**
   * Drops every chunk's geometry, for a model that has been replaced outright.
   * The meshes themselves are kept and re-used, because a new model of the same
   * size has the same chunks in it.
   */
  release(): void {
    for (const mesh of this.meshes.values()) {
      mesh.geometry.dispose();
      mesh.geometry = new BufferGeometry();
      mesh.visible = false;
    }
  }

  /**
   * Re-meshes up to `budget` of the chunks named by `dirty`, and reports which
   * of them it built. A chunk that meshes to nothing — a stroke that erased the
   * last of its voxels — is left with no geometry and hidden, rather than drawn
   * as an empty buffer.
   */
  drain(
    dirty: Set<number>,
    volume: Volume,
    budget = CHUNKS_PER_FRAME,
  ): { built: Set<number> } {
    const built = new Set<number>();
    for (const key of dirty) {
      if (built.size >= budget) {
        break;
      }
      built.add(key);
      this.rebuild(key, volume);
    }
    return { built };
  }

  /** Re-meshes one chunk, and the mesh that draws it. */
  private rebuild(key: number, volume: Volume): void {
    const counts = chunkCounts(volume.dimensions);
    const at = chunkAt(key, counts);
    const mesh = meshChunk(
      volume.dimensions,
      volume.voxels,
      chunkOrigin(at),
      chunkExtent(volume.dimensions, at),
      this.builder,
    );

    if (mesh.indices.length === 0) {
      const empty = this.meshes.get(key);
      if (empty !== undefined) {
        empty.geometry.dispose();
        empty.geometry = new BufferGeometry();
        empty.visible = false;
      }
      return;
    }

    // The geometry is replaced rather than rewritten in place: a chunk's vertex
    // count changes with almost every stroke, and an attribute that is shorter
    // than the one before it cannot be uploaded over the top of the old one.
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(mesh.positions, 3));
    geometry.setAttribute("packed", new BufferAttribute(mesh.packed, 4, true));
    geometry.setIndex(new BufferAttribute(mesh.indices, 1));

    const existing = this.meshes.get(key);
    if (existing !== undefined) {
      existing.geometry.dispose();
      existing.geometry = geometry;
      existing.visible = true;
      return;
    }

    // The vertices are in cells, and the group's own transform puts them in the
    // normalized box, so a mesh needs no place of its own.
    const created = new Mesh(geometry, this.material);
    this.meshes.set(key, created);
    this.group.add(created);
  }

  /** Whether any chunk is drawn, which is what a model with nothing in it is not. */
  get isEmpty(): boolean {
    for (const mesh of this.meshes.values()) {
      if (mesh.visible) {
        return false;
      }
    }
    return true;
  }
}
