import {
  Component,
  createEffect,
  createMemo,
  createSignal,
  createTrackedEffect,
  onSettled,
  untrack,
  useContext,
} from "solid-js";
import {
  BoxGeometry,
  Mesh,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from "@random-mesh/rmsl/scene";
import { uniform } from "@random-mesh/rmsl";
import { bloom } from "@random-mesh/rmsl/effects";
import { StackerContext } from "./context";
import { BloomExecutor, createRenderTarget, GlowPass, type RenderTarget } from "./bloom-executor";
import { Dimensions3D, Matrix3x3, Vector3D } from "./maths";
import {
  PANEL_PAIR_KINDS,
  PANEL_PAIR_UNIFORM_NAME,
  toPanelPairTextures,
} from "./panel-textures";
import shaders from "./shaders";
import { VoxelPreviewMaterial } from "./voxel-preview-material";
import { voxelPicker } from "./voxel-picker";
import { boxSize, FOV, NEAR, FAR, rotateMesh } from "./voxel-preview-scene";
import { tryCatch } from "./utils";
import styles from "./VoxelPreviewView.module.css";

const MIN_RADIUS = 2;
const MAX_RADIUS = 20;

// Directional + ambient light for the voxel preview. The direction is fixed in
// world space and the model turns beneath it, so it is rotated into the model's
// space before it is uploaded rather than being sent as it stands.
const LIGHT_DIR = Object.freeze(Vector3D.normalize(Vector3D.create(0.4, 0.7, 0.8)));
const LIGHT_COLOUR = new Float32Array([1.0, 0.97, 0.9]);
const AMBIENT_COLOUR = new Float32Array([0.35, 0.35, 0.4]);

const TURNTABLE_SECONDS_PER_REVOLUTION = 20;
const TURNTABLE_RADIANS_PER_SECOND = -(2 * Math.PI) / TURNTABLE_SECONDS_PER_REVOLUTION;

// The bloom source is the picked voxel's own colour, so the threshold only
// needs to clear zero — everything else in the mask is transparent.
const BLOOM_STRENGTH = 1;
const BLOOM_RADIUS = 0.4;
const BLOOM_THRESHOLD = 0;
const BLOOM_SMOOTH_WIDTH = 0.01;

type PreviewScene = {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  mesh: Mesh;
  material: VoxelPreviewMaterial;
  bloom: BloomExecutor;
  glow: GlowPass;
  maskTarget: RenderTarget | null;
};

const VoxelPreviewView: Component = () => {
  const { dimensions, sides, sidesVersion, palette, preview } = useContext(StackerContext);

  const [canvas, setCanvas] = createSignal<HTMLCanvasElement>();
  const [previewScene, setPreviewScene] = createSignal<PreviewScene>();
  const [glError, setGlError] = createSignal<string | undefined>();
  const [pickedVoxel, setPickedVoxel] = createSignal<[number, number, number] | undefined>();

  const normalizedDimensions = createMemo(() => Dimensions3D.normalize(dimensions()));

  // The panels the marcher reads the model from, packed a facing pair to a
  // texture. They are rebuilt only when one of them is drawn on: `sidesVersion`
  // counts the edits, since commands write into the panels in place and so leave
  // `sides()` itself unchanged. Both the GPU upload and the CPU picker read the
  // same three.
  const panelPairTextures = createMemo(() => {
    sidesVersion();
    return toPanelPairTextures(sides());
  });

  let yaw = Math.PI / 4;
  let pitch = Math.PI / 6;
  let radius = 3;

  const RADIANS_PER_PIXEL = 0.005;
  const PITCH_LIMIT = Math.PI / 2 - 0.01;

  const yawMatrix = Matrix3x3.create();
  const pitchMatrix = Matrix3x3.create();
  const worldToModel = Matrix3x3.create();
  const modelSpaceLightDirection = Vector3D.create();

  let timeOffset = 0;
  let spinOffset = 0;
  let spin = 0;

  createEffect(preview.autorotate, autoRotate => {
    if (autoRotate) {
      timeOffset = performance.now();
    } else {
      spinOffset = spin;
    }
  });

  const getWorldToModel = () => {
    Matrix3x3.rotationX(-pitch, pitchMatrix);
    if (untrack(preview.autorotate)) {
      spin = ((performance.now() - timeOffset) / 1000) * TURNTABLE_RADIANS_PER_SECOND + spinOffset;
    }
    Matrix3x3.rotationY(-(yaw + spin), yawMatrix);
    return Matrix3x3.multiply(yawMatrix, pitchMatrix, worldToModel);
  };

  // CPU voxel picking: ray-march the same volume the fragment shader renders,
  // from the click position in UV space, and return the voxel index under it
  // (or [-1, -1, -1] for empty space). The picker is precompiled at build time
  // by precompileJS, so this never runs the rmsl graph in the browser.
  const pickAt = (clientX: number, clientY: number) => {
    const _canvas = canvas();
    const _dimensions = dimensions();
    const _palette = palette();
    if (_canvas === undefined) {
      return;
    }
    const rect = _canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    // The drawing buffer is scaled by devicePixelRatio, but vUv spans the CSS
    // box, so the click position is normalized against the CSS size.
    const width = _canvas.width;
    const height = _canvas.height;
    if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) {
      return;
    }

    Matrix3x3.transform(getWorldToModel(), LIGHT_DIR, modelSpaceLightDirection);

    const paletteData = new Uint8Array(_palette.length * 4);
    _palette.forEach(({ r, g, b, a }, i) => {
      const o = i << 2;
      paletteData[o] = r;
      paletteData[o + 1] = g;
      paletteData[o + 2] = b;
      paletteData[o + 3] = a;
    });

    const picked = voxelPicker({
      uniforms: {
        [shaders.uResolution]: [width, height],
        [shaders.uDimensions]: [
          normalizedDimensions().width,
          normalizedDimensions().height,
          normalizedDimensions().depth,
        ],
        [shaders.uVoxelCount]: [_dimensions.width, _dimensions.height, _dimensions.depth],
        [shaders.uLightDir]: [
          modelSpaceLightDirection.x,
          modelSpaceLightDirection.y,
          modelSpaceLightDirection.z,
        ],
        [shaders.uLightColour]: Array.from(LIGHT_COLOUR),
        [shaders.uAmbientColour]: Array.from(AMBIENT_COLOUR),
        [shaders.uCameraPosition]: [0, 0, radius],
        [shaders.uWorldToModel]: Array.from(worldToModel),
        [shaders.uUnlit]: untrack(preview.unlit),
      },
      varying: { vUv: [x / rect.width, 1 - y / rect.height] },
      textures: {
        ...Object.fromEntries(
          PANEL_PAIR_KINDS.map(kind => [PANEL_PAIR_UNIFORM_NAME[kind], panelPairTextures()[kind]]),
        ),
        [shaders.uPalette]: { data: paletteData, width: _palette.length, height: 1 },
      },
    });

    // The picker is not reentrant: it returns a shared scratch array that it
    // mutates in place on every call, so copying it gives Solid a new reference
    // to trigger a re-render.
    setPickedVoxel(picked.slice() as [number, number, number]);
  };

  // One finger orbits, two fingers pinch to zoom. Every pointer is tracked so
  // the pinch can be measured from both of them regardless of which raised the
  // move; while pinching, the drag (and the pick readout) is suspended.
  const activePointers = new Map<number, { x: number; y: number }>();
  let pinchDistance = 0;

  const pinchSpan = () => {
    const [a, b] = [...activePointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  const handlePointerDown = (event: PointerEvent) => {
    const first = activePointers.size === 0;
    activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    // Keep receiving moves for this pointer even when the finger leaves the
    // canvas, so a drag (or a pinch) can run past its edge.
    (event.currentTarget as HTMLCanvasElement | null)?.setPointerCapture(event.pointerId);
    if (first) {
      // Pick immediately, so a tap (which produces no pointermove) still
      // selects the voxel under the finger.
      pickAt(event.clientX, event.clientY);
    } else if (activePointers.size === 2) {
      pinchDistance = pinchSpan();
    }
  };

  const handlePointerMove = (event: PointerEvent) => {
    const tracked = activePointers.get(event.pointerId);
    if (tracked === undefined) {
      return;
    }
    const delta = {
      x: event.clientX - tracked.x,
      y: event.clientY - tracked.y,
    };
    tracked.x = event.clientX;
    tracked.y = event.clientY;

    if (activePointers.size >= 2) {
      const distance = pinchSpan();
      if (pinchDistance > 0) {
        // Spreading the fingers (distance grows) zooms in, i.e. pulls the
        // camera closer, so the radius scales by the inverse ratio.
        radius = Math.min(MAX_RADIUS, Math.max(MIN_RADIUS, radius * (pinchDistance / distance)));
      }
      pinchDistance = distance;
      return;
    }

    // Keep the readout in step with the cursor — including while orbiting,
    // where the model turns beneath the pointer.
    pickAt(event.clientX, event.clientY);
    yaw += delta.x * RADIANS_PER_PIXEL;
    pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch + delta.y * RADIANS_PER_PIXEL));
  };

  const handlePointerEnd = (event: PointerEvent) => {
    activePointers.delete(event.pointerId);
    if (activePointers.size < 2) {
      pinchDistance = 0;
    }
  };

  createTrackedEffect(() => {
    const _previewScene = previewScene();
    const _dimensions = dimensions();
    if (_previewScene === undefined) {
      return;
    }
    // The box that bounds the volume: the same one the marcher intersects,
    // which is the volume padded by one voxel on each side. Rasterizing it
    // limits the fragment shader to the pixels that could land on a voxel.
    const size = boxSize(_dimensions);
    _previewScene.mesh.geometry = new BoxGeometry(size.width, size.height, size.depth);
  });

  createTrackedEffect(() => {
    const _previewScene = previewScene();
    const _pairs = panelPairTextures();
    if (_previewScene === undefined) {
      return;
    }
    PANEL_PAIR_KINDS.forEach(kind => {
      const pair = _pairs[kind];
      const texture = _previewScene.material.panelPairTextures[kind];
      texture.image = pair.data;
      texture.width = pair.width;
      texture.height = pair.height;
      texture.needsUpdate = true;
    });
  });

  createTrackedEffect(() => {
    const _previewScene = previewScene();
    const _palette = palette();
    if (_previewScene === undefined) {
      return;
    }
    const paletteData = new Uint8Array(_palette.length * 4);
    _palette.forEach(({ r, g, b, a }, i) => {
      const offset = i << 2;
      paletteData[offset] = r;
      paletteData[offset + 1] = g;
      paletteData[offset + 2] = b;
      paletteData[offset + 3] = a;
    });
    const texture = _previewScene.material.paletteTexture;
    texture.image = paletteData;
    texture.width = _palette.length;
    texture.height = 1;
    texture.needsUpdate = true;
  });

  const render = () => {
    const _previewScene = untrack(previewScene);
    const _canvas = untrack(canvas);
    if (_previewScene === undefined || _canvas === undefined) {
      return;
    }
    const { renderer, scene, camera, mesh, material } = _previewScene;
    const _dimensions = untrack(dimensions);
    const n = untrack(normalizedDimensions);

    // The model is turned to the orientation getWorldToModel describes, so the
    // mesh's world-to-model matrix (the inverse of its world matrix, which the
    // material uses for its ray origin) stays equal to the worldToModel matrix
    // the CPU picker follows its ray along — keeping the pick under the pointer
    // aligned with what is drawn.
    getWorldToModel();
    rotateMesh(mesh, yaw, pitch, spin);

    Matrix3x3.transform(worldToModel, LIGHT_DIR, modelSpaceLightDirection);

    material.dimensions = [n.width, n.height, n.depth];
    material.voxelCount = [_dimensions.width, _dimensions.height, _dimensions.depth];
    material.lightDir = [
      modelSpaceLightDirection.x,
      modelSpaceLightDirection.y,
      modelSpaceLightDirection.z,
    ];
    material.lightColour = [LIGHT_COLOUR[0], LIGHT_COLOUR[1], LIGHT_COLOUR[2]];
    material.ambientColour = [AMBIENT_COLOUR[0], AMBIENT_COLOUR[1], AMBIENT_COLOUR[2]];
    material.unlit = untrack(preview.unlit);

    camera.position.set(0, 0, radius);

    const gl = renderer.gl;
    const maskTarget = _previewScene.maskTarget;
    if (maskTarget === null) {
      return;
    }

    // The scene (all voxels) is drawn straight to the canvas, exactly as the
    // preview did before the bloom pipeline. The bloom and glow passes bind
    // their own quad VAOs, so the scene renderer (which uses plain attribute
    // pointers) must be put back on the default VAO or it would overwrite the
    // quad VAO and the glow would draw with the box's vertices.
    gl.bindVertexArray(null);
    renderer.render(scene, camera);

    // The picked voxel, alone and bright, is the bloom source. The marcher
    // only lights it when it is the front-most hit, so an occluded pick shows
    // no glow.
    const _picked = pickedVoxel();
    if (_picked !== undefined && _picked[0] >= 0) {
      material.maskMode = true;
      material.pickedVoxel = _picked;
      gl.bindFramebuffer(gl.FRAMEBUFFER, maskTarget.fbo);
      gl.bindVertexArray(null);
      renderer.render(scene, camera);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      material.maskMode = false;

      const bloomResult = _previewScene.bloom.run({
        scene: maskTarget.texture,
        sceneWidth: maskTarget.width,
        sceneHeight: maskTarget.height,
      });
      _previewScene.glow.draw(bloomResult.tex, maskTarget.width, maskTarget.height);
    }
  };

  onSettled(() => {
    const _canvas = canvas();
    if (_canvas === undefined) {
      return;
    }

    const _previewScene = tryCatch(
      (): PreviewScene => {
        const renderer = new WebGLRenderer(_canvas, { antialias: false, depth: true });
        // Clear to transparent so the background painted behind the canvas
        // shows through the pixels no voxel ray lands on.
        renderer.setClearColor(0x000000, 0);
        const gl = renderer.gl;
        const scene = new Scene();
        const camera = new PerspectiveCamera(FOV, 1, NEAR, FAR);
        camera.position.set(0, 0, radius);
        camera.lookAt(0, 0, 0);
        const material = new VoxelPreviewMaterial();
        const mesh = new Mesh(undefined, material);
        scene.add(mesh);

        // Selective bloom: the picked voxel's mask is bloomed and added over
        // the scene. strength/radius/threshold are fixed constants, folded
        // straight into the pass shaders.
        const maskSampler = uniform("sampler2D");
        const bloomGraph = bloom(maskSampler, {
          strength: BLOOM_STRENGTH,
          radius: BLOOM_RADIUS,
          threshold: BLOOM_THRESHOLD,
          smoothWidth: BLOOM_SMOOTH_WIDTH,
        });
        const bloomExecutor = new BloomExecutor(gl, bloomGraph);
        const glow = new GlowPass(gl);

        return {
          renderer,
          scene,
          camera,
          mesh,
          material,
          bloom: bloomExecutor,
          glow,
          maskTarget: null,
        };
      },
      e => {
        setGlError(e instanceof Error ? e.message : String(e));
      },
    );

    if (!_previewScene) {
      return;
    }

    setPreviewScene(_previewScene);

    const { renderer, camera } = _previewScene;
    const gl = renderer.gl;

    // The mask render target is sized to the drawing buffer and carries a
    // depth buffer because the box is rendered with depth.
    const ensureTarget = (current: RenderTarget | null, width: number, height: number) => {
      if (current !== null && current.width === width && current.height === height) {
        return current;
      }
      if (current !== null) {
        gl.deleteFramebuffer(current.fbo);
        gl.deleteTexture(current.texture);
        if (current.depth !== null) {
          gl.deleteRenderbuffer(current.depth);
        }
      }
      return createRenderTarget(gl, width, height, true);
    };

    const sizeToCanvas = () => {
      const rect = _canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.round(rect.width * dpr));
      const height = Math.max(1, Math.round(rect.height * dpr));
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      _previewScene.maskTarget = ensureTarget(_previewScene.maskTarget, width, height);
    };
    sizeToCanvas();

    const resizeObserver = new ResizeObserver(sizeToCanvas);
    resizeObserver.observe(_canvas);

    let rafId = requestAnimationFrame(function renderLoop() {
      render();
      rafId = requestAnimationFrame(renderLoop);
    });

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      const maskTarget = _previewScene.maskTarget;
      if (maskTarget !== null) {
        gl.deleteFramebuffer(maskTarget.fbo);
        gl.deleteTexture(maskTarget.texture);
        if (maskTarget.depth !== null) {
          gl.deleteRenderbuffer(maskTarget.depth);
        }
      }
      _previewScene.bloom.dispose();
      _previewScene.glow.dispose();
      renderer.dispose();
      setPreviewScene(undefined);
    };
  });

  return (
    <div class={styles.container}>
      {glError() === undefined ? (
        <>
          <canvas
            ref={setCanvas}
            class={styles.canvas}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
            onWheel={event => {
              const sign = Math.sign(event.deltaY);
              radius = Math.min(MAX_RADIUS, Math.max(MIN_RADIUS, radius * Math.pow(1.1, sign)));
            }}
          />
          {pickedVoxel() !== undefined && (
            <div class={styles.picked}>
              {pickedVoxel()![0] === -1
                ? "no voxel"
                : `voxel ${pickedVoxel()![0]}, ${pickedVoxel()![1]}, ${pickedVoxel()![2]}`}
            </div>
          )}
        </>
      ) : (
        <div class={styles.error}>{glError()}</div>
      )}
    </div>
  );
};

export default VoxelPreviewView;
