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
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from "@random-mesh/rmsl/scene";
import {
  FigureMeshes,
  type Figure,
  type SolvedPart,
} from "@big-mesh-studios/stacker/renderer";
import {
  FAR,
  FOV,
  lightFigure,
  NEAR,
  rotateFigure,
} from "./voxel-preview-scene";

export interface VoxelImageRequest {
  /** The figure to draw, with every part in it. */
  figure: Figure;
  /** Each part's volume, in the order `figure.parts` holds them. */
  solved: SolvedPart[];
  /** How many pixels across and down the picture is. */
  size: number;
  /** Which way the model is turned, and how far back the camera stands. */
  yaw: number;
  pitch: number;
  radius: number;
}

interface OffscreenScene {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  meshes: FigureMeshes;
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

    const meshes = new FigureMeshes();
    const scene = new Scene();
    scene.add(meshes.group);

    offscreen = {
      renderer,
      scene,
      meshes,
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
export function renderVoxelImage(
  request: VoxelImageRequest,
): Uint8Array | null {
  const built = offscreenScene();

  if (built === undefined) {
    return null;
  }

  const { renderer, scene, camera, meshes } = built;

  try {
    renderer.setSize(request.size, request.size);

    camera.position.set(0, 0, request.radius);
    camera.lookAt(0, 0, 0);

    meshes.sync(request.figure, request.solved);
    lightFigure(meshes, false);

    // The figure is turned to the orientation the light is measured against, so
    // that what lands on a face here is what would land on it in the preview.
    rotateFigure(meshes.group, request.yaw, request.pitch, 0);

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
        pixels.subarray(
          (request.size - 1 - row) * stride,
          (request.size - row) * stride,
        ),
        row * stride,
      );
    }

    return rows;
  } catch {
    return null;
  }
}
