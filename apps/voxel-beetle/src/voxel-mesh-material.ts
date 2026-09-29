// The material a meshed voxel model is drawn with: a palette lookup per
// fragment, shaded by one directional light and an ambient term.
//
// The model this draws is real geometry — the triangles a mesher merged from a
// volume's exposed faces — rather than a ray marched through a packed one. What
// that changes is where the colour comes from. A marcher reads a packed face
// index out of the volume at the point the ray lands; a mesh carries the palette
// index in the vertex it got there from, and a face index beside it, which is
// the normal the fragment is lit by. Both the palette and the light are the
// marcher's own, so a model looks the same drawn either way.
import type { Node, UniformNode } from "@random-mesh/rmsl";
import { float, If, vec2, vec3, vec4 } from "@random-mesh/rmsl";
import type { Builder } from "@random-mesh/rmsl/scene";
import {
  DataTexture,
  NodeMaterial,
  Scene,
  Side,
} from "@random-mesh/rmsl/scene";

/** How many texels the palette texture is wide, which is what a colour index divides. */
const PALETTE_WIDTH = 32;

/**
 * A face index, as a float a shader can take apart: the normal it names is three
 * lines of arithmetic rather than a third attribute, which is why the mesher
 * spends one byte on the direction rather than nine on the normal.
 *
 * The index arrives scaled into 0..1 by the `unorm8x4` lane it is stored in, so
 * it is multiplied back up before being read.
 */
const normalOfFace = (face: Node<"float">): Node<"vec3"> => {
  const index = face.mul(255).round();
  const axis = index.mul(0.5).floor();
  // The low bit is the direction: even faces point along the axis, odd against.
  const sign = float(1).sub(index.sub(axis.mul(2)).mul(2));
  // One where the face lies on this axis and nothing where it does not, without
  // a branch: the axes are whole numbers, so anything but a match is at least
  // one away.
  const on = (which: number): Node<"float"> =>
    float(1).sub(axis.sub(float(which)).abs().min(float(1)));
  return vec3(on(0), on(1), on(2)).mul(sign);
};

/**
 * A voxel model drawn as triangles, in the colours of the palette it names.
 *
 * The geometry is built by the mesher in the shared package, and every vertex
 * carries a `packed` lane group whose first two bytes are the face it lies on and
 * the palette index it shows. The material has no geometry of its own and no
 * opinion about how the model was cut up: it draws whatever triangles it is
 * handed.
 */
export class VoxelMeshMaterial extends NodeMaterial {
  /** The palette, one row of colours, sampled by the index each vertex carries. */
  readonly paletteTexture = new DataTexture(new Uint8Array(4), 1, 1);

  /** The direction the light comes from, in the model's own space. */
  lightDir: [number, number, number] = [0, 0, 1];
  /** The colour of that light, which a face turned away from it receives none of. */
  lightColour: [number, number, number] = [1, 1, 1];
  /** The colour every face receives whatever way it is turned. */
  ambientColour: [number, number, number] = [0, 0, 0];
  /** Whether to show the palette's own colours with no light on them at all. */
  unlit = false;

  private paletteUniform?: UniformNode<"sampler2D">;
  private lightDirUniform?: UniformNode<"vec3">;
  private lightColourUniform?: UniformNode<"vec3">;
  private ambientColourUniform?: UniformNode<"vec3">;
  private unlitUniform?: UniformNode<"bool">;

  constructor() {
    super();
    // A model drawn as geometry can be seen into: a hollow one shows the inside
    // of its far wall rather than a hole through to whatever is behind it. The
    // ray marcher drew both sides for the same reason, and because a box the
    // camera was standing inside had to have some front face to hit.
    this.side = Side.DoubleSide;
  }

  protected setup(b: Builder, _scene: Scene): void {
    this.paletteUniform = b.sampler(
      "uPalette",
      "sampler2D",
      () => this.paletteTexture,
    );
    this.lightDirUniform = b.materialUniform(
      "uLightDir",
      "vec3",
      () => this.lightDir,
    );
    this.lightColourUniform = b.materialUniform(
      "uLightColour",
      "vec3",
      () => this.lightColour,
    );
    this.ambientColourUniform = b.materialUniform(
      "uAmbientColour",
      "vec3",
      () => this.ambientColour,
    );
    this.unlitUniform = b.materialUniform("uUnlit", "bool", () =>
      this.unlit ? 1 : 0,
    );
  }

  protected buildVertexBody(b: Builder): Node<"vec4"> {
    const packed = b.attribute("packed", "vec4");
    // The fragment stage cannot read a vertex attribute, so both quantities are
    // handed across as varyings. The normal is rebuilt from the face index on
    // the far side rather than interpolated, so that a merged quad is lit as one
    // flat face instead of ramping across the cells it covers.
    b.varying("vFace", "float").assign(packed.x);
    b.varying("vColourIndex", "float").assign(packed.y);
    return b.projectionMatrix.mul(
      b.viewMatrix.mul(b.modelMatrix.mul(vec4(b.position, 1))),
    );
  }

  protected buildFragmentBody(b: Builder): Node<"vec4"> {
    const normal = normalOfFace(b.varying("vFace", "float"));
    // The palette is one row of thirty-two texels, so texel i is sampled at
    // (i + 0.5) / 32 — the half texel being the middle of it, which is what
    // keeps a lookup from landing on the seam between two colours and blending
    // them.
    //
    // The index is multiplied back up out of the 0..1 a `unorm8x4` lane delivers
    // it in, and then divided by the width of the row. Skipping the first step
    // is not a subtle error: the thirty-two indices would all land on the first
    // four or five texels, and a model drawn in the palette's darkest colours
    // would come out as one shade of grey.
    const texel = b
      .varying("vColourIndex", "float")
      .mul(255)
      .round()
      .div(PALETTE_WIDTH)
      .add(float(0.5 / PALETTE_WIDTH));
    const colour = this.paletteUniform!.texture(vec2(texel, float(0.5)));

    const diffuse = normal.dot(this.lightDirUniform!).max(float(0));
    const lit = this.ambientColourUniform!.add(
      this.lightColourUniform!.mul(diffuse),
    );

    const out = colour.rgb.toVar();
    If(this.unlitUniform!, () => {
      out.assign(colour.rgb);
    }).Else(() => {
      out.assign(colour.rgb.mul(lit));
    });

    // The palette's own alpha reaches the screen as it is, which is how a
    // palette entry below full opacity reads as a tinted voxel. Blending is off,
    // as it is for the marcher, so nothing behind the model is mixed in: the
    // canvas underneath shows through where the model is not drawn at all.
    return vec4(out, colour.a);
  }
}

/**
 * Puts a palette into the texture the material samples, and the texture's own
 * dimensions: a palette shorter than the full thirty-two leaves the entries
 * beyond it as they were, which is what the marcher's own palette texture did.
 */
export const bakePalette = (
  material: VoxelMeshMaterial,
  pixels: Uint8Array,
  width: number,
): void => {
  const texture = material.paletteTexture;
  texture.image = pixels;
  texture.width = width;
  texture.height = 1;
  texture.needsUpdate = true;
};
