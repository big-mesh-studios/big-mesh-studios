import {
  AmbientLight,
  BoxGeometry,
  Color,
  DirectionalLight,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  WebGLRenderer,
} from "@random-mesh/rmsl/scene";
import { Component, createEffect, createStore } from "solid-js";
import { AdaptiveResolution } from "./adaptive";
import {
  buildVoxelTileConfig,
  loadTileTexture,
  parseTileAtlasXml,
} from "./atlas";
import { Console } from "./Console";
import Controls from "./Controls";
import { dayNightState, phaseAt, VISIBLE_ELEVATION } from "./day-night";
import { addLookDelta, consumeInput, installKeyboardControls } from "./input";
import { BLOCK_WORLD, getWorldHeight, type Dim3 } from "./level-data";
import { DEFAULT_TERRAIN, type TerrainConfig } from "./noise";
import { GpuTimer, sampleFetchCount } from "./perf";
import { createPlayer, placeCamera, PLAYER_CFG, updatePlayer } from "./player";
import { RendererSwitch } from "./renderers/renderer-switch";
import { WorldRing } from "./world-ring";

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
  // The world ring: a BLOCKS x BLOCKS window of WorldBlocks kept centred on
  // the player, streamed in off the main thread as it scrolls. See
  // `src/world-ring.ts` and docs/adr/0002-world-ring-seam.md. `rendererSwitch`
  // is constructed just below and assigned before any callback can fire (both
  // the fill worker's response and any ring scroll happen later, from the
  // animate loop), so this forward reference is safe.
  let rendererSwitch: RendererSwitch;
  const worldRing = new WorldRing({
    blocksPerSide: BLOCKS,
    terrain: TERRAIN,
    surfaceOnly: SURFACE_ONLY,
    onBlockChanged: (i) => rendererSwitch.onBlockChanged(i),
    onBlockReposition: (i, center) => rendererSwitch.repositionBlock(i, center),
  });
  // Builds both rendering strategies' meshes for every block above and owns
  // switching between them (`/renderer ray|tri`). See
  // `src/renderers/renderer-switch.ts` and docs/adr/0001-renderer-seam.md.
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
  // Far plane beyond the ring's physical extent so box geometry is never
  // clipped (fog + early ray termination hide the actual cutoff).
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
  // means they must be added after the player cube (see the method's doc).
  rendererSwitch.addTranslucentPassesToScene(scene);
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
          return rendererSwitch.setMode("ray");
        }
        if (arg === "tri" || arg === "mesh" || arg === "triangles") {
          return rendererSwitch.setMode("tri");
        }
        return `renderer: ${rendererSwitch.mode} — usage: /renderer ray|tri`;
      }
      case "/tris":
        return `triangles: ${rendererSwitch.triangleCount.toLocaleString()} (${rendererSwitch.mode} mode)`;
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
    rendererSwitch.applyLighting(dayNight);
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
    elapsed += dt * timeSpeed;
    applyDayNight(dayNightState(timeOverride ?? elapsed));
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
