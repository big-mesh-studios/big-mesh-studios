import { bool, Break, Discard, float, Fn, For, If, int, ivec3, Node, UniformNode, vec2, vec3, vec4 } from "@random-mesh/rmsl";
import { Builder, DataTexture, NodeMaterial, Scene, Vector3 } from "@random-mesh/rmsl/scene";

export class Level {
  // r === 0 -> empty space; r === 1 -> non-empty space
  broadData: Uint8Array;
  broadDim: number;
  // the size of each of the chunks in a broad cell
  chunkDim: number;
  // the size of the storage
  storageDim: number;
  data: Uint8Array;

  constructor(params: {
    broadDim: number,
    chunkDim: number,
    storageDim: number,
  }) {
    let { broadDim, chunkDim, storageDim, } = params;
    this.broadData = new Uint8Array(broadDim * broadDim * broadDim * 4);
    this.broadDim = broadDim;
    this.chunkDim = chunkDim;
    this.storageDim = storageDim;
    this.data = new Uint8Array(storageDim * storageDim * storageDim * 4);
  }
}

export type LevelChunk = {
  data: Uint8Array;
  lenX: number;
  lenY: number;
  lenZ: number;
}

export function makeLevelChunk(lenX: number, lenY: number, lenZ: number) {
  let len = lenX * lenY * lenZ;
  let data = new Uint8Array(len * 4);
  for (let i = 0, l = 0; i < lenZ; ++i) {
    for (let j = 0; j < lenY; ++j) {
      for (let k = 0; k < lenX; ++k) {
        let cell = (i === 1 && j === 1 && k === 1) ? 1 : 0;
        data[l++] = cell;
        data[l++] = 0;
        data[l++] = 0;
        data[l++] = 0;
      }
    }
  }
  return { data, lenX, lenY, lenZ, };
}

// Componentwise min/max of two vectors, expressed with abs since rmsl only
// types the scalar variants: (a + b +/- |a - b|) / 2
const minVec2 = (a: Node<"vec2">, b: Node<"vec2">): Node<"vec2"> =>
  a.add(b).sub(a.sub(b).abs()).mul(float(0.5));
const maxVec2 = (a: Node<"vec2">, b: Node<"vec2">): Node<"vec2"> =>
  a.add(b).add(a.sub(b).abs()).mul(float(0.5));
const minVec3 = (a: Node<"vec3">, b: Node<"vec3">): Node<"vec3"> =>
  a.add(b).sub(a.sub(b).abs()).mul(float(0.5));
const maxVec3 = (a: Node<"vec3">, b: Node<"vec3">): Node<"vec3"> =>
  a.add(b).add(a.sub(b).abs()).mul(float(0.5));

// The volume fills the whole grid (one texel per voxel), so a cell is inside
// the volume exactly when every index lies in [0, uVoxelCount).
const inBounds = (voxelCount: Node<"vec3">, cell: Node<"ivec3">): Node<"bool"> => {
  const c = cell.toVec3();
  return c
    .greaterThanEqual(vec3(float(0)))
    .all()
    .and(c.lessThan(voxelCount).all());
};

// The ray is intersected with a box padded by one voxel on each side, so its
// start and exit land safely outside the volume instead of exactly on a wall
// face, where float error could put them on the wrong side. The DDA therefore
// walks from up to a cell or two outside, sampling only cells that are in the
// volume and stopping once it leaves the padded range.
const paddedInBounds = (voxelCount: Node<"vec3">, cell: Node<"ivec3">): Node<"bool"> => {
  const c = cell.toVec3();
  return c
    .greaterThanEqual(vec3(float(-2)))
    .all()
    .and(c.lessThan(voxelCount.add(vec3(float(2)))).all());
};



export class LevelChunkMaterial extends NodeMaterial {
  voxelTexture: DataTexture;

  private voxelsUniform?: UniformNode<"usampler3D">;
  private uDimensions?: UniformNode<"vec3">;
  private uVoxelCount?: UniformNode<"vec3">;

  constructor() {
    super();
    this.voxelTexture = new DataTexture(new Uint8Array(4), 1, 1, 1);
  }

  setLevelChunk(levelChunk: LevelChunk): void {
    this.voxelTexture = new DataTexture(
      levelChunk.data,
      levelChunk.lenX,
      levelChunk.lenY,
      levelChunk.lenZ,
    );
  }

  protected setup(b: Builder, _scene: Scene): void {
    this.voxelsUniform = b.sampler("uVoxels", "usampler3D", () => this.voxelTexture);
    let cellSize = 0.1;
    this.uDimensions = b.materialUniform("uDimensions", "vec3", () => [
      this.voxelTexture.width * cellSize,
      this.voxelTexture.height * cellSize,
      this.voxelTexture.depth * cellSize,
    ]);
    this.uVoxelCount = b.materialUniform("uVoxelCount", "vec3", () => [
      this.voxelTexture.width,
      this.voxelTexture.height,
      this.voxelTexture.depth,
    ]);
  }

  protected buildVertexBody(b: Builder): Node<"vec4"> {
    const position = b.position;
    b.varying("vModelPos", "vec3").assign(position);
    return b.projectionMatrix.mul(b.viewMatrix.mul(b.modelMatrix.mul(vec4(position, 1.0))));
  }

  protected buildFragmentBody(b: Builder): Node<"vec4"> {
    const vModelPos = b.varying("vModelPos", "vec3");
    const rayOrigin = b.normalMatrix.mul(b.cameraPosition);
    const rayDirection = vModelPos.sub(rayOrigin).normalize();

    const uVoxels = this.voxelsUniform!;
    const dimensions = this.uDimensions!;
    const voxelCount = this.uVoxelCount!;

    const fragmentShader = Fn(() => {

      const cellSize = dimensions.div(voxelCount).toVar();
      const boxMin = dimensions.mul(-0.5).sub(cellSize).toVar();
      const boxMax = dimensions.mul(0.5).sub(cellSize).toVar();
      const inverseRayDirection = vec3(1.0).div(rayDirection).toVar();

      const colour = vec4(0).toVar();
      const voxelPos = ivec3(0).toVar();
      const normal = vec3(0).toVar();

      const ambientColour = vec3(0.2).toVar();
      const lightColour = vec3(1.0).toVar();
      const lightDir = vec3(1.0, 2.0, 1.0).normalize().toVar();

      const distanceToMinPlanes = inverseRayDirection.mul(boxMin.sub(rayOrigin)).toVar();
      const distanceToMaxPlanes = inverseRayDirection.mul(boxMax.sub(rayOrigin)).toVar();

      const nearPlaneDistances = minVec3(distanceToMinPlanes, distanceToMaxPlanes);
      const farPlaneDistances = maxVec3(distanceToMinPlanes, distanceToMaxPlanes);

      const nearPair = maxVec2(
        vec2(nearPlaneDistances.x, nearPlaneDistances.x),
        nearPlaneDistances.yz,
      ).toVar();
      const entryDistance = nearPair.x.max(nearPair.y).toVar();

      const farPair = minVec2(
        vec2(farPlaneDistances.x, farPlaneDistances.x),
        farPlaneDistances.yz,
      ).toVar();
      const exitDistance = farPair.x.min(farPair.y).toVar();

      If(entryDistance.lessThanEqual(exitDistance), () => {
        const cellDir = rayDirection.div(cellSize).toVar();

        const entryPoint = rayOrigin.add(rayDirection.mul(entryDistance)).toVar();
        const cellOrigin = entryPoint
          .add(dimensions.mul(0.5))
          .div(cellSize)
          .add(cellDir.mul(0.001))
          .toVar();

        const mapPos = cellOrigin.floor().toIVec3().toVar();
        const rayStep = rayDirection.sign().toIVec3().toVar();
        const deltaDist = vec3(1.0)
          .div(cellDir.abs().max(1e-6))
          .toVar();
        const sideDist = rayStep
          .toVec3()
          .mul(mapPos.toVec3().sub(cellOrigin))
          .add(rayStep.toVec3().mul(0.5).add(0.5))
          .mul(deltaDist)
          .toVar();

        const mask = vec3(float(0)).toVar();

        If(nearPlaneDistances.x.equal(entryDistance), () => {
          mask.assign(vec3(float(1), float(0), float(0)));
        })
          .ElseIf(nearPlaneDistances.y.equal(entryDistance), () => {
            mask.assign(vec3(float(0), float(1), float(0)));
          })
          .Else(() => {
            mask.assign(vec3(float(0), float(0), float(1)));
          });

        const maxSteps = voxelCount.x
          .max(voxelCount.y)
          .max(voxelCount.z)
          .mul(float(3))
          .add(float(8))
          .toInt();

        const hit = bool(false).toVar();
        For(
          () => int(0).toVar(),
          i => i.lessThan(maxSteps),
          i => i.assign(i.add(1)),
          () => {
            If(paddedInBounds(voxelCount, mapPos).not(), () => {
              Break();
            });
            If(inBounds(voxelCount, mapPos), () => {
              If(uVoxels.texture(mapPos.toUVec3()).r.notEqual(0), () => {
                hit.assign(bool(true));
                Break();
              });
            });
            mask.assign(
              sideDist
                .lessThanEqual(
                  vec3(
                    sideDist.y.min(sideDist.z),
                    sideDist.z.min(sideDist.x),
                    sideDist.x.min(sideDist.y),
                  ),
                )
                .toVec3(),
            );
            sideDist.assign(sideDist.add(mask.mul(deltaDist)));
            mapPos.assign(mapPos.add(mask.toIVec3().mul(rayStep)));
          },
        );
        If(hit, () => {
          voxelPos.assign(mapPos);
          const voxel = uVoxels.texture(mapPos.toUVec3());
          normal.assign(mask.mul(rayStep.toVec3()).negate());
          const diffuse = normal.dot(lightDir).max(float(0));
          colour.rgb.assign(
            vec3(0.0, 0.0, 1.0).mul(
              ambientColour.add(lightColour.mul(diffuse)),
            ),
          );
          colour.a.assign(float(1));
        }).Else(() => {
          Discard();
        });
      });

      return colour;
    });

    return fragmentShader();
  }
}

