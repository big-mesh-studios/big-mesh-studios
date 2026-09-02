// The flat colour pass the hardware occlusion culler draws into its offscreen
// target. One material is shared by every chunk's probes (terrain and water
// get one instance each, differing only in whether they write depth), with the
// chunk's slot id carried per vertex in the geometry's `occlusionColor`
// attribute — so the whole probe scene compiles exactly two programs, whatever
// the window holds. The fragment writes the interpolated id straight out: no
// lighting, no texture, no fog, so the pixel the readback collects is exactly
// the chunk that won the depth test there.
import { mat3, vec4, type Node } from "@random-mesh/rmsl";
import { Builder, NodeMaterial } from "@random-mesh/rmsl/scene";

export class OcclusionProbeMaterial extends NodeMaterial {
  protected setup(b: Builder): void {
    // The varying and the attribute it is fed from are declared in `setup`, so
    // both stages resolve the same names; the vertex body below writes the
    // varying, the fragment body reads it back.
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
    return vec4(b.varying("occlusionColor", "vec3"), 1);
  }
}
