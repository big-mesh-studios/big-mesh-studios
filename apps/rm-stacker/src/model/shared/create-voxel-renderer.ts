import {
  BoxGeometry,
  Mesh,
  NodeMaterial,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from "@random-mesh/rmsl/scene";
import { Dimensions3D, Vector3D } from "../../maths";
import type { Sides } from "../../types";
import type { ModelRenderer, VoxelMaterial } from "../types";
import { AMBIENT_COLOUR, LIGHT_COLOUR, modelSpaceLightDirection } from "./lighting";
import { createOutline } from "./outline";
import { paletteToBytes } from "./palette-texture";
import { boxSize, FAR, FOV, NEAR, rotateMesh } from "./scene";

export type UploadModel<M extends VoxelMaterial> = (
  material: M,
  dimensions: Dimensions3D,
  sides: Sides,
) => void;

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
      renderer.dispose();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
