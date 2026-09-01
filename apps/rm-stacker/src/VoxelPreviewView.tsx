import { Matrix3x3, Vector2D, Vector3D } from "@big-mesh-studios/maths";
import {
  composeRoot,
  FigureMeshes,
  figurePlacement,
} from "@big-mesh-studios/stacker/renderer";
import {
  getPointers,
  getPointerSize,
  pointer,
} from "@big-mesh-studios/utils/pointer";
import {
  Group,
  Line2NodeMaterial,
  LineSegments2,
  LineSegmentsGeometry,
  PerspectiveCamera,
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
import { Command } from "./command/Command";
import { StackerContext } from "./context";
import { pickFigure, type FigurePick } from "./figure-picker";
import {
  armUnderPointer,
  TranslateWidget,
  voxelsDragged,
  type ArmOnScreen,
  type WidgetAxis,
} from "./translate-widget";
import {
  FAR,
  FOV,
  LIGHT_DIR,
  lightFigure,
  NEAR,
  rotateFigure,
  voxelCellEdges,
} from "./voxel-preview-scene";
import styles from "./VoxelPreviewView.module.css";

const MIN_RADIUS = 2;
const MAX_RADIUS = 20;

// Directional + ambient light for the voxel preview. The direction is fixed in
// world space and the model turns beneath it, so it is rotated into the model's
// space before it is uploaded rather than being sent as it stands.

const TURNTABLE_SECONDS_PER_REVOLUTION = 20;
const TURNTABLE_RADIANS_PER_SECOND =
  -(2 * Math.PI) / TURNTABLE_SECONDS_PER_REVOLUTION;

// The picked voxel's outline: a crisp white wireframe, a couple of device
// pixels wide. The material's fragDepth bias (see voxel-preview-material) keeps
// it in front of the voxel face it sits on.
const OUTLINE_COLOUR = 0xffffff;
const OUTLINE_LINE_WIDTH = 2;

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
    figure,
    selectedPart,
    selectPart,
    solvedParts,
    palette,
    preview,
    doCommand,
    pushUndo,
  } = useContext(StackerContext);

  /**
   * How much of the drawn world one voxel takes up for as long as a drag runs,
   * or undefined when none is running and the figure is drawn at the size it
   * measures to.
   *
   * A figure is drawn at a voxel size worked out from the box its parts
   * together fill, so a part carried outwards makes every voxel in the figure
   * smaller: the part being dragged would lag behind the arrow pulling it and
   * the parts standing still would slide the other way. Held at the size the
   * arrow was measured against, a part moves a voxel for every voxel it is
   * dragged and the rest of the figure stays where it stands.
   */
  const [heldVoxelSize, setHeldVoxelSize] = createSignal<number | undefined>();
  const [picked, setPicked] = createSignal<FigurePick | undefined>();

  /** Where every part stands, and how much of the drawn world one voxel takes. */
  const placement = createMemo(() =>
    figurePlacement(figure(), heldVoxelSize()),
  );

  /**
   * Where the selected part's root sits in the drawn world, which is where the
   * arrows stand.
   */
  const selectedRoot = createMemo(() =>
    Vector3D.multiplyScalar(
      composeRoot(figure(), selectedPart()),
      placement().voxelSize,
    ),
  );

  let yaw = Math.PI / 4;
  let pitch = Math.PI / 6;
  let radius = 3;

  let timeOffset = 0;
  let spinOffset = 0;
  let spin = 0;

  let isDraggingWidget = false;

  const yawMatrix = Matrix3x3.create();
  const pitchMatrix = Matrix3x3.create();
  const worldToModel = Matrix3x3.create();
  const inverseYawMatrix = Matrix3x3.create();
  const inversePitchMatrix = Matrix3x3.create();
  const modelToWorld = Matrix3x3.create();
  const modelSpaceLightDirection = Vector3D.create();

  function getWorldToModel() {
    Matrix3x3.rotationX(-pitch, pitchMatrix);
    Matrix3x3.rotationY(-(yaw + spin), yawMatrix);
    return Matrix3x3.multiply(yawMatrix, pitchMatrix, worldToModel);
  }

  function getModelToWorld() {
    Matrix3x3.rotationX(pitch, inversePitchMatrix);
    Matrix3x3.rotationY(yaw + spin, inverseYawMatrix);
    return Matrix3x3.multiply(
      inversePitchMatrix,
      inverseYawMatrix,
      modelToWorld,
    );
  }

  /** Where a pointer event lands on the canvas, in pixels from its top left. */
  function pointerOnCanvas(event: PointerEvent): Vector2D | undefined {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  /** Which arrow lies under the pointer, and where each of them lies. */
  function grabArm(
    at: Vector2D,
  ): { axis: WidgetAxis; arm: ArmOnScreen } | undefined {
    if (scene === undefined || canvas === undefined || !preview.axesVisible()) {
      return undefined;
    }

    const rect = canvas.getBoundingClientRect();
    // The arrows are placed for this frame's camera before they are measured,
    // so a grab reads the same picture the pointer is looking at.
    widget.place(selectedRoot(), radius);
    rotateFigure(turntable, yaw, pitch, spin);

    const arms = widget.armsOnScreen(camera, {
      width: rect.width,
      height: rect.height,
    });
    const axis = armUnderPointer(at, arms);

    if (axis === undefined) {
      return undefined;
    }

    return { axis, arm: arms.find((arm) => arm.axis === axis)! };
  }

  // CPU voxel picking: ray-march the same volumes the fragment shader renders,
  // from the pointer position in UV space, and hold on to the voxel met first
  // across the whole figure. The picker is precompiled at build time by
  // precompileJS, so this never runs the rmsl graph in the browser.
  function pickAt(clientX: number, clientY: number) {
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) {
      return;
    }

    Matrix3x3.transform(getWorldToModel(), LIGHT_DIR, modelSpaceLightDirection);

    setPicked(
      pickFigure({
        solved: solvedParts(),
        placements: placement().placements,
        palette: palette(),
        // The drawing buffer is scaled by devicePixelRatio, but vUv spans the
        // CSS box, so the pointer is normalized against the CSS size.
        uv: { x: x / rect.width, y: 1 - y / rect.height },
        resolution: { width: canvas.width, height: canvas.height },
        cameraDistance: radius,
        worldToModel,
        modelToWorld: getModelToWorld(),
        lightDirection: modelSpaceLightDirection,
        unlit: untrack(preview.unlit),
      }),
    );
  }

  async function handleWidgetDrag(
    initialEvent: PointerEvent & { currentTarget: HTMLElement },
    at: Vector2D,
    grabbedArm: {
      axis: keyof Vector3D;
      arm: ArmOnScreen;
    },
  ) {
    const part = untrack(selectedPart);
    // Hold the figure still, in its turn and in the size it is drawn at
    // alike: an arrow dragged against a turning model would slide along an
    // axis that had moved on by the time the pointer did, and a figure
    // measured afresh as the part moves would rescale under the pointer.
    spinOffset = spin;
    isDraggingWidget = true;

    setHeldVoxelSize(untrack(placement).voxelSize);

    let lastRoot = part.root;
    const startRoot = part.root;
    const voxelSize = untrack(placement).voxelSize;

    widget.setHeld(grabbedArm.axis);

    await pointer(initialEvent, ({ totalDelta }) => {
      const steps = voxelsDragged(
        totalDelta,
        grabbedArm.arm,
        widget.armLength,
        voxelSize,
      );

      const root = { ...startRoot };
      root[grabbedArm.axis] = startRoot[grabbedArm.axis] + steps;

      if (Vector3D.equals(root, lastRoot)) {
        return;
      }

      lastRoot = root;
      doCommand(Command.movePart(part.name, root));
    });

    isDraggingWidget = false;

    widget.setHeld(undefined);
    // Measure the figure again, so it fits the view at wherever the part landed.
    setHeldVoxelSize(undefined);

    // The figure was held still for the drag; pick the turntable up from where
    // it was rather than from where it would have got to.
    timeOffset = performance.now();
    spinOffset = spin;

    if (!Vector3D.equals(startRoot, lastRoot)) {
      pushUndo(Command.movePart(part.name, startRoot), "Move Part");
    }
  }

  async function handlePointer(
    initialEvent: PointerEvent & { currentTarget: HTMLElement },
  ) {
    const element = initialEvent.currentTarget;
    const initialPointerCount = getPointerSize(element);

    if (initialPointerCount === 0) {
      const at = pointerOnCanvas(initialEvent);
      const grabbedArm = at === undefined ? undefined : grabArm(at);

      if (at !== undefined && grabbedArm !== undefined) {
        handleWidgetDrag(initialEvent, at, grabbedArm);
        return;
      }

      pickAt(initialEvent.clientX, initialEvent.clientY);
    }

    let isTap = initialPointerCount === 0;
    let previousPinchDistance: number | undefined = pinchSpan(
      getPointers(element),
    );

    const { timespan, pointers } = await pointer(
      initialEvent,
      ({ event, delta, pointers, totalDelta }) => {
        switch (pointers.size) {
          case 1: {
            if (isTap && Math.hypot(totalDelta.x, totalDelta.y) > TAP_SLOP) {
              isTap = false;
            }

            // Keep the readout in step with the cursor — including while orbiting,
            // where the model turns beneath the pointer.
            pickAt(event.clientX, event.clientY);
            yaw += delta.x * RADIANS_PER_PIXEL;
            pitch = Math.max(
              -PITCH_LIMIT,
              Math.min(PITCH_LIMIT, pitch + delta.y * RADIANS_PER_PIXEL),
            );

            previousPinchDistance = undefined;

            break;
          }
          case 2: {
            isTap = false;

            const distance = pinchSpan(pointers.values());

            if (previousPinchDistance && distance) {
              // Spreading the fingers (distance grows) zooms in, i.e. pulls the
              // camera closer, so the radius scales by the inverse ratio.
              radius = Math.min(
                MAX_RADIUS,
                Math.max(
                  MIN_RADIUS,
                  radius * (previousPinchDistance / distance),
                ),
              );
            }

            previousPinchDistance = distance;

            break;
          }
        }
      },
    );

    if (isTap && pointers.size === 0 && timespan <= TAP_HELD) {
      const _picked = untrack(picked);

      if (_picked === undefined) {
        return;
      }

      selectPart(_picked.part);
    }
  }

  const canvas = (
    <canvas
      class={styles.canvas}
      onPointerDown={handlePointer}
      onWheel={(event) => {
        const sign = Math.sign(event.deltaY);
        radius = Math.min(
          MAX_RADIUS,
          Math.max(MIN_RADIUS, radius * Math.pow(1.1, sign)),
        );
      }}
    />
  ) as HTMLCanvasElement;

  const renderer = new WebGLRenderer(canvas, {
    antialias: false,
    depth: true,
  });

  // Clear to transparent so the background painted behind the canvas
  // shows through the pixels no voxel ray lands on.
  renderer.setClearColor(0x000000, 0);
  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, NEAR, FAR);
  camera.position.set(0, 0, radius);
  camera.lookAt(0, 0, 0);

  // The figure and the arrows are turned together, so an arrow stands at
  // the root of the part it moves however the turntable has carried it.
  const turntable = new Group();
  scene.add(turntable);

  const meshes = new FigureMeshes();
  turntable.add(meshes.group);

  // The picked voxel's outline. Its geometry is in the part's own space
  // (the same cell layout the marcher walks), so it is made a child of
  // whichever part is picked and inherits that part's place and turn.
  const outline = new LineSegments2(
    new LineSegmentsGeometry(),
    new Line2NodeMaterial({
      color: OUTLINE_COLOUR,
      linewidth: OUTLINE_LINE_WIDTH,
    }),
  );
  outline.visible = false;

  // Added after the figure, and drawn without a depth test, so the arrows
  // come out over whatever they reach into rather than inside it.
  const widget = new TranslateWidget();
  turntable.add(widget.group);

  createEffect(preview.autorotate, (autoRotate) => {
    if (autoRotate) {
      timeOffset = performance.now();
    } else {
      spinOffset = spin;
    }
  });

  const updateSpin = () => {
    if (untrack(preview.autorotate) && !isDraggingWidget) {
      spin =
        ((performance.now() - timeOffset) / 1000) *
          TURNTABLE_RADIANS_PER_SECOND +
        spinOffset;
    }
  };

  const render = () => {
    // The figure is turned to the orientation getWorldToModel describes, so the
    // meshes' world-to-model matrices (the inverse of their world matrices,
    // which the material uses for its ray origin) stay in step with the matrix
    // the CPU picker follows its ray along — keeping the pick under the pointer
    // aligned with what is drawn.
    updateSpin();
    getWorldToModel();
    rotateFigure(turntable, yaw, pitch, spin);

    lightFigure(meshes, untrack(preview.unlit));

    // The arrows stand inside the figure, turned by the same turntable, so they
    // stay pointing along the axes a drag moves the part along.
    if (widget.visible) {
      widget.place(untrack(selectedRoot), radius);
    }

    camera.position.set(0, 0, radius);

    renderer.render(scene, camera);
  };

  createEffect(preview.axesVisible, (axesVisible) => {
    widget.visible = axesVisible;
  });

  createEffect(
    () => [figure(), solvedParts(), placement()] as const,
    ([figure, solvedParts, placement]) => {
      meshes.sync(figure, solvedParts, placement);
    },
  );

  // The outline follows the pick: trace the picked voxel's cell (in the part's
  // own space, from the same dimensions the marcher sizes its box by) and hide
  // it when the pick met nothing. It hangs off the part it was picked on, so it
  // moves and turns with it.
  createEffect(
    () => [solvedParts(), picked()] as const,
    ([solvedParts, picked]) => {
      if (picked === undefined) {
        outline.visible = false;
        return;
      }

      const on = solvedParts.find((solved) => solved.name === picked.part);
      const host = meshes.meshFor(picked.part);

      if (on === undefined || host === undefined) {
        outline.visible = false;
        return;
      }

      if (outline.parent !== host) {
        outline.parent?.remove(outline);
        host.add(outline);
      }

      const geometry = outline.geometry;
      geometry.setPositions(voxelCellEdges(on.dimensions, picked.voxel));
      // setPositions swaps in fresh instance attributes whose needsUpdate flag
      // is false, so the renderer would keep drawing the previous pick's edges.
      // Flag them so the next frame uploads the new cell.
      geometry.attributes.instanceStart.needsUpdate = true;
      geometry.attributes.instanceEnd.needsUpdate = true;
      outline.visible = true;
    },
  );

  onSettled(() => {
    const sizeToCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.round(rect.width * dpr));
      const height = Math.max(1, Math.round(rect.height * dpr));
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      render();
    };
    sizeToCanvas();

    const resizeObserver = new ResizeObserver(sizeToCanvas);
    resizeObserver.observe(canvas);

    let rafId = requestAnimationFrame(function renderLoop() {
      render();
      rafId = requestAnimationFrame(renderLoop);
    });

    return () => {
      cancelAnimationFrame(rafId);
    };
  });

  return <div class={styles.container}>{canvas}</div>;
};

export default VoxelPreviewView;
