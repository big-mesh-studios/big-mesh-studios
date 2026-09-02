import { Matrix3x3, Vector2D, Vector3D } from "@big-mesh-studios/maths";
import {
  applyFraming,
  composeRoot,
  FigureMeshes,
  figurePlacement,
  voxelReach,
  type FigureFraming,
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
  framedVoxelSize,
  LIGHT_DIR,
  lightFigure,
  NEAR,
  rotateFigure,
  voxelCellEdges,
} from "./voxel-preview-scene";
import styles from "./VoxelPreviewView.module.css";

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
    figureLoads,
  } = useContext(StackerContext);

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

  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, NEAR, FAR);
  camera.position.set(0, 0, radius);
  camera.lookAt(0, 0, 0);

  // The figure and the arrows are turned together, so an arrow stands at
  // the root of the part it moves however the turntable has carried it.
  const turntable = new Group();
  scene.add(turntable);

  /**
   * The group the figure's voxel space is drawn in. Everything inside it stands
   * in voxels from the figure's origin, so this group's own place and size are
   * the whole of what point the view is looking at and how large the figure is
   * drawn — a part moved never changes either.
   */
  const framed = new Group();
  turntable.add(framed);

  const meshes = new FigureMeshes();
  framed.add(meshes.group);

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

  /** How much of the drawn world one voxel takes up. */
  const [voxelSize, setVoxelSize] = createSignal(1);
  const [pickedFigure, setPickedFigure] = createSignal<
    FigurePick | undefined
  >();

  /** Where every part stands, in voxels from the figure's origin. */
  const placement = createMemo(() => figurePlacement(figure()));

  /**
   * The point of the figure drawn at the middle of the view, which is also the
   * point the turntable turns about: the figure's own root, or the pivot of the
   * part being drawn on.
   *
   * The root stays where it is however the parts are moved, so a part carried
   * away from the others moves that part alone and leaves the rest of the
   * figure standing still under the pointer.
   */
  const focus = createMemo(() =>
    preview.focus() === "part"
      ? composeRoot(figure(), selectedPart())
      : Vector3D.EMPTY,
  );

  /** How the figure's voxels are drawn in the world the camera stands in. */
  const framing = createMemo<FigureFraming>(() => ({
    focus: focus(),
    voxelSize: voxelSize(),
  }));

  /**
   * Draws the figure at the size that brings the whole of it into the view,
   * from where the camera stands now: a figure framed while the view is zoomed
   * in fills that closer view, as the one it is framed against.
   */
  function fitToView() {
    setVoxelSize(
      framedVoxelSize(
        voxelReach(untrack(figure), untrack(solvedParts), untrack(focus)),
        radius,
        camera.aspect,
      ),
    );
  }

  /**
   * Where the selected part's root sits in the drawn world, which is where the
   * arrows stand.
   */
  const selectedRoot = createMemo(() => {
    const { focus, voxelSize } = framing();
    return Vector3D.multiplyScalar(
      Vector3D.subtract(composeRoot(figure(), selectedPart()), focus),
      voxelSize,
    );
  });

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
  function pickAt(event: PointerEvent & { currentTarget: HTMLElement }) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) {
      return;
    }

    Matrix3x3.transform(getWorldToModel(), LIGHT_DIR, modelSpaceLightDirection);

    setPickedFigure(
      pickFigure({
        solved: solvedParts(),
        placements: placement().placements,
        framing: framing(),
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
    // Hold the figure still in its turn: an arrow dragged against a turning
    // model would slide along an axis that had moved on by the time the
    // pointer did.
    spinOffset = spin;
    isDraggingWidget = true;

    let lastRoot = part.root;
    const startRoot = part.root;

    widget.setHeld(grabbedArm.axis);

    await pointer(initialEvent, ({ totalDelta }) => {
      const steps = voxelsDragged(
        totalDelta,
        grabbedArm.arm,
        widget.armLength,
        voxelSize(),
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

      pickAt(initialEvent);
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
            pickAt(event);
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
                radius * (previousPinchDistance / distance),
              );
            }

            previousPinchDistance = distance;

            break;
          }
        }
      },
    );

    if (isTap && pointers.size === 0 && timespan <= TAP_HELD) {
      const _picked = untrack(pickedFigure);

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
        radius = Math.min(MAX_RADIUS, radius * Math.pow(1.1, sign));
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

  const render = () => {
    if (untrack(preview.autorotate) && !isDraggingWidget) {
      spin =
        ((performance.now() - timeOffset) / 1000) *
          TURNTABLE_RADIANS_PER_SECOND +
        spinOffset;
    }
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

  createEffect(framing, (framing) => {
    applyFraming(framed, framing);
  });

  // The figure is fitted to the view when a whole one is put in front of the
  // editor, and, while autoframing is on, on every change to what is drawn or
  // to the point the view is framed on. With autoframing off an edit leaves the
  // size alone, so drawing on a part or moving one does not resize what is
  // under the pointer. The drawing is tracked as well as the count of loads,
  // because the model kept in the browser is restored after the first run and
  // there is nothing to measure until it arrives.
  let fittedFor = -1;
  createEffect(
    () =>
      [
        figureLoads(),
        figure(),
        solvedParts(),
        focus(),
        preview.autoframe(),
      ] as const,
    ([loads, , , , autoframe]) => {
      if (!autoframe && loads === fittedFor) {
        return;
      }

      fittedFor = loads;
      fitToView();
    },
  );

  createEffect(
    () => [figure(), solvedParts(), placement()] as const,
    ([figure, solvedParts, placement]) => {
      meshes.sync(figure, solvedParts, placement);
    },
  );

  createEffect(preview.autorotate, (autoRotate) => {
    if (autoRotate) {
      timeOffset = performance.now();
    } else {
      spinOffset = spin;
    }
  });

  // The outline follows the pick: trace the picked voxel's cell (in the part's
  // own space, from the same dimensions the marcher sizes its box by) and hide
  // it when the pick met nothing. It hangs off the part it was picked on, so it
  // moves and turns with it.
  createEffect(
    () => [solvedParts(), pickedFigure()] as const,
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

      // A canvas that has changed shape has changed how much room there is to
      // frame the figure in, which is the other half of what a framing is
      // measured against.
      if (untrack(preview.autoframe)) {
        fitToView();
      }

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
      resizeObserver.disconnect();
    };
  });

  return <div class={styles.container}>{canvas}</div>;
};

export default VoxelPreviewView;
