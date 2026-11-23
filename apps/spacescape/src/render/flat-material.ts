/**
 * An unlit colour material for geometry that has a position and nothing else.
 *
 * **A `MeshBasicMaterial` is not that material.** Its default vertex stage also asks the
 * geometry for a normal and a UV, because the class is written for the built-in geometries
 * that all carry both. This application's meshed shapes do not: `toChunkGeometry` produces
 * `position`, `normalOct` and `colour` for the terrain's own shader, and a ghost or a CSG
 * visual built from it has no `normal` or `uv` at all. Drawing one with a plain
 * `MeshBasicMaterial` makes rmsl warn once per geometry about attributes the fragment stage
 * never reads.
 *
 * **Subclassed rather than copied so the colour, opacity, blending and depth flags stay the
 * ones `MeshBasicMaterial` already documents and honours.** The only difference is the vertex
 * stage: world position, and a UV only when there is actually a map to sample.
 */

import { vec4, type Node } from "@random-mesh/rmsl";
import type { Builder } from "@random-mesh/rmsl/scene";
import { MeshBasicMaterial } from "@random-mesh/rmsl/scene";

export class FlatMaterial extends MeshBasicMaterial {
  protected override buildVertexBody(b: Builder): Node<"vec4"> {
    const world = b.modelMatrix.mul(vec4(b.position, 1));
    b.positionWorld.assign(world.xyz);
    // The fragment stage reads `uvVarying` only through `map`; assigning it unconditionally
    // would bring back the very attribute request this class exists to avoid.
    if (this.map !== null) b.uvVarying.assign(b.uv);
    return b.projectionMatrix.mul(b.viewMatrix.mul(world));
  }
}
