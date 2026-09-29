import { Vector3D } from "@big-mesh-studios/maths";
import {
  applyFraming,
  encodePalette,
} from "@big-mesh-studios/stacker/renderer";
import { filledBounds, volumeReach } from "@big-mesh-studios/stacker/volume";
import {
  getPointers,
  getPointerSize,
  pointer,
} from "@big-mesh-studios/utils/pointer";
import {
  Group,
  PerspectiveCamera,
  Quaternion,
  Scene,
  WebGLRenderer,
} from "@random-mesh/rmsl/scene";
import {
  Component,
  createEffect,
  createMemo,
  createSignal,
  onSettled,
  untrack,
  useContext,
} from "solid-js";
import { BeetleContext } from "./context";
import { ModelMeshes } from "./model-meshes";
import { pickModel, type VoxelPick } from "./picking/volume-picker";
import { PickOutline } from "./picking/pick-outline";
import { SlicePlane } from "./slice-plane";
import {
  FAR,
  FOV,
  framedVoxelSize,
  lightMaterial,
  NEAR,
  rotateModel,
} from "./voxel-preview-scene";
import { bakePalette, VoxelMeshMaterial } from "./voxel-mesh-material";
import styles from "./VoxelPreviewView.module.css";

/**
 * How far back the camera stands from a model.
 *
 * A model is always drawn in a box about one unit across whatever it is made of,
 * so this is the same distance whatever is in the box. It is far enough that the
 * camera is outside the box even when a model fills the view from one side, and
 * near enough that the depth range is spent on the model rather than on nothing.
 */
const RADIUS = 3;
const MIN_RADIUS = 1.4;
const MAX_RADIUS = 12;

const TURNTABLE_SECONDS_PER_REVOLUTION = 24;
const TURNTABLE_RADIANS_PER_SECOND =
  -(2 * Math.PI) / TURNTABLE_SECONDS_PER_REVOLUTION;

/** How far a press may wander across the canvas and still count as a tap. */
const TAP_SLOP = 4;

/** How long a press may be held down and still count as a tap, in milliseconds. */
const TAP_HELD = 300;

const RADIANS_PER_PIXEL = 0.005;
const PITCH_LIMIT = Math.PI / 2 - 0.01;

const pinchSpan = ([a, b]: Iterable<PointerEvent> = []) => {
  if (a === undefined || b === undefined) {
    return undefined;
  }
  return Math.hypot(a.x - b.x, a.y - b.y);
};

const VoxelPreviewView: Component = () => {
  const {
    volume,
    dimensions,
    palette,
    slice,
    preview,
    showVoxel,
    dirtyChunks,
    clearDirtyChunks,
  } = useContext(BeetleContext);

  const [picked, setPicked] = createSignal<VoxelPick | undefined>(undefined);
  const [hovered, setHovered] = createSignal<VoxelPick | undefined>(undefined);

  let yaw = Math.PI / 4;
  let pitch = Math.PI / 6;
  let radius = RADIUS;
  let timeOffset = 0;
  let spin = 0;

  const turntable = new Group();
  const framed = new Group();
  const material = new VoxelMeshMaterial();
  const meshes = new ModelMeshes(material);
  const slicePlane = new SlicePlane();
  const outline = new PickOutline();
  framed.add(meshes.group, slicePlane.group);
  turntable.add(framed);

  const scene = new Scene();
  scene.add(turntable);
  const camera = new PerspectiveCamera(FOV, 1, NEAR, FAR);

  /**
   * The model as it is drawn, rather than as the volume holds it.
   *
   * The geometry is built in a box with the model's own longest axis made one,
   * and it is that box the framing scales — which is what keeps a model eight
   * voxels across and one twenty voxels across from being drawn at wildly
   * different sizes for no reason. So the two things a framing is measured
   * against are read in the box's own units: the point the camera looks at,
   * measured from the middle of the box rather than from one of its corners,
   * and how far the model reaches from it, in boxes rather than in voxels.
   */
  const framing = createMemo(() => {
    const { width, height, depth } = dimensions();
    const longest = Math.max(1, width, height, depth);
    const middle = Vector3D.create(width / 2, height / 2, depth / 2);

    const bounds = filledBounds(volume());
    const centre =
      bounds === undefined
        ? middle
        : Vector3D.create(
            bounds.low.x + bounds.dimensions.width / 2,
            bounds.low.y + bounds.dimensions.height / 2,
            bounds.low.z + bounds.dimensions.depth / 2,
          );

    return {
      focus: Vector3D.multiplyScalar(
        Vector3D.subtract(centre, middle),
        1 / longest,
      ),
      reach: volumeReach(volume(), centre) / longest,
    };
  });

  const canvas = (
    <canvas
      class={styles.canvas}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={() => setHovered(undefined)}
      onPointerLeave={() => setHovered(undefined)}
      onWheel={(event) => {
        radius = Math.max(
          MIN_RADIUS,
          Math.min(MAX_RADIUS, radius * Math.pow(1.1, Math.sign(event.deltaY))),
        );
        fit();
      }}
    />
  ) as HTMLCanvasElement;

  const renderer = new WebGLRenderer(canvas, { antialias: false, depth: true });
  renderer.setClearColor(0x000000, 0);

  /**
   * How big a voxel is drawn, which follows from how far the camera stands and
   * how much room is left around the model. A model with nothing in it reaches
   * nowhere, and is drawn at a voxel to the unit rather than not at all.
   */
  function fit() {
    const width = Math.max(1, canvas.clientWidth);
    const height = Math.max(1, canvas.clientHeight);
    const { focus, reach } = framing();
    applyFraming(framed, {
      focus,
      // How much of the view a model of this reach fills from where the camera
      // stands, which follows from how far away the camera is and how much room
      // is left around it — and not from how many voxels the model happens to be
      // made of, which the box has already taken out.
      voxelSize: framedVoxelSize(reach, radius, width / height),
    });
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  createEffect(dimensions, () => {
    // A box of a different size is a different set of chunks, and its vertices
    // are laid out against its own cell size.
    meshes.place(dimensions());
    meshes.release();
    fit();
  });

  createEffect(palette, () => {
    // Changing a colour re-uploads a texture of thirty-two texels rather than
    // re-meshing the model: what a vertex carries is which colour it shows, not
    // the colour itself.
    bakePalette(material, encodePalette(palette()), palette().length);
  });

  createEffect(
    () => [preview.unlit(), preview.showSlice(), slice()],
    () => {
      lightMaterial(material, preview.unlit());
      slicePlane.show(volume(), slice(), palette(), preview.showSlice());
    },
    { defer: true },
  );

  const render = () => {
    // A bounded number of the chunks waiting to be rebuilt is built before the
    // frame is drawn, so a model just loaded appears at once and fills in rather
    // than holding up the first frame that would show it. The ones built are
    // taken off the list, and whatever is left stays for the next frame.
    const waiting = untrack(dirtyChunks);
    if (waiting.size > 0) {
      const { built } = meshes.drain(waiting, untrack(volume));
      clearDirtyChunks(built);
    }

    if (preview.autorotate()) {
      spin =
        ((performance.now() - timeOffset) / 1000) *
        TURNTABLE_RADIANS_PER_SECOND;
    }
    rotateModel(turntable, yaw, pitch, spin);
    camera.position.set(0, 0, radius);
    outline.trace(dimensions(), meshes.group, hovered() ?? picked());
    renderer.render(scene, camera);
  };

  /**
   * The voxel under a point of the canvas, or nothing where there is none.
   *
   * The camera stands outside the turntable and the model is what turns, so the
   * ray is taken back into the model's own space before it is walked: a
   * rotation undoes itself by being transposed, and the camera's own place in
   * that space follows from the same nine numbers.
   */
  const inverse = new Quaternion();

  function pickAt(event: PointerEvent & { currentTarget: HTMLCanvasElement }) {
    inverse.copy(turntable.quaternion).invert();
    const { x, y, z, w } = inverse;

    const worldToModel = [
      1 - 2 * (y * y + z * z),
      2 * (x * y - z * w),
      2 * (x * z + y * w),
      2 * (x * y + z * w),
      1 - 2 * (x * x + z * z),
      2 * (y * z - x * w),
      2 * (x * z - y * w),
      2 * (y * z + x * w),
      1 - 2 * (x * x + y * y),
    ];

    const rect = canvas.getBoundingClientRect();
    return pickModel({
      volume: untrack(volume),
      worldToModel,
      // In world space the camera stands on the +z axis at the radius; in the
      // model's own space it stands wherever that turn has put it.
      camera: {
        x: worldToModel[2] * radius,
        y: worldToModel[5] * radius,
        z: worldToModel[8] * radius,
      },
      resolution: { x: canvas.width, y: canvas.height },
      uv: {
        x:
          (event.clientX - rect.left) *
          (canvas.width / Math.max(1, rect.width)),
        y:
          (event.clientY - rect.top) *
          (canvas.height / Math.max(1, rect.height)),
      },
    });
  }

  async function handlePointerDown(
    event: PointerEvent & { currentTarget: HTMLCanvasElement },
  ) {
    const element = event.currentTarget;
    element.setPointerCapture(event.pointerId);

    const initialPointers = getPointerSize(element);
    let previousPinch: number | undefined =
      initialPointers > 1 ? pinchSpan(getPointers(element)) : undefined;

    const {
      event: end,
      totalDelta,
      timespan,
    } = await pointer(event, ({ delta, pointers: down }) => {
      if (down.size > 1) {
        const span = pinchSpan(down.values());
        if (
          span !== undefined &&
          previousPinch !== undefined &&
          previousPinch > 0
        ) {
          radius = Math.max(
            MIN_RADIUS,
            Math.min(MAX_RADIUS, radius * (previousPinch / span)),
          );
          fit();
        }
        previousPinch = span;
        return;
      }
      yaw -= delta.x * RADIANS_PER_PIXEL;
      pitch = Math.max(
        -PITCH_LIMIT,
        Math.min(PITCH_LIMIT, pitch + delta.y * RADIANS_PER_PIXEL),
      );
    });

    if (
      Math.hypot(totalDelta.x, totalDelta.y) <= TAP_SLOP &&
      timespan <= TAP_HELD
    ) {
      const hit = pickAt(end);
      setPicked(hit);
      // A tap brings that voxel's slice in front of you, so the two views can
      // be driven from either one and neither of them is a dead end.
      if (hit !== undefined) {
        showVoxel(hit.voxel);
      }
    }
  }

  function handlePointerMove(
    event: PointerEvent & { currentTarget: HTMLCanvasElement },
  ) {
    if (event.buttons !== 0) {
      return;
    }
    setHovered(pickAt(event));
  }

  onSettled(() => {
    const sizeToCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      renderer.setSize(
        Math.max(1, Math.round(rect.width * dpr)),
        Math.max(1, Math.round(rect.height * dpr)),
      );
      fit();
      render();
    };

    sizeToCanvas();
    timeOffset = performance.now();

    const observer = new ResizeObserver(sizeToCanvas);
    observer.observe(canvas);

    let frame = requestAnimationFrame(function loop() {
      render();
      frame = requestAnimationFrame(loop);
    });

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  });

  return <div class={styles.container}>{canvas}</div>;
};

export default VoxelPreviewView;
