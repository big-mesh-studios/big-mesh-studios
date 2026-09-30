// The dust storms a place script drives, drawn from one billboard shader shared
// by both shapes: a fan of large quads whose motion runs entirely in the vertex
// shader — the same shape the fire, explosion, and particle renderers use — with
// a seamless Perlin fBm texture sampled in the fragment shader for the dust. A
// `wall` spreads the quads over a slab the storm's width, height, and depth
// size; a `funnel` sets them on a tapering cone and turns them about its axis.
// A storm the script dispatches again is moved rather than restarted, so a
// pursuing front keeps one animation running as it advances.
//
// The noise is baked once into a repeating texture from the terrain's own
// `PerlinNoise2D`: that noise is periodic with a 256-texel lattice, and every
// fBm octave's period divides it, so sampling one whole period across the image
// tiles without a seam. Sampling a texture rather than evaluating fBm per pixel
// keeps a screen-filling storm's fragment cost to two taps.
import type { Node, UniformNode } from "@random-mesh/rmsl";
import {
  cos,
  float,
  mix,
  mod,
  sin,
  smoothstep,
  vec2,
  vec3,
  vec4,
} from "@random-mesh/rmsl";
import {
  Blending,
  BufferAttribute,
  BufferGeometry,
  Builder,
  DataTexture,
  Group,
  Mesh,
  NodeMaterial,
  RGBAFormat,
  RepeatWrapping,
  Scene,
  Side,
  UnsignedByteType,
  type Texture,
} from "@random-mesh/rmsl/scene";
import { PerlinNoise2D } from "../world/noise";
import {
  STORM_DUST_COLOR,
  type ScriptedStorm,
  type StormKind,
} from "../world/scripted-storm";

/** How many billboards make a wall. */
const WALL_COUNT = 168;
/** How many billboards make a funnel. */
const FUNNEL_COUNT = 216;
/** How long one billboard lives before it recycles, in seconds. */
const LIFE_SECONDS: [number, number] = [2.2, 4.2];
/** How wide one wall billboard is, as a fraction of the storm's largest side. */
const WALL_SIZE_FRACTION = 0.3;
/** How wide one funnel billboard is, as a fraction of the storm's height. */
const FUNNEL_SIZE_FRACTION = 0.12;
/** The size one billboard draws at when a script asks for a storm of its own. */
const SIZE_JITTER: [number, number] = [0.5, 1.3];
/** The side of the baked fBm noise texture, in texels. */
export const STORM_NOISE_SIZE = 128;
/** The lattice period `PerlinNoise2D` repeats at, in noise units. */
const NOISE_PERIOD = 256;
/**
 * How far off the lattice each texel samples. A whole period mapped across the
 * image lands every texel exactly on a lattice point, where Perlin is zero, so
 * the samples are nudged off it; the offset keeps the tile periodic.
 */
const NOISE_OFFSET = 0.5;
/** How many octaves of fBm the dust texture bakes. */
const NOISE_OCTAVES = 4;
/** How many times the dust texture repeats across one billboard. */
const NOISE_SCALE = 3;
/** How many storm materials exist before the oldest is reused, bounding shaders. */
const MATERIAL_POOL = 4;

/**
 * Bakes a seamless tile of Perlin fBm into a repeating texture. `PerlinNoise2D`
 * repeats every `NOISE_PERIOD` units, and every octave's period divides it, so
 * sampling exactly one period across the image makes opposite edges match; the
 * texels are then rescaled to use the full 0..255 range for contrast.
 */
export const buildStormNoiseTexture = (): DataTexture => {
  const noise = new PerlinNoise2D(0x51c2);
  const data = new Uint8Array(STORM_NOISE_SIZE * STORM_NOISE_SIZE * 4);
  const values = new Float32Array(STORM_NOISE_SIZE * STORM_NOISE_SIZE);
  let low = Infinity;
  let high = -Infinity;
  for (let y = 0; y < STORM_NOISE_SIZE; y++) {
    for (let x = 0; x < STORM_NOISE_SIZE; x++) {
      const u = (x / STORM_NOISE_SIZE) * NOISE_PERIOD + NOISE_OFFSET;
      const v = (y / STORM_NOISE_SIZE) * NOISE_PERIOD + NOISE_OFFSET;
      const value = noise.fbm(u, v, NOISE_OCTAVES);
      values[y * STORM_NOISE_SIZE + x] = value;
      low = Math.min(low, value);
      high = Math.max(high, value);
    }
  }
  const span = Math.max(0.0001, high - low);
  for (let i = 0; i < values.length; i++) {
    const level = Math.round(((values[i] - low) / span) * 255);
    data[i * 4] = level;
    data[i * 4 + 1] = level;
    data[i * 4 + 2] = level;
    data[i * 4 + 3] = 255;
  }
  const texture = new DataTexture(
    data,
    STORM_NOISE_SIZE,
    STORM_NOISE_SIZE,
    1,
    RGBAFormat,
    UnsignedByteType,
  );
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
};

/** The corner offsets of a quad, in order around it. */
const CORNER: ReadonlyArray<readonly [number, number]> = [
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
];

/**
 * One storm's billboard geometry in the storm's own unit frame: `count` quads
 * of four vertices, each carrying a centre, a drift, a lifetime, a phase, a
 * relative size, and a corner. A wall's centres spread over a slab; a funnel's
 * sit on a cone wide aloft and narrow at the ground. Arrays are written once
 * and never touched — the shader animates them from the material's uniforms.
 */
const buildStormGeometry = (kind: StormKind): BufferGeometry => {
  const count = kind === "funnel" ? FUNNEL_COUNT : WALL_COUNT;
  const positions = new Float32Array(count * 4 * 3);
  const corners = new Float32Array(count * 4 * 2);
  const drifts = new Float32Array(count * 4 * 3);
  const lives = new Float32Array(count * 4);
  const offsets = new Float32Array(count * 4);
  const sizes = new Float32Array(count * 4);
  const phases = new Float32Array(count * 4);
  const uvs = new Float32Array(count * 4 * 2);
  const indices = new Uint16Array(count * 6);
  for (let i = 0; i < count; i++) {
    const life =
      LIFE_SECONDS[0] + Math.random() * (LIFE_SECONDS[1] - LIFE_SECONDS[0]);
    const offset = Math.random() * life;
    const phase = Math.random() * Math.PI * 2;
    const jitter =
      SIZE_JITTER[0] + Math.random() * (SIZE_JITTER[1] - SIZE_JITTER[0]);
    let px: number;
    let py: number;
    let pz: number;
    let dx: number;
    let dy: number;
    let dz: number;
    let size: number;
    if (kind === "funnel") {
      // A tornado is wide where it meets the cloud and narrow at touchdown, so
      // the cone's radius grows with height and the billboards with it.
      const angle = phase;
      const radius = 0.15 + 0.85 * Math.pow(Math.random(), 0.6);
      const height = Math.random();
      px = Math.cos(angle) * radius;
      py = height;
      pz = Math.sin(angle) * radius;
      dx = 0;
      dy = 0.1 + Math.random() * 0.2;
      dz = 0;
      size = (0.4 + 0.9 * height) * jitter;
    } else {
      px = Math.random() * 2 - 1;
      py = Math.random();
      pz = Math.random() * 2 - 1;
      dx = 0.25 + Math.random() * 0.4;
      dy = Math.random() * 0.25;
      dz = (Math.random() * 2 - 1) * 0.05;
      size = jitter;
    }
    const v0 = i * 4;
    for (let j = 0; j < 4; j++) {
      const vi = v0 + j;
      const vs = vi * 3;
      const ct = vi * 2;
      positions[vs] = px;
      positions[vs + 1] = py;
      positions[vs + 2] = pz;
      corners[ct] = CORNER[j][0];
      corners[ct + 1] = CORNER[j][1];
      drifts[vs] = dx;
      drifts[vs + 1] = dy;
      drifts[vs + 2] = dz;
      lives[vi] = life;
      offsets[vi] = offset;
      sizes[vi] = size;
      phases[vi] = phase;
      uvs[ct] = (CORNER[j][0] + 1) / 2;
      uvs[ct + 1] = (CORNER[j][1] + 1) / 2;
    }
    indices[i * 6 + 0] = v0;
    indices[i * 6 + 1] = v0 + 1;
    indices[i * 6 + 2] = v0 + 2;
    indices[i * 6 + 3] = v0;
    indices[i * 6 + 4] = v0 + 2;
    indices[i * 6 + 5] = v0 + 3;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("particlePos", new BufferAttribute(positions, 3));
  geometry.setAttribute("corner", new BufferAttribute(corners, 2));
  geometry.setAttribute("drift", new BufferAttribute(drifts, 3));
  geometry.setAttribute("life", new BufferAttribute(lives, 1));
  geometry.setAttribute("offset", new BufferAttribute(offsets, 1));
  geometry.setAttribute("size", new BufferAttribute(sizes, 1));
  geometry.setAttribute("phase", new BufferAttribute(phases, 1));
  geometry.setAttribute("uv", new BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return geometry;
};

/**
 * The dust material: every storm shares one shader whose uniforms the shapes
 * and sizes set. All motion runs in the vertex shader — each billboard recycles
 * on `mod(time + offset, life)`, drifts on its own baked vector, and is turned
 * about the axis for a funnel. The fragment samples the seamless fBm texture
 * twice at different scales and scrolls, shapes the dust with a vertical
 * gradient that thins toward the sky and a soft quad edge, and tints it from a
 * dark base into the script's dust colour. Normal-blended, because dust sits in
 * the light rather than glowing like a flame.
 */
export class StormMaterial extends NodeMaterial {
  /** The storm's age in seconds, from 0 at the moment it appeared. */
  time = 0;
  /** 1 for a funnel, 0 for a wall. */
  kind = 0;
  /** 0..1 how thick the dust reads; the whole storm fades with it. */
  intensity = 1;
  /** Linear RGB dust colour. */
  color: [number, number, number] = [...STORM_DUST_COLOR] as [
    number,
    number,
    number,
  ];
  /** A funnel's rotation rate, in radians per second. */
  spin = 0;
  /** The world-unit width of one billboard at full size. */
  size = 1;

  private timeUniform: UniformNode<"float"> | undefined;
  private kindUniform: UniformNode<"float"> | undefined;
  private intensityUniform: UniformNode<"float"> | undefined;
  private colorUniform: UniformNode<"vec3"> | undefined;
  private spinUniform: UniformNode<"float"> | undefined;
  private sizeUniform: UniformNode<"float"> | undefined;
  private noiseSampler: UniformNode<"sampler2D"> | undefined;

  constructor(private readonly noise: Texture) {
    super();
    this.transparent = true;
    this.depthWrite = false;
    this.side = Side.DoubleSide;
    this.blending = Blending.NormalBlending;
  }

  protected setup(b: Builder, _scene: Scene): void {
    this.timeUniform = b.materialUniform("time", "float", () => this.time);
    this.kindUniform = b.materialUniform("kind", "float", () => this.kind);
    this.intensityUniform = b.materialUniform(
      "intensity",
      "float",
      () => this.intensity,
    );
    this.colorUniform = b.materialUniform("uColor", "vec3", () => this.color);
    this.spinUniform = b.materialUniform("spin", "float", () => this.spin);
    this.sizeUniform = b.materialUniform("uSize", "float", () => this.size);
    this.noiseSampler = b.sampler("dustNoise", "sampler2D", () => this.noise);
  }

  protected buildVertexBody(b: Builder): Node<"vec4"> {
    const time = this.timeUniform ?? float(0);
    const kind = this.kindUniform ?? float(0);
    const spin = this.spinUniform ?? float(0);
    const pos = b.attribute("particlePos", "vec3");
    const corner = b.attribute("corner", "vec2");
    const drift = b.attribute("drift", "vec3");
    const life = b.attribute("life", "float");
    const offset = b.attribute("offset", "float");
    const size = b.attribute("size", "float");
    const phase = b.attribute("phase", "float");
    const uv = b.attribute("uv", "vec2");

    // Each billboard runs its age once around a loop, and the fade masks the
    // wrap at both ends so a recycled quad is never seen to pop.
    const lifeT = mod(time.add(offset), life).div(life).toVar();
    const fadeIn = smoothstep(float(0), float(0.15), lifeT);
    const fadeOut = float(1).sub(smoothstep(float(0.7), float(1), lifeT));
    const fade = fadeIn.mul(fadeOut).toVar();

    // A wall's dust drifts across its width and rises a little, with a sway.
    const rise = drift.mul(lifeT);
    const sway = sin(time.mul(float(2)).add(phase))
      .mul(float(0.05))
      .mul(float(1).sub(lifeT));
    const wall = vec3(
      pos.x.add(rise.x).add(sway),
      pos.y.add(rise.y),
      pos.z.add(rise.z),
    ).toVar();

    // A funnel's dust turns about the vertical axis, one cone of dust churning.
    const angle = time.mul(spin).add(phase).toVar();
    const ca = cos(angle);
    const sa = sin(angle);
    const funnel = vec3(
      pos.x.mul(ca).sub(pos.z.mul(sa)),
      pos.y.add(rise.y),
      pos.x.mul(sa).add(pos.z.mul(ca)),
    ).toVar();

    const animLocal = kind.greaterThan(float(0.5)).select(funnel, wall).toVar();
    const mvPos = b.viewMatrix
      .mul(b.modelMatrix.mul(vec4(animLocal, float(1))))
      .toVar();
    const drawSize = size
      .mul(this.sizeUniform ?? float(1))
      .mul(fade)
      .toVar();
    const offset2 = corner.mul(drawSize).toVar();
    const billboard = mvPos.xyz
      .add(vec3(offset2.x, offset2.y, float(0)))
      .toVar();

    b.varying("vUv", "vec2").assign(uv);
    b.varying("vFade", "float").assign(fade);
    // Each billboard carries its own phase, so two quads never sample the same
    // patch of dust and a wall of them does not read as one repeating tile.
    b.varying("vSeed", "float").assign(phase);
    return b.projectionMatrix.mul(vec4(billboard, mvPos.w));
  }

  protected buildFragmentBody(b: Builder): Node<"vec4"> {
    const uv = b.varying("vUv", "vec2");
    const fade = b.varying("vFade", "float");
    const seed = b.varying("vSeed", "float");
    const time = this.timeUniform ?? float(0);
    const intensity = this.intensityUniform ?? float(1);
    const color =
      this.colorUniform ??
      vec3(STORM_DUST_COLOR[0], STORM_DUST_COLOR[1], STORM_DUST_COLOR[2]);
    const noise = this.noiseSampler;
    const jitter = vec2(seed, seed.mul(float(1.7))).toVar();

    // Two taps of the same seamless dust, scrolled against each other and
    // seeded per billboard, read as a denser billow than one tap alone.
    const first =
      noise === undefined
        ? float(0.5)
        : noise.texture(
            uv
              .mul(float(NOISE_SCALE))
              .add(jitter)
              .add(vec2(time.mul(float(0.03)), time.mul(float(0.01)))),
          ).r;
    const second =
      noise === undefined
        ? float(0.5)
        : noise.texture(
            uv
              .mul(float(NOISE_SCALE * 2.7))
              .add(jitter)
              .sub(vec2(time.mul(float(0.05)), float(0))),
          ).r;
    const density = first
      .mul(float(0.6))
      .add(second.mul(float(0.4)))
      .toVar();

    // Dense at the ground, thinning toward the sky so the top dissolves.
    const vertical = float(1).sub(smoothstep(float(0.2), float(1), uv.y));
    // Fade the quad out in a disc rather than a square, so overlapping
    // billboards read as round puffs of dust and never show their corners.
    const centered = uv.sub(vec2(0.5)).toVar();
    const radius = centered.length().toVar();
    const edge = float(1).sub(smoothstep(float(0.15), float(0.5), radius));

    const base = mix(vec3(0.34, 0.27, 0.19), color, density).toVar();
    const lit = mix(base, base.mul(float(1.3)), uv.y).toVar();
    const alpha = smoothstep(float(0.2), float(0.8), density)
      .mul(vertical)
      .mul(edge)
      .mul(fade)
      .mul(intensity)
      .toVar();
    return vec4(lit, alpha);
  }
}

/** One running storm's mesh, material, and the moment it appeared. */
interface Storm {
  mesh: Mesh;
  material: StormMaterial;
  kind: StormKind;
  started: number;
}

/**
 * Draws the dust storms a place script drives. The set reconciles against the
 * host's storm list every tick, the same way the particle renderer reconciles
 * its emitters; a storm dispatched again with the same id is moved and restyled
 * rather than restarted, so an advancing front keeps one animation. Both shapes
 * share one geometry each and a small pooled material set, so a run of storms
 * compiles a fixed number of shaders.
 */
export class VoxelStorm {
  /** The scene group the storms draw in; add it to the world's scene. */
  readonly group = new Group();

  private readonly wallGeometry = buildStormGeometry("wall");
  private readonly funnelGeometry = buildStormGeometry("funnel");
  private readonly noise = buildStormNoiseTexture();
  private readonly materials: StormMaterial[] = [];
  private readonly free: StormMaterial[] = [];
  private readonly storms = new Map<string, Storm>();
  private time = 0;

  constructor(private readonly getStorms: () => ScriptedStorm[]) {}

  /** Advances the storm clock and refills the mesh set from the host. */
  tick(dt: number): void {
    this.time += dt;
    const current = this.getStorms();
    for (const storm of current) {
      let held = this.storms.get(storm.id);
      if (held === undefined) {
        const material = this.takeMaterial();
        const mesh = new Mesh(
          storm.kind === "funnel" ? this.funnelGeometry : this.wallGeometry,
          material,
        );
        this.group.add(mesh);
        held = { mesh, material, kind: storm.kind, started: this.time };
        this.storms.set(storm.id, held);
      } else if (held.kind !== storm.kind) {
        held.kind = storm.kind;
        held.mesh.geometry =
          storm.kind === "funnel" ? this.funnelGeometry : this.wallGeometry;
      }
      const material = held.material;
      material.time = this.time - held.started;
      material.kind = storm.kind === "funnel" ? 1 : 0;
      material.intensity = storm.intensity;
      material.color = storm.color;
      material.spin = storm.spin * Math.PI * 2;
      material.size =
        storm.kind === "funnel"
          ? storm.height * FUNNEL_SIZE_FRACTION
          : Math.max(storm.width, storm.height) * WALL_SIZE_FRACTION;
      held.mesh.position.set(storm.x, storm.y, storm.z);
      held.mesh.rotation.y = storm.yaw;
      if (storm.kind === "funnel") {
        held.mesh.scale.set(storm.width, storm.height, storm.width);
      } else {
        held.mesh.scale.set(storm.width, storm.height, storm.depth);
      }
    }
    for (const [id, storm] of this.storms) {
      if (!current.some((held) => held.id === id)) {
        this.discard(id, storm);
      }
    }
  }

  /** Removes every storm, leaving the set ready for a fresh script. */
  clear(): void {
    for (const [id, storm] of this.storms) {
      this.discard(id, storm);
    }
  }

  private discard(id: string, storm: Storm): void {
    this.group.remove(storm.mesh);
    this.storms.delete(id);
    this.free.push(storm.material);
  }

  /** A free material, a new one while the pool has room, or the oldest's. */
  private takeMaterial(): StormMaterial {
    const free = this.free.pop();
    if (free !== undefined) {
      return free;
    }
    if (this.materials.length < MATERIAL_POOL) {
      const material = new StormMaterial(this.noise);
      this.materials.push(material);
      return material;
    }
    const oldest = [...this.storms.entries()].sort(
      (a, b) => a[1].started - b[1].started,
    )[0];
    if (oldest === undefined) {
      return this.materials[0];
    }
    this.discard(oldest[0], oldest[1]);
    return this.free.pop() as StormMaterial;
  }
}
