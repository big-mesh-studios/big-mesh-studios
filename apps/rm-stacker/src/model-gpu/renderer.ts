import { uniform } from "@random-mesh/rmsl";
import { bloom } from "@random-mesh/rmsl/effects";
import { BoxGeometry, Mesh, PerspectiveCamera, Scene, WebGLRenderer } from "@random-mesh/rmsl/scene";
import { Dimensions3D, Matrix3x3, RGBA, Vector3D } from "../maths";
import type { ModelRenderer } from "../model-renderer";
import type { Sides } from "../types";
import { BloomExecutor, createRenderTarget, GlowPass, type RenderTarget } from "./bloom-executor";
import { VoxelPreviewMaterial } from "./material";
import { PANEL_PAIR_KINDS, PANEL_PAIR_UNIFORM_NAME, toPanelPairTextures } from "./panel-textures";
import { boxSize, FAR, FOV, NEAR, rotateMesh } from "./scene";
import shaders from "./shaders";
import { voxelPicker } from "./voxel-picker";

/**
 * Directional and ambient light for the model, in world space. The model
 * turns beneath a fixed light, so the direction is rotated into the model's
 * space before it is uploaded rather than sent as it stands.
 */
const LIGHT_DIR = Object.freeze(Vector3D.normalize(Vector3D.create(0.4, 0.7, 0.8)));
const LIGHT_COLOUR = new Float32Array([1.0, 0.97, 0.9]);
const AMBIENT_COLOUR = new Float32Array([0.35, 0.35, 0.4]);

/**
 * Bloom parameters for the picked-voxel glow. The bloom source is the picked
 * voxel's own colour, so the threshold only needs to clear zero — everything
 * else in the mask is transparent.
 */
const BLOOM_STRENGTH = 1;
const BLOOM_RADIUS = 0.4;
const BLOOM_THRESHOLD = 0;
const BLOOM_SMOOTH_WIDTH = 0.01;

function paletteToBytes(palette: RGBA[]): Uint8Array {
  const data = new Uint8Array(palette.length * 4);
  palette.forEach(({ r, g, b, a }, i) => {
    const offset = i << 2;
    data[offset] = r;
    data[offset + 1] = g;
    data[offset + 2] = b;
    data[offset + 3] = a;
  });
  return data;
}

/**
 * Marches a ray per pixel directly against the model's six drawn panels,
 * packed a facing pair to a texture: solidity along the ray is resolved in
 * the fragment shader rather than from a volume solved up front. Also
 * resolves a screen point to a voxel by running the same march on the CPU,
 * and glows the picked voxel with a selective bloom pass.
 */
export function createGpuModelRenderer(canvas: HTMLCanvasElement): ModelRenderer {
  const renderer = new WebGLRenderer(canvas, { antialias: false, depth: true });
  // Clear to transparent so the background painted behind the canvas shows
  // through the pixels no voxel ray lands on.
  renderer.setClearColor(0x000000, 0);
  const gl = renderer.gl;
  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, NEAR, FAR);
  camera.lookAt(0, 0, 0);
  const material = new VoxelPreviewMaterial();
  const mesh = new Mesh(undefined, material);
  scene.add(mesh);

  const maskSampler = uniform("sampler2D");
  const bloomGraph = bloom(maskSampler, {
    strength: BLOOM_STRENGTH,
    radius: BLOOM_RADIUS,
    threshold: BLOOM_THRESHOLD,
    smoothWidth: BLOOM_SMOOTH_WIDTH,
  });
  const bloomExecutor = new BloomExecutor(gl, bloomGraph);
  const glow = new GlowPass(gl);

  let maskTarget: RenderTarget | null = null;
  let dimensions: Dimensions3D = { width: 1, height: 1, depth: 1 };
  let normalizedDimensions = Dimensions3D.normalize(dimensions);
  let palette: RGBA[] = [];
  let panelPairTextures: ReturnType<typeof toPanelPairTextures> | undefined;
  let unlit = false;
  let pickedVoxel: [number, number, number] | undefined;
  const modelSpaceLightDirection = Vector3D.create();

  function ensureMaskTarget(width: number, height: number) {
    if (maskTarget !== null && maskTarget.width === width && maskTarget.height === height) {
      return;
    }
    if (maskTarget !== null) {
      gl.deleteFramebuffer(maskTarget.fbo);
      gl.deleteTexture(maskTarget.texture);
      if (maskTarget.depth !== null) {
        gl.deleteRenderbuffer(maskTarget.depth);
      }
    }
    // The mask target carries a depth buffer because the box is rendered
    // with depth.
    maskTarget = createRenderTarget(gl, width, height, true);
  }

  return {
    resize(width, height) {
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      ensureMaskTarget(width, height);
    },

    setModel(newDimensions, sides) {
      dimensions = newDimensions;
      normalizedDimensions = Dimensions3D.normalize(dimensions);

      // The box that bounds the volume, matching the one the marcher
      // intersects: the volume padded by one voxel on each side, so
      // rasterizing it limits the fragment shader to the pixels that could
      // land on a voxel.
      const size = boxSize(dimensions);
      mesh.geometry = new BoxGeometry(size.width, size.height, size.depth);

      const pairs = toPanelPairTextures(sides);
      PANEL_PAIR_KINDS.forEach(kind => {
        const pair = pairs[kind];
        const texture = material.panelPairTextures[kind];
        texture.image = pair.data;
        texture.width = pair.width;
        texture.height = pair.height;
        texture.needsUpdate = true;
      });
      panelPairTextures = pairs;
    },

    setPalette(newPalette) {
      palette = newPalette;
      const texture = material.paletteTexture;
      texture.image = paletteToBytes(palette);
      texture.width = palette.length;
      texture.height = 1;
      texture.needsUpdate = true;
    },

    setUnlit(newUnlit) {
      unlit = newUnlit;
    },

    render(orbit, worldToModel) {
      // The mesh is turned to the orientation `worldToModel` describes, so
      // the mesh's world-to-model matrix (the inverse of its world matrix,
      // which the material uses for its ray origin) stays equal to
      // `worldToModel` — keeping a pick under the pointer aligned with what
      // is drawn.
      rotateMesh(mesh, orbit.yaw, orbit.pitch, orbit.spin);
      Matrix3x3.transform(worldToModel, LIGHT_DIR, modelSpaceLightDirection);

      material.dimensions = [
        normalizedDimensions.width,
        normalizedDimensions.height,
        normalizedDimensions.depth,
      ];
      material.voxelCount = [dimensions.width, dimensions.height, dimensions.depth];
      material.lightDir = [
        modelSpaceLightDirection.x,
        modelSpaceLightDirection.y,
        modelSpaceLightDirection.z,
      ];
      material.lightColour = [LIGHT_COLOUR[0], LIGHT_COLOUR[1], LIGHT_COLOUR[2]];
      material.ambientColour = [AMBIENT_COLOUR[0], AMBIENT_COLOUR[1], AMBIENT_COLOUR[2]];
      material.unlit = unlit;

      camera.position.set(0, 0, orbit.radius);

      if (maskTarget === null) {
        return;
      }

      // The bloom and glow passes bind their own quad VAOs, so the scene
      // renderer (which uses plain attribute pointers) is put back on the
      // default VAO first, or it would overwrite the quad VAO and the glow
      // would draw with the box's vertices.
      gl.bindVertexArray(null);
      renderer.render(scene, camera);

      // The picked voxel, alone and bright, is the bloom source. The marcher
      // only lights it when it is the front-most hit, so an occluded pick
      // shows no glow.
      if (pickedVoxel !== undefined && pickedVoxel[0] >= 0) {
        material.maskMode = true;
        material.pickedVoxel = pickedVoxel;
        gl.bindFramebuffer(gl.FRAMEBUFFER, maskTarget.fbo);
        gl.bindVertexArray(null);
        renderer.render(scene, camera);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        material.maskMode = false;

        const bloomResult = bloomExecutor.run({
          scene: maskTarget.texture,
          sceneWidth: maskTarget.width,
          sceneHeight: maskTarget.height,
        });
        glow.draw(bloomResult.tex, maskTarget.width, maskTarget.height);
      }
    },

    pick(uv, orbit, worldToModel) {
      const pairs = panelPairTextures;
      if (pairs === undefined) {
        return undefined;
      }
      Matrix3x3.transform(worldToModel, LIGHT_DIR, modelSpaceLightDirection);

      // Ray-marches the same panels the fragment shader reads, from a screen
      // point in UV space, and returns the voxel index under it (or
      // [-1, -1, -1] for empty space). The picker is precompiled at build
      // time by precompileJS, so this never runs the rmsl graph in the
      // browser.
      const picked = voxelPicker({
        uniforms: {
          [shaders.uResolution]: [canvas.width, canvas.height],
          [shaders.uDimensions]: [
            normalizedDimensions.width,
            normalizedDimensions.height,
            normalizedDimensions.depth,
          ],
          [shaders.uVoxelCount]: [dimensions.width, dimensions.height, dimensions.depth],
          [shaders.uLightDir]: [
            modelSpaceLightDirection.x,
            modelSpaceLightDirection.y,
            modelSpaceLightDirection.z,
          ],
          [shaders.uLightColour]: Array.from(LIGHT_COLOUR),
          [shaders.uAmbientColour]: Array.from(AMBIENT_COLOUR),
          [shaders.uCameraPosition]: [0, 0, orbit.radius],
          [shaders.uWorldToModel]: Array.from(worldToModel),
          [shaders.uUnlit]: unlit,
        },
        varying: { vUv: [uv[0], uv[1]] },
        textures: {
          ...Object.fromEntries(
            PANEL_PAIR_KINDS.map(kind => [PANEL_PAIR_UNIFORM_NAME[kind], pairs[kind]]),
          ),
          [shaders.uPalette]: { data: paletteToBytes(palette), width: palette.length, height: 1 },
        },
      });

      // The picker is not reentrant: it returns a shared scratch array that
      // it mutates in place on every call, so it is copied before it is kept.
      const result = picked.slice() as [number, number, number];
      pickedVoxel = result;
      return result;
    },

    dispose() {
      if (maskTarget !== null) {
        gl.deleteFramebuffer(maskTarget.fbo);
        gl.deleteTexture(maskTarget.texture);
        if (maskTarget.depth !== null) {
          gl.deleteRenderbuffer(maskTarget.depth);
        }
      }
      bloomExecutor.dispose();
      glow.dispose();
      renderer.dispose();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
