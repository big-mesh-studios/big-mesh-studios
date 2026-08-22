// Node materials for the triangle (surface-mesh) renderer. They replicate the
// raymarched look with real geometry: the fragment shades the interpolated
// vertex normal + baked atlas UV, applies the same day-night sun/moon/ambient
// lighting and distance fog as `LevelWorldMaterial`, and the water pass blends
// over the scene with the same Fresnel reflection as `LevelWaterMaterial`.
import { float, min, pow, vec3, vec4 } from "@random-mesh/rmsl";
import type { Node } from "@random-mesh/rmsl";
import {
  Builder,
  NodeMaterial,
  Scene,
  Side,
  Texture,
} from "@random-mesh/rmsl/scene";
import type { UniformNode } from "@random-mesh/rmsl";

// Opaque terrain surface. One shared instance across every block's mesh; the
// per-face look lives in the geometry (positions/normals/baked atlas UVs).
export class LevelTriangleMaterial extends NodeMaterial {
  // The spritesheet uploaded as one 2D texture; set asynchronously once loaded
  // (mirrors `LevelWorldMaterial.tilesTexture`).
  tilesTexture: Texture | null = null;
  maxDistance: number = 480;
  fogStart: number = 200;
  fogColor: [number, number, number] = [0.53, 0.81, 0.92];
  sunDirection: [number, number, number] = [
    1 / Math.sqrt(6),
    2 / Math.sqrt(6),
    1 / Math.sqrt(6),
  ];
  sunLightColor: [number, number, number] = [1, 1, 1];
  moonDirection: [number, number, number] = [
    -1 / Math.sqrt(6),
    -2 / Math.sqrt(6),
    -1 / Math.sqrt(6),
  ];
  moonLightColor: [number, number, number] = [0, 0, 0];
  ambientColor: [number, number, number] = [0.2, 0.2, 0.2];

  private maxDistanceUniform: UniformNode<"float"> | undefined;
  private fogStartUniform: UniformNode<"float"> | undefined;
  private fogColorUniform: UniformNode<"vec3"> | undefined;
  private sunDirectionUniform: UniformNode<"vec3"> | undefined;
  private sunLightColorUniform: UniformNode<"vec3"> | undefined;
  private moonDirectionUniform: UniformNode<"vec3"> | undefined;
  private moonLightColorUniform: UniformNode<"vec3"> | undefined;
  private ambientColorUniform: UniformNode<"vec3"> | undefined;
  private tilesSampler: UniformNode<"sampler2D"> | undefined;

  constructor() {
    super();
    this.side = Side.DoubleSide;
  }

  protected setup(b: Builder, _scene: Scene): void {
    this.maxDistanceUniform = b.materialUniform(
      "maxDistance",
      "float",
      () => this.maxDistance,
    );
    this.fogStartUniform = b.materialUniform(
      "fogStart",
      "float",
      () => this.fogStart,
    );
    this.fogColorUniform = b.materialUniform(
      "fogColor",
      "vec3",
      () => this.fogColor,
    );
    this.sunDirectionUniform = b.materialUniform(
      "sunDirection",
      "vec3",
      () => this.sunDirection,
    );
    this.sunLightColorUniform = b.materialUniform(
      "sunLightColor",
      "vec3",
      () => this.sunLightColor,
    );
    this.moonDirectionUniform = b.materialUniform(
      "moonDirection",
      "vec3",
      () => this.moonDirection,
    );
    this.moonLightColorUniform = b.materialUniform(
      "moonLightColor",
      "vec3",
      () => this.moonLightColor,
    );
    this.ambientColorUniform = b.materialUniform(
      "ambientColor",
      "vec3",
      () => this.ambientColor,
    );
    if (this.tilesTexture !== null) {
      this.tilesSampler = b.sampler(
        "tilesAtlas",
        "sampler2D",
        () => this.tilesTexture,
      );
    }
  }

  protected buildFragmentBody(b: Builder): Node<"vec4"> {
    const normal = b.normalWorld.normalize().toVar();
    const positionWorld = b.positionWorld.toVar();
    const uv = b.uvVarying.toVar();

    const lightDir =
      this.sunDirectionUniform ?? vec3(0.4, 0.7, 0.4).normalize();
    const lightColour = this.sunLightColorUniform ?? vec3(1.0);
    const moonDir =
      this.moonDirectionUniform ?? vec3(-0.4, -0.7, -0.4).normalize();
    const moonLightColour = this.moonLightColorUniform ?? vec3(0);
    const ambientColour = this.ambientColorUniform ?? vec3(0.2);
    const fogColour = this.fogColorUniform ?? vec3(0.53, 0.81, 0.92);
    const fogNear = this.fogStartUniform ?? float(200);
    const maxDist = this.maxDistanceUniform ?? float(480);

    const diffuse = normal.dot(lightDir).max(float(0));
    const moonDiffuse = normal.dot(moonDir).max(float(0));
    const lighting = ambientColour
      .add(lightColour.mul(diffuse))
      .add(moonLightColour.mul(moonDiffuse));

    // flat blue until the spritesheet is applied (mirrors the raymarch fallback)
    let albedo = vec3(0.0, 0.0, 1.0);
    if (this.tilesSampler !== undefined) {
      albedo = this.tilesSampler.texture(uv).rgb;
    }
    const lit = albedo.mul(lighting).toVar();

    const dist = positionWorld.sub(b.cameraPosition).length().toVar();
    const fogFactor = dist.smoothstep(fogNear, maxDist).toVar();
    lit.assign(lit.mix(fogColour, fogFactor));
    return vec4(lit, 1.0);
  }
}

// Translucent water surface pass, drawn after the opaque terrain in scene-graph
// order. Shades each fragment with the same Fresnel sky reflection + base
// transparency as the raymarch water pass; the geometry is the water surface
// mesh, so depth-testing occludes correctly against terrain and the player.
export class LevelTriangleWaterMaterial extends NodeMaterial {
  fogColor: [number, number, number] = [0.53, 0.81, 0.92];
  waterColor: [number, number, number] = [0.1, 0.35, 0.55];
  waterOpacity: number = 0.5;

  private fogColorUniform: UniformNode<"vec3"> | undefined;
  private waterColorUniform: UniformNode<"vec3"> | undefined;
  private waterOpacityUniform: UniformNode<"float"> | undefined;

  constructor() {
    super();
    this.transparent = true;
    this.depthWrite = false;
    this.side = Side.DoubleSide;
  }

  protected setup(b: Builder, _scene: Scene): void {
    this.fogColorUniform = b.materialUniform(
      "fogColor",
      "vec3",
      () => this.fogColor,
    );
    this.waterColorUniform = b.materialUniform(
      "waterColor",
      "vec3",
      () => this.waterColor,
    );
    this.waterOpacityUniform = b.materialUniform(
      "waterOpacity",
      "float",
      () => this.waterOpacity,
    );
  }

  protected buildFragmentBody(b: Builder): Node<"vec4"> {
    const skyColour = this.fogColorUniform ?? vec3(0.53, 0.81, 0.92);
    const waterColour = this.waterColorUniform ?? vec3(0.1, 0.35, 0.55);
    const waterOpacity = this.waterOpacityUniform ?? float(0.5);

    const positionWorld = b.positionWorld.toVar();
    const rayDirection = positionWorld.sub(b.cameraPosition).normalize();
    const fresnel = float(0.05)
      .add(float(0.95).mul(pow(float(1).sub(rayDirection.y.abs()), float(3))))
      .toVar();
    const rgb = waterColour.mix(skyColour, fresnel);
    const alpha = fresnel.add(waterOpacity).min(float(1));
    return vec4(rgb, alpha);
  }
}
