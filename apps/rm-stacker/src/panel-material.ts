// The material a plane standing among a figure's voxels is drawn with: the
// picture it has been given, the cells of that picture outlined as a grid, and
// nothing else.
import {
  abs,
  Discard,
  float,
  fract,
  fwidth,
  If,
  max,
  min,
  mix,
  step,
  vec2,
  vec4,
  type Node,
  type UniformNode,
} from "@random-mesh/rmsl";
import type { Builder } from "@random-mesh/rmsl/scene";
import {
  Color,
  DataTexture,
  NodeMaterial,
  Scene,
} from "@random-mesh/rmsl/scene";

/**
 * How thick a grid line is drawn, in the fragments it covers, so that a line is
 * the same width however near the camera stands to the plane or how far it is
 * turned away from it.
 */
const LINE_WIDTH = 1;

/** How little of a cell has to be left before it counts as nothing at all. */
const CLEAR = 0.01;

/**
 * A picture drawn flat on a plane, with the cells it is made of outlined.
 *
 * Each texel's own alpha decides how much of what stands behind that cell shows
 * through, so how solid the plane is drawn is the picture's own; the grid is
 * drawn over the picture, and the material's opacity carries the whole of it.
 *
 * The picture is handed in rather than made here, so the two passes a plane is
 * drawn in — one against the figure's depth, one over it — read the one texture.
 */
export class PanelMaterial extends NodeMaterial {
  readonly picture: DataTexture;
  /** How many cells the picture spans, across and down, which the grid follows. */
  cells: [number, number] = [1, 1];
  /** The colour the cells are outlined in. */
  readonly gridColour = new Color(0xffffff);
  /** How solid those outlines are drawn, zero for a plane drawn without them. */
  gridShare = 0;

  private pictureUniform?: UniformNode<"sampler2D">;
  private cellsUniform?: UniformNode<"vec2">;
  private gridColourUniform?: UniformNode<"vec3">;
  private gridShareUniform?: UniformNode<"float">;
  private opacityUniform?: UniformNode<"float">;

  constructor(picture: DataTexture) {
    super();
    this.picture = picture;
  }

  protected setup(b: Builder, _scene: Scene): void {
    this.pictureUniform = b.sampler(
      "uPicture",
      "sampler2D",
      () => this.picture,
    );
    this.cellsUniform = b.materialUniform("uCells", "vec2", () => this.cells);
    this.gridColourUniform = b.materialUniform("uGridColour", "vec3", () =>
      this.gridColour.toArray(),
    );
    this.gridShareUniform = b.materialUniform(
      "uGridShare",
      "float",
      () => this.gridShare,
    );
    this.opacityUniform = b.materialUniform(
      "uOpacity",
      "float",
      () => this.opacity,
    );
  }

  protected buildFragmentBody(b: Builder): Node<"vec4"> {
    const texel = this.pictureUniform!.texture(b.uvVarying);
    const half = vec2(float(0.5), float(0.5));
    // Where the fragment lands on the plane, counted in the cells of the
    // picture rather than across the whole of it.
    const cell = b.uvVarying.mul(this.cellsUniform!);
    // How far it stands from the nearest edge of that cell, in fragments: the
    // distance in cells over how much of a cell one fragment covers, which is
    // what the screen makes of the plane at this point of it.
    const fromEdge = half.sub(abs(fract(cell).sub(half))).div(fwidth(cell));
    const line = step(min(fromEdge.x, fromEdge.y), float(LINE_WIDTH / 2)).mul(
      this.gridShareUniform!,
    );

    // The line laid over the texel: what comes out is as solid as the more
    // solid of the two, and takes as much of the line's colour as the line is
    // of that — a line over a cell with nothing in it is the line's own colour
    // at the line's own alpha, and one over a drawn cell tints it.
    const solid = max(texel.a, line);

    // A cell with nothing in it is dropped rather than drawn clear, so that a
    // plane writing depth leaves the figure behind it standing.
    If(solid.lessThan(float(CLEAR)), () => {
      Discard();
    });

    return vec4(
      mix(
        texel.rgb,
        this.gridColourUniform!,
        line.div(max(solid, float(CLEAR))),
      ),
      solid.mul(this.opacityUniform!),
    );
  }
}
