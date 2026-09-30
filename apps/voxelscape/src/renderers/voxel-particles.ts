// The particle emitters a place script runs, drawn from one billboard shader
// shared by every kind: a fixed fan of quads whose motion runs entirely in the
// vertex shader, the same shape the fire and explosion renderers use. A kind
// only changes the material's uniforms and blend — its colour, size, spread,
// lifetime, and whether particles rise or fly outward — so a script names a
// kind and may override a few of its numbers, never its whole look.
import type { Node, UniformNode } from "@random-mesh/rmsl";
import {
  float,
  mix,
  mod,
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
  Group,
  Mesh,
  NodeMaterial,
  Scene,
  Side,
} from "@random-mesh/rmsl/scene";
import type { ParticlePose } from "../world/scripted-particle";

/** How many billboards make one emitter. */
const PARTICLE_COUNT = 96;
/** The greatest head start any particle gets, in seconds. */
const STAGGER_SECONDS = 0.12;
/** How wide one particle billboard is relative to the emitter's `size`. */
const SIZE_JITTER: [number, number] = [0.6, 1.4];

/** One random unit direction, the way a particle flies when it drifts outward. */
const unitDirection = (): [number, number, number] => {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const sqrtTerm = Math.sqrt(v * (1 - v));
  return [
    2 * sqrtTerm * Math.cos(theta),
    2 * sqrtTerm * Math.sin(theta),
    2 * v - 1,
  ];
};

/**
 * One emitter's particle geometry in local space: `PARTICLE_COUNT` quads of
 * four billboard corners, each carrying an outward direction, an upward bias,
 * a size jitter, and a phase offset. Written once and never touched; the
 * shader animates it from the material's uniforms.
 */
const buildParticleGeometry = (): BufferGeometry => {
  const positions = new Float32Array(PARTICLE_COUNT * 4 * 3);
  const corners = new Float32Array(PARTICLE_COUNT * 4 * 2);
  const directions = new Float32Array(PARTICLE_COUNT * 4 * 3);
  const rises = new Float32Array(PARTICLE_COUNT * 4);
  const offsets = new Float32Array(PARTICLE_COUNT * 4);
  const sizes = new Float32Array(PARTICLE_COUNT * 4);
  const uvs = new Float32Array(PARTICLE_COUNT * 4 * 2);
  const indices = new Uint16Array(PARTICLE_COUNT * 6);
  const CORNER: ReadonlyArray<readonly [number, number]> = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const [dx, dy, dz] = unitDirection();
    const px = dx * 0.02;
    const py = dy * 0.02;
    const pz = dz * 0.02;
    const rise = 0.4 + Math.random() * 0.6;
    const offset = Math.random() * STAGGER_SECONDS;
    const size =
      SIZE_JITTER[0] + Math.random() * (SIZE_JITTER[1] - SIZE_JITTER[0]);
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
      directions[vs] = dx;
      directions[vs + 1] = dy;
      directions[vs + 2] = dz;
      rises[vi] = rise;
      offsets[vi] = offset;
      sizes[vi] = size;
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
  geometry.setAttribute("direction", new BufferAttribute(directions, 3));
  geometry.setAttribute("rise", new BufferAttribute(rises, 1));
  geometry.setAttribute("offset", new BufferAttribute(offsets, 1));
  geometry.setAttribute("size", new BufferAttribute(sizes, 1));
  geometry.setAttribute("uv", new BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return geometry;
};

/**
 * The particle material: every uniform a kind varies lives on an instance, so
 * one class draws a spark, a flame, a puff of smoke, or a cloud of dust. A
 * looping emitter wraps each particle's life; a one-shot runs it once and
 * stays gone. Self-lit and blending by the kind's own `additive`.
 */
class ParticleMaterial extends NodeMaterial {
  /** The emitter's age in seconds, from 0 at the moment it started. */
  time = 0;
  color: [number, number, number] = [1, 1, 1];
  size = 0.2;
  spread = 3;
  life = 1;
  upward = 0;
  loop = 0;

  private timeUniform: UniformNode<"float"> | undefined;
  private colorUniform: UniformNode<"vec3"> | undefined;
  private sizeUniform: UniformNode<"float"> | undefined;
  private spreadUniform: UniformNode<"float"> | undefined;
  private lifeUniform: UniformNode<"float"> | undefined;
  private upwardUniform: UniformNode<"float"> | undefined;
  private loopUniform: UniformNode<"float"> | undefined;

  constructor(additive: boolean) {
    super();
    this.transparent = true;
    this.depthWrite = false;
    this.side = Side.DoubleSide;
    this.blending = additive
      ? Blending.AdditiveBlending
      : Blending.NormalBlending;
  }

  protected setup(b: Builder, _scene: Scene): void {
    this.timeUniform = b.materialUniform("time", "float", () => this.time);
    this.colorUniform = b.materialUniform("uColor", "vec3", () => this.color);
    this.sizeUniform = b.materialUniform("uSize", "float", () => this.size);
    this.spreadUniform = b.materialUniform(
      "uSpread",
      "float",
      () => this.spread,
    );
    this.lifeUniform = b.materialUniform("uLife", "float", () => this.life);
    this.upwardUniform = b.materialUniform(
      "uUpward",
      "float",
      () => this.upward,
    );
    this.loopUniform = b.materialUniform("uLoop", "float", () => this.loop);
  }

  protected buildVertexBody(b: Builder): Node<"vec4"> {
    const time = (this.timeUniform ?? float(0)).toVar();
    const loop = this.loopUniform ?? float(0);
    const life = this.lifeUniform ?? float(1);
    const pos = b.attribute("particlePos", "vec3");
    const corner = b.attribute("corner", "vec2");
    const direction = b.attribute("direction", "vec3");
    const rise = b.attribute("rise", "float");
    const offset = b.attribute("offset", "float");
    const size = b.attribute("size", "float");
    const uv = b.attribute("uv", "vec2");

    // A looping emitter wraps each particle's age; a one-shot runs it once, so
    // a puff fades out and stays gone.
    const wrapped = mod(time.add(offset), life).div(life).toVar();
    const once = time.add(offset).div(life).clamp(float(0), float(1));
    const lifeT = loop.greaterThan(float(0.5)).select(wrapped, once).toVar();
    const fadeIn = smoothstep(float(0), float(0.1), lifeT);
    const fadeOut = float(1).sub(smoothstep(float(0.5), float(1), lifeT));
    const fade = fadeIn.mul(fadeOut).toVar();

    // The particle drifts along the mix of its outward direction and straight
    // up that the kind's `uUpward` chooses.
    const upward = this.upwardUniform ?? float(0);
    const drift = mix(
      direction,
      vec3(float(0), rise, float(0)),
      upward,
    ).toVar();
    const spread = this.spreadUniform ?? float(1);
    const animLocal = pos.add(drift.mul(spread).mul(lifeT)).toVar();
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
    return b.projectionMatrix.mul(vec4(billboard, mvPos.w));
  }

  protected buildFragmentBody(b: Builder): Node<"vec4"> {
    const uv = b.varying("vUv", "vec2");
    const fade = b.varying("vFade", "float");
    const centered = uv.sub(vec2(0.5)).toVar();
    const ptDist = centered.length().toVar();
    const circleAlpha = ptDist
      .lessThanEqual(float(0.5))
      .select(float(1), float(0));
    const edge = float(1).sub(smoothstep(float(0.06), float(0.5), ptDist));
    const alpha = edge.mul(fade).mul(circleAlpha).toVar();
    const color = this.colorUniform ?? vec3(float(1), float(1), float(1));
    return vec4(color, alpha);
  }
}

/** One running emitter's mesh, its material, and the moment it started. */
interface Emitter {
  mesh: Mesh;
  material: ParticleMaterial;
  started: number;
}

/**
 * Draws the emitters a place script runs. The set reconciles against the
 * host's list every tick, the same way the fire and explosion renderers
 * reconcile theirs; an emitter dispatched again with a newer `at` restarts. A
 * material is pooled per blend, so a run that starts many emitters compiles a
 * fixed number of shaders.
 */
export class VoxelParticles {
  /** The scene group the emitters draw in; add it to the world's scene. */
  readonly group = new Group();

  private readonly geometry = buildParticleGeometry();
  private readonly pools = new Map<boolean, ParticleMaterial[]>();
  private readonly emitters = new Map<string, Emitter>();
  /** The `at` each id was last started at, so a re-dispatch restarts it. */
  private readonly started = new Map<string, number>();
  private time = 0;

  constructor(private readonly getParticles: () => ParticlePose[]) {}

  /** Advances the emitter clock and refills the mesh set from the host. */
  tick(dt: number): void {
    this.time += dt;
    const current = this.getParticles();
    const present = new Set<string>();
    for (const particle of current) {
      present.add(particle.id);
      if (this.started.get(particle.id) === particle.at) {
        continue;
      }
      this.started.set(particle.id, particle.at);
      this.start(particle);
    }
    for (const [id, emitter] of this.emitters) {
      const pose = current.find((held) => held.id === id);
      if (pose === undefined) {
        this.discard(id);
        continue;
      }
      const age = this.time - emitter.started;
      if (!pose.loop && age >= pose.lifeMs / 1000 + STAGGER_SECONDS) {
        this.discard(id);
        continue;
      }
      emitter.material.time = age;
      emitter.material.color = pose.color;
      emitter.material.size = pose.size;
      emitter.material.spread = pose.spread;
      emitter.material.life = Math.max(0.05, pose.lifeMs / 1000);
      emitter.material.upward = pose.upward ? 1 : 0;
      emitter.material.loop = pose.loop ? 1 : 0;
      emitter.mesh.position.set(pose.x, pose.y, pose.z);
    }
    for (const id of [...this.started.keys()]) {
      if (!present.has(id)) {
        this.started.delete(id);
      }
    }
  }

  /** Removes every emitter, leaving the set ready for a fresh script. */
  clear(): void {
    for (const id of [...this.emitters.keys()]) {
      this.discard(id);
    }
    this.started.clear();
  }

  private start(particle: ParticlePose): void {
    this.discard(particle.id);
    const material = this.takeMaterial(particle.additive);
    material.time = 0;
    const mesh = new Mesh(this.geometry, material);
    mesh.position.set(particle.x, particle.y, particle.z);
    this.group.add(mesh);
    this.emitters.set(particle.id, {
      mesh,
      material,
      started: this.time,
    });
  }

  private discard(id: string): void {
    const emitter = this.emitters.get(id);
    if (emitter === undefined) {
      return;
    }
    this.group.remove(emitter.mesh);
    this.emitters.delete(id);
    // Return the material to the pool of the blend it was made with.
    const key = emitter.material.blending === Blending.AdditiveBlending;
    const pool = this.pools.get(key) ?? [];
    pool.push(emitter.material);
    this.pools.set(key, pool);
  }

  private takeMaterial(additive: boolean): ParticleMaterial {
    const pool = this.pools.get(additive) ?? [];
    const free = pool.pop();
    return free ?? new ParticleMaterial(additive);
  }
}
