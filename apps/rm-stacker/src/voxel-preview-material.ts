import type { Node, UniformNode } from "@random-mesh/rmsl";
import { float, If, vec4 } from "@random-mesh/rmsl";
import type { Builder } from "@random-mesh/rmsl/scene";
import { DataTexture, NodeMaterial, Scene } from "@random-mesh/rmsl/scene";
import type { Panels } from "./shaders-shared";
import { marchVolume } from "./shaders-shared";
import { type SideKind } from "./types";

// A panel before its first upload: one empty cell. The renderer uploads every
// integer texture as RGBA8UI, so a cell is four bytes with its palette index in
// the red channel.
const emptyPanelTexture = () => new DataTexture(new Uint8Array(4), 1, 1);

/**
 * The ray-marched voxel material. It draws a box bounding the volume (one
 * voxel of padding on each side, matching the box the marcher intersects), so
 * the fragment shader only runs on pixels that could land on a voxel, and
 * derives each ray from the interpolated model-space box position. The
 * marching itself is `marchVolume` from shaders-shared — the same code the
 * CPU voxel picker runs — so rendering and picking can never drift.
 *
 * In `maskMode` the material instead outputs just the picked voxel's colour
 * where the ray's front-most hit is `pickedVoxel` (transparent elsewhere), so
 * the selective bloom glows in the same colour as the voxel itself.
 */
export class VoxelPreviewMaterial extends NodeMaterial {
  panelTextures: Record<SideKind, DataTexture>;
  paletteTexture: DataTexture;
  dimensions: [number, number, number] = [0, 0, 0];
  voxelCount: [number, number, number] = [1, 1, 1];
  lightDir: [number, number, number] = [0, 0, 1];
  lightColour: [number, number, number] = [1, 1, 1];
  ambientColour: [number, number, number] = [0, 0, 0];
  unlit = false;
  maskMode = false;
  pickedVoxel: [number, number, number] = [-1, -1, -1];

  private panelUniforms?: Panels;
  private paletteUniform?: UniformNode<"sampler2D">;
  private dimensionsUniform?: UniformNode<"vec3">;
  private voxelCountUniform?: UniformNode<"vec3">;
  private lightDirUniform?: UniformNode<"vec3">;
  private lightColourUniform?: UniformNode<"vec3">;
  private ambientColourUniform?: UniformNode<"vec3">;
  private unlitUniform?: UniformNode<"bool">;
  private maskModeUniform?: UniformNode<"bool">;
  private pickedVoxelUniform?: UniformNode<"vec3">;

  constructor() {
    super();
    this.panelTextures = {
      front: emptyPanelTexture(),
      back: emptyPanelTexture(),
      left: emptyPanelTexture(),
      right: emptyPanelTexture(),
      top: emptyPanelTexture(),
      bottom: emptyPanelTexture(),
    };
    this.paletteTexture = new DataTexture(new Uint8Array(4), 1, 1);
  }

  protected setup(b: Builder, _scene: Scene): void {
    // One sampler per panel, named after the direction the panel looks from.
    const panel = (name: string, kind: SideKind) =>
      b.sampler(name, "usampler2D", () => this.panelTextures[kind]);
    this.panelUniforms = {
      front: panel("uFront", "front"),
      back: panel("uBack", "back"),
      left: panel("uLeft", "left"),
      right: panel("uRight", "right"),
      top: panel("uTop", "top"),
      bottom: panel("uBottom", "bottom"),
    };
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
    this.maskModeUniform = b.materialUniform("uMaskMode", "bool", () => (this.maskMode ? 1 : 0));
    this.pickedVoxelUniform = b.materialUniform("uPickedVoxel", "vec3", () => this.pickedVoxel);
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
    const { colour, voxelPos } = marchVolume({
      rayOrigin,
      rayDirection,
      panels: this.panelUniforms!,
      palette: this.paletteUniform!,
      dimensions: this.dimensionsUniform!,
      voxelCount: this.voxelCountUniform!,
      lightDir: this.lightDirUniform!,
      lightColour: this.lightColourUniform!,
      ambientColour: this.ambientColourUniform!,
      unlit: this.unlitUniform!,
    });

    // The picked voxel is an integer cell but uploaded as a float vec3 (the
    // scene renderer uploads integer uniforms as floats), so the comparison
    // is exact for the small indices voxels have.
    const position = voxelPos.toVec3();
    const isPicked = position.x
      .equal(this.pickedVoxelUniform!.x)
      .and(position.y.equal(this.pickedVoxelUniform!.y))
      .and(position.z.equal(this.pickedVoxelUniform!.z));

    // In mask mode only the picked voxel keeps its colour (transparent
    // elsewhere), brightened to full strength in the same hue, so the bloom
    // glows vividly in the voxel's colour.
    const out = colour.toVar();
    If(this.maskModeUniform!.toVar(), () => {
      If(isPicked, () => {
        // Scale the colour so its brightest channel is 1, keeping the hue.
        const brightest = colour.r.max(colour.g).max(colour.b).max(float(0.001));
        out.rgb.assign(colour.rgb.div(brightest));
        out.a.assign(float(1));
      }).Else(() => {
        out.assign(vec4(float(0), float(0), float(0), float(0)));
      });
    });
    return out;
  }
}
