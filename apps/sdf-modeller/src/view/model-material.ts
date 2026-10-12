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
import { report } from "./paint-report";
import { BRICK, GRID_RES, SLOT } from "../unwrapping/paint-field";
import type { PaintField } from "../unwrapping/paint-field";

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

  /**
   * The paint field's two 3D textures, or nothing.
   *
   * **A pair rather than one texture, because a sparse grid is two things**: the texels, and
   * the table saying which brick each cell of the volume lives in. The indirection is read
   * first and the pool second, which is the whole of GPU Gems 2 Ch. 37's N³-tree lookup with
   * the tree flattened — one lookup either way, where an actual octree needs a loop.
   */
  private fieldPool: Node<"sampler3D"> | undefined;
  private fieldGrid: Node<"sampler3D"> | undefined;
  private fieldOrigin: Node<"vec3"> | undefined;
  private fieldExtent: Node<"vec3"> | undefined;
  private fieldBricks: Node<"vec3"> | undefined;

  /**
   * The field this material draws, or nothing.
   *
   * **A field rather than a constructor argument, for the reason `texture` is** — the samplers
   * are only created if a field exists when the material is compiled, and attachment happens
   * after a rebuild, which is the only time anybody knows whether there is one.
   */
  field: PaintField | undefined;

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
    }

    if (this.field !== undefined) {
      this.fieldPool = b.sampler("fieldPool", "sampler3D", () => {
        return this.field?.poolTexture ?? null;
      });
      this.fieldGrid = b.sampler("fieldGrid", "sampler3D", () => {
        return this.field?.gridTexture ?? null;
      });
      // **Two uniforms, and not more, because the rest of the mapping is compile-time.** The
      // brick and slot sizes are module constants on both sides of the shader, so a world
      // position reaches a texel with the origin and the extent and nothing else.
      this.fieldOrigin = b.materialUniform("fieldOrigin", "vec3", () => [
        this.field?.origin[0] ?? 0,
        this.field?.origin[1] ?? 0,
        this.field?.origin[2] ?? 0,
      ]);
      this.fieldExtent = b.materialUniform("fieldExtent", "vec3", () => {
        const extent = this.field?.extent ?? [1, 1, 1];
        return [extent[0], extent[1], extent[2]];
      });
      // **How many bricks the volume spans, which is not the grid's resolution.** The grid is
      // as large as the largest box the field will accept; this box is usually much smaller, and
      // a shader that turns a volume coordinate into a brick by multiplying by the *grid's*
      // resolution looks in the wrong place for everything outside it. It is the difference
      // between painting and not painting at all, and it is a single wrong constant.
      this.fieldBricks = b.materialUniform("fieldBricks", "vec3", () => {
        const bricks = this.field?.bricksPerAxis ?? [1, 1, 1];
        return [bricks[0], bricks[1], bricks[2]];
      });
    }

    // **The blend uniform belongs to whichever source exists, not to the atlas.**
    //
    // **This is what a first version got wrong**, and it failed silently: declaring
    // `blendUniform` inside the atlas branch meant a material with only a field had no blend,
    // the fragment body skipped the whole mix, and the model came out its plain part colour
    // with no error anywhere — which is exactly what an unpainted model looks like. A test
    // that compiled the shader and looked for the sample is what caught it.
    if (this.texture !== undefined || this.field !== undefined) {
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
    const fieldSampled = this.sampleField(b);
    // **Whichever paint source exists, and then the same blend.** The atlas and the field
    // produce the same four numbers — a straight-alpha RGBA — so everything downstream of the
    // sample is written once. An earlier arrangement gave each its own copy of the blend, and
    // two copies of that arithmetic is two copies of the `pow(0.0, 2.2)` bug it is guarding.
    const sampled =
      this.paintSampler !== undefined && this.blendUniform !== undefined
        ? this.paintSampler.texture(b.varying("uv", "vec2"))
        : fieldSampled;

    if (sampled !== undefined && this.blendUniform !== undefined) {
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
   * Reads the paint field at a world position, or `undefined` when there is no field.
   *
   * **Two lookups and no loop, which is what flattening the octree bought.** A world position
   * divides into a brick coordinate; the indirection texture says which slot that brick's
   * texels live in; the pool texture holds the texels. The one line here that is not obvious
   * is the `1.5`, and it is the border: cell `n` of a slot holds voxel `n - 1`, so the centre
   * of the first voxel is half a texel past cell one.
   */
  private sampleField(b: Builder): Node<"vec4"> | undefined {
    const pool = this.fieldPool;
    const grid = this.fieldGrid;
    const origin = this.fieldOrigin;
    const extent = this.fieldExtent;
    const bricks = this.fieldBricks;
    if (
      pool === undefined ||
      grid === undefined ||
      origin === undefined ||
      extent === undefined ||
      bricks === undefined
    ) {
      return undefined;
    }

    // **`positionWorld`, not a varying.** The field is a function of where a fragment is, so
    // there is nothing to interpolate across a triangle and nothing to disagree between the
    // vertices. This is the line the whole change turns on: the atlas needed a `uv` varying
    // precisely because it could not answer this question any other way.
    const uvw = b.positionWorld.sub(origin).div(extent);
    // **In bounds as a float, because a comparison per axis would need a bool tree rmsl does
    // not have.** `low` is below the box on some axis and `high` above it on some axis, so
    // their minimum is positive exactly when the fragment is inside; a negative one is clamped
    // to zero, which is what the out-of-range branch wants.
    const low = uvw.x.min(uvw.y).min(uvw.z);
    const high = uvw.x.max(uvw.y).max(uvw.z);
    const inside = low.min(high.oneMinus()).max(float(0));

    // **Bricks, not grid cells.** `bricksPerAxis` is how many bricks this volume spans;
    // `GRID_RES` is how many cells the indirection texture has, which is only used below to
    // normalise the lookup into that texture. Conflating them is what stopped the whole feature
    // from showing a single texel.
    const gridFloat = uvw.mul(bricks);
    const brick = gridFloat.floor();
    const cellLocal = gridFloat.sub(brick);
    // **At the cell centre**, so the linear filter returns that cell and not a blend of its
    // neighbours — which is what makes a filtered sampler usable where an unfiltered fetch
    // would be the obvious choice, and keeps the shader portable across the integer sampler
    // formats rmsl would otherwise need.
    const info = grid
      .texture(brick.add(float(0.5)).div(float(GRID_RES)))
      // **Also `.toVar()`, for the same reason as the result.** The indirection is read for
      // its `w` to test allocation and its `xyz` to find the slot, and without a temporary
      // that is two dependent 3D reads where one would do.
      .toVar();
    const tile = info.xyz.mul(float(255));
    const slotPosition = tile
      .mul(float(SLOT))
      .add(float(1.5))
      .add(cellLocal.mul(float(BRICK)));
    const sampled = pool.texture(
      slotPosition.div(float(this.field?.poolDim ?? 1)),
    );

    const clear = vec4(float(0), float(0), float(0), float(0));
    // **`.toVar()` and not just for style.** rmsl's node graph has no common-subexpression
    // elimination: every *use* of a node re-emits its subgraph, so a sample left inline is
    // re-evaluated at each of its five uses — `.xyz` three times for the stroke colour and
    // `.w` twice for the coverage — and each evaluation is two dependent 3D texture reads.
    // That is ten reads a fragment instead of two, from a line that looks like it samples
    // once. The atlas path already did this; the field path has to as well, and the test
    // below is what keeps it.
    return select(
      inside.greaterThan(float(0)),
      // **The unallocated check is `a`, which is 255 or 0** — a flag in the fourth byte,
      // rather than a sentinel slot number that a brick could legitimately hold.
      select(info.w.lessThan(float(0.5)), clear, sampled),
      clear,
    ).toVar();
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
   * Puts a paint field on this material, and builds its textures.
   *
   * **The field builds them, not this method**, because the field owns the bytes and a
   * texture over somebody else's buffer is a way to have two of them disagree. `ensureTextures`
   * is idempotent, so a rebuild re-attaching the same field costs one branch.
   */
  attachField = (field: PaintField | undefined): void => {
    if (field === undefined) return;
    field.ensureTextures();
    this.field = field;
    this.needsUpdate = true;
  };

  /** Whether a field is on this material. */
  get fielded(): boolean {
    return this.field !== undefined;
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
  sync = (surface: PaintSurface | undefined, field?: PaintField): void => {
    const texture = this.texture;
    if (texture !== undefined && surface?.dirty === true) {
      texture.needsUpdate = true;
    }
    // **The field is uploaded by the same flag, and for the same reason it exists at all.**
    //
    // rmsl has no partial texture upload, so `needsUpdate` re-sends the whole image. A stroke
    // is a stamp per pointer move, and a naive upload per stamp would re-send a sixteen-megabyte
    // pool sixty times a second for a change covering a few hundred texels. Once a frame is the
    // finest the renderer can act on anyway, so the flag is the coalescing.
    //
    // **Which is why M1 matters.** At a 0.05 voxel the pool is 2 MB and this is already half
    // the bandwidth of the 4.15 MB atlas it replaces; at 0.02 it is 16 MB and the upload is
    // the dominant cost of a stroke. Until M1 lands, the cheap answer is a coarse field.
    if (
      field !== undefined &&
      this.field !== undefined &&
      field.dirtySinceSync
    ) {
      this.field.poolTexture!.needsUpdate = true;
      this.field.gridTexture!.needsUpdate = true;
      field.markSynced();
      report({
        what: "upload",
        bricks: field.brickCount,
        voxelSize: field.voxelSize,
      });
    }
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
