/**
 * The material a model's surface is drawn with: its own colour per vertex, its own normal
 * per vertex, and three fixed lights.
 *
 * ## Why this is a node graph and not one of rmsl's materials
 *
 * **Because the packed vertex layout has no `normal` attribute.** It has `normalOct` —
 * octahedral-encoded, two bytes a normal — and only the landscape's `SurfaceMaterial`
 * knows to read and decode it. `MeshStandardMaterial` and `MeshLambertMaterial` look for
 * `normal`, find nothing, and fall back to a constant, so a figure shades as one flat tone
 * however good its geometry is.
 *
 * That failure is **silent**: nothing throws, nothing warns, and the model is visible,
 * correctly coloured, correctly shaped and completely flat. An earlier version of this
 * material was a stock `MeshStandardMaterial`, which is the natural thing to reach for and
 * which produced exactly that.
 *
 * Adding a `normal` attribute instead would cost twelve bytes a vertex to save about thirty
 * lines of shader, and would change a vertex layout three packages agree on — so the
 * decode happens here instead.
 *
 * ## Why the lights are in the material rather than in the scene
 *
 * **Because a rig that lives in the scene has to be added and removed as panels come and
 * go, and because the modeller's rig exists to make a form readable rather than to light a
 * world.** The landscape's terrain has a sun, a sky and a fog, and its rig is a property of
 * the place. This has a turntable and a form, and the three constants that do that job sit
 * next to the shading that uses them.
 *
 * The numbers are the landscape's rig in spirit: a warm key from above and to the right, a
 * cool fill from the opposite side so the shadowed half is shaped rather than hollow, and an
 * ambient at under a fifth of the key so nothing is ever fully black.
 */
import { float, select, vec3, vec4, type Node } from "@random-mesh/rmsl";
import {
  Blending,
  ClampToEdgeWrapping,
  DataTexture,
  LinearFilter,
  NodeMaterial,
  RGBAFormat,
  Side,
  UnsignedByteType,
  type Builder,
  type Scene,
} from "@random-mesh/rmsl/scene";

import type { PaintSurface } from "../unwrapping/paint-surface";

/**
 * Octahedral decode, in the shader.
 *
 * **The lower hemisphere's branch is an unconditional add of a term that is zero when the
 * branch is not taken**, rather than an `If` — the same reasoning as the landscape's
 * `octahedralNode`: a branch here would be a per-vertex divergence on exactly the vertices
 * where a fold turns over, which is most of a modelled shape.
 *
 * A copy rather than a shared import, because a GLSL expression cannot live in a package
 * that does not depend on the renderer.
 */
const octahedralNode = (f: Node<"vec2">): Node<"vec3"> => {
  const n = vec3(f.x, f.y, float(1).sub(f.x.abs()).sub(f.y.abs())).toVar();
  const height = n.z.negate().max(float(0)).toVar();
  n.x.assign(
    n.x.add(select(n.x.greaterThanEqual(float(0)), height.negate(), height)),
  );
  n.y.assign(
    n.y.add(select(n.y.greaterThanEqual(float(0)), height.negate(), height)),
  );
  return n.normalize();
};

/**
 * sRGB to linear, by the usual power.
 *
 * **Because rmsl builds no mip chain and its `sampler2D` reads raw bytes.** A PNG is sRGB, and
 * the other codebase — which bakes its texture this way and never sets `colorSpace` — draws
 * every stroke too dark as a result. Doing it here rather than storing linear is what lets the
 * atlas be a PNG on disk and a brush colour on screen without either of them knowing.
 */
const SRGB_GAMMA = 2.2;

/**
 * The smallest base the sRGB curve is taken over.
 *
 * **Because a driver that spells `pow` as `exp2(y * log2(x))` has to get `log2(0)` right, and
 * the ones that do not answer NaN.** GLSL specifies zero, so this is insurance rather than a
 * correction — but a NaN multiplied by a coverage of zero is still a NaN, and it then decides
 * what an unpainted model looks like on that machine. One in a hundred thousand raised to 2.2
 * is about `1.6e-11`, far below a byte of output, so the floor costs nothing.
 */
const MIN_LINEAR = 1e-5;

/** Direction, colour and strength of one light. All three are fixed in world space. */
const KEY = {
  direction: [0.51, 0.79, 0.56] as const,
  colour: [1.0, 0.97, 0.92] as const,
  power: 1.55,
};
const FILL = {
  direction: [-0.78, 0.21, -0.58] as const,
  colour: [0.66, 0.76, 1.0] as const,
  power: 0.6,
};
const AMBIENT = [0.28, 0.3, 0.36] as const;

/**
 * A Lambert material over the packed vertex layout.
 *
 * **Diffuse only, and deliberately.** A figure being modelled wants to read as a form, and
 * a specular highlight on a matte clay surface mostly reads as a rendering artefact.
 */
export class ModelMaterial extends NodeMaterial {
  /**
   * The painted atlas, or nothing.
   *
   * **A field rather than a constructor argument, and set after construction**, because the
   * sampler is only created if a texture exists when the material is compiled — and the
   * attachment happens after every rebuild, which is the only time anybody learns whether the
   * model has one.
   */
  texture: DataTexture | undefined;

  /**
   * How much of the texture replaces the part's colour rather than tinting it.
   *
   * **A uniform rather than a second code path**, so the toggle — which a person will drag
   * while looking at the model — costs nothing but four bytes to the GPU rather than a
   * recompile of the whole program.
   */
  blend = 0;

  private paintSampler: Node<"sampler2D"> | undefined;
  private blendUniform: Node<"float"> | undefined;

  protected override setup(b: Builder, _scene: Scene): void {
    // Declared here rather than where it is written, because a varying the builder never
    // sees is one the compiler will not emit.
    void b.varying("vColour", "vec4");

    // **Only with a texture.** A material compiled without a sampler has no `uv` varying at
    // all, so an untextured model reads no texture and binds no attribute — which is what keeps
    // a model nobody is painting exactly as cheap as it was.
    if (this.texture !== undefined) {
      this.paintSampler = b.sampler(
        "paint",
        "sampler2D",
        () => this.texture ?? null,
      );
      this.blendUniform = b.materialUniform(
        "paintBlend",
        "float",
        () => this.blend,
      );
    }

    // **Double-sided, because a subtracted shape is mostly its own inside.** With a
    // one-sided material the interior of a difference is back-facing and invisible, so
    // cutting a hole out of a figure leaves the figure looking whole from the far side.
    // This is the same reason the terrain material is double-sided.
    this.side = Side.DoubleSide;
  }

  protected override buildVertexBody(b: Builder): Node<"vec4"> {
    const oct = b.attribute("normalOct", "vec2");
    const colour = b.attribute("colour", "vec4");

    // **The octahedral decode happens per vertex and the result is what crosses as a
    // varying**, which is both cheaper than carrying the encoded pair and smoother across a
    // triangle than interpolating two shorts and decoding per fragment.
    b.normalWorld.assign(octahedralNode(oct));
    b.varying("vColour", "vec4").assign(colour);
    if (this.paintSampler !== undefined) {
      // **Only when there is a texture**, for the same reason the sampler is conditional: the
      // varying is declared in `setup` and would be emitted whether or not anything wrote it.
      b.varying("uv", "vec2").assign(b.uv);
    }

    const world = b.modelMatrix.mul(vec4(b.position, float(1)));
    b.positionWorld.assign(world.xyz);
    return b.projectionMatrix.mul(b.viewMatrix.mul(world));
  }

  protected override buildFragmentBody(b: Builder): Node<"vec4"> {
    const normal = b.normalWorld.normalize().toVar();
    const colour = b.varying("vColour", "vec4").toVar();

    // **The normal is turned towards the eye, which is what makes a two-sided surface
    // read rather than merely be drawn.** A one-sided check on the sign of the
    // normal-to-eye dot flips it only when it points away; because the test is made on
    // whichever normal arrived, this is also correct if the renderer has already flipped
    // one for a back face, and a no-op in that case.
    const facing = normal.dot(
      b.cameraPosition.sub(b.positionWorld).normalize(),
    );
    normal.mulAssign(select(facing.lessThan(float(0)), float(-1), float(1)));

    // **The texture goes in before the lighting, not after**, so a painted surface is lit like
    // any other surface. Applying it to the lit result would mean a bright stroke in shadow
    // glows, which is the single most obvious way a texture can look pasted on.
    if (this.paintSampler !== undefined && this.blendUniform !== undefined) {
      const sampled = this.paintSampler
        .texture(b.varying("uv", "vec2"))
        .toVar();
      // **The floor under the linearisation is belt and braces, not the argument for the
      // rewrite below.** GLSL does define `pow(0.0, 2.2)` as zero, but a driver that spells
      // `pow` the way D3D does — `exp2(y * log2(x))` — has to get `log2(0)` right first, and
      // the ones that do not answer NaN instead. A NaN survives being multiplied by a
      // coverage of zero, so it reaches the framebuffer and whatever the driver does with a
      // NaN there decides what a model with no paint on it looks like on that machine.
      const stroke = sampled.xyz.max(float(MIN_LINEAR)).pow(float(SRGB_GAMMA));
      // **The coverage is the texture's own alpha**, and the part colour is already linear — it
      // is a vertex attribute of bytes written from a colour picker — so the texture is brought
      // to the same space before the two are mixed, or every stroke reads a shade dark for no
      // reason anybody can see.
      const coverage = sampled.w;

      // **The two things `blend` chooses between, each weighted by the coverage, so that a
      // texel with nothing on it is a no-op rather than a darkening or a blackout.**
      //
      // Replacing is `mix(part, stroke, coverage)`. Tinting is `part * mix(vec3(1.0), stroke,
      // coverage)`, which keeps the part's own colour underneath a stroke instead of throwing
      // it away.
      //
      // **Why the old line could not be kept: it treated an opaque texel as "the part colour,
      // scaled by zero".** It wrote
      //
      //     (colour.rgb * (colour.a - coverage) + stroke * coverage) / (blend * (colour.a - coverage) + 1)
      //
      // so a texel that read back with `coverage` of one multiplied the part colour by
      // `colour.a - 1.0`, which for an opaque part is zero — and it read back as exactly
      // `(0, 0, 0, 1)` in two ordinary ways: a sampler bound to a texture that never got a
      // level zero, which WebGL defines as sampling to `(0, 0, 0, 1)` and which rmsl's own
      // sampler notes call out as sampling as black, and any texel with an opaque black stroke
      // on it. Either way the whole figure went to black, on whichever machine's sampler did
      // it and not on the others. The denominator was wrong for the far more common case as
      // well: with nothing painted at all it divided by `1 + blend`, so an unpainted model came
      // out at half brightness at `blend = 1`.
      const replacing = colour.xyz
        .mul(coverage.oneMinus())
        .add(stroke.mul(coverage));
      const tinting = colour.xyz.mul(
        coverage.oneMinus().add(coverage.mul(stroke)),
      );
      colour.xyz.assign(replacing.mix(tinting, this.blendUniform));
    }

    const lambert = (
      direction: readonly number[],
      colour: readonly number[],
      power: number,
    ): Node<"vec3"> => {
      const light = vec3(
        float(direction[0]),
        float(direction[1]),
        float(direction[2]),
      ).normalize();
      // **Clamped at zero**, so a surface turned away from a light contributes nothing
      // rather than a negative amount that darkens the far side twice.
      return vec3(colour[0], colour[1], colour[2])
        .mul(normal.dot(light).max(float(0)))
        .mul(float(power));
    };

    const lit = lambert(KEY.direction, KEY.colour, KEY.power)
      .add(lambert(FILL.direction, FILL.colour, FILL.power))
      .add(vec3(AMBIENT[0], AMBIENT[1], AMBIENT[2]));

    return vec4(colour.xyz.mul(lit), colour.w);
  }

  /**
   * Puts the painted atlas on this material.
   *
   * **Attaching and detaching recompiles, and that is correct.** The sampler only exists when a
   * texture does, so a material that gains one has to be rebuilt to declare it — the same
   * contract `TriangleMaterial.setTiles` works to in voxelscape.
   */
  attach = (surface: PaintSurface): void => {
    const texture = new DataTexture(
      surface.pixels,
      surface.width,
      surface.height,
      1,
      RGBAFormat,
      UnsignedByteType,
    );
    // **Clamped and linear, and both are rmsl's defaults** — stated rather than assumed, because
    // the atlas is exactly the case where the default is right: there is no tiling to do and no
    // mip chain for the renderer to build anyway.
    texture.wrapS = ClampToEdgeWrapping;
    texture.wrapT = ClampToEdgeWrapping;
    texture.magFilter = LinearFilter;
    texture.minFilter = LinearFilter;
    texture.needsUpdate = true;
    this.texture = texture;
    this.needsUpdate = true;
  };

  /** Whether a texture is on this material, so a caller need not keep its own flag. */
  get textured(): boolean {
    return this.texture !== undefined;
  }

  /**
   * Pushes the atlas to the GPU if it has changed since this was last called.
   *
   * **Called once per frame rather than once per stamp, and that is not an optimisation.** rmsl
   * has no partial texture upload — `needsUpdate` re-sends the whole image — and a stroke is a
   * stamp per pointer move, so a naive upload per stamp would re-send a four-megabyte atlas
   * sixty times a second for a change covering a few hundred texels. Once a frame is the finest
   * the renderer can act on anyway, so the flag is the coalescing.
   *
   * **Reading `dirty` is what clears it**, which is why this is the only thing that should ask.
   * A second reader elsewhere would find it already clean and skip an upload that the first
   * reader has not made yet.
   *
   * **A material with no texture does nothing and says nothing.** A stroke is not possible
   * without one, so a dirty surface here would mean the two had come apart — and silently
   * re-attaching would paper over that rather than report it.
   */
  sync = (surface: PaintSurface): void => {
    const texture = this.texture;
    if (texture === undefined) return;
    if (!surface.dirty) return;
    texture.needsUpdate = true;
  };
}

/**
 * A material for `translucent`, built once per install.
 *
 * **`translucent` is passed rather than derived from the mesh, because a mesh cannot say
 * whether it wants blending**: every vertex carries an alpha either way, and a model with no
 * transparency in it still has an opaque fourth byte. An always-transparent material would
 * put a fully opaque model into the transparent queue with depth writes off, which is the
 * arrangement that makes a solid self-overlap wrongly.
 *
 * **`blend` is the texture's claim on the part colour**, and it is a constructor argument rather
 * than something set afterwards because `install` builds a new material on every rebuild — a
 * value set on the previous one would be gone, and the toggle would spring back on every edit.
 */
export const modelMaterial = (
  translucent: boolean,
  blend = 0,
): ModelMaterial => {
  const material = new ModelMaterial();
  material.blend = blend;

  if (translucent) {
    material.transparent = true;
    material.blending = Blending.NormalBlending;
    material.depthWrite = false;
  }

  return material;
};
