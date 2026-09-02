// The flat-colour pass the hardware occlusion culler draws, shown on screen so
// a viewer can see which chunk each region of the world belongs to. It reads
// the same per-vertex `occlusionColor` attribute the probe pass writes — the
// packed slot id — and remaps that id to a colour the eye can tell apart: the
// probe's own colour packs the id into the three 8-bit channels, which shades
// adjacent slot ids one byte apart and so reads as a smear. Here the id is
// unpacked and rotated through hue space by the golden angle, so even
// neighbouring slots land on clearly different hues. The readback logic is
// untouched: this is a view of the id, not a different way of encoding it.
import { mat3, vec3, vec4, type Node } from "@random-mesh/rmsl";
import { Builder, NodeMaterial } from "@random-mesh/rmsl/scene";

export class OcclusionDebugMaterial extends NodeMaterial {
  protected setup(b: Builder): void {
    void b.attribute("occlusionColor", "vec3");
    void b.varying("occlusionColor", "vec3");
  }

  protected buildVertexBody(b: Builder): Node<"vec4"> {
    const colourVarying = b.varying("occlusionColor", "vec3");
    colourVarying.assign(b.attribute("occlusionColor", "vec3"));
    const position4 = vec4(b.position, 1);
    const localPosition = b.instancing
      ? b.instanceMatrix.mul(position4)
      : position4;
    const worldPosition = b.modelMatrix.mul(localPosition);
    b.positionWorld.assign(worldPosition.xyz);
    let normal: Node<"vec3"> = b.normal;
    if (b.instancing) {
      normal = mat3(b.instanceMatrix).mul(normal);
    }
    b.normalWorld.assign(b.normalMatrix.mul(normal).normalize());
    b.uvVarying.assign(b.uv);
    if (b.instancingColor) {
      b.instanceColorVarying.assign(b.instanceColor);
    }
    return b.projectionMatrix.mul(b.viewMatrix.mul(worldPosition));
  }

  protected buildFragmentBody(b: Builder): Node<"vec4"> {
    const packed = b.varying("occlusionColor", "vec3");
    const red = packed.element(0).mul(255).round();
    const green = packed.element(1).mul(255).round();
    const blue = packed.element(2).mul(255).round();
    const id = red.add(green.mul(256)).add(blue.mul(65536));
    const hue = id.mul(0.6180339887).fract();
    // A branchless hue-to-rgb: the golden-angled hue walks the three colour
    // channels through a continuous ramp, saturated and bright so the bands
    // read clearly against the sky behind them.
    const p = vec3(hue)
      .add(vec3(1, 2 / 3, 1 / 3))
      .fract()
      .mul(6)
      .sub(3)
      .abs();
    const rgb = vec3(0.9).mul(vec3(1).mix(p.sub(vec3(1)).clamp(0, 1), 0.8));
    return vec4(rgb, 1);
  }
}
