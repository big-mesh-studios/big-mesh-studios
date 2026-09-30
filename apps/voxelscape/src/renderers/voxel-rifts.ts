// The rifts a place script opens: a flat, camera-independent sheet whose colour
// churns across it, drawn from one shader — the violet, translucent surface of
// a portal. A single quad `width` by `height` stands at the rift's centre,
// turned about the vertical axis; the churn runs entirely in the fragment
// shader off the shared clock, sampling the same seamless fBm texture the dust
// storms use, swirled about the sheet's centre and scrolled upward so the
// colour reads as a slowly turning nether-portal field rather than a still
// tile. A rift is one quad each, so the renderer reconciles a map against the
// host's list the way the decal and storm renderers do; a rift dispatched
// again with the same id is moved and restyled rather than restarted.
import type { Node, UniformNode } from "@random-mesh/rmsl";
import {
  atan,
  cos,
  float,
  mix,
  sin,
  smoothstep,
  vec2,
  vec3,
  vec4,
} from "@random-mesh/rmsl";
import {
  Blending,
  Builder,
  Group,
  Mesh,
  NodeMaterial,
  PlaneGeometry,
  Scene,
  Side,
  type Texture,
} from "@random-mesh/rmsl/scene";
import { buildStormNoiseTexture } from "./voxel-storm";
import { RIFT_COLOR, type RiftPose } from "../world/scripted-rift";

/** How many times the coarse churn layer repeats across the sheet. */
const CHURN_SCALE: [number, number] = [3, 1.5];
/** How many times the fine churn layer repeats across the sheet. */
const CHURN_FINE_SCALE: [number, number] = [6, 2.6];
/** The deep violet the sheet falls to where the churn is thin. */
const RIFT_DEEP: [number, number, number] = [0.06, 0.01, 0.12];
/** The bright magenta the churn peaks at. */
const RIFT_HIGHLIGHT: [number, number, number] = [0.95, 0.45, 1];

/**
 * The rift surface: a translucent violet field that swirls about the quad's
 * centre. The sheet is sampled through a rotation whose angle grows with
 * radius and with time, so the noise smears into a slow spiral rather than
 * scrolling flat; two layers at different scales cover the coarse and fine
 * churn the way a nether portal's two texture taps do, and the colour runs from
 * a deep near-black violet up to a magenta crest. Alpha stays under one, so the
 * frame and the far side remain faintly visible through it.
 */
export class RiftMaterial extends NodeMaterial {
  /** The world's elapsed seconds, so every rift churns on the same clock. */
  time = 0;
  /** How strongly the sheet reads, 0 (barely there) to 1 (dense). */
  intensity = 1;
  /** Linear RGB churn colour. */
  color: [number, number, number] = [...RIFT_COLOR] as [number, number, number];
  /** The churn's rotation rate, in radians per second. */
  spin = 0;

  private timeUniform: UniformNode<"float"> | undefined;
  private intensityUniform: UniformNode<"float"> | undefined;
  private colorUniform: UniformNode<"vec3"> | undefined;
  private spinUniform: UniformNode<"float"> | undefined;
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
    this.intensityUniform = b.materialUniform(
      "intensity",
      "float",
      () => this.intensity,
    );
    this.colorUniform = b.materialUniform("uColor", "vec3", () => this.color);
    this.spinUniform = b.materialUniform("spin", "float", () => this.spin);
    this.noiseSampler = b.sampler("riftNoise", "sampler2D", () => this.noise);
  }

  protected buildFragmentBody(b: Builder): Node<"vec4"> {
    const uv = b.uvVarying;
    const time = this.timeUniform ?? float(0);
    const intensity = this.intensityUniform ?? float(1);
    const color =
      this.colorUniform ?? vec3(RIFT_COLOR[0], RIFT_COLOR[1], RIFT_COLOR[2]);
    const spin = this.spinUniform ?? float(0);
    const noise = this.noiseSampler;

    // Rotate the sample about the centre by an angle that grows with radius
    // and time: the differential turn is what reads as a churn.
    const centered = uv.sub(vec2(0.5)).toVar();
    const radius = centered.length().toVar();
    const angle = atan(centered.y, centered.x).add(time.mul(spin)).toVar();
    const swirl = vec2(cos(angle), sin(angle))
      .mul(radius)
      .add(vec2(0.5))
      .toVar();

    const tap = (coords: Node<"vec2">): Node<"float"> =>
      noise === undefined ? float(0.5) : noise.texture(coords).r;
    const coarse = tap(
      swirl
        .mul(vec2(CHURN_SCALE[0], CHURN_SCALE[1]))
        .add(vec2(0, time.mul(float(-0.18)))),
    );
    const fine = tap(
      swirl
        .mul(vec2(CHURN_FINE_SCALE[0], CHURN_FINE_SCALE[1]))
        .add(vec2(time.mul(float(0.1)), time.mul(float(-0.32)))),
    );
    const density = coarse
      .mul(float(0.6))
      .add(fine.mul(float(0.4)))
      .toVar();

    const deep = vec3(RIFT_DEEP[0], RIFT_DEEP[1], RIFT_DEEP[2]);
    const crest = vec3(RIFT_HIGHLIGHT[0], RIFT_HIGHLIGHT[1], RIFT_HIGHLIGHT[2]);
    const body = mix(
      deep,
      color,
      smoothstep(float(0.15), float(0.75), density),
    ).toVar();
    const lit = mix(
      body,
      crest,
      smoothstep(float(0.72), float(1), density),
    ).toVar();

    // Soften only a sliver of the border, so the sheet stays a rectangle the
    // frame can butt against rather than dissolving into a disc.
    const edgeX = smoothstep(float(0), float(0.05), uv.x).mul(
      smoothstep(float(0), float(0.05), float(1).sub(uv.x)),
    );
    const edgeY = smoothstep(float(0), float(0.05), uv.y).mul(
      smoothstep(float(0), float(0.05), float(1).sub(uv.y)),
    );
    const alpha = smoothstep(float(0.05), float(0.5), density)
      .mul(float(0.45))
      .add(float(0.35))
      .mul(edgeX)
      .mul(edgeY)
      .mul(intensity)
      .toVar();
    return vec4(lit, alpha);
  }
}

/** One running rift's mesh and material. */
interface Rift {
  mesh: Mesh;
  material: RiftMaterial;
}

/** Draws the rifts a place script opens, one translucent quad each. */
export class VoxelRifts {
  /** The scene group the rifts draw in; add it to the world's scene. */
  readonly group = new Group();

  private readonly geometry = new PlaneGeometry(1, 1);
  private readonly noise = buildStormNoiseTexture();
  private readonly rifts = new Map<string, Rift>();
  private time = 0;

  constructor(private readonly getRifts: () => RiftPose[]) {}

  /** Advances the churn clock and brings the quads in step with the host. */
  tick(dt: number): void {
    this.time += dt;
    const current = this.getRifts();
    for (const rift of current) {
      let held = this.rifts.get(rift.id);
      if (held === undefined) {
        const material = new RiftMaterial(this.noise);
        const mesh = new Mesh(this.geometry, material);
        this.group.add(mesh);
        held = { mesh, material };
        this.rifts.set(rift.id, held);
      }
      held.material.time = this.time;
      held.material.color = rift.color;
      held.material.intensity = rift.intensity;
      held.material.spin = rift.spin * Math.PI * 2;
      held.mesh.position.set(rift.x, rift.y, rift.z);
      held.mesh.scale.set(rift.width, rift.height, 1);
      held.mesh.rotation.y = rift.yaw;
    }
    for (const [id, held] of this.rifts) {
      if (!current.some((rift) => rift.id === id)) {
        this.group.remove(held.mesh);
        this.rifts.delete(id);
      }
    }
  }

  /** Removes every rift, leaving the set ready for a fresh script. */
  clear(): void {
    for (const [id, held] of this.rifts) {
      this.group.remove(held.mesh);
      this.rifts.delete(id);
    }
  }
}
