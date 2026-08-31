import { Matrix3x3, Vector2D, Vector3D } from "@big-mesh-studios/maths";
import {
  composeRoot,
  FigureMeshes,
  figurePlacement,
} from "@big-mesh-studios/stacker/renderer";
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

type PreviewScene = {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  /** The figure and the arrows standing in it, turned as one by the turntable. */
  turntable: Group;
  meshes: FigureMeshes;
  widget: TranslateWidget;
  outline: LineSegments2;
};

/** A drag of one of the widget's arrows, from the moment it was taken hold of. */
interface WidgetDrag {
  part: string;
  axis: WidgetAxis;
  /** Where the arrow lay on the canvas when it was grabbed, which fixes how far a pixel slides it. */
  arm: ArmOnScreen;
  armLength: number;
  voxelSize: number;
  startPointer: Vector2D;
  startRoot: Vector3D;
  /** The root the part was last put at, so a move is only issued when it changes. */
  lastRoot: Vector3D;
}

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

  /** What the readout says the pointer is over, or undefined before any pick. */
  const pickedLabel = createMemo(() => {
    const _picked = picked();

    if (_picked === undefined) {
      return "no voxel";
    }

    return `${_picked.part}: voxel ${_picked.voxel.join(", ")}`;
  });

  let yaw = Math.PI / 4;
  let pitch = Math.PI / 6;
  let radius = 3;

  const RADIANS_PER_PIXEL = 0.005;
  const PITCH_LIMIT = Math.PI / 2 - 0.01;

  const yawMatrix = Matrix3x3.create();
  const pitchMatrix = Matrix3x3.create();
  const worldToModel = Matrix3x3.create();
  const inverseYawMatrix = Matrix3x3.create();
  const inversePitchMatrix = Matrix3x3.create();
  const modelToWorld = Matrix3x3.create();
  const modelSpaceLightDirection = Vector3D.create();

  let timeOffset = 0;
  let spinOffset = 0;
  let spin = 0;

  const handlePointerEnd = (event: PointerEvent) => {
    activePointers.delete(event.pointerId);
    if (activePointers.size < 2) {
      pinchDistance = 0;
    }
    if (activePointers.size === 0) {
      // A press that stayed put and was let go again quickly is a tap on the
      // figure, which reaches for whichever part it landed on.
      const tapped =
        press !== undefined && performance.now() - press.when <= TAP_HELD;
      press = undefined;
      endWidgetDrag();

      if (tapped) {
        selectPicked();
      }
    }
  };

  const canvas = (
    <canvas
      class={styles.canvas}
      onPointerDown={(event) => {
        const first = activePointers.size === 0;
        activePointers.set(event.pointerId, {
          x: event.clientX,
          y: event.clientY,
        });
        // Keep receiving moves for this pointer even when the finger leaves the
        // canvas, so a drag (or a pinch) can run past its edge.
        event.currentTarget.setPointerCapture(event.pointerId);

        if (first) {
          const at = pointerOnCanvas(event);
          const grabbed = at === undefined ? undefined : grabArm(at);

          if (at !== undefined && grabbed !== undefined) {
            const part = untrack(selectedPart);
            // Hold the figure still, in its turn and in the size it is drawn at
            // alike: an arrow dragged against a turning model would slide along an
            // axis that had moved on by the time the pointer did, and a figure
            // measured afresh as the part moves would rescale under the pointer.
            spinOffset = spin;
            setHeldVoxelSize(untrack(placement).voxelSize);
            widgetDrag = {
              part: part.name,
              axis: grabbed.axis,
              arm: grabbed.arm,
              armLength: widget.armLength,
              voxelSize: untrack(placement).voxelSize,
              startPointer: at,
              startRoot: part.root,
              lastRoot: part.root,
            };
            widget.setHeld(grabbed.axis);
            press = undefined;
            console.log("this");
            return;
          }

          // Pick immediately, so a tap (which produces no pointermove) still
          // selects the voxel under the finger.
          pickAt(event.clientX, event.clientY);
          press = {
            at: { x: event.clientX, y: event.clientY },
            when: performance.now(),
          };
        } else if (activePointers.size === 2) {
          // A second finger ends an arrow drag rather than fighting it for the move.
          endWidgetDrag();
          press = undefined;
          pinchDistance = pinchSpan();
        }
      }}
      onPointerMove={(event: PointerEvent) => {
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

        if (
          press !== undefined &&
          Math.hypot(event.clientX - press.at.x, event.clientY - press.at.y) >
            TAP_SLOP
        ) {
          press = undefined;
        }

        if (widgetDrag !== undefined) {
          const at = pointerOnCanvas(event);

          if (at !== undefined) {
            dragWidget(at);
          }

          return;
        }

        if (activePointers.size >= 2) {
          const distance = pinchSpan();
          if (pinchDistance > 0) {
            // Spreading the fingers (distance grows) zooms in, i.e. pulls the
            // camera closer, so the radius scales by the inverse ratio.
            radius = Math.min(
              MAX_RADIUS,
              Math.max(MIN_RADIUS, radius * (pinchDistance / distance)),
            );
          }
          pinchDistance = distance;
          return;
        }

        // Keep the readout in step with the cursor — including while orbiting,
        // where the model turns beneath the pointer.
        pickAt(event.clientX, event.clientY);
        yaw += delta.x * RADIANS_PER_PIXEL;
        pitch = Math.max(
          -PITCH_LIMIT,
          Math.min(PITCH_LIMIT, pitch + delta.y * RADIANS_PER_PIXEL),
        );
      }}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
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

  /** The arrow being dragged, or undefined when none is. */
  let widgetDrag: WidgetDrag | undefined;

  createEffect(preview.autorotate, (autoRotate) => {
    if (autoRotate) {
      timeOffset = performance.now();
    } else {
      spinOffset = spin;
    }
  });

  /** Whether the figure is turning on its own right now. */
  const spinning = () =>
    untrack(preview.autorotate) && widgetDrag === undefined;

  const getWorldToModel = () => {
    Matrix3x3.rotationX(-pitch, pitchMatrix);
    if (spinning()) {
      spin =
        ((performance.now() - timeOffset) / 1000) *
          TURNTABLE_RADIANS_PER_SECOND +
        spinOffset;
    }
    Matrix3x3.rotationY(-(yaw + spin), yawMatrix);
    return Matrix3x3.multiply(yawMatrix, pitchMatrix, worldToModel);
  };

  /**
   * The turn that carries a point out of the space the figure is drawn in and
   * into the world, which is what puts a part's place in the figure into the
   * same terms as the camera's.
   */
  const getModelToWorld = () => {
    Matrix3x3.rotationX(pitch, inversePitchMatrix);
    Matrix3x3.rotationY(yaw + spin, inverseYawMatrix);
    return Matrix3x3.multiply(
      inversePitchMatrix,
      inverseYawMatrix,
      modelToWorld,
    );
  };

  // CPU voxel picking: ray-march the same volumes the fragment shader renders,
  // from the pointer position in UV space, and hold on to the voxel met first
  // across the whole figure. The picker is precompiled at build time by
  // precompileJS, so this never runs the rmsl graph in the browser.
  const pickAt = (clientX: number, clientY: number) => {
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
  };

  /** Points the editor at the part the pointer last met, so a tap reaches it. */
  const selectPicked = () => {
    const _picked = untrack(picked);

    if (_picked === undefined) {
      return;
    }

    selectPart(_picked.part);
  };

  /** Where a pointer event lands on the canvas, in pixels from its top left. */
  const pointerOnCanvas = (event: PointerEvent): Vector2D | undefined => {
    const rect = canvas.getBoundingClientRect();

    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  /** Which arrow lies under the pointer, and where each of them lies. */
  const grabArm = (
    at: Vector2D,
  ): { axis: WidgetAxis; arm: ArmOnScreen } | undefined => {
    if (scene === undefined || canvas === undefined) {
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
  };

  /** Slides the part being dragged to wherever the pointer has carried its arrow. */
  const dragWidget = (at: Vector2D) => {
    if (widgetDrag === undefined) {
      return;
    }

    const steps = voxelsDragged(
      {
        x: at.x - widgetDrag.startPointer.x,
        y: at.y - widgetDrag.startPointer.y,
      },
      widgetDrag.arm,
      widgetDrag.armLength,
      widgetDrag.voxelSize,
    );

    const root = { ...widgetDrag.startRoot };
    root[widgetDrag.axis] = widgetDrag.startRoot[widgetDrag.axis] + steps;

    if (Vector3D.equals(root, widgetDrag.lastRoot)) {
      return;
    }

    widgetDrag.lastRoot = root;
    doCommand(Command.movePart(widgetDrag.part, root));
  };

  /** Ends a drag, leaving one step in the history for the whole of it. */
  const endWidgetDrag = () => {
    if (widgetDrag === undefined) {
      return;
    }

    const { part, startRoot, lastRoot } = widgetDrag;
    widgetDrag = undefined;
    widget.setHeld(undefined);
    // Measure the figure again, so it fits the view at wherever the part landed.
    setHeldVoxelSize(undefined);

    // The figure was held still for the drag; pick the turntable up from where
    // it was rather than from where it would have got to.
    timeOffset = performance.now();
    spinOffset = spin;

    if (!Vector3D.equals(startRoot, lastRoot)) {
      pushUndo(Command.movePart(part, startRoot), "Move Part");
    }
  };

  // One finger orbits, two fingers pinch to zoom. Every pointer is tracked so
  // the pinch can be measured from both of them regardless of which raised the
  // move; while pinching, the drag (and the pick readout) is suspended.
  const activePointers = new Map<number, { x: number; y: number }>();
  let pinchDistance = 0;

  /**
   * Where and when a press that could still turn out to be a tap landed, or
   * undefined once it has wandered far enough to be an orbit — or taken hold of
   * an arrow, or been joined by a second finger — instead.
   */
  let press: { at: Vector2D; when: number } | undefined;

  const pinchSpan = () => {
    const [a, b] = [...activePointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  const render = () => {
    // The figure is turned to the orientation getWorldToModel describes, so the
    // meshes' world-to-model matrices (the inverse of their world matrices,
    // which the material uses for its ray origin) stay in step with the matrix
    // the CPU picker follows its ray along — keeping the pick under the pointer
    // aligned with what is drawn.
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

  return (
    <div class={styles.container}>
      {canvas}
      {pickedLabel() !== undefined && (
        <div class={styles.picked}>{pickedLabel()}</div>
      )}
    </div>
  );
};

export default VoxelPreviewView;
