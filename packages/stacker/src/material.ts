// The ray-marched voxel-model material: a fragment shader that steps a 3D DDA
// through a packed voxel volume (a `usampler3D` DataTexture) and shades the
// surface with a palette. Works on a regular `Mesh` — positioned, rotated, and
// scaled freely, with the volume→world transform just the mesh's model matrix —
// and on an `InstancedMesh` sitting at the identity whose per-instance pose
// lives in `instanceMatrix`.
import type { Node, UniformNode } from "@random-mesh/rmsl";
import {
  builtinFragDepth,
  float,
  If,
  mix,
  vec3,
  vec4,
} from "@random-mesh/rmsl";
import type { Builder } from "@random-mesh/rmsl/scene";
import { DataTexture, NodeMaterial, Scene } from "@random-mesh/rmsl/scene";
import { marchVolume } from "./march";

export class VoxelModelMaterial extends NodeMaterial {
  voxelTexture: DataTexture;
  paletteTexture: DataTexture;
  dimensions: [number, number, number] = [0, 0, 0];
  voxelCount: [number, number, number] = [1, 1, 1];
  lightDir: [number, number, number] = [0, 0, 1];
  lightColour: [number, number, number] = [1, 1, 1];
  ambientColour: [number, number, number] = [0, 0, 0];
  unlit = false;
  /**
   * How strongly the surface mixes toward red, 0 to 1. A caller flashes a hit
   * monster by raising this on the material it draws with; the colour alone is
   * mixed so transparent fragments stay transparent.
   */
  flash = 0;
  /**
   * How far to push the voxel surface away from the camera when writing depth,
   * in window-depth units. A caller drawing a line on a voxel's surface raises
   * it enough for the line to win the depth test against the surface it sits
   * on; left at zero, the depth written is the surface's own.
   */
  depthBias = 0;

  private voxelsUniform?: UniformNode<"usampler3D">;
  private paletteUniform?: UniformNode<"sampler2D">;
  private dimensionsUniform?: UniformNode<"vec3">;
  private voxelCountUniform?: UniformNode<"vec3">;
  private lightDirUniform?: UniformNode<"vec3">;
  private lightColourUniform?: UniformNode<"vec3">;
  private ambientColourUniform?: UniformNode<"vec3">;
  private unlitUniform?: UniformNode<"bool">;
  private flashUniform?: UniformNode<"float">;
  private depthBiasUniform?: UniformNode<"float">;

  constructor() {
    super();
    this.voxelTexture = new DataTexture(new Uint8Array(4), 1, 1, 1);
    this.paletteTexture = new DataTexture(new Uint8Array(4), 1, 1);
  }

  protected setup(b: Builder, _scene: Scene): void {
    this.voxelsUniform = b.sampler(
      "uVoxels",
      "usampler3D",
      () => this.voxelTexture,
    );
    this.paletteUniform = b.sampler(
      "uPalette",
      "sampler2D",
      () => this.paletteTexture,
    );
    this.dimensionsUniform = b.materialUniform(
      "uDimensions",
      "vec3",
      () => this.dimensions,
    );
    this.voxelCountUniform = b.materialUniform(
      "uVoxelCount",
      "vec3",
      () => this.voxelCount,
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
    this.flashUniform = b.materialUniform("uFlash", "float", () => this.flash);
    this.depthBiasUniform = b.materialUniform(
      "uDepthBias",
      "float",
      () => this.depthBias,
    );
  }

  protected buildVertexBody(b: Builder): Node<"vec4"> {
    const position = b.position;
    // The vertex's model-space position, interpolated across the box, is the
    // point the ray from the camera hits the volume's bounding box.
    b.varying("vModelPos", "vec3").assign(position);

    // The transform that turns world vectors into the volume's model space:
    // `instanceMatrix⁻¹` when instanced (the mesh itself is assumed to sit at
    // the identity), or the plain mesh's `modelMatrix⁻¹` for a regular Mesh,
    // which may be positioned and rotated freely. It is the same for all eight
    // corners of one box, so carrying its two results through varyings is exact.
    const toVolume = b.instancing
      ? b.instanceMatrix.inverse()
      : b.modelMatrix.inverse();
    b.varying("vCamVolume", "vec3").assign(
      toVolume.mul(vec4(b.cameraPosition, float(1))).xyz,
    );
    // The light is a direction, so its homogeneous coordinate is 0 and the
    // translation column of the inverse matrix does not reach it.
    b.varying("vLightVolume", "vec3").assign(
      toVolume.mul(vec4(this.lightDirUniform!, float(0))).xyz.normalize(),
    );

    const local = b.instancing
      ? b.instanceMatrix.mul(vec4(position, float(1)))
      : vec4(position, float(1));
    const clip = b.projectionMatrix.mul(
      b.viewMatrix.mul(b.modelMatrix.mul(local)),
    );

    // The box-front clip z/w at this fragment, plus the 3rd and 4th rows of
    // projection·view·(model·instance). The fragment stage uses them to rebuild
    // the clip position of the ray's true hit point (the instance matrix is a
    // vertex attribute, which a WebGL2 fragment shader cannot read). All three
    // are constant across a box, so their interpolation is exact. A regular
    // Mesh has no instance matrix, so its volume→clip transform is just
    // projection·view·model.
    b.varying("vClipZ", "float").assign(clip.z);
    b.varying("vClipW", "float").assign(clip.w);

    const mvw = b.instancing
      ? b.modelMatrix.mul(b.instanceMatrix)
      : b.modelMatrix;
    const full = b.projectionMatrix.mul(b.viewMatrix.mul(mvw));
    b.varying("vRow2", "vec4").assign(
      vec4(
        full.element(0).element(2),
        full.element(1).element(2),
        full.element(2).element(2),
        full.element(3).element(2),
      ),
    );
    b.varying("vRow3", "vec4").assign(
      vec4(
        full.element(0).element(3),
        full.element(1).element(3),
        full.element(2).element(3),
        full.element(3).element(3),
      ),
    );

    return clip;
  }

  protected buildFragmentBody(b: Builder): Node<"vec4"> {
    // The camera position, transformed into the volume's model space by the
    // vertex stage, is where each ray starts; vModelPos is the box point the
    // ray from the camera lands on, which gives its direction.
    const rayOrigin = b.varying("vCamVolume", "vec3");
    const rayDirection = b
      .varying("vModelPos", "vec3")
      .sub(rayOrigin)
      .normalize();
    const { colour, hitPoint } = marchVolume({
      rayOrigin,
      rayDirection,
      voxels: this.voxelsUniform!,
      palette: this.paletteUniform!,
      dimensions: this.dimensionsUniform!,
      voxelCount: this.voxelCountUniform!,
      lightDir: b.varying("vLightVolume", "vec3"),
      lightColour: this.lightColourUniform!,
      ambientColour: this.ambientColourUniform!,
      unlit: this.unlitUniform!,
    });

    // A hit monster flashes red: mix the shaded colour toward red by `flash`,
    // leaving the alpha alone so empty fragments stay empty and the depth
    // test below still sees the voxel surface.
    const tinted = vec4(
      mix(
        colour.xyz,
        vec3(float(1), float(0.15), float(0.15)),
        this.flashUniform!,
      ),
      colour.a,
    );

    const fragDepth = builtinFragDepth();
    If(colour.a.greaterThan(float(0.5)), () => {
      // Write the depth of the true voxel surface, so models occlude each other
      // and the terrain by their geometry. The vertex stage passed the
      // box-entry clip z/w and the rows of projection·view·model·instance;
      // adding the rows' dot with the volume-space offset from the box entry to
      // the hit rebuilds the hit's clip position.
      const d = hitPoint.sub(b.varying("vModelPos", "vec3"));
      const clipZ = b
        .varying("vClipZ", "float")
        .add(b.varying("vRow2", "vec4").dot(vec4(d, float(0))));
      const clipW = b
        .varying("vClipW", "float")
        .add(b.varying("vRow3", "vec4").dot(vec4(d, float(0))));
      fragDepth.assign(
        clipZ
          .div(clipW)
          .mul(float(0.5))
          .add(float(0.5))
          .add(this.depthBiasUniform!),
      );
    }).Else(() => {
      // A fragment that hits no voxel is transparent; push it to the far plane
      // so it never occludes whatever is behind it — the ground, another model,
      // or a line drawn on this one's surface.
      fragDepth.assign(float(1));
    });

    return tinted;
  }
}
