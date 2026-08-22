// Web worker that builds a block's surface triangle mesh off the main thread.
// The main thread sends the block's voxel data plus its neighbours' boundary
// shells (see `BlockShells`) and gets back both the terrain and water meshes as
// transferable typed arrays, so no geometry work ever stalls the UI.
import type { MeshArrays, MeshBuildRequest, MeshBuildResult } from "./mesh";
import { buildBlockMesh, buildWaterMesh, makeShellResolver } from "./mesh";
import { VoxelStore } from "../world/voxel-store";

// The DOM lib types `self` as `Window`, whose `postMessage` needs a target
// origin; in a dedicated worker the global is a `DedicatedWorkerGlobalScope`.
const workerSelf = self as unknown as {
  onmessage: ((ev: MessageEvent<MeshBuildRequest>) => void) | null;
  postMessage: (message: MeshBuildResult, transfer: Transferable[]) => void;
};

workerSelf.onmessage = (ev: MessageEvent<MeshBuildRequest>) => {
  const { id, voxels, scale, data, shells, tileRects } = ev.data;
  const store = new VoxelStore({
    dims: [voxels[0] * scale, voxels[1] * scale, voxels[2] * scale],
    voxels,
    scale,
  });
  // adopt the transferred buffer instead of copying it again
  store.data = data;
  const resolver = makeShellResolver(store, shells);
  const toTyped = (m: MeshArrays): MeshArrays => ({
    positions:
      m.positions instanceof Float32Array
        ? m.positions
        : new Float32Array(m.positions),
    normals:
      m.normals instanceof Float32Array
        ? m.normals
        : new Float32Array(m.normals),
    uvs: m.uvs instanceof Float32Array ? m.uvs : new Float32Array(m.uvs),
    indices:
      m.indices instanceof Uint32Array ? m.indices : new Uint32Array(m.indices),
  });
  const result: MeshBuildResult = {
    id,
    terrain: toTyped(buildBlockMesh(store, resolver, tileRects)),
    water: toTyped(buildWaterMesh(store, resolver)),
  };
  const transfer: Transferable[] = [];
  for (const mesh of [result.terrain, result.water]) {
    const { positions, normals, uvs, indices } = mesh as {
      positions: Float32Array;
      normals: Float32Array;
      uvs: Float32Array;
      indices: Uint32Array;
    };
    transfer.push(positions.buffer, normals.buffer, uvs.buffer, indices.buffer);
  }
  workerSelf.postMessage(result, transfer);
};
