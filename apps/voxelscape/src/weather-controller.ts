import type { Node, UniformNode } from "@random-mesh/rmsl";
import {
  float,
  mod,
  sin,
  smoothstep,
  vec2,
  vec3,
  vec4,
} from "@random-mesh/rmsl";
import {
  Blending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Builder,
  Line2,
  LineGeometry,
  Line2NodeMaterial,
  Mesh,
  MeshBasicMaterial,
  NodeMaterial,
  Scene,
  Side,
} from "@random-mesh/rmsl/scene";
import type { PerspectiveCamera } from "@random-mesh/rmsl/scene";
import { weatherAt, type Weather, type WeatherState } from "./weather";

/** The controller's per-frame view of the weather for the caller to apply. */
export interface WeatherView {
  weather: Weather;
  /** How strongly the storm's lighting is applied, ramping smoothly on change. */
  intensity: number;
}

const WEATHER_SEED = 0x5eed;
const RAIN_COUNT = 5000;
const SNOW_COUNT = 4000;
/** Seconds for storm lighting and particles to ramp in or out on a weather change. */
const RAMP_SECONDS = 5;
/** Mean seconds between lightning strikes while a thunderstorm is active. */
const STRIKE_MEAN_SECONDS = 3.5;
/** Horizontal half-extent of the box lightning strikes target around the camera. */
const STRIKE_RADIUS = 150;
/** Seconds a bolt is fully lit (re-jittered every frame for flicker). */
const BOLT_ACTIVE_SECONDS = 0.18;
/** Seconds a bolt takes to fade out after its active window. */
const BOLT_FADE_SECONDS = 0.3;
/** Seconds for the strike flash overlay to decay to nothing. */
const FLASH_DECAY_SECONDS = 0.3;

/** World-unit box each particle system lives in, centred on the camera. */
interface ParticleOpts {
  count: number;
  spreadX: number;
  spreadZ: number;
  /**
   * World-unit grid size the particle field snaps to in x/z (see
   * `ParticleSystem.tileSize`). Independent of the spread.
   */
  tileSize: number;
  minY: number;
  maxY: number;
  fallSpeed: number;
  windX: number;
  windZ: number;
  sizeMin: [number, number];
  sizeMax: [number, number];
  lifeMin: number;
  lifeMax: number;
}

const RAIN_OPTS: ParticleOpts = {
  count: RAIN_COUNT,
  spreadX: 100,
  spreadZ: 100,
  tileSize: 200,
  minY: -80,
  maxY: 220,
  fallSpeed: 90,
  windX: 4,
  windZ: 1,
  sizeMin: [0.05, 0.6],
  sizeMax: [0.1, 1.8],
  lifeMin: 0.8,
  lifeMax: 1.8,
};

const SNOW_OPTS: ParticleOpts = {
  count: SNOW_COUNT,
  spreadX: 120,
  spreadZ: 120,
  tileSize: 240,
  minY: -80,
  maxY: 240,
  fallSpeed: 6,
  windX: 2,
  windZ: 0.5,
  sizeMin: [0.1, 0.1],
  sizeMax: [0.2, 0.2],
  lifeMin: 6,
  lifeMax: 10,
};

/**
 * One particle's per-corner attributes, expanded to `count * 4` billboard
 * vertices once on the CPU. The array buffers are never touched again — all
 * motion happens in the vertex shader, keyed by a time uniform (`mod` wraps
 * each particle's lifetime so it recycles without any reallocation).
 */
interface ParticleGeometryArrays {
  positions: Float32Array;
  corners: Float32Array;
  drifts: Float32Array;
  lives: Float32Array;
  offsets: Float32Array;
  sizes: Float32Array;
  spins: Float32Array;
  uvs: Float32Array;
  indices: Uint16Array;
}

const buildParticleGeometry = (opts: ParticleOpts): ParticleGeometryArrays => {
  const n = opts.count;
  const positions = new Float32Array(n * 4 * 3);
  const corners = new Float32Array(n * 4 * 2);
  const drifts = new Float32Array(n * 4 * 3);
  const lives = new Float32Array(n * 4);
  const offsets = new Float32Array(n * 4);
  const sizes = new Float32Array(n * 4 * 2);
  const spins = new Float32Array(n * 4);
  const uvs = new Float32Array(n * 4 * 2);
  const indices = new Uint16Array(n * 6);
  const CORNER: ReadonlyArray<readonly [number, number]> = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ];
  for (let i = 0; i < n; i++) {
    const x = (Math.random() * 2 - 1) * opts.spreadX;
    const z = (Math.random() * 2 - 1) * opts.spreadZ;
    const y = opts.minY + Math.random() * (opts.maxY - opts.minY);
    const life = opts.lifeMin + Math.random() * (opts.lifeMax - opts.lifeMin);
    const offset = Math.random() * life;
    const sizeW =
      opts.sizeMin[0] + Math.random() * (opts.sizeMax[0] - opts.sizeMin[0]);
    const sizeH =
      opts.sizeMin[1] + Math.random() * (opts.sizeMax[1] - opts.sizeMin[1]);
    const spin = Math.random() * Math.PI * 2;
    // `drift` is the total displacement over one lifetime (drift * lifeT in the
    // shader), so a per-particle speed variation lands on `speed * life`.
    const speed = opts.fallSpeed * (0.85 + Math.random() * 0.3);
    const driftX = (opts.windX + (Math.random() * 2 - 1) * 2) * life;
    const driftY = -speed * life;
    const driftZ = (opts.windZ + (Math.random() * 2 - 1) * 2) * life;
    const v0 = i * 4;
    for (let j = 0; j < 4; j++) {
      const vi = v0 + j;
      const vs = vi * 3;
      const ct = vi * 2;
      positions[vs] = x;
      positions[vs + 1] = y;
      positions[vs + 2] = z;
      drifts[vs] = driftX;
      drifts[vs + 1] = driftY;
      drifts[vs + 2] = driftZ;
      corners[ct] = CORNER[j][0];
      corners[ct + 1] = CORNER[j][1];
      uvs[ct] = (CORNER[j][0] + 1) / 2;
      uvs[ct + 1] = (CORNER[j][1] + 1) / 2;
      lives[vi] = life;
      offsets[vi] = offset;
      sizes[ct] = sizeW;
      sizes[ct + 1] = sizeH;
      spins[vi] = spin;
    }
    indices[i * 6 + 0] = v0;
    indices[i * 6 + 1] = v0 + 1;
    indices[i * 6 + 2] = v0 + 2;
    indices[i * 6 + 3] = v0;
    indices[i * 6 + 4] = v0 + 2;
    indices[i * 6 + 5] = v0 + 3;
  }
  return {
    positions,
    corners,
    drifts,
    lives,
    offsets,
    sizes,
    spins,
    uvs,
    indices,
  };
};

const makeParticleGeometry = (opts: ParticleOpts): BufferGeometry => {
  const g = buildParticleGeometry(opts);
  const geometry = new BufferGeometry();
  geometry.setAttribute("particlePos", new BufferAttribute(g.positions, 3));
  geometry.setAttribute("corner", new BufferAttribute(g.corners, 2));
  geometry.setAttribute("drift", new BufferAttribute(g.drifts, 3));
  geometry.setAttribute("life", new BufferAttribute(g.lives, 1));
  geometry.setAttribute("offset", new BufferAttribute(g.offsets, 1));
  geometry.setAttribute("size", new BufferAttribute(g.sizes, 2));
  geometry.setAttribute("spin", new BufferAttribute(g.spins, 1));
  geometry.setAttribute("uv", new BufferAttribute(g.uvs, 2));
  geometry.setIndex(g.indices);
  return geometry;
};

/**
 * Rain/snow billboard material. All particle physics runs in the vertex
 * shader: each particle's lifetime is `mod(time + offset, life) / life`, so it
 * recycles at the loop wrap (hidden by a fade near both ends), and it drifts
 * along its baked `drift` displacement plus a `sin` sway. The quad is
 * billboarded in view space (fixed world-unit size), so the perspective
 * projection shrinks distant particles naturally.
 *
 * The horizontal (x/z) position is wrapped by `tileSize` against the camera
 * (`camPos`): the baked positions span one full tile, so wrapping keeps each
 * drop anchored to the same world cell yet always within `tileSize/2` of the
 * camera. As the camera crosses a cell boundary the pattern wraps invisibly
 * (uniform distribution), so the field reads as infinite terrain-fixed rain
 * instead of a box dragged along with the player.
 */
export class ParticleMaterial extends NodeMaterial {
  /** Shader-clock seconds; advances the per-particle lifetime mod loops. */
  time = 0;
  /** 0..1 storm intensity; the whole system fades in and out with it. */
  intensity = 0;
  /** Particle albedo (rain blue-grey, snow white). */
  tint: [number, number, number] = [0.75, 0.8, 0.9];
  /** Horizontal sway amplitude in world units; zero for rain, larger for snow. */
  sway = 0;
  /** When true the fragment is a soft disc (snow); otherwise a soft rectangle (rain streak). */
  disc = false;
  /** World-unit wrap period for the x/z anchoring. */
  tileSize = 200;
  /** Camera world position; the x/z field wraps around it. */
  camPos: [number, number, number] = [0, 0, 0];

  private timeUniform: UniformNode<"float"> | undefined;
  private intensityUniform: UniformNode<"float"> | undefined;
  private tintUniform: UniformNode<"vec3"> | undefined;
  private swayUniform: UniformNode<"float"> | undefined;
  private camPosUniform: UniformNode<"vec3"> | undefined;
  private tileUniform: UniformNode<"float"> | undefined;

  constructor() {
    super();
    this.transparent = true;
    this.depthWrite = false;
    this.side = Side.DoubleSide;
  }

  protected setup(b: Builder, _scene: Scene): void {
    this.timeUniform = b.materialUniform("time", "float", () => this.time);
    this.intensityUniform = b.materialUniform(
      "intensity",
      "float",
      () => this.intensity,
    );
    this.tintUniform = b.materialUniform("tint", "vec3", () => this.tint);
    this.swayUniform = b.materialUniform("sway", "float", () => this.sway);
    this.camPosUniform = b.materialUniform("camPos", "vec3", () => this.camPos);
    this.tileUniform = b.materialUniform(
      "tileSize",
      "float",
      () => this.tileSize,
    );
  }

  protected buildVertexBody(b: Builder): Node<"vec4"> {
    const time = this.timeUniform ?? float(0);
    const sway = this.swayUniform ?? float(0);
    const cam = this.camPosUniform ?? vec3(0);
    const tile = this.tileUniform ?? float(200);
    const pos = b.attribute("particlePos", "vec3");
    const corner = b.attribute("corner", "vec2");
    const drift = b.attribute("drift", "vec3");
    const life = b.attribute("life", "float");
    const offset = b.attribute("offset", "float");
    const size = b.attribute("size", "vec2");
    const spin = b.attribute("spin", "float");
    const uv = b.attribute("uv", "vec2");

    // loop a particle through its lifetime; the fade masks the wrap
    const lifeT = mod(time.add(offset), life).div(life).toVar();
    const fadeIn = smoothstep(float(0), float(0.08), lifeT);
    const fadeOut = float(1).sub(smoothstep(float(0.8), float(1), lifeT));
    const fade = fadeIn.mul(fadeOut).toVar();

    const anim = vec3(
      pos.x.add(drift.x.mul(lifeT)).add(
        sin(time.mul(float(1.4)).add(spin))
          .mul(sway)
          .mul(float(1).sub(lifeT)),
      ),
      pos.y.add(drift.y.mul(lifeT)),
      pos.z.add(drift.z.mul(lifeT)).add(
        sin(time.mul(float(1.1)).add(spin))
          .mul(sway)
          .mul(float(1).sub(lifeT)),
      ),
    ).toVar();

    // wrap the animated local x/z into [-tile/2, tile/2) around the camera so
    // the field is world-anchored yet always surrounds the player; y is kept
    // as-is so the vertical box follows the camera.
    const half = tile.mul(float(0.5));
    const wrapX = mod(anim.x.sub(cam.x).add(half), tile).sub(half).toVar();
    const wrapZ = mod(anim.z.sub(cam.z).add(half), tile).sub(half).toVar();
    const world = vec3(
      cam.x.add(wrapX),
      cam.y.add(anim.y),
      cam.z.add(wrapZ),
    ).toVar();

    // billboard in view space: the quad expands along the camera-right/up axes
    const mvPos = b.viewMatrix.mul(vec4(world, float(1))).toVar();
    const offsetPx = corner.mul(size.mul(fade)).toVar();
    const billboard = mvPos.xyz
      .add(vec3(offsetPx.x, offsetPx.y, float(0)))
      .toVar();

    b.varying("vUv", "vec2").assign(uv);
    b.varying("vFade", "float").assign(fade);
    return b.projectionMatrix.mul(vec4(billboard, mvPos.w));
  }

  protected buildFragmentBody(b: Builder): Node<"vec4"> {
    const uv = b.varying("vUv", "vec2");
    const fade = b.varying("vFade", "float");
    const tint = this.tintUniform ?? vec3(1);
    const intensity = this.intensityUniform ?? float(0);
    const centered = uv.sub(vec2(0.5)).toVar();
    let alpha: Node<"float">;
    if (this.disc) {
      const ptDist = centered.length();
      alpha = float(1).sub(smoothstep(float(0.42), float(0.5), ptDist));
    } else {
      const edge = vec2(1).sub(
        smoothstep(float(0.4), float(0.5), centered.abs().mul(vec2(2))),
      );
      alpha = edge.x.mul(edge.y);
    }
    return vec4(tint, alpha.mul(fade).mul(intensity));
  }
}

/** One particle system: a mesh whose material's intensity/visibility is ramped. */
class ParticleSystem {
  readonly mesh: Mesh;
  readonly material: ParticleMaterial;
  private level = 0;
  private readonly rampSeconds: number;

  constructor(
    material: ParticleMaterial,
    geometry: BufferGeometry,
    rampSeconds: number,
  ) {
    this.material = material;
    this.mesh = new Mesh(geometry, material);
    this.mesh.visible = false;
    this.rampSeconds = rampSeconds;
  }

  /** Moves the fade level toward `target` at the ramp speed and syncs the material. */
  setTarget(target: number, dt: number): void {
    const step = dt / this.rampSeconds;
    this.level =
      this.level < target
        ? Math.min(target, this.level + step)
        : Math.max(target, this.level - step);
    this.material.intensity = this.level;
    this.mesh.visible = this.level > 0.005;
  }

  follow(camera: PerspectiveCamera, time: number): void {
    this.material.time = time;
    this.material.camPos = [
      camera.position.x,
      camera.position.y,
      camera.position.z,
    ];
    this.mesh.position.copy(camera.position);
  }
}

interface ActiveStrike {
  main: Line2;
  branch: Line2 | null;
  state: "active" | "fade";
  timeLeft: number;
  x: number;
  z: number;
  groundY: number;
  topY: number;
}

/** Builds a jagged polyline from a cloud-height start down to a ground point. */
const boltPath = (
  x0: number,
  y0: number,
  z0: number,
  x1: number,
  y1: number,
  z1: number,
  segments: number,
  jitter: number,
): number[] => {
  const pts: number[] = [x0, y0, z0];
  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    pts.push(
      x0 + (x1 - x0) * t + (Math.random() * 2 - 1) * jitter,
      y0 + (y1 - y0) * t,
      z0 + (z1 - z0) * t + (Math.random() * 2 - 1) * jitter,
    );
  }
  pts.push(x1, y1, z1);
  return pts;
};

/** Rewrites a bolt's geometry from a polyline, flagging the buffers dirty. */
const setBoltGeometry = (geometry: LineGeometry, pts: number[]): void => {
  const pairs: number[] = [];
  for (let i = 0; i + 3 <= pts.length - 3; i += 3) {
    pairs.push(
      pts[i],
      pts[i + 1],
      pts[i + 2],
      pts[i + 3],
      pts[i + 4],
      pts[i + 5],
    );
  }
  geometry.setPositions(pairs);
  geometry.getAttribute("instanceStart")!.needsUpdate = true;
  geometry.getAttribute("instanceEnd")!.needsUpdate = true;
};

export interface WeatherControllerParams {
  scene: Scene;
  /** Ground-height lookup at an absolute world XZ, for lightning targets. */
  groundHeight: (x: number, z: number) => number;
  /**
   * Called whenever a lightning strike spawns, with the strike's target world
   * position. A plain event — the weather controller has no idea what
   * consumes it (e.g. a sound controller playing thunder).
   */
  onStrike?: (x: number, z: number) => void;
  seed?: number;
  rampSeconds?: number;
  strikeInterval?: number;
}

/**
 * Applies the weather schedule (`./weather`) to the scene: rain and snow
 * particle systems (animated entirely in the vertex shader), thunder
 * lightning bolts and strike flashes. `tick` advances everything and returns
 * the current weather plus a smoothly-ramped intensity; the caller feeds that
 * into `applyWeather` to tint the sky and lights. Holds no reference to a
 * renderer or a console — only scene objects it owns.
 */
export class WeatherController {
  private readonly groundHeight: (x: number, z: number) => number;
  private readonly onStrike: ((x: number, z: number) => void) | undefined;
  private readonly seed: number;
  private readonly rampSeconds: number;
  private readonly strikeMean: number;

  private readonly rain: ParticleSystem;
  private readonly snow: ParticleSystem;
  private readonly bolts: Line2[];
  private readonly flashMesh: Mesh;
  private readonly flashMaterial: MeshBasicMaterial;

  private forcedWeather: Weather | null = null;
  private intensity = 0;
  private time = 0;
  private lastClockSeconds = 0;
  private inThunder = false;
  private nextStrikeAt = 0;
  private strike: ActiveStrike | null = null;
  private flashOpacity = 0;
  /** The schedule's current weather (drives particles and lightning). */
  private scheduleWeather: Weather = "clear";
  /** The weather whose lighting is currently applied, for the ramp-out. */
  private tintWeather: Weather = "clear";

  constructor(params: WeatherControllerParams) {
    const { scene, groundHeight, onStrike, seed, rampSeconds, strikeInterval } =
      params;
    this.groundHeight = groundHeight;
    this.onStrike = onStrike;
    this.seed = seed ?? WEATHER_SEED;
    this.rampSeconds = rampSeconds ?? RAMP_SECONDS;
    this.strikeMean = strikeInterval ?? STRIKE_MEAN_SECONDS;

    this.rain = new ParticleSystem(
      new ParticleMaterial(),
      makeParticleGeometry(RAIN_OPTS),
      this.rampSeconds,
    );
    this.rain.material.tileSize = RAIN_OPTS.tileSize;
    this.rain.material.tint = [0.75, 0.8, 0.9];
    this.rain.material.sway = 0.4;
    scene.add(this.rain.mesh);

    this.snow = new ParticleSystem(
      new ParticleMaterial(),
      makeParticleGeometry(SNOW_OPTS),
      this.rampSeconds,
    );
    this.snow.material.tileSize = SNOW_OPTS.tileSize;
    this.snow.material.tint = [0.95, 0.97, 1];
    this.snow.material.sway = 1.6;
    this.snow.material.disc = true;
    scene.add(this.snow.mesh);

    this.bolts = [this.makeBolt(scene), this.makeBolt(scene)];

    this.flashMaterial = new MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
    });
    this.flashMaterial.blending = Blending.AdditiveBlending;
    this.flashMaterial.depthTest = false;
    this.flashMaterial.depthWrite = false;
    this.flashMesh = new Mesh(
      new BoxGeometry(3000, 3000, 3000),
      this.flashMaterial,
    );
    this.flashMesh.visible = false;
    scene.add(this.flashMesh);
  }

  private makeBolt(scene: Scene): Line2 {
    const material = new Line2NodeMaterial({
      color: 0xcfe0ff,
      linewidth: 0.7,
      worldUnits: true,
      transparent: true,
      opacity: 0,
    });
    material.blending = Blending.AdditiveBlending;
    material.depthWrite = false;
    const bolt = new Line2(new LineGeometry(), material);
    bolt.visible = false;
    scene.add(bolt);
    return bolt;
  }

  private currentState(clockSeconds: number): WeatherState {
    if (this.forcedWeather !== null) {
      return {
        weather: this.forcedWeather,
        startedAt: -Infinity,
        endsAt: Infinity,
      };
    }
    return weatherAt(this.seed, clockSeconds);
  }

  private spawnStrike(x: number, z: number): void {
    const groundY = this.groundHeight(x, z);
    if (!Number.isFinite(groundY)) {
      return;
    }
    this.onStrike?.(x, z);
    this.strike = {
      main: this.bolts[0],
      branch: this.bolts[1],
      state: "active",
      timeLeft: BOLT_ACTIVE_SECONDS,
      x,
      z,
      groundY,
      topY: groundY + 60 + Math.random() * 40,
    };
    this.strike.main.material.opacity = 1;
    this.strike.main.visible = true;
    if (this.strike.branch !== null) {
      this.strike.branch.material.opacity = 0.7;
      this.strike.branch.visible = true;
    }
    this.flashOpacity = 0.9;
    this.rewriteStrike();
  }

  private rewriteStrike(): void {
    const s = this.strike;
    if (s === null) {
      return;
    }
    const horizontal = Math.hypot(s.x, s.z);
    const jitter = Math.max(3, horizontal * 0.15);
    const main = boltPath(s.x, s.topY, s.z, s.x, s.groundY, s.z, 9, jitter);
    setBoltGeometry(s.main.geometry, main);
    if (s.branch !== null) {
      // branch forks from roughly halfway down the main bolt and lands offset
      const bx = s.x + (Math.random() * 2 - 1) * jitter * 1.5;
      const bz = s.z + (Math.random() * 2 - 1) * jitter * 1.5;
      const by =
        s.groundY + (s.topY - s.groundY) * (0.4 + Math.random() * 0.25);
      const ex = bx + (Math.random() * 2 - 1) * 30;
      const ez = bz + (Math.random() * 2 - 1) * 30;
      const ey = s.groundY + 10 + Math.random() * 30;
      const branch = boltPath(bx, by, bz, ex, ey, ez, 5, jitter * 0.6);
      setBoltGeometry(s.branch.geometry, branch);
    }
  }

  private updateStrike(dt: number): void {
    const s = this.strike;
    if (s === null) {
      return;
    }
    s.timeLeft -= dt;
    if (s.state === "active") {
      if (s.timeLeft <= 0) {
        s.state = "fade";
        s.timeLeft = BOLT_FADE_SECONDS;
      } else {
        // fresh jitter every frame while lit: the bolt flickers
        this.rewriteStrike();
      }
    } else {
      const t = 1 - Math.max(0, s.timeLeft) / BOLT_FADE_SECONDS;
      s.main.material.opacity = 1 - t;
      if (s.branch !== null) {
        s.branch.material.opacity = (1 - t) * 0.7;
      }
      if (s.timeLeft <= 0) {
        s.main.visible = false;
        if (s.branch !== null) {
          s.branch.visible = false;
        }
        this.strike = null;
      }
    }
  }

  /**
   * Advances the weather systems. `clockSeconds` is the day-night clock's
   * shown time, so weather and sun share a time-scale.
   */
  tick(
    dt: number,
    camera: PerspectiveCamera,
    clockSeconds: number,
  ): WeatherView {
    this.time += dt;
    this.lastClockSeconds = clockSeconds;
    const weather = this.currentState(clockSeconds).weather;

    if (weather !== this.scheduleWeather) {
      this.scheduleWeather = weather;
      if (weather !== "clear") {
        // keep tinting with the new storm during its ramp-in
        this.tintWeather = weather;
      }
    }
    const target = weather === "clear" ? 0 : 1;
    const step = dt / this.rampSeconds;
    this.intensity =
      this.intensity < target
        ? Math.min(target, this.intensity + step)
        : Math.max(target, this.intensity - step);
    if (this.intensity <= 0.001) {
      this.tintWeather = "clear";
    }

    this.rain.setTarget(
      weather === "rain" || weather === "thunder" ? 1 : 0,
      dt,
    );
    this.snow.setTarget(weather === "snow" ? 1 : 0, dt);
    this.rain.follow(camera, this.time);
    this.snow.follow(camera, this.time);

    if (weather === "thunder" && this.intensity > 0.4) {
      if (!this.inThunder) {
        this.inThunder = true;
        this.nextStrikeAt = this.time + 0.5 + Math.random() * 1.5;
      }
      if (this.strike === null && this.time >= this.nextStrikeAt) {
        this.spawnStrike(
          camera.position.x + (Math.random() * 2 - 1) * STRIKE_RADIUS,
          camera.position.z + (Math.random() * 2 - 1) * STRIKE_RADIUS,
        );
        this.nextStrikeAt = this.time + this.strikeMean * (0.4 + Math.random());
      }
    } else {
      this.inThunder = false;
    }
    this.updateStrike(dt);

    if (this.flashOpacity > 0) {
      this.flashOpacity = Math.max(
        0,
        this.flashOpacity - dt / FLASH_DECAY_SECONDS,
      );
    }
    this.flashMesh.position.copy(camera.position);
    this.flashMaterial.opacity = this.flashOpacity;
    this.flashMesh.visible = this.flashOpacity > 0.002;

    return { weather: this.tintWeather, intensity: this.intensity };
  }

  /** Pins the weather (ignoring the schedule) or, with `"auto"`, resumes it. */
  setWeather(weather: Weather | "auto"): void {
    this.forcedWeather = weather === "auto" ? null : weather;
  }

  describe(): string {
    const state = this.currentState(this.lastClockSeconds);
    const mode = this.forcedWeather === null ? "auto" : "forced";
    const until = Number.isFinite(state.endsAt)
      ? `until ${state.endsAt.toFixed(0)}s`
      : "indefinite";
    return `weather: ${state.weather} (${mode}) | intensity=${this.intensity.toFixed(2)} | ${until}`;
  }
}
