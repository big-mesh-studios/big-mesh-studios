import { Component, createEffect, createStore } from "solid-js";
import {
  AmbientLight,
  BoxGeometry,
  BufferGeometry,
  Color,
  DirectionalLight,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  Side,
  WebGLRenderer,
} from "@random-mesh/rmsl/scene";
import {
  LevelWorldMaterial,
  LevelWaterMaterial,
  BLOCK_WORLD,
  applyLevelData,
  buildBlock,
  resetLevel,
  syncLevelFromStore,
  getWorldHeight,
  type Dim3,
  type WorldBlock,
} from "./level";
import { fillStore, type VoxelStore } from "./voxel-store";
import {
  type FillBatchRequest,
  type FillBatchResult,
  type FillConfig,
} from "./fill-worker";
import { DEFAULT_TERRAIN, type TerrainConfig } from "./noise";
import {
  buildVoxelTileConfig,
  loadTileTexture,
  parseTileAtlasXml,
  type VoxelTileConfig,
} from "./atlas";
import {
  buildBlockMesh,
  buildWaterMesh,
  extractBlockShells,
  makeBlockResolver,
  setGeometryData,
  type MeshArrays,
  type MeshBuildRequest,
  type MeshBuildResult,
} from "./mesh";
import {
  LevelTriangleMaterial,
  LevelTriangleWaterMaterial,
} from "./mesh-material";
import { GpuTimer, sampleFetchCount } from "./perf";
import { AdaptiveResolution } from "./adaptive";
import { installKeyboardControls, addLookDelta, consumeInput } from "./input";
import { createPlayer, updatePlayer, placeCamera, PLAYER_CFG } from "./player";
import { dayNightState, phaseAt, VISIBLE_ELEVATION } from "./day-night";
import Controls from "./Controls";
import { Console } from "./Console";

const App: Component<{}> = () => {
  // append `#perf` to the URL to enable the debug HUD (GPU timer + fetches/ray)
  const debugPerf =
    typeof window !== "undefined" && window.location.hash.includes("perf");
  const BLOCKS = 5;
  // Ring half-extent: farthest the ring's outer edge can be from the player.
  const RING_RADIUS = (BLOCKS / 2) * BLOCK_WORLD[0];
  // "Completely seamless" fog: the ring edge can be as close as (BLOCKS/2 - 0.5)
  // blocks (384) when the player hugs the far edge of their center block, so
  // fog must be fully opaque by then and rays stop marching there.
  const FOG_DISTANCE = (BLOCKS / 2 - 0.5) * BLOCK_WORLD[0];
  const FOG_START = 0.4 * FOG_DISTANCE;
  // Sky blue; matches the material's default fogColor so the horizon blends.
  const SKY_BLUE = 0x87ceeb;
  // Day-night: the sun/moon squares orbit the camera at this distance (inside
  // the camera far plane) so the raymarched terrain occludes them at the
  // horizon, and hide once they dip a few degrees below it.
  const SKY_DISTANCE = 600;
  const SUN_SIZE = 48;
  const MOON_SIZE = 32;
  const SPAWN: Dim3 = [0, 0, 0];
  // Roughly the previous walkable extent; with the infinite ring the player is
  // effectively unbounded, but clamp to guard against float drift far out.
  const SAFE_EXTENT = 1e6;
  // Terrain noise + GPU chunk derivation settings shared by every block in the
  // ring. `surfaceOnly` writes only surface voxels into the GPU chunks; flip it
  // to `false` to upload the full solid volume (see `syncLevelFromStore`).
  const TERRAIN: TerrainConfig = DEFAULT_TERRAIN;
  const SURFACE_ONLY = true;
  // Each mesh is one padded box so adjacent meshes share a thin overlap shell.
  const PAD = 2.0;
  // Water absorption used by the raymarch water pass; the triangle renderer's
  // underwater tint uses the same value.
  const WATER_EXTINCTION = 0.12;
  let [state, setState] = createStore<{
    canvas: HTMLCanvasElement | undefined;
    renderer: WebGLRenderer | undefined;
  }>({
    canvas: undefined,
    renderer: undefined,
  });
  const scene = new Scene();
  // Lights for the standard materials (the player cube). Position/direction,
  // colour and intensity are re-derived from the day-night clock each frame
  // (`applyDayNight`), since the raymarched terrain lights itself in-shader.
  const sun = new DirectionalLight();
  sun.position.set(2, 1, 1);
  scene.add(sun);
  const ambient = new AmbientLight(0xffffff, 0.6);
  scene.add(ambient);
  // Square sun/moon billboards, drawn before the terrain so the raymarcher
  // overdraws them wherever solid ground lies (occluding the horizon).
  const sunMaterial = new MeshBasicMaterial({ color: 0xfff2a0 });
  sunMaterial.depthWrite = false;
  const sunMesh = new Mesh(new PlaneGeometry(SUN_SIZE, SUN_SIZE), sunMaterial);
  scene.add(sunMesh);
  const moonMaterial = new MeshBasicMaterial({ color: 0xcfd6e6 });
  moonMaterial.depthWrite = false;
  const moonMesh = new Mesh(
    new PlaneGeometry(MOON_SIZE, MOON_SIZE),
    moonMaterial,
  );
  scene.add(moonMesh);
  // The infinite-scroll ring: a BLOCKS x BLOCKS window of 192x256x192 blocks,
  // each rendered by its own raymarching mesh. The window stays centred on the
  // player's block; when the player crosses a block boundary the trailing block
  // teleports to the leading edge and refills its voxel data at the new
  // absolute world coords (see `stepRing`).
  const blocks: WorldBlock[] = [];
  const meshes: Mesh[] = [];
  const materials: LevelWorldMaterial[] = [];
  // Water is rendered by a second transparent mesh per block, blending over the
  // opaque scene (terrain + player) after it. Same block voxels, water-only march.
  const waterMeshes: Mesh[] = [];
  const waterMaterials: LevelWaterMaterial[] = [];
  // Per-slot integer grid coordinate of the world block currently displayed.
  const worldGrid: { x: number; z: number }[] = [];
  {
    const geometry = new BoxGeometry(
      BLOCK_WORLD[0] + PAD,
      BLOCK_WORLD[1] + PAD,
      BLOCK_WORLD[2] + PAD,
    );
    for (let i = 0; i < BLOCKS; i++) {
      for (let j = 0; j < BLOCKS; j++) {
        const grid = {
          x: i - (BLOCKS - 1) / 2,
          z: j - (BLOCKS - 1) / 2,
        };
        const center: Dim3 = [
          grid.x * BLOCK_WORLD[0],
          0,
          grid.z * BLOCK_WORLD[2],
        ];
        const block: WorldBlock = buildBlock({
          center,
          terrain: TERRAIN,
          surfaceOnly: SURFACE_ONLY,
        });
        const material = new LevelWorldMaterial();
        material.transparent = true;
        material.depthWrite = true;
        material.debugFetchCount = debugPerf;
        material.side = Side.DoubleSide;
        material.maxDistance = FOG_DISTANCE;
        material.fogStart = FOG_START;
        material.setBlocks([block]);
        const mesh = new Mesh(geometry, material);
        mesh.position.set(center[0], center[1], center[2]);
        scene.add(mesh);
        blocks.push(block);
        meshes.push(mesh);
        materials.push(material);
        worldGrid.push(grid);

        // translucent water pass: blends over the opaque scene, never writes
        // depth, and depth-tests so mountains/player in front hide it. The mesh
        // is added to the scene *after* the player cube (see below) because the
        // renderer draws meshes in scene-graph order.
        const waterMaterial = new LevelWaterMaterial();
        waterMaterial.transparent = true;
        waterMaterial.depthWrite = false;
        waterMaterial.side = Side.DoubleSide;
        waterMaterial.maxDistance = FOG_DISTANCE;
        waterMaterial.fogColor = [0.53, 0.81, 0.92];
        waterMaterial.waterColor = [0.1, 0.35, 0.55];
        waterMaterial.waterOpacity = 0.5;
        waterMaterial.waterExtinction = 0.12;
        waterMaterial.seaLevel = TERRAIN.seaLevel ?? 0;
        waterMaterial.setBlocks([block]);
        const waterMesh = new Mesh(geometry, waterMaterial);
        waterMesh.position.set(center[0], center[1], center[2]);
        waterMeshes.push(waterMesh);
        waterMaterials.push(waterMaterial);
      }
    }
  }
  // --- triangle (surface-mesh) renderer ------------------------------------
  // A parallel set of meshes that rasterize each block's surface voxels as
  // triangles instead of raymarching them. `/renderer tri` hides the raymarch
  // meshes above and shows these; both stay in the scene so the toggle is
  // instant and the hidden set costs nothing (the renderer skips invisible
  // objects). The voxel tiles load async, so meshes are rebuilt once the atlas
  // arrives (see the atlas block below).
  const triMaterial = new LevelTriangleMaterial();
  const triWaterMaterial = new LevelTriangleWaterMaterial();
  const triMeshes: Mesh[] = [];
  const triWaterMeshes: Mesh[] = [];
  for (let i = 0; i < BLOCKS * BLOCKS; i++) {
    const center = blocks[i].center;
    const triMesh = new Mesh(new BufferGeometry(), triMaterial);
    triMesh.position.set(center[0], center[1], center[2]);
    triMesh.visible = false;
    scene.add(triMesh);
    triMeshes.push(triMesh);
    const triWaterMesh = new Mesh(new BufferGeometry(), triWaterMaterial);
    triWaterMesh.position.set(center[0], center[1], center[2]);
    triWaterMesh.visible = false;
    // added to the scene after the player cube, below, so the transparent
    // water blends over it like the raymarch water pass does
    triWaterMeshes.push(triWaterMesh);
  }
  let rendererMode: "ray" | "tri" = "ray";
  let totalTriangles = 0;
  // Per-voxel-id face tile rects, populated once the atlas loads; the mesh UVs
  // are baked from these, so changing them requires a mesh rebuild.
  const tilesById = new Map<number, VoxelTileConfig>();
  const lookupBlock = (gx: number, gz: number): VoxelStore | undefined => {
    for (let i = 0; i < worldGrid.length; i++) {
      if (worldGrid[i].x === gx && worldGrid[i].z === gz) {
        return blocks[i].store;
      }
    }
    return undefined;
  };
  const updateTriCount = (): void => {
    let tris = 0;
    for (const mesh of triMeshes) {
      tris += mesh.geometry.drawCount / 3;
    }
    for (const mesh of triWaterMeshes) {
      tris += mesh.geometry.drawCount / 3;
    }
    totalTriangles = Math.round(tris);
  };
  // Meshes are built in a web worker so a block rebuild never stalls the UI;
  // the worker gets the block's voxel data plus its neighbours' boundary shells
  // and hands back transferable arrays. `pendingBuilds` holds blocks whose mesh
  // is stale, drained a few per frame while in tri mode. `meshGen` is bumped
  // whenever a block's data or the tiles change, so a slow worker result for
  // stale data is dropped. If the worker is unavailable (no Worker, build error)
  // the synchronous `buildBlockMeshesSync` path is used instead.
  const meshGen: number[] = [];
  const pendingBuilds = new Set<number>();
  const inflight = new Map<number, number>();
  // Shared empty mesh for clearing a block's geometry on scroll: the geometry
  // object is reused so the renderer never orphans a GPU buffer.
  const EMPTY_MESH: MeshArrays = {
    positions: [],
    normals: [],
    uvs: [],
    indices: [],
  };
  for (let i = 0; i < blocks.length; i++) {
    meshGen.push(0);
    pendingBuilds.add(i);
  }
  let meshWorker: Worker | undefined;
  let workerAvailable = true;
  const buildBlockMeshesSync = (indices: number[]): void => {
    const tileList = [...tilesById.values()];
    for (const i of indices) {
      const resolver = makeBlockResolver(
        blocks[i].store,
        worldGrid[i].x,
        worldGrid[i].z,
        lookupBlock,
      );
      setGeometryData(
        triMeshes[i].geometry,
        buildBlockMesh(blocks[i].store, resolver, tileList),
      );
      setGeometryData(
        triWaterMeshes[i].geometry,
        buildWaterMesh(blocks[i].store, resolver),
      );
    }
    updateTriCount();
  };
  try {
    meshWorker = new Worker(new URL("./mesh-worker.ts", import.meta.url), {
      type: "module",
    });
    meshWorker.onmessage = (ev) => {
      const msg = ev.data as MeshBuildResult;
      const gen = inflight.get(msg.id);
      if (gen === undefined) {
        return;
      }
      inflight.delete(msg.id);
      if (gen !== meshGen[msg.id]) {
        return; // the block changed after this request was sent
      }
      // update the persistent geometry in place so the renderer re-uploads
      // into its existing GPU buffers instead of leaking new ones
      setGeometryData(triMeshes[msg.id].geometry, msg.terrain);
      setGeometryData(triWaterMeshes[msg.id].geometry, msg.water);
      updateTriCount();
    };
    meshWorker.onerror = () => {
      // fall back to building synchronously; requeue whatever was in flight
      workerAvailable = false;
      console.warn(
        "[tri renderer] mesh worker errored; falling back to synchronous builds",
      );
      for (const i of inflight.keys()) {
        pendingBuilds.add(i);
      }
      inflight.clear();
    };
  } catch {
    workerAvailable = false;
  }
  const requestBlockBuild = (i: number): void => {
    meshGen[i]++;
    inflight.set(i, meshGen[i]);
    const store = blocks[i].store;
    const req: MeshBuildRequest = {
      id: i,
      voxels: store.voxels,
      scale: store.scale,
      data: store.data.slice(),
      shells: extractBlockShells(
        store,
        worldGrid[i].x,
        worldGrid[i].z,
        lookupBlock,
      ),
      tileRects: [...tilesById.values()],
    };
    const transfers: Transferable[] = [req.data.buffer];
    for (const shell of Object.values(req.shells)) {
      if (shell !== null) {
        transfers.push(shell.buffer);
      }
    }
    meshWorker?.postMessage(req, transfers);
  };
  // How many block meshes to kick off per frame while draining the queue; the
  // worker does the heavy lifting so the main thread just wraps the results.
  const MAX_BUILDS_PER_FRAME = 6;
  const drainMeshBuilds = (): void => {
    if (meshWorker !== undefined && workerAvailable) {
      let sent = 0;
      for (const i of pendingBuilds) {
        if (inflight.has(i)) {
          continue;
        }
        requestBlockBuild(i);
        pendingBuilds.delete(i);
        if (++sent >= MAX_BUILDS_PER_FRAME) {
          break;
        }
      }
    } else {
      buildBlockMeshesSync([...pendingBuilds]);
      pendingBuilds.clear();
    }
  };
  const markAllMeshesDirty = (): void => {
    for (let i = 0; i < blocks.length; i++) {
      meshGen[i]++;
      pendingBuilds.add(i);
    }
  };
  // --- fill worker ----------------------------------------------------------
  // Procedural voxel data (noise fill) + the derived GPU level layout (surface
  // sweep) are generated off the main thread: `stepRing` sends a batch of the
  // changed blocks' centres and the worker posts each block's store data, broad
  // grid and fine chunks back transferred (moved, not copied). The response
  // adopts them zero-copy into the store + level textures, which is how BOTH
  // renderers get fresh terrain — the raymarch reads the swapped level, and the
  // triangle path queues a mesh build from the adopted store. Per-slot `fillGen`
  // drops a stale response if the slot scrolls again before it lands.
  const fillGen: number[] = [];
  const fillInflight = new Map<number, number>();
  for (let i = 0; i < blocks.length; i++) {
    fillGen.push(0);
  }
  let fillWorker: Worker | undefined;
  let fillAvailable = true;
  const syncFillBlock = (i: number): void => {
    fillStore(blocks[i].store, blocks[i].center, TERRAIN);
    syncLevelFromStore(blocks[i].level, blocks[i].store, {
      surfaceOnly: SURFACE_ONLY,
    });
    meshGen[i]++;
    pendingBuilds.add(i);
  };
  const sendFillBatch = (indices: number[], centers: Dim3[]): void => {
    const req: FillBatchRequest = { type: "fill", indices, centers };
    for (const i of indices) {
      fillGen[i]++;
      fillInflight.set(i, fillGen[i]);
    }
    fillWorker?.postMessage(req);
  };
  try {
    fillWorker = new Worker(new URL("./fill-worker.ts", import.meta.url), {
      type: "module",
    });
    const fillConfig: FillConfig = {
      terrain: TERRAIN,
      surfaceOnly: SURFACE_ONLY,
    };
    fillWorker.postMessage({ type: "config", config: fillConfig });
    fillWorker.onmessage = (ev) => {
      const msg = ev.data as FillBatchResult;
      for (let j = 0; j < msg.indices.length; j++) {
        const i = msg.indices[j];
        const gen = fillInflight.get(i);
        if (gen === undefined) {
          continue;
        }
        fillInflight.delete(i);
        if (gen !== fillGen[i]) {
          continue; // the slot scrolled again; a newer batch will fill it
        }
        applyLevelData(blocks[i], {
          storeData: msg.storeData[j],
          broadData: msg.broadData[j],
          fineData: msg.fineData[j],
        });
        meshGen[i]++;
        pendingBuilds.add(i);
      }
    };
    fillWorker.onerror = () => {
      // fall back to filling synchronously; don't leave anything stranded
      fillAvailable = false;
      console.warn("[fill] worker errored; falling back to synchronous fills");
      for (const i of fillInflight.keys()) {
        syncFillBlock(i);
      }
      fillInflight.clear();
    };
  } catch {
    fillAvailable = false;
  }
  // Fullscreen underwater tint for the triangle renderer (the raymarch water
  // pass tints the view in-shader instead). Drawn last with depth-testing off
  // so it washes the whole view when the camera dips below the sea.
  const tintMaterial = new MeshBasicMaterial({
    color: 0x1a598c,
    transparent: true,
    opacity: 0,
  });
  tintMaterial.depthTest = false;
  tintMaterial.depthWrite = false;
  const tintMesh = new Mesh(new BoxGeometry(4000, 4000, 4000), tintMaterial);
  tintMesh.visible = false;
  const applyRendererMode = (mode: "ray" | "tri"): string => {
    rendererMode = mode;
    const rayOn = mode === "ray";
    for (const mesh of meshes) {
      mesh.visible = rayOn;
    }
    for (const mesh of waterMeshes) {
      mesh.visible = rayOn;
    }
    for (const mesh of triMeshes) {
      mesh.visible = !rayOn;
    }
    for (const mesh of triWaterMeshes) {
      mesh.visible = !rayOn;
    }
    return mode === "ray"
      ? "renderer: ray (raymarch)"
      : "renderer: tri (surface triangles)";
  };
  // Moves the ring window one block step in the given direction: the whole
  // trailing column/row (5 blocks) teleports to the leading edge and each is
  // refilled at its new center. Stepping only one block would let the window
  // drift off-centre when walking along a single axis.
  const stepRing = (dx: number, dz: number): void => {
    const changed = new Set<number>();
    if (dx !== 0) {
      let min = Infinity;
      let max = -Infinity;
      for (const g of worldGrid) {
        if (g.x < min) {
          min = g.x;
        }
        if (g.x > max) {
          max = g.x;
        }
      }
      const from = dx > 0 ? min : max;
      const to = dx > 0 ? max + 1 : min - 1;
      for (let i = 0; i < worldGrid.length; i++) {
        if (worldGrid[i].x === from) {
          worldGrid[i].x = to;
          changed.add(i);
        }
      }
    }
    if (dz !== 0) {
      let min = Infinity;
      let max = -Infinity;
      for (const g of worldGrid) {
        if (g.z < min) {
          min = g.z;
        }
        if (g.z > max) {
          max = g.z;
        }
      }
      const from = dz > 0 ? min : max;
      const to = dz > 0 ? max + 1 : min - 1;
      for (let i = 0; i < worldGrid.length; i++) {
        if (worldGrid[i].z === from) {
          worldGrid[i].z = to;
          changed.add(i);
        }
      }
    }
    const changedIndices: number[] = [];
    const changedCenters: Dim3[] = [];
    for (const i of changed) {
      const center: Dim3 = [
        worldGrid[i].x * BLOCK_WORLD[0],
        0,
        worldGrid[i].z * BLOCK_WORLD[2],
      ];
      blocks[i].center = center;
      meshes[i].position.set(center[0], center[1], center[2]);
      waterMeshes[i].position.set(center[0], center[1], center[2]);
      // the triangle meshes sit at their block's world center, so they must
      // follow the slot's new position too; clear their geometry until the
      // worker rebuilds it for the new terrain (avoid a flash of the old
      // block's surface at the new location, without leaking the old buffers)
      triMeshes[i].position.set(center[0], center[1], center[2]);
      triWaterMeshes[i].position.set(center[0], center[1], center[2]);
      setGeometryData(triMeshes[i].geometry, EMPTY_MESH);
      setGeometryData(triWaterMeshes[i].geometry, EMPTY_MESH);
      // clear the raymarch level so no stale terrain renders at the new spot
      // while the fill worker regenerates it (the block is at the fogged ring
      // edge, so the brief empty window is hidden)
      resetLevel(blocks[i].level);
      blocks[i].level.broadTexture.needsUpdate = true;
      blocks[i].level.texture.needsUpdate = true;
      // the block's voxel data is about to change: invalidate any in-flight
      // triangle mesh build for the old data (the fill response requeues it)
      meshGen[i]++;
      changedIndices.push(i);
      changedCenters.push(center);
    }
    updateTriCount();
    if (fillWorker !== undefined && fillAvailable) {
      sendFillBatch(changedIndices, changedCenters);
    } else {
      // synchronous fallback: fill + sweep the changed blocks here
      for (const i of changedIndices) {
        syncFillBlock(i);
      }
    }
  };
  // Keeps the ring window centred on the player's block.
  let centerBlockX = 0;
  let centerBlockZ = 0;
  const scrollToPlayer = (playerX: number, playerZ: number): void => {
    const blockX = Math.floor(playerX / BLOCK_WORLD[0]);
    const blockZ = Math.floor(playerZ / BLOCK_WORLD[2]);
    while (centerBlockX !== blockX) {
      stepRing(Math.sign(blockX - centerBlockX), 0);
      centerBlockX += Math.sign(blockX - centerBlockX);
    }
    while (centerBlockZ !== blockZ) {
      stepRing(0, Math.sign(blockZ - centerBlockZ));
      centerBlockZ += Math.sign(blockZ - centerBlockZ);
    }
  };
  {
    // Load the tile spritesheet (one 2D GPU texture) plus its atlas XML, and
    // tell every block material which tile each voxel face uses. Set after the
    // first build, so mark needsUpdate to force a rebuild with the sampler +
    // rect uniforms registered.
    const tileUrl = "./spritesheets/spritesheet_tiles.png";
    const xmlUrl = "./spritesheets/spritesheet_tiles.xml";
    (async () => {
      try {
        const [loaded, xmlRes] = await Promise.all([
          loadTileTexture(tileUrl),
          fetch(xmlUrl),
        ]);
        if (!xmlRes.ok) {
          throw new Error(`failed to load "${xmlUrl}": ${xmlRes.status}`);
        }
        const atlas = parseTileAtlasXml(await xmlRes.text());
        const voxelTiles = buildVoxelTileConfig(
          atlas,
          loaded.width,
          loaded.height,
        );
        for (const material of materials) {
          material.tilesTexture = loaded.texture;
          material.voxelTiles = voxelTiles;
          material.needsUpdate = true;
        }
        // The triangle renderer bakes the atlas rects into its geometry UVs, so
        // give it the texture and re-extract every block mesh with real tiles.
        triMaterial.tilesTexture = loaded.texture;
        triMaterial.needsUpdate = true;
        tilesById.clear();
        for (const v of voxelTiles) {
          tilesById.set(v.id, v);
        }
        markAllMeshesDirty();
      } catch (err) {
        console.warn(
          "[atlas] spritesheet not applied; voxels stay flat blue.",
          err,
        );
      }
    })();
  }
  // Far plane beyond the ring's physical extent so box geometry is never
  // clipped (fog + early ray termination hide the actual cutoff).
  const camera = new PerspectiveCamera(50, 1.0, 0.1, RING_RADIUS + 200);
  const player = createPlayer(
    SPAWN[0],
    getWorldHeight(blocks, SPAWN[0], SPAWN[2]) + PLAYER_CFG.halfSize + 0.1,
    SPAWN[2],
  );
  const playerCube = new Mesh(
    new BoxGeometry(
      PLAYER_CFG.halfSize * 2,
      PLAYER_CFG.halfSize * 2,
      PLAYER_CFG.halfSize * 2,
    ),
    new MeshStandardMaterial({ color: 0xff7043, roughness: 0.8 }),
  );
  playerCube.position.copy(player.position);
  scene.add(playerCube);
  // Draw the water after the player so it blends over it (the renderer has no
  // transparent pass; it draws meshes in scene-graph order).
  for (const waterMesh of waterMeshes) {
    scene.add(waterMesh);
  }
  // The triangle renderer's translucent water pass is added here too, after the
  // player cube, so it blends over it the same way.
  for (const waterMesh of triWaterMeshes) {
    scene.add(waterMesh);
  }
  // The triangle renderer's underwater tint draws over everything, so it is
  // added to the scene last.
  scene.add(tintMesh);
  installKeyboardControls();
  placeCamera(camera, player);
  let timer: GpuTimer | undefined;
  let hud: HTMLDivElement | undefined;
  let sampleCounter = 0;
  const SAMPLE_EVERY = 24;

  // --- adaptive render resolution -------------------------------------
  // Pure scaler (see `adaptive.ts`) fed this frame's render time; it steps the
  // scale by ~1.25x so marginal devices converge instead of thrashing between
  // 1x and 0.5x. Tunables (budget, steps) live in `adaptive.ts`.
  const adaptive = new AdaptiveResolution();
  let baseW = 0;
  let baseH = 0;
  let lastAdaptT = 0;

  const applyResolution = (scale: number) => {
    const canvas = state.canvas;
    if (canvas === undefined || baseW <= 0 || baseH <= 0) {
      return;
    }
    const w = Math.max(1, Math.round(baseW * scale));
    const h = Math.max(1, Math.round(baseH * scale));
    if (w !== canvas.width || h !== canvas.height) {
      canvas.width = w;
      canvas.height = h;
      // Resizing the canvas clears its drawing buffer to transparent, which
      // would flash the page background until the next RAF frame. Draw the new
      // resolution immediately so the compositor never shows the cleared buffer.
      render();
    }
  };

  // Called once per frame after `render()`: feed the frame time (ms) into the
  // scaler and apply whatever scale it settles on. Readback frames are skipped
  // from the decision (they stall the GPU) but still update the EMA.
  const adaptResolution = (t: number) => {
    if (lastAdaptT > 0) {
      const dt = t - lastAdaptT;
      const next =
        debugPerf && sampleCounter % SAMPLE_EVERY === 0
          ? adaptive.frame(dt)
          : adaptive.update(dt);
      applyResolution(next);
    }
    lastAdaptT = t;
  };

  const updateHud = (
    ms: number,
    sample: ReturnType<typeof sampleFetchCount> | undefined,
  ) => {
    if (hud === undefined) {
      return;
    }
    const res = `res: ${adaptive.scale}x`;
    const mode = rendererMode === "ray" ? "ray" : "tri";
    const triLabel =
      rendererMode === "tri"
        ? ` | tris: ${totalTriangles.toLocaleString()}`
        : "";
    hud.textContent =
      sample === undefined
        ? `frame: ${ms.toFixed(2)} ms | ${res} | ${mode}${triLabel}`
        : `frame: ${ms.toFixed(2)} ms | ${res} | ${mode}${triLabel} | fetches/ray: ${sample.fetchesPerRay.toFixed(1)} (${sample.rays} rays)`;
  };
  let lastFrameT = 0;
  // day-night clock: accumulates real time so the 20-minute cycle runs live.
  // Debug console commands can pin `timeOverride` (freezing the cycle at a
  // chosen moment) and scale the speed for fast-forwarding.
  let elapsed = 0;
  let timeOverride: number | null = null;
  let timeSpeed = 1;
  // Debug console: parses "/command" lines and mutates the day-night clock.
  const runConsoleCommand = (line: string): string => {
    const [name, ...rest] = line.trim().toLowerCase().split(/\s+/);
    const shownTime = (): number => timeOverride ?? elapsed;
    switch (name) {
      case "/help":
        return [
          "/day       jump to noon (t=300s)",
          "/sunset    jump to dusk (t=645s)",
          "/night     jump to midnight (t=900s)",
          "/sunrise   jump to dawn (t=1120s)",
          "/time <s>  jump to a second of the 20-min cycle",
          "/normal    resume the live clock",
          "/speed <n> run the clock n× fast (0 pauses)",
          "/now       show the current clock state",
          "/renderer ray|tri   switch renderer (raymarch | surface triangles)",
          "/tris      show the current triangle count",
        ].join("\n");
      case "/day":
        timeOverride = 300;
        return "jumped to noon (t=300s)";
      case "/sunset":
        timeOverride = 645;
        return "jumped to dusk (t=645s)";
      case "/night":
        timeOverride = 900;
        return "jumped to midnight (t=900s)";
      case "/sunrise":
        timeOverride = 1120;
        return "jumped to dawn (t=1120s)";
      case "/time": {
        const t = Number(rest[0]);
        if (!Number.isFinite(t) || t < 0) {
          return "usage: /time <seconds>  (0..1200, wraps)";
        }
        timeOverride = t;
        return `time set to ${t}s`;
      }
      case "/normal":
        timeOverride = null;
        return "resumed the live clock";
      case "/speed": {
        const n = Number(rest[0]);
        if (!Number.isFinite(n) || n < 0) {
          return "usage: /speed <multiplier>  (0 pauses, 1 = real time)";
        }
        timeSpeed = n;
        return `clock speed set to ${n}×`;
      }
      case "/now":
        return `phase: ${phaseAt(shownTime())} | t=${shownTime().toFixed(1)}s | speed=${timeSpeed}× | live=${timeOverride === null}`;
      case "/renderer": {
        const arg = rest[0];
        if (arg === "ray") {
          return applyRendererMode("ray");
        }
        if (arg === "tri" || arg === "mesh" || arg === "triangles") {
          return applyRendererMode("tri");
        }
        return `renderer: ${rendererMode} — usage: /renderer ray|tri`;
      }
      case "/tris":
        return `triangles: ${totalTriangles.toLocaleString()} (${rendererMode} mode)`;
      default:
        return `unknown command "${line}" — try /help`;
    }
  };
  // reusable colour so per-frame sky updates don't allocate
  const skyColor = new Color(SKY_BLUE);
  // Re-derives every light + the sun/moon billboards from the day-night clock.
  // The terrain/water materials expose uniforms read each draw, so only their
  // public fields need updating here.
  const applyDayNight = (dayNight: ReturnType<typeof dayNightState>): void => {
    const renderer = state.renderer;
    skyColor.set(
      dayNight.skyColor[0],
      dayNight.skyColor[1],
      dayNight.skyColor[2],
    );
    renderer?.setClearColor(skyColor, 1);
    for (const material of materials) {
      material.fogColor = dayNight.skyColor;
      material.sunDirection = dayNight.sunDir;
      material.sunLightColor = dayNight.sunLight;
      material.moonDirection = dayNight.moonDir;
      material.moonLightColor = dayNight.moonLight;
      material.ambientColor = dayNight.ambient;
    }
    for (const waterMaterial of waterMaterials) {
      waterMaterial.fogColor = dayNight.skyColor;
    }
    triMaterial.fogColor = dayNight.skyColor;
    triMaterial.sunDirection = dayNight.sunDir;
    triMaterial.sunLightColor = dayNight.sunLight;
    triMaterial.moonDirection = dayNight.moonDir;
    triMaterial.moonLightColor = dayNight.moonLight;
    triMaterial.ambientColor = dayNight.ambient;
    triWaterMaterial.fogColor = dayNight.skyColor;
    // The player cube is a standard material; point the directional light at
    // the sun and tint the fill light to match the phase.
    sun.color.set(
      dayNight.sunLight[0],
      dayNight.sunLight[1],
      dayNight.sunLight[2],
    );
    sun.position.set(
      dayNight.sunDir[0],
      dayNight.sunDir[1],
      dayNight.sunDir[2],
    );
    ambient.color.set(
      dayNight.ambient[0],
      dayNight.ambient[1],
      dayNight.ambient[2],
    );
    ambient.intensity = 1;
    const cam = camera.position;
    sunMesh.position.set(
      cam.x + dayNight.sunDir[0] * SKY_DISTANCE,
      cam.y + dayNight.sunDir[1] * SKY_DISTANCE,
      cam.z + dayNight.sunDir[2] * SKY_DISTANCE,
    );
    sunMesh.lookAt(cam.x, cam.y, cam.z);
    sunMesh.visible = dayNight.sunElevation > VISIBLE_ELEVATION;
    moonMesh.position.set(
      cam.x + dayNight.moonDir[0] * SKY_DISTANCE,
      cam.y + dayNight.moonDir[1] * SKY_DISTANCE,
      cam.z + dayNight.moonDir[2] * SKY_DISTANCE,
    );
    moonMesh.lookAt(cam.x, cam.y, cam.z);
    moonMesh.visible = dayNight.moonElevation > VISIBLE_ELEVATION;
  };
  let animate = (t: number) => {
    const dt =
      lastFrameT > 0 ? Math.min(0.05, (t - lastFrameT) / 1000) : 1 / 60;
    lastFrameT = t;
    updatePlayer(
      player,
      dt,
      consumeInput(),
      (x, z) => getWorldHeight(blocks, x, z),
      // water surface height: sea level where the ground dips below it, else none
      (x, z) => {
        const ground = getWorldHeight(blocks, x, z);
        const sea = TERRAIN.seaLevel;
        return sea !== undefined && ground < sea ? sea : -Infinity;
      },
      SAFE_EXTENT,
    );
    // scroll the terrain ring so the player's block stays centred
    scrollToPlayer(player.position.x, player.position.z);
    // while tri mode is active, keep draining the mesh-build queue a few blocks
    // per frame (the worker does the heavy lifting off the main thread)
    if (rendererMode === "tri") {
      drainMeshBuilds();
    }
    playerCube.position.copy(player.position);
    // the cube's local +Z faces the heading; a Y rotation by `yaw` aligns it
    playerCube.rotation.y = player.yaw;
    placeCamera(camera, player);
    // advance the day-night clock and re-derive the scene lighting. A command
    // override pins the shown time; otherwise the real clock (scaled by speed)
    // drives the cycle.
    elapsed += dt * timeSpeed;
    applyDayNight(dayNightState(timeOverride ?? elapsed));
    // triangle renderer: fullscreen underwater tint when the camera dips below
    // the sea (the raymarch water pass tints the view in-shader instead)
    if (rendererMode === "tri" && TERRAIN.seaLevel !== undefined) {
      const depth = TERRAIN.seaLevel - camera.position.y;
      if (depth > 0) {
        tintMesh.visible = true;
        tintMesh.position.copy(camera.position);
        tintMaterial.opacity = Math.min(
          1,
          1 - Math.exp(-WATER_EXTINCTION * depth),
        );
      } else {
        tintMesh.visible = false;
      }
    } else {
      tintMesh.visible = false;
    }
    render();
    adaptResolution(t);
  };
  createEffect(
    () => state.canvas,
    (canvas) => {
      if (canvas === undefined) {
        return;
      }
      let renderer = new WebGLRenderer(canvas);
      renderer.setClearColor(SKY_BLUE, 1);
      if (debugPerf) {
        timer = new GpuTimer(renderer.gl);
      }
      setState((s) => {
        s.renderer = renderer;
      });
      let resizeObserver = new ResizeObserver(() => {
        let rect = canvas.getBoundingClientRect();
        let aspect = rect.width / rect.height;
        if (!Number.isFinite(aspect) || aspect <= 0) {
          return;
        }
        baseW = rect.width * window.devicePixelRatio;
        baseH = rect.height * window.devicePixelRatio;
        camera.aspect = aspect;
        camera.updateProjectionMatrix();
        // a layout change changes the render cost, so hold adaptation while
        // the new base resolution settles
        adaptive.hold();
        applyResolution(adaptive.scale);
      });
      resizeObserver.observe(canvas);
      renderer.setAnimationLoop((t) => {
        animate(t);
      });
      return () => {
        resizeObserver.unobserve(canvas);
        resizeObserver.disconnect();
        renderer.setAnimationLoop(null);
        // release the renderer's GPU programs, buffers and textures
        renderer.dispose();
      };
    },
  );
  const render = () => {
    let renderer = state.renderer;
    if (renderer === undefined) {
      return;
    }
    if (timer !== undefined) {
      timer.begin();
    }
    renderer.render(scene, camera);
    if (timer !== undefined) {
      timer.end();
      timer.poll();
      sampleCounter++;
      // the fetch-count heatmap only exists in raymarch mode; the triangle
      // renderer's HUD shows the triangle count instead
      if (rendererMode === "ray" && sampleCounter % SAMPLE_EVERY === 0) {
        const sample = sampleFetchCount(
          renderer.gl,
          renderer.canvas.width,
          renderer.canvas.height,
        );
        updateHud(timer.ms, sample);
      } else {
        updateHud(timer.ms, undefined);
      }
    }
  };
  let lookPointerId: number | null = null;
  let lastLookX = 0;
  let lastLookY = 0;
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
      }}
    >
      <canvas
        ref={(canvas) =>
          setState((s) => {
            s.canvas = canvas;
          })
        }
        style={{
          position: "absolute",
          left: "0",
          top: "0",
          width: "100%",
          height: "100%",
          "touch-action": "none",
        }}
        onPointerDown={(e) => {
          if (lookPointerId === null) {
            lookPointerId = e.pointerId;
            lastLookX = e.clientX;
            lastLookY = e.clientY;
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          }
        }}
        onPointerMove={(e) => {
          if (e.pointerId !== lookPointerId) {
            return;
          }
          const dx = e.clientX - lastLookX;
          const dy = e.clientY - lastLookY;
          lastLookX = e.clientX;
          lastLookY = e.clientY;
          addLookDelta(dx, dy);
        }}
        onPointerUp={(e) => {
          if (e.pointerId === lookPointerId) {
            lookPointerId = null;
          }
        }}
        onPointerCancel={(e) => {
          if (e.pointerId === lookPointerId) {
            lookPointerId = null;
          }
        }}
      />
      <Controls />
      <Console onCommand={runConsoleCommand} />
      {debugPerf && (
        <div
          ref={(el) => {
            hud = el;
          }}
          style={{
            position: "absolute",
            left: "8px",
            top: "8px",
            padding: "4px 8px",
            background: "rgba(0, 0, 0, 0.6)",
            color: "#fff",
            font: "12px monospace",
            "border-radius": "4px",
            "pointer-events": "none",
          }}
        />
      )}
    </div>
  );
};

export default App;
