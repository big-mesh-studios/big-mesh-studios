import type { Node, UniformNode } from "@random-mesh/rmsl";
import { builtinFragDepth, float, If, vec4 } from "@random-mesh/rmsl";
import type { Builder } from "@random-mesh/rmsl/scene";
import { DataTexture, NodeMaterial, Scene } from "@random-mesh/rmsl/scene";
import type { CellSource } from "./shaders-shared";
import { marchVolume } from "./shaders-shared";

// The picked voxel's outline (a LineSegments2 drawn on its surface) must pass
// the depth test, so the voxel surface is pushed this far away in window-depth
// units. A constant NDC bias is what keeps the shader simple; the volume sits
// in a shallow slice of the depth range (the far plane is far away), so this
// is only a fraction of a voxel and is not visible — but it needs to exceed
// the depth span of the line's screen-space ribbon or the outline shimmers.
const DEPTH_BIAS = 0.0001;

/**
 * The ray-marched voxel material shared by both render backends. It draws a
 * box bounding the volume (one voxel of padding on each side, matching the
 * box the marcher intersects), so the fragment shader only runs on pixels
 * that could land on a voxel, and derives each ray from the interpolated
 * model-space box position. The marching itself is `marchVolume` from
 * shaders-shared — the same code the CPU voxel picker runs — so rendering and
 * picking can never drift.
 *
 * Each fragment writes `gl_FragDepth` from the ray's actual hit point (with a
 * small bias), so the picked-voxel outline (drawn as a separate child mesh)
 * is neither hidden behind the box's front face nor z-fighting it. Fragments
 * that hit no voxel write the farthest depth, so the transparent pixels of
 * the bounding box never occlude the outline.
 *
 * Backends differ only in where a cell's solidity and colour come from —
 * `setupSamplers` binds a backend's own texture uniform(s), and
 * `makeCellSource` wraps them as a `CellSource` for `marchVolume`.
 */
export abstract class VoxelMaterialBase extends NodeMaterial {
  paletteTexture: DataTexture;
  dimensions: [number, number, number] = [0, 0, 0];
  voxelCount: [number, number, number] = [1, 1, 1];
  lightDir: [number, number, number] = [0, 0, 1];
  lightColour: [number, number, number] = [1, 1, 1];
  ambientColour: [number, number, number] = [0, 0, 0];
  unlit = false;

  protected paletteUniform?: UniformNode<"sampler2D">;
  protected dimensionsUniform?: UniformNode<"vec3">;
  protected voxelCountUniform?: UniformNode<"vec3">;
  protected lightDirUniform?: UniformNode<"vec3">;
  protected lightColourUniform?: UniformNode<"vec3">;
  protected ambientColourUniform?: UniformNode<"vec3">;
  protected unlitUniform?: UniformNode<"bool">;

  constructor() {
    super();
    this.paletteTexture = new DataTexture(new Uint8Array(4), 1, 1);
  }

  /** Build and store this backend's own sampler uniform(s). */
  protected abstract setupSamplers(b: Builder): void;
  /** Wrap this backend's sampler uniform(s) as a `CellSource`. */
  protected abstract makeCellSource(): CellSource;

  protected setup(b: Builder, _scene: Scene): void {
    this.paletteUniform = b.sampler("uPalette", "sampler2D", () => this.paletteTexture);
    this.dimensionsUniform = b.materialUniform("uDimensions", "vec3", () => this.dimensions);
    this.voxelCountUniform = b.materialUniform("uVoxelCount", "vec3", () => this.voxelCount);
    this.lightDirUniform = b.materialUniform("uLightDir", "vec3", () => this.lightDir);
    this.lightColourUniform = b.materialUniform("uLightColour", "vec3", () => this.lightColour);
    this.ambientColourUniform = b.materialUniform(
      "uAmbientColour",
      "vec3",
      () => this.ambientColour,
    );
    this.unlitUniform = b.materialUniform("uUnlit", "bool", () => (this.unlit ? 1 : 0));
    this.setupSamplers(b);
  }

  protected buildVertexBody(b: Builder): Node<"vec4"> {
    const position = b.position;
    // The vertex's model-space position, interpolated across the box, is the
    // point the ray from the camera hits the volume's bounding box.
    b.varying("vModelPos", "vec3").assign(position);
    return b.projectionMatrix.mul(b.viewMatrix.mul(b.modelMatrix.mul(vec4(position, float(1)))));
  }

  protected buildFragmentBody(b: Builder): Node<"vec4"> {
    // normalMatrix is the mesh's world-to-model rotation (the same matrix the
    // CPU voxel picker uses), so transforming the camera's world position by it
    // puts the camera in model space, where the volume lives.
    const rayOrigin = b.normalMatrix.mul(b.cameraPosition);
    const rayDirection = b.varying("vModelPos", "vec3").sub(rayOrigin).normalize();
    const { colour, hitPoint } = marchVolume({
      rayOrigin,
      rayDirection,
      cells: this.makeCellSource(),
      palette: this.paletteUniform!,
      dimensions: this.dimensionsUniform!,
      voxelCount: this.voxelCountUniform!,
      lightDir: this.lightDirUniform!,
      lightColour: this.lightColourUniform!,
      ambientColour: this.ambientColourUniform!,
      unlit: this.unlitUniform!,
    });

    // The depth written by default would be the bounding box's front face,
    // which hides any line drawn on a voxel deeper in the volume and
    // z-fights one drawn on the front face. Project the hit point into clip
    // space instead, so each fragment's depth is where the ray actually
    // landed, and nudge it slightly away from the camera so the outline wins
    // the test.
    const fragDepth = builtinFragDepth();
    If(colour.a.greaterThan(float(0.5)), () => {
      const clip = b.projectionMatrix.mul(
        b.viewMatrix.mul(b.modelMatrix.mul(vec4(hitPoint, float(1)))),
      );
      fragDepth.assign(clip.z.div(clip.w).mul(float(0.5)).add(float(0.5)).add(float(DEPTH_BIAS)));
    }).Else(() => {
      // A fragment that hits no voxel is transparent; push it to the far
      // plane so it never occludes the outline (the line's ribbon bleeds a
      // pixel or two past the voxel's silhouette into such pixels).
      fragDepth.assign(float(1));
    });

    return colour;
  }
}
