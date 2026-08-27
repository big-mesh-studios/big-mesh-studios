// Drawing a model into a picture, away from the screen.
//
// The preview draws the model into a canvas somebody is looking at. This draws
// the same model, with the same material and the same light, into a canvas
// attached to nothing — for the small picture a published model carries, which
// is wanted for a model whether or not it is the one on screen.
//
// The pixels are read back the instant after the frame is drawn, while the
// drawing buffer still holds it. A canvas is free to throw that away as soon as
// the browser gets a turn, and the usual way around it — asking for the buffer
// to be preserved — costs something on every frame ever drawn, to be paid back
// on the rare one that is read.
import {
  BoxGeometry,
  Mesh,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from "@random-mesh/rmsl/scene";
import { Dimensions3D, Matrix3x3, RGBA, Vector3D } from "./maths";
import { VoxelPreviewMaterial } from "./voxel-preview-material";
import {
  AMBIENT_COLOUR,
  boxSize,
  FAR,
  FOV,
  LIGHT_COLOUR,
  LIGHT_DIR,
  NEAR,
  rotateMesh,
} from "./voxel-preview-scene";

export interface VoxelImageRequest {
  dimensions: Dimensions3D;
  /** The solved volume, as `solveVoxels` hands it back. */
  voxels: Uint8Array;
  palette: RGBA[];
  /** How many pixels across and down the picture is. */
  size: number;
  /** Which way the model is turned, and how far back the camera stands. */
  yaw: number;
  pitch: number;
  radius: number;
}

/** The palette as a texture: one row of texels, red green blue alpha. */
function paletteTexels(palette: RGBA[]): Uint8Array {
  const data = new Uint8Array(palette.length * 4);

  palette.forEach(({ r, g, b, a }, index) => {
    const offset = index << 2;
    data[offset + 0] = r;
    data[offset + 1] = g;
    data[offset + 2] = b;
    data[offset + 3] = a;
  });

  return data;
}

interface OffscreenScene {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  mesh: Mesh;
  material: VoxelPreviewMaterial;
}

/**
 * The one scene every picture is drawn in, built when the first is asked for
 * and kept afterwards.
 *
 * A browser will only hold so many graphics contexts at once and starts taking
 * the oldest away when asked for more, so building one per picture would
 * eventually be building it at the expense of the preview the person is looking
 * at. Keeping one also keeps the compiled shader, which is most of what drawing
 * the first picture costs.
 */
let offscreen: OffscreenScene | undefined;

function offscreenScene(): OffscreenScene | undefined {
  if (offscreen !== undefined && !offscreen.renderer.gl.isContextLost()) {
    return offscreen;
  }

  if (typeof document === "undefined") {
    return undefined;
  }

  try {
    // Without smoothing, so every pixel is either the model's colour or none of
    // it. A smoothed edge would be part transparent, and the canvas keeps those
    // colours already multiplied by their transparency — which a png does not,
    // and which would show as a dark rim once they were written out as one.
    const renderer = new WebGLRenderer(document.createElement("canvas"), {
      antialias: false,
      depth: true,
    });
    // Clear to nothing at all, so the model is cut out of its background rather
    // than sitting on a colour that will not suit wherever it ends up shown.
    renderer.setClearColor(0x000000, 0);

    const material = new VoxelPreviewMaterial();
    const mesh = new Mesh(new BoxGeometry(1, 1, 1), material);
    const scene = new Scene();
    scene.add(mesh);

    offscreen = {
      renderer,
      scene,
      material,
      mesh,
      camera: new PerspectiveCamera(FOV, 1, NEAR, FAR),
    };

    return offscreen;
  } catch {
    return undefined;
  }
}

/**
 * Draws `request` and hands back its pixels as red, green, blue and alpha, row
 * by row from the top — or null where there is no graphics context to draw
 * into, which is every browser that has WebGL turned off and every test that
 * runs outside a browser altogether.
 */
export function renderVoxelImage(request: VoxelImageRequest): Uint8Array | null {
  const built = offscreenScene();

  if (built === undefined) {
    return null;
  }

  const { renderer, scene, camera, mesh, material } = built;

  try {
    renderer.setSize(request.size, request.size);

    const normalized = Dimensions3D.normalize(request.dimensions);
    const size = boxSize(request.dimensions);
    mesh.geometry = new BoxGeometry(size.width, size.height, size.depth);

    camera.position.set(0, 0, request.radius);
    camera.lookAt(0, 0, 0);

    material.voxelTexture.image = request.voxels;
    material.voxelTexture.width = request.dimensions.width;
    material.voxelTexture.height = request.dimensions.height;
    material.voxelTexture.depth = request.dimensions.depth;
    material.voxelTexture.needsUpdate = true;

    const texels = paletteTexels(request.palette);
    material.paletteTexture.image = texels;
    material.paletteTexture.width = request.palette.length;
    material.paletteTexture.height = 1;
    material.paletteTexture.needsUpdate = true;

    // The model is turned to the orientation the light is measured against, so
    // that what lands on a face here is what would land on it in the preview.
    rotateMesh(mesh, request.yaw, request.pitch, 0);
    const worldToModel = Matrix3x3.multiply(
      Matrix3x3.rotationY(-request.yaw),
      Matrix3x3.rotationX(-request.pitch),
      Matrix3x3.create(),
    );
    const lightDirection = Matrix3x3.transform(worldToModel, LIGHT_DIR, Vector3D.create());

    material.dimensions = [normalized.width, normalized.height, normalized.depth];
    material.voxelCount = [
      request.dimensions.width,
      request.dimensions.height,
      request.dimensions.depth,
    ];
    material.lightDir = [lightDirection.x, lightDirection.y, lightDirection.z];
    material.lightColour = [LIGHT_COLOUR[0], LIGHT_COLOUR[1], LIGHT_COLOUR[2]];
    material.ambientColour = [AMBIENT_COLOUR[0], AMBIENT_COLOUR[1], AMBIENT_COLOUR[2]];
    material.unlit = false;

    renderer.render(scene, camera);

    const pixels = new Uint8Array(request.size * request.size * 4);
    renderer.gl.readPixels(
      0,
      0,
      request.size,
      request.size,
      renderer.gl.RGBA,
      renderer.gl.UNSIGNED_BYTE,
      pixels,
    );

    // A graphics context counts its rows up from the bottom and an image counts
    // them down from the top, so what was read is upside down.
    const rows = new Uint8Array(pixels.length);
    const stride = request.size * 4;

    for (let row = 0; row < request.size; row++) {
      rows.set(
        pixels.subarray((request.size - 1 - row) * stride, (request.size - row) * stride),
        row * stride,
      );
    }

    return rows;
  } catch {
    return null;
  }
}
