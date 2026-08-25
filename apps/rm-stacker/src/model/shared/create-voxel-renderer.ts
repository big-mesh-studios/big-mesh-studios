import {
  BoxGeometry,
  Mesh,
  NodeMaterial,
  PerspectiveCamera,
  Quaternion,
  Scene,
  Vector3,
  WebGLRenderer,
} from "@random-mesh/rmsl/scene";
import { Dimensions3D, Vector3D } from "../../maths";
import type { Sides } from "../../types";
import type { ModelRenderer, VoxelMaterial } from "../types";
import { AMBIENT_COLOUR, LIGHT_COLOUR, modelSpaceLightDirection } from "./lighting";
import { createOutline } from "./outline";
import { paletteToBytes } from "./palette-texture";

export type UploadModel<M extends VoxelMaterial> = (
  material: M,
  dimensions: Dimensions3D,
  sides: Sides,
) => void;

// The CPU voxel picker builds its ray with a pinhole camera whose focal length
// is 2 (see rayMarcher in shaders-shared). A perspective camera with this
// vertical fov emits exactly those rays, so the click picker and the rendered
// preview agree no matter where the model is turned.
const FOV = 2 * Math.atan(0.5) * (180 / Math.PI);
const NEAR = 0.1;
const FAR = 100;

const X_AXIS = new Vector3(1, 0, 0);
const Y_AXIS = new Vector3(0, 1, 0);

/**
 * The size of the box bounding the volume, matching the box the ray marcher
 * intersects in shaders-shared: the volume (normalized) padded by one voxel on
 * each side, so rasterizing it limits the fragment shader to the pixels that
 * could possibly land on a voxel.
 */
export const boxSize = (dimensions: Dimensions3D) => {
  const normalized = Dimensions3D.normalize(dimensions);
  const scale = (axis: number, count: number) => axis * (1 + 2 / count);
  return {
    width: scale(normalized.width, dimensions.width),
    height: scale(normalized.height, dimensions.height),
    depth: scale(normalized.depth, dimensions.depth),
  };
};

/**
 * Turns the mesh to the orientation the world-to-model matrix (used by both
 * the CPU voxel picker and the material's ray origin) describes: the mesh's
 * world rotation is the inverse of that matrix, so its world-to-model — the
 * inverse of its world matrix — is exactly what the picker follows its ray
 * along.
 */
export const rotateMesh = (
  mesh: Mesh,
  yaw: number,
  pitch: number,
  spin: number,
  pitchQuaternion = new Quaternion(),
  yawQuaternion = new Quaternion(),
) => {
  pitchQuaternion.setFromAxisAngle(X_AXIS, pitch);
  yawQuaternion.setFromAxisAngle(Y_AXIS, yaw + spin);
  mesh.quaternion.copy(pitchQuaternion.multiply(yawQuaternion));
};

/**
 * The renderer skeleton shared by both render backends: the scene graph
 * (renderer, camera, box mesh, picked-voxel outline), resizing, the
 * per-frame camera/light/material-field pushes, and disposal. A backend
 * supplies only its material instance and how it uploads a model into it —
 * everything else about drawing a ray-marched voxel box is identical. Each
 * material is a standalone `NodeMaterial` (see gpu/material.ts,
 * cpu/material.ts) — this only needs the `VoxelMaterial` field surface.
 */
export function createVoxelRenderer<M extends NodeMaterial & VoxelMaterial>(
  canvas: HTMLCanvasElement,
  material: M,
  uploadModel: UploadModel<M>,
): ModelRenderer {
  const renderer = new WebGLRenderer(canvas, { antialias: false, depth: true });
  // Clear to transparent so the background painted behind the canvas shows
  // through the pixels no voxel ray lands on.
  renderer.setClearColor(0x000000, 0);
  const gl = renderer.gl;
  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, NEAR, FAR);
  camera.lookAt(0, 0, 0);
  const mesh = new Mesh(undefined, material);
  scene.add(mesh);

  const outline = createOutline();
  mesh.add(outline.mesh);

  let dimensions: Dimensions3D = { width: 1, height: 1, depth: 1 };
  let normalizedDimensions = Dimensions3D.normalize(dimensions);
  const modelSpaceLightDirectionVec = Vector3D.create();

  return {
    resize(width, height) {
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
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

      uploadModel(material, dimensions, sides);
    },

    setPalette(palette) {
      const texture = material.paletteTexture;
      texture.image = paletteToBytes(palette);
      texture.width = palette.length;
      texture.height = 1;
      texture.needsUpdate = true;
    },

    setUnlit(unlit) {
      material.unlit = unlit;
    },

    render(orbit, worldToModel, pickedVoxel) {
      // The mesh is turned to the orientation `worldToModel` describes, so
      // the mesh's world-to-model matrix (the inverse of its world matrix,
      // which the material uses for its ray origin) stays equal to
      // `worldToModel` — keeping a pick under the pointer aligned with what
      // is drawn.
      rotateMesh(mesh, orbit.yaw, orbit.pitch, orbit.spin);
      modelSpaceLightDirection(worldToModel, modelSpaceLightDirectionVec);

      material.dimensions = [
        normalizedDimensions.width,
        normalizedDimensions.height,
        normalizedDimensions.depth,
      ];
      material.voxelCount = [dimensions.width, dimensions.height, dimensions.depth];
      material.lightDir = [
        modelSpaceLightDirectionVec.x,
        modelSpaceLightDirectionVec.y,
        modelSpaceLightDirectionVec.z,
      ];
      material.lightColour = [LIGHT_COLOUR[0], LIGHT_COLOUR[1], LIGHT_COLOUR[2]];
      material.ambientColour = [AMBIENT_COLOUR[0], AMBIENT_COLOUR[1], AMBIENT_COLOUR[2]];

      camera.position.set(0, 0, orbit.radius);

      outline.setPicked(dimensions, pickedVoxel);

      renderer.render(scene, camera);
    },

    dispose() {
      // Deliberately does not force-lose the WebGL context (via
      // WEBGL_lose_context): the canvas is reused across a renderer swap
      // (toggling the cpu/gpu backend keeps the same <canvas> element), and
      // a canvas's context, once created, is permanent for that canvas's
      // lifetime — losing it here would leave the next renderer's
      // getContext() call handed back the same, now-dead context, and every
      // shader it tries to compile would fail. renderer.dispose() already
      // frees the GL resources (programs, buffers, textures) this renderer
      // owns without invalidating the context itself.
      renderer.dispose();

      // rmsl's WebGLRenderer never binds a non-default vertex array object —
      // every mesh's attributes are enabled directly on the one shared
      // default VAO and never explicitly disabled again. Deleting this
      // renderer's buffers above leaves any attribute location it last
      // enabled still marked enabled, now pointing at a deleted buffer; the
      // next renderer sharing this canvas's context only rebinds the
      // locations its own geometry uses, so a stale one left over here
      // would fail WebGL's "no buffer bound to enabled attribute" check on
      // its very next draw call. Disabling every attribute slot leaves the
      // context clean for whichever renderer reuses it.
      const maxAttribs = gl.getParameter(gl.MAX_VERTEX_ATTRIBS) as number;
      for (let i = 0; i < maxAttribs; i++) {
        gl.disableVertexAttribArray(i);
      }
    },
  };
}
