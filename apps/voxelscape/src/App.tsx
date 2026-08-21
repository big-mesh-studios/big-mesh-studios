import { Component, createEffect, createStore } from "solid-js";
import {
  AmbientLight,
  BoxGeometry,
  DirectionalLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  Side,
  WebGLRenderer,
} from "@random-mesh/rmsl/scene";
import {
  LevelWorldMaterial,
  BLOCK_WORLD,
  buildBlock,
  fillBlock,
  getWorldHeight,
  type Dim3,
  type WorldBlock,
} from "./level";
import {
  buildVoxelTileConfig,
  loadTileTexture,
  parseTileAtlasXml,
} from "./atlas";
import { GpuTimer, sampleFetchCount } from "./perf";
import { installKeyboardControls, addLookDelta, consumeInput } from "./input";
import { createPlayer, updatePlayer, placeCamera, PLAYER_CFG } from "./player";
import Controls from "./Controls";

const App: Component<{}> = () => {
  // append `#perf` to the URL to enable the debug HUD (GPU timer + fetches/ray)
  const debugPerf =
    typeof window !== "undefined" && window.location.hash.includes("perf");
  const BLOCKS = 5;
  const SPAWN: Dim3 = [0, 0, 0];
  // Roughly the previous walkable extent; with the infinite ring the player is
  // effectively unbounded, but clamp to guard against float drift far out.
  const SAFE_EXTENT = 1e6;
  // Each mesh is one padded box so adjacent meshes share a thin overlap shell.
  const PAD = 2.0;
  let [state, setState] = createStore<{
    canvas: HTMLCanvasElement | undefined;
    renderer: WebGLRenderer | undefined;
  }>({
    canvas: undefined,
    renderer: undefined,
  });
  const scene = new Scene();
  {
    let sun = new DirectionalLight();
    sun.position.set(2, 1, 1);
    scene.add(sun);
  }
  {
    scene.add(new AmbientLight(0xffffff, 0.6));
  }
  // The infinite-scroll ring: a BLOCKS x BLOCKS window of 192x256x192 blocks,
  // each rendered by its own raymarching mesh. The window stays centred on the
  // player's block; when the player crosses a block boundary the trailing block
  // teleports to the leading edge and refills its voxel data at the new
  // absolute world coords (see `stepRing`).
  const blocks: WorldBlock[] = [];
  const meshes: Mesh[] = [];
  const materials: LevelWorldMaterial[] = [];
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
        const block: WorldBlock = { level: buildBlock({ center }), center };
        const material = new LevelWorldMaterial();
        material.transparent = true;
        material.depthWrite = true;
        material.debugFetchCount = debugPerf;
        material.side = Side.DoubleSide;
        material.setBlocks([block]);
        const mesh = new Mesh(geometry, material);
        mesh.position.set(center[0], center[1], center[2]);
        scene.add(mesh);
        blocks.push(block);
        meshes.push(mesh);
        materials.push(material);
        worldGrid.push(grid);
      }
    }
  }
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
    for (const i of changed) {
      const center: Dim3 = [
        worldGrid[i].x * BLOCK_WORLD[0],
        0,
        worldGrid[i].z * BLOCK_WORLD[2],
      ];
      fillBlock(blocks[i].level, center);
      blocks[i].center = center;
      meshes[i].position.set(center[0], center[1], center[2]);
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
      } catch (err) {
        console.warn(
          "[atlas] spritesheet not applied; voxels stay flat blue.",
          err,
        );
      }
    })();
  }
  const camera = new PerspectiveCamera(50, 1.0, 0.1, 20000.0);
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
  installKeyboardControls();
  placeCamera(camera, player);
  let timer: GpuTimer | undefined;
  let hud: HTMLDivElement | undefined;
  let sampleCounter = 0;
  const SAMPLE_EVERY = 24;

  // --- adaptive render resolution -------------------------------------
  // Tunables live here so a settings page can drive them later.
  const RES = {
    budgetMs: 16.7, // frame budget for the 60fps target
    downFactor: 1.25, // ema above budget * this => consider downscaling
    upFactor: 0.6, // ema below budget * this => consider upscaling
    downFrames: 30, // sustained slow frames before stepping down
    upFrames: 60, // sustained fast frames before stepping up
    minScale: 0.25, // lowest render scale (1 -> 0.5 -> 0.25)
  };
  let resolutionScale = 1;
  let baseW = 0;
  let baseH = 0;
  let emaMs = RES.budgetMs;
  let slowFrames = 0;
  let fastFrames = 0;
  let lastT = 0;
  let settleFrames = 0;

  const applyResolution = (scale: number) => {
    resolutionScale = scale;
    const canvas = state.canvas;
    if (canvas === undefined || baseW <= 0 || baseH <= 0) {
      return;
    }
    const w = Math.max(1, Math.round(baseW * scale));
    const h = Math.max(1, Math.round(baseH * scale));
    if (w !== canvas.width || h !== canvas.height) {
      canvas.width = w;
      canvas.height = h;
      settleFrames = 10;
    }
  };

  const adaptResolution = (t: number) => {
    if (lastT > 0) {
      const dt = t - lastT;
      emaMs = emaMs * 0.9 + dt * 0.1;
    }
    lastT = t;
    if (settleFrames > 0) {
      settleFrames--;
      return;
    }
    // skip on frames that do the debug readback (they stall the GPU)
    if (debugPerf && sampleCounter % SAMPLE_EVERY === 0) {
      return;
    }
    const downMs = RES.budgetMs * RES.downFactor;
    const upMs = RES.budgetMs * RES.upFactor;
    if (emaMs > downMs) {
      slowFrames++;
      fastFrames = 0;
      if (slowFrames >= RES.downFrames && resolutionScale > RES.minScale) {
        applyResolution(Math.max(RES.minScale, resolutionScale / 2));
        slowFrames = 0;
        fastFrames = 0;
      }
    } else if (emaMs < upMs) {
      fastFrames++;
      slowFrames = 0;
      if (fastFrames >= RES.upFrames && resolutionScale < 1) {
        applyResolution(Math.min(1, resolutionScale * 2));
        slowFrames = 0;
        fastFrames = 0;
      }
    } else {
      slowFrames = 0;
      fastFrames = 0;
    }
  };

  const updateHud = (
    ms: number,
    sample: ReturnType<typeof sampleFetchCount> | undefined,
  ) => {
    if (hud === undefined) {
      return;
    }
    const res = `res: ${resolutionScale}x`;
    hud.textContent =
      sample === undefined
        ? `frame: ${ms.toFixed(2)} ms | ${res}`
        : `frame: ${ms.toFixed(2)} ms | ${res} | fetches/ray: ${sample.fetchesPerRay.toFixed(1)} (${sample.rays} rays)`;
  };
  let lastFrameT = 0;
  let animate = (t: number) => {
    const dt =
      lastFrameT > 0 ? Math.min(0.05, (t - lastFrameT) / 1000) : 1 / 60;
    lastFrameT = t;
    updatePlayer(
      player,
      dt,
      consumeInput(),
      (x, z) => getWorldHeight(blocks, x, z),
      SAFE_EXTENT,
    );
    // scroll the terrain ring so the player's block stays centred
    scrollToPlayer(player.position.x, player.position.z);
    playerCube.position.copy(player.position);
    // the cube's local +Z faces the heading; a Y rotation by `yaw` aligns it
    playerCube.rotation.y = player.yaw;
    placeCamera(camera, player);
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
        applyResolution(resolutionScale);
      });
      resizeObserver.observe(canvas);
      renderer.setAnimationLoop((t) => {
        animate(t);
      });
      return () => {
        resizeObserver.unobserve(canvas);
        resizeObserver.disconnect();
        renderer.setAnimationLoop(null);
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
      if (++sampleCounter % SAMPLE_EVERY === 0) {
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
