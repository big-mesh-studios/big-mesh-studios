import {
  BoxGeometry,
  Color,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from "@random-mesh/rmsl/scene";
import { Component, createEffect, createStore } from "solid-js";
import { AdaptiveResolution } from "./adaptive";
import { Commander } from "./commander";
import { DayNightController } from "./day-night-controller";
import { addLookDelta, consumeInput, installKeyboardControls } from "./input";
import { GpuTimer, sampleFetchCount } from "./perf";
import { createPlayer, placeCamera, PLAYER_CFG, updatePlayer } from "./player";
import {
  buildVoxelTileConfig,
  loadTileTexture,
  parseTileAtlasXml,
} from "./renderers/atlas";
import { RendererSwitch } from "./renderers/renderer-switch";
import { Console } from "./ui/Console";
import Controls from "./ui/Controls";
import { BLOCK_WORLD, getWorldHeight, type Dim3 } from "./world/level-data";
import { DEFAULT_TERRAIN, type TerrainConfig } from "./world/noise";
import { WorldRing } from "./world/world-ring";

const App: Component<{}> = () => {
  /** True when the URL hash includes `perf`, enabling the debug HUD (GPU timer and fetches-per-ray). */
  const debugPerf =
    typeof window !== "undefined" && window.location.hash.includes("perf");
  const BLOCKS = 5;
  /** Ring half-extent: the farthest the ring's outer edge can be from the player. */
  const RING_RADIUS = (BLOCKS / 2) * BLOCK_WORLD[0];
  /**
   * Distance at which fog becomes fully opaque and rays stop marching. Set
   * to the ring edge's closest possible approach to the player — `(BLOCKS/2
   * - 0.5)` blocks (384) — the distance when the player hugs the far edge
   * of their center block, so fog always hides the ring boundary before it
   * can become visible.
   */
  const FOG_DISTANCE = (BLOCKS / 2 - 0.5) * BLOCK_WORLD[0];
  const FOG_START = 0.4 * FOG_DISTANCE;
  /** Sky blue, matching the material's default fog color so the horizon blends. */
  const SKY_BLUE = 0x87ceeb;
  const SPAWN: Dim3 = [0, 0, 0];
  /**
   * Distance from the origin beyond which player movement is clamped. The
   * ring is effectively unbounded, so this exists only to guard against
   * floating-point drift far outside it.
   */
  const SAFE_EXTENT = 1e6;
  /** Terrain noise settings shared by every block in the ring. */
  const TERRAIN: TerrainConfig = DEFAULT_TERRAIN;
  /** When true, only surface voxels are written into each block's GPU chunks instead of the full solid volume. */
  const SURFACE_ONLY = true;
  /** Padding added to each mesh's box so adjacent meshes share a thin overlap shell. */
  const PAD = 2.0;
  /** Water absorption used by the raymarch water pass and, at the same value, the triangle renderer's underwater tint. */
  const WATER_EXTINCTION = 0.12;
  let [state, setState] = createStore<{
    canvas: HTMLCanvasElement | undefined;
    renderer: WebGLRenderer | undefined;
  }>({
    canvas: undefined,
    renderer: undefined,
  });
  const scene = new Scene();
  /**
   * Owns the sun/ambient lights, the sun/moon billboards, and the day-night
   * clock. `tick` (called from `animate`) returns the computed day-night
   * state, which feeds both `rendererSwitch.applyLighting` and the clear
   * colour below.
   */
  const dayNight = new DayNightController({ scene });

  /**
   * The world ring: a BLOCKS x BLOCKS window of WorldBlocks kept centred on
   * the player, streamed in off the main thread as it scrolls.
   * `rendererSwitch` is constructed just below and assigned before any
   * callback can fire (both the fill worker's response and any ring scroll
   * happen later, from the animate loop), so this forward reference is safe.
   */
  let rendererSwitch: RendererSwitch;
  const worldRing = new WorldRing({
    blocksPerSide: BLOCKS,
    terrain: TERRAIN,
    surfaceOnly: SURFACE_ONLY,
    onBlockChanged: (i) => rendererSwitch.onBlockChanged(i),
    onBlockReposition: (i, center) => rendererSwitch.repositionBlock(i, center),
  });

  /**
   * Builds both rendering strategies' meshes for every block above and owns
   * switching between them (`/renderer ray|tri`).
   */
  rendererSwitch = new RendererSwitch({
    scene,
    blocks: worldRing.blocks,
    gridCoordAt: (i) => worldRing.gridCoordAt(i),
    lookupBlock: worldRing.lookupBlock,
    padding: PAD,
    blockWorld: BLOCK_WORLD,
    fogDistance: FOG_DISTANCE,
    fogStart: FOG_START,
    debugPerf,
    waterExtinction: WATER_EXTINCTION,
    seaLevel: TERRAIN.seaLevel,
  });

  /**
   * Every debug console command, declared as a single object literal keyed
   * by command name. A duplicate key is a compile error, so a command-name
   * collision is caught by the type checker rather than at runtime.
   */
  const commands = new Commander({
    "/day": {
      help: "/day       jump to noon (t=300s)",
      run: () => {
        dayNight.jumpTo(300);
        return "jumped to noon (t=300s)";
      },
    },
    "/sunset": {
      help: "/sunset    jump to dusk (t=645s)",
      run: () => {
        dayNight.jumpTo(645);
        return "jumped to dusk (t=645s)";
      },
    },
    "/night": {
      help: "/night     jump to midnight (t=900s)",
      run: () => {
        dayNight.jumpTo(900);
        return "jumped to midnight (t=900s)";
      },
    },
    "/sunrise": {
      help: "/sunrise   jump to dawn (t=1120s)",
      run: () => {
        dayNight.jumpTo(1120);
        return "jumped to dawn (t=1120s)";
      },
    },
    "/time": {
      help: "/time <s>  jump to a second of the 20-min cycle",
      run: (rest) => {
        const t = Number(rest[0]);
        if (!Number.isFinite(t) || t < 0) {
          return "usage: /time <seconds>  (0..1200, wraps)";
        }
        dayNight.jumpTo(t);
        return `time set to ${t}s`;
      },
    },
    "/normal": {
      help: "/normal    resume the live clock",
      run: () => {
        dayNight.clearOverride();
        return "resumed the live clock";
      },
    },
    "/speed": {
      help: "/speed <n> run the clock n× fast (0 pauses)",
      run: (rest) => {
        const n = Number(rest[0]);
        if (!Number.isFinite(n) || n < 0) {
          return "usage: /speed <multiplier>  (0 pauses, 1 = real time)";
        }
        dayNight.setSpeed(n);
        return `clock speed set to ${n}×`;
      },
    },
    "/now": {
      help: "/now       show the current clock state",
      run: () => dayNight.describe(),
    },
    "/renderer": {
      help: "/renderer ray|tri   switch renderer (raymarch | surface triangles)",
      run: (rest) => {
        const arg = rest[0];
        if (arg === "ray") {
          return rendererSwitch.setMode("ray");
        }
        if (arg === "tri" || arg === "mesh" || arg === "triangles") {
          return rendererSwitch.setMode("tri");
        }
        return `renderer: ${rendererSwitch.mode} — usage: /renderer ray|tri`;
      },
    },
    "/tris": {
      help: "/tris      show the current triangle count",
      run: () =>
        `triangles: ${rendererSwitch.triangleCount.toLocaleString()} (${rendererSwitch.mode} mode)`,
    },
  });
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
        rendererSwitch.setTiles(voxelTiles, loaded.texture);
      } catch (err) {
        console.warn(
          "[atlas] spritesheet not applied; voxels stay flat blue.",
          err,
        );
      }
    })();
  }
  /**
   * Camera with a far plane beyond the ring's physical extent, so box
   * geometry is never clipped (fog and early ray termination hide the
   * actual cutoff).
   */
  const camera = new PerspectiveCamera(50, 1.0, 0.1, RING_RADIUS + 200);
  const player = createPlayer(
    SPAWN[0],
    getWorldHeight(worldRing.blocks, SPAWN[0], SPAWN[2]) +
      PLAYER_CFG.halfSize +
      0.1,
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
  // Both renderers' translucent water passes (and the triangle renderer's
  // underwater tint) blend over the opaque scene; scene-graph draw order
  // means they must be added after the player cube.
  rendererSwitch.addTranslucentPassesToScene(scene);
  installKeyboardControls();
  placeCamera(camera, player);
  let timer: GpuTimer | undefined;
  let hud: HTMLDivElement | undefined;
  let sampleCounter = 0;
  const SAMPLE_EVERY = 24;

  // --- adaptive render resolution -------------------------------------
  /**
   * A pure scaler fed this frame's render time. It steps the render
   * resolution scale by roughly 1.25x per adjustment, so marginal devices
   * converge on a stable scale instead of thrashing between 1x and 0.5x.
   */
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

  /**
   * Called once per frame after `render()`: feeds the frame time (in
   * milliseconds) into the scaler and applies whatever scale it settles on.
   * Readback frames are skipped from the decision (they stall the GPU) but
   * still update the exponential moving average.
   */
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
    const mode = rendererSwitch.mode === "ray" ? "ray" : "tri";
    const triLabel =
      rendererSwitch.mode === "tri"
        ? ` | tris: ${rendererSwitch.triangleCount.toLocaleString()}`
        : "";
    hud.textContent =
      sample === undefined
        ? `frame: ${ms.toFixed(2)} ms | ${res} | ${mode}${triLabel}`
        : `frame: ${ms.toFixed(2)} ms | ${res} | ${mode}${triLabel} | fetches/ray: ${sample.fetchesPerRay.toFixed(1)} (${sample.rays} rays)`;
  };
  let lastFrameT = 0;
  /** Reusable color object, updated in place each frame so sky updates don't allocate. */
  const skyColor = new Color(SKY_BLUE);
  let animate = (t: number) => {
    const dt =
      lastFrameT > 0 ? Math.min(0.05, (t - lastFrameT) / 1000) : 1 / 60;
    lastFrameT = t;
    updatePlayer(
      player,
      dt,
      consumeInput(),
      (x, z) => getWorldHeight(worldRing.blocks, x, z),
      // water surface height: sea level where the ground dips below it, else none
      (x, z) => {
        const ground = getWorldHeight(worldRing.blocks, x, z);
        const sea = TERRAIN.seaLevel;
        return sea !== undefined && ground < sea ? sea : -Infinity;
      },
      SAFE_EXTENT,
    );
    // scroll the terrain ring so the player's block stays centred
    worldRing.scrollToPlayer(player.position.x, player.position.z);
    playerCube.position.copy(player.position);
    // the cube's local +Z faces the heading; a Y rotation by `yaw` aligns it
    playerCube.rotation.y = player.yaw;
    placeCamera(camera, player);
    // advance the day-night clock and re-derive the scene lighting. A command
    // override pins the shown time; otherwise the real clock (scaled by speed)
    // drives the cycle.
    const dn = dayNight.tick(dt, camera);
    skyColor.set(dn.skyColor[0], dn.skyColor[1], dn.skyColor[2]);
    state.renderer?.setClearColor(skyColor, 1);
    rendererSwitch.applyLighting(dn);
    // per-frame work specific to whichever renderer is active (mesh-build
    // draining for the triangle renderer, underwater tint, etc.)
    rendererSwitch.tick(dt, camera);
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
        // stop the fill worker so it doesn't keep running after unmount
        worldRing.dispose();
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
      if (rendererSwitch.mode === "ray" && sampleCounter % SAMPLE_EVERY === 0) {
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
      <Console onCommand={(line) => commands.run(line)} />
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
