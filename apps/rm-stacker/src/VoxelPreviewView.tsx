import { Matrix3x3, Vector2D, Vector3D } from "@big-mesh-studios/maths";
import {
  applyFraming,
  composeRoot,
  FigureMeshes,
  figurePlacement,
  type PartPlacement,
  turnAngles,
  turnMatrix,
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
import {
  armUnderPointer,
  ArmWidget,
  sizeDragged,
  voxelsDragged,
  type ArmOnScreen,
  type WidgetAxis,
} from "./arm-widget";
import { Command } from "./command/Command";
import { StackerContext } from "./context";
import { CutPlane } from "./cut-plane";
import { DebugPlanes } from "./debug-planes";
import { createFigurePicking } from "./picking/figure-picking";
import { PickOutline } from "./picking/pick-outline";
import {
  radiansDragged,
  ringUnderPointer,
  TurnWidget,
  type RingOnScreen,
} from "./turn-widget";
import {
  FAR,
  FOV,
  framedVoxelSize,
  lightFigure,
  NEAR,
  rotateFigure,
} from "./voxel-preview-scene";
import styles from "./VoxelPreviewView.module.css";

const MAX_RADIUS = 20;

/** The way each arm points, before the part's own turn has pointed it. */
const ALONG: Record<WidgetAxis, Vector3D> = {
  x: Object.freeze(Vector3D.create(1, 0, 0)),
  y: Object.freeze(Vector3D.create(0, 1, 0)),
  z: Object.freeze(Vector3D.create(0, 0, 1)),
};

/** A turn of so many radians about each of the axes a ring lies across. */
const ABOUT: Record<WidgetAxis, (angle: number) => Matrix3x3> = {
  x: (angle) => Matrix3x3.rotationX(angle),
  y: (angle) => Matrix3x3.rotationY(angle),
  z: (angle) => Matrix3x3.rotationZ(angle),
};

// Directional + ambient light for the voxel preview. The direction is fixed in
// world space and the model turns beneath it, so it is rotated into the model's
// space before it is uploaded rather than being sent as it stands.

const TURNTABLE_SECONDS_PER_REVOLUTION = 20;
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
    posedFigure,
    posedPart,
    selectedPart,
    selectPart,
    solvedParts,
    palette,
    preview,
    doCommand,
    pushUndo,
    figureLoads,
    dimensions,
    knifeCut,
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

  // Added after the meshes, so a plane standing among a part's voxels is drawn
  // against the figure that is already there.
  const cutPlane = new CutPlane();
  framed.add(cutPlane.group);

  const debugPlanes = new DebugPlanes();
  framed.add(debugPlanes.group);

  // The outline hangs off the part it was traced on rather than standing in the
  // scene, so it is not added to a group here.
  const outline = new PickOutline();

  // Added after the figure, and drawn without a depth test, so the handles come
  // out over whatever they reach into rather than inside it. One set of them
  // stands at a time, which is the set the view bar has asked for.
  const moveWidget = new ArmWidget("arrow");
  const sizeWidget = new ArmWidget("cube");
  const turnWidget = new TurnWidget();
  turntable.add(moveWidget.group, sizeWidget.group, turnWidget.group);

  /** How much of the drawn world one voxel takes up. */
  const [voxelSize, setVoxelSize] = createSignal(1);

  /** Where every part stands, in voxels from the figure's origin. */
  const placement = createMemo(() => figurePlacement(posedFigure()));

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
      ? composeRoot(posedFigure(), posedPart())
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
        voxelReach(untrack(posedFigure), untrack(solvedParts), untrack(focus)),
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
      Vector3D.subtract(composeRoot(posedFigure(), posedPart()), focus),
      voxelSize,
    );
  });

  /**
   * Where the part being drawn on stands in the figure, which is where a cut
   * through it stands as well.
   */
  const selectedPlacement = createMemo<PartPlacement | undefined>(() => {
    const index = posedFigure().parts.findIndex(
      (part) => part.name === selectedPart().name,
    );
    return index === -1 ? undefined : placement().placements[index];
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

  /**
   * The turn the handles stand along: the part's own, or none at all for
   * handles standing along the figure's axes, which is what every part shares.
   */
  const handleTurn = () =>
    preview.handleAxes() === "part" ? posedPart().turn : Vector3D.EMPTY;

  /** The handles standing at the part being drawn on, whichever set it is. */
  function standingWidget() {
    switch (preview.handles()) {
      case "move":
        return moveWidget;
      case "size":
        return sizeWidget;
      case "turn":
        return turnWidget;
      default:
        return undefined;
    }
  }

  /**
   * Which arm lies under the pointer, and where each of them lies. Placed for
   * this frame's camera before they are measured, so a grab reads the same
   * picture the pointer is looking at.
   */
  function grabArm(
    at: Vector2D,
  ): { axis: WidgetAxis; arm: ArmOnScreen } | undefined {
    const widget = standingWidget();

    if (
      canvas === undefined ||
      (widget !== moveWidget && widget !== sizeWidget)
    ) {
      return undefined;
    }

    const rect = canvas.getBoundingClientRect();
    widget.place(selectedRoot(), radius, handleTurn());
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

  /** Which ring lies under the pointer, and where it lies. */
  function grabRing(at: Vector2D): RingOnScreen | undefined {
    if (canvas === undefined || standingWidget() !== turnWidget) {
      return undefined;
    }

    const rect = canvas.getBoundingClientRect();
    turnWidget.place(selectedRoot(), radius, handleTurn());
    rotateFigure(turntable, yaw, pitch, spin);

    const rings = turnWidget.ringsOnScreen(camera, {
      width: rect.width,
      height: rect.height,
    });
    const axis = ringUnderPointer(at, rings);

    return rings.find((ring) => ring.axis === axis);
  }

  // What the pointer meets in the figure, ray-marched through the same volumes
  // the fragment shader draws. The marcher is precompiled at build time by
  // precompileJS, so the graph it is written as is never built in the browser.
  const picking = createFigurePicking(() => ({
    solved: solvedParts(),
    placements: placement().placements,
    framing: framing(),
    palette: palette(),
    cameraDistance: radius,
    worldToModel: getWorldToModel(),
    modelToWorld: getModelToWorld(),
    unlit: untrack(preview.unlit),
  }));

  async function handleArmDrag(
    initialEvent: PointerEvent & { currentTarget: HTMLElement },
    grabbedArm: {
      axis: keyof Vector3D;
      arm: ArmOnScreen;
    },
  ) {
    const part = untrack(posedPart);
    const sizing = standingWidget() === sizeWidget;
    const widget = sizing ? sizeWidget : moveWidget;
    // Hold the figure still in its turn: an arm dragged against a turning
    // model would slide along an axis that had moved on by the time the
    // pointer did.
    spinOffset = spin;
    isDraggingWidget = true;

    const startRoot = part.root;
    const startScale = part.scale;
    let lastRoot = startRoot;
    let lastScale = startScale;
    // The reverse of the first command the drag lands, which is what puts the
    // part back where it was picked up from. Where the drag is what first posed
    // the part, that command stood the part's keys and its reverse takes them
    // away again, which a pose put together here could not do.
    let undoDrag: Command | undefined;

    widget.setHeld(grabbedArm.axis);

    await pointer(initialEvent, ({ totalDelta }) => {
      if (sizing) {
        const scale = startScale * sizeDragged(totalDelta, grabbedArm.arm);

        if (scale === lastScale) {
          return;
        }

        lastScale = scale;

        const reverse = doCommand(Command.scalePart(part.name, scale));
        undoDrag ??= reverse;
        return;
      }

      const steps = voxelsDragged(
        totalDelta,
        grabbedArm.arm,
        widget.armLength,
        voxelSize(),
      );

      // The arm points along one of the axes the handles stand on, which the
      // part's own turn may have taken somewhere of its own. A root falls where
      // it likes, so the part goes as far along that line as the pointer has
      // carried it and stops there.
      const along = Matrix3x3.transform(
        turnMatrix(untrack(handleTurn)),
        ALONG[grabbedArm.axis],
      );
      const root = Vector3D.create(
        startRoot.x + along.x * steps,
        startRoot.y + along.y * steps,
        startRoot.z + along.z * steps,
      );

      if (Vector3D.equals(root, lastRoot)) {
        return;
      }

      lastRoot = root;

      const reverse = doCommand(Command.movePart(part.name, root));
      undoDrag ??= reverse;
    });

    isDraggingWidget = false;

    widget.setHeld(undefined);

    // The figure was held still for the drag; pick the turntable up from where
    // it was rather than from where it would have got to.
    timeOffset = performance.now();
    spinOffset = spin;

    if (undoDrag !== undefined) {
      pushUndo(undoDrag, sizing ? "Scale Part" : "Move Part");
    }
  }

  /**
   * Turns the part as the pointer carries the ring round, and puts the turn it
   * came from on the history once the pointer is let go.
   */
  async function handleRingDrag(
    initialEvent: PointerEvent & { currentTarget: HTMLElement },
    at: Vector2D,
    ring: RingOnScreen,
  ) {
    const part = untrack(posedPart);
    // Hold the figure still in its turn, as an arm's drag does: a ring dragged
    // against a turning model would be measured about a middle that had moved.
    spinOffset = spin;
    isDraggingWidget = true;

    const startTurn = part.turn;
    const alongThePart = untrack(preview.handleAxes) === "part";
    let lastTurn = startTurn;
    // The reverse of the first command the drag lands, as an arm's drag keeps.
    let undoDrag: Command | undefined;

    turnWidget.setHeld(ring.axis);

    await pointer(initialEvent, ({ event }) => {
      const now = pointerOnCanvas(event);

      if (now === undefined) {
        return;
      }

      // What the drag says is a turn about the axis the ring lies along, which
      // is put together with the turn the part already has rather than added to
      // whichever of its three angles shares the ring's name. A ring lying
      // along the part's own axis turns it after that turn; one lying along the
      // figure's turns it before, the figure's axes being the ones the part's
      // own turn is written against.
      const swept = ABOUT[ring.axis](radiansDragged(at, now, ring));
      const already = turnMatrix(startTurn);
      const turn = turnAngles(
        alongThePart
          ? Matrix3x3.multiply(already, swept)
          : Matrix3x3.multiply(swept, already),
      );

      if (Vector3D.equals(turn, lastTurn)) {
        return;
      }

      lastTurn = turn;

      const reverse = doCommand(Command.turnPart(part.name, turn));
      undoDrag ??= reverse;
    });

    isDraggingWidget = false;

    turnWidget.setHeld(undefined);

    // The figure was held still for the drag; pick the turntable up from where
    // it was rather than from where it would have got to.
    timeOffset = performance.now();
    spinOffset = spin;

    if (undoDrag !== undefined) {
      pushUndo(undoDrag, "Turn Part");
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

      if (grabbedArm !== undefined) {
        handleArmDrag(initialEvent, grabbedArm);
        return;
      }

      const grabbedRing = at === undefined ? undefined : grabRing(at);

      if (at !== undefined && grabbedRing !== undefined) {
        handleRingDrag(initialEvent, at, grabbedRing);
        return;
      }

      picking.at(initialEvent, canvas);
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
            picking.at(event, canvas);
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
      const _picked = untrack(picking.picked);

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

    // The handles stand inside the figure, turned by the same turntable, so
    // they stay pointing along the axes a drag works along.
    standingWidget()?.place(untrack(selectedRoot), radius, untrack(handleTurn));

    camera.position.set(0, 0, radius);

    renderer.render(scene, camera);
  };

  createEffect(preview.handles, (handles) => {
    moveWidget.visible = handles === "move";
    sizeWidget.visible = handles === "size";
    turnWidget.visible = handles === "turn";
  });

  createEffect(framing, (framing) => {
    applyFraming(framed, framing);
  });

  // The plane follows the knife: it stands through the part being drawn on
  // wherever the cut in hand would divide it, and is nowhere at all while no
  // knife is over a panel.
  createEffect(
    () => [knifeCut(), selectedPlacement(), dimensions()] as const,
    ([cut, placement, dimensions]) => {
      if (cut === undefined || placement === undefined) {
        cutPlane.visible = false;
        return;
      }

      cutPlane.place(placement, dimensions, cut);
      cutPlane.visible = true;
    },
  );

  // The planes follow the figure while the debug view is up, and are nowhere
  // while it is down: a figure edited with them down is measured again the
  // moment they come back up, because putting them up is itself a change here.
  // A stroke is drawn into the bitmap a panel already holds, which leaves the
  // figure the same value it was — the volumes solved from those bitmaps are
  // what says a drawing has changed.
  createEffect(
    () => [preview.debug(), posedFigure(), solvedParts(), placement()] as const,
    ([debug, figure, , placement]) => {
      debugPlanes.visible = debug;

      if (debug) {
        debugPlanes.sync(figure, placement.placements);
      }
    },
  );

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
        posedFigure(),
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
    () => [posedFigure(), solvedParts(), placement()] as const,
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

  createEffect(
    () => [solvedParts(), picking.picked()] as const,
    ([solvedParts, picked]) => outline.trace(solvedParts, meshes, picked),
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
