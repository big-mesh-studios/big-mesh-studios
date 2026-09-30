import { Bitmap, Matrix3x3, Vector2D, Vector3D } from "@big-mesh-studios/maths";
import {
  applyFraming,
  composeRoot,
  figurePlacement,
  MeshFigureMeshes,
  partDimensions,
  turnAngles,
  turnMatrix,
  voxelReach,
  type FigureFraming,
  type PartPlacement,
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
import {
  createFlyCamera,
  flightEntry,
  flightReach,
  flightExtent,
  lookDirection,
  orbitFromFlyCamera,
  stepFlyCamera,
  type FlyCamera,
} from "./fly-camera";
import { createFigurePicking } from "./picking/figure-picking";
import {
  crosshairOf,
  pickCrosshair,
  type FlyNormal,
  type FlyPick,
} from "./picking/fly-picker";
import type { FlySnapshot } from "./fly-input";
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
  lightMeshFigure,
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

/**
 * How far in front of a camera in flight the near plane stands, in voxels. The
 * camera can be inside the figure, and a near plane a whole world unit out
 * would cut a hole straight through it at the camera's own face.
 */
const FLY_NEAR_IN_VOXELS = 0.05;

const pinchSpan = ([a, b]: Iterable<PointerEvent> = []) => {
  if (a === undefined || b === undefined) {
    return undefined;
  }
  return Math.hypot(a.x - b.x, a.y - b.y);
};

const VoxelPreviewView: Component = () => {
  const {
    parts,
    posedFigure,
    posedPart,
    selectedPart,
    selectPart,
    solvedParts,
    onGeometryChange,
    palette,
    preview,
    flying,
    flyInput,
    setCrosshair,
    editVoxel,
    selectedPaletteIndex,
    undoRedoManager,
    doCommand,
    pushUndo,
    figureLoads,
    dimensions,
    knifeCut,
  } = useContext(StackerContext);

  let yaw = Math.PI / 4;
  let pitch = Math.PI / 6;
  let radius = 3;

  /** The camera in flight, or undefined while the turntable has the figure. */
  let fly: FlyCamera | undefined;

  let timeOffset = 0;
  let spinOffset = 0;
  let spin = 0;
  let lastTap: number;

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

  const meshes = new MeshFigureMeshes();
  framed.add(meshes.group);

  // Added after the meshes, so a plane standing among a part's voxels is drawn
  // against the figure that is already there.
  const cutPlane = new CutPlane();
  framed.add(cutPlane.group);

  const debugPlanes = new DebugPlanes();
  framed.add(debugPlanes.group);

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
   * figure standing still under the pointer. A camera in flight is held at the
   * root whatever the focus says, because the figure moves under a camera that
   * is inside it: following the selection would carry the whole figure out from
   * under the crosshair as soon as it selected a part of its own.
   */
  const focus = createMemo(() =>
    flying() || preview.focus() !== "part"
      ? Vector3D.EMPTY
      : composeRoot(posedFigure(), posedPart()),
  );

  /** How the figure's voxels are drawn in the world the camera stands in. */
  const framing = createMemo<FigureFraming>(() => ({
    focus: focus(),
    voxelSize: voxelSize(),
  }));

  /**
   * How far the figure reaches from the point it is turned about, in voxels.
   *
   * Both how far off a camera in flight opens and how far its crosshair reaches
   * are measured against it, so that a figure however large it is drawn is
   * worked on from outside rather than only at its near corners.
   */
  const figureReach = createMemo(() =>
    voxelReach(posedFigure(), solvedParts(), Vector3D.EMPTY),
  );

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

  /**
   * The handles standing at the part being drawn on, whichever set it is.
   *
   * A camera in flight is inside the figure, and the handles stand at the
   * middle of the turntable the flight took away — so there is nothing there to
   * take hold of, and what is stood on the figure is not what a drag would move.
   */
  function standingWidget() {
    if (fly !== undefined) {
      return undefined;
    }

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
    initialEvent: PointerEvent & { currentTarget: HTMLCanvasElement },
  ) {
    const element = initialEvent.currentTarget;

    // A press on the canvas while a camera is in flight is the flight's own: it
    // takes the pointer lock the first time, and after that places a voxel or
    // takes one away. None of the turntable's own presses — an arm, a ring, a
    // tap to select — mean anything to a camera that is inside the figure.
    if (fly !== undefined) {
      void flyInput.canvasHandlers.onPointerDown(initialEvent);
      return;
    }

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
        const now = performance.now();

        if (lastTap && now - lastTap < 250) {
          preview.setHandles("none");
        }
        lastTap = performance.now();

        return;
      }

      selectPart(_picked.part);
    }
  }

  const canvas = (
    <canvas
      class={styles.canvas}
      onPointerDown={handlePointer}
      // Both are the flight's own and do nothing while the turntable has the
      // figure, so they are bound for the canvas's whole life rather than
      // swapped in and out as the mode changes.
      onMouseMove={flyInput.canvasHandlers.onMouseMove}
      onPointerUp={flyInput.canvasHandlers.onPointerUp}
      onWheel={(event) => {
        if (fly !== undefined) {
          return;
        }

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

  /**
   * What the frame's presses do to the part the crosshair is over.
   *
   * The left button puts a voxel down against the face looked at, or takes one
   * away where the eraser is up, and the right button takes one away either way —
   * which is the arrangement a hand already knows from building things out of
   * cubes, and it means both of them are useful without reaching for a toolbar.
   *
   * Each press is one voxel and so is one thing to take back: a run of them put
   * down by holding the button down is undone a voxel at a time, which is the
   * only way to say which of them was the mistake.
   *
   * @param met What the crosshair is over, or undefined where it is over nothing.
   * @param input The frame's edges, already drained.
   */
  function editAtCrosshair(met: FlyPick | undefined, input: FlySnapshot): void {
    if (met === undefined) {
      return;
    }

    // A part is edited through the crosshair rather than through the panels, so
    // the part being looked at is the part being drawn on: coming back to the
    // panels leaves them on what was being worked on.
    if (untrack(selectedPart).name !== met.part) {
      selectPart(met.part);
    }

    const at = (cell: FlyNormal): Vector3D =>
      Vector3D.create(cell[0], cell[1], cell[2]);
    const drawn = untrack(selectedPaletteIndex);

    if (input.place) {
      if (drawn === Bitmap.EMPTY) {
        editVoxel(met.part, at(met.voxel), Bitmap.EMPTY);
        return;
      }

      // A face on the part's own edge has no cell outside the box to grow into,
      // so there is nowhere for a voxel to be put against it.
      if (met.face?.place !== undefined) {
        editVoxel(met.part, at(met.face.place), drawn);
      }
    }

    if (input.remove) {
      editVoxel(met.part, at(met.voxel), Bitmap.EMPTY);
    }
  }

  const render = (dt: number) => {
    if (fly === undefined) {
      if (untrack(preview.autorotate) && !isDraggingWidget) {
        spin =
          ((performance.now() - timeOffset) / 1000) *
            TURNTABLE_RADIANS_PER_SECOND +
          spinOffset;
      }
      rotateFigure(turntable, yaw, pitch, spin);

      // The handles stand inside the figure, turned by the same turntable, so
      // they stay pointing along the axes a drag works along.
      standingWidget()?.place(
        untrack(selectedRoot),
        radius,
        untrack(handleTurn),
      );

      camera.position.set(0, 0, radius);
    } else {
      // The turntable is left unturned while a camera flies, so the figure
      // stands where the framing puts it and the camera looks about freely.
      const input = flyInput.consume();

      stepFlyCamera(fly, input, dt);

      const look = lookDirection(fly);
      const { x, y, z } = fly.position;

      camera.position.set(x, y, z);
      camera.lookAt(x + look.x, y + look.y, z + look.z);

      // The crosshair is read after the camera has moved, so what it is over is
      // what this frame draws under it rather than where the figure was when the
      // last one was read.
      const met = pickCrosshair({
        solved: untrack(solvedParts),
        placements: untrack(placement).placements,
        origin: fly.position,
        direction: look,
        reach: flightReach(untrack(figureReach)),
        voxelSize: untrack(voxelSize),
        focus: Vector3D.EMPTY,
      });

      setCrosshair(crosshairOf(met));
      editAtCrosshair(met, input);

      // A camera in flight holds the pointer, so the history is reached from the
      // keys rather than from a button that cannot be pressed.
      if (input.undo) {
        undoRedoManager.undo();
      }

      if (input.redo) {
        undoRedoManager.redo();
      }
    }

    lightMeshFigure(meshes, untrack(preview.unlit));

    // Whatever a change has left out of date is built before the frame is drawn,
    // and only for as long as the budget allows, so a large model fills in over
    // the frames after it is opened rather than holding one of them up.
    meshes.drain(untrack(solvedParts));

    renderer.render(scene, camera);
  };

  createEffect(
    () => [preview.handles(), flying()] as const,
    ([handles, inFlight]) => {
      const standing = inFlight ? "none" : handles;
      moveWidget.visible = standing === "move";
      sizeWidget.visible = standing === "size";
      turnWidget.visible = standing === "turn";
    },
  );

  // A camera in flight stands where the turntable's camera stood and looks back
  // at the figure, so the two views are one view with the turning taken away
  // rather than two. Coming back the other way reads the camera's own place and
  // builds a turntable to match it, which is what makes leaving flight land on
  // the view that was just flown around rather than on the one it set off from.
  createEffect(flying, (inFlight) => {
    if (!inFlight) {
      if (fly === undefined) {
        return;
      }

      const back = orbitFromFlyCamera(fly);

      yaw = back.yaw;
      pitch = back.pitch;
      radius = Math.min(MAX_RADIUS, back.radius);
      spin = 0;
      spinOffset = 0;
      timeOffset = performance.now();
      fly = undefined;

      // Whatever the crosshair was over belonged to a view that has gone.
      setCrosshair(undefined);

      // A flight put down through the toolbar while the pointer was still held
      // would otherwise leave the cursor captured over the panels, where there
      // is nothing to click.
      if (flyInput.pointerLocked()) {
        void document.exitPointerLock?.();
      }

      return;
    }

    const voxels = voxelSize();

    fly = createFlyCamera({
      heading: yaw + spin,
      pitch,
      distance: flightEntry(untrack(figureReach), radius, voxels),
      voxelSize: voxels,
      extent: flightExtent(placement().size, voxels),
    });

    // The turntable is only ever held unturned while a camera is in flight, so
    // the figure is drawn the way the turntable was last seen only until the
    // first frame of it.
    rotateFigure(turntable, 0, 0, 0);
  });

  createEffect(framing, (framing) => {
    applyFraming(framed, framing);
  });

  // The near plane a turntable needs is set by how big the figure is drawn,
  // which is what keeps a camera outside it from seeing through the figure's
  // own far side. A camera in flight is measured against the figure instead,
  // since it is inside it.
  createEffect(
    () => [flying(), voxelSize()] as const,
    ([inFlight, voxels]) => {
      camera.near = inFlight ? voxels * FLY_NEAR_IN_VOXELS : NEAR;
      camera.updateProjectionMatrix();
    },
  );

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
  // there is nothing to measure until it arrives. A camera in flight is fitted
  // against the turntable's distance, which is not the distance anything is
  // measuring once the turntable is gone, so a change to the figure leaves the
  // size it was entered at.
  let fittedFor = -1;
  createEffect(
    () =>
      [
        figureLoads(),
        posedFigure(),
        solvedParts(),
        focus(),
        preview.autoframe(),
        flying(),
      ] as const,
    ([loads, , , , autoframe, inFlight]) => {
      if (inFlight || (!autoframe && loads === fittedFor)) {
        return;
      }

      fittedFor = loads;
      fitToView();
    },
  );

  createEffect(
    () => [posedFigure(), placement()] as const,
    ([figure, placement]) => {
      // Stands every part's chunks where the figure has it. A pose reaches this
      // and nothing else: the part is somewhere else with the same drawings, and
      // the triangles are the ones it was already drawn with.
      meshes.place(figure, placement);
    },
  );

  // A change to a drawing is a change to the volume built from it and to the
  // triangles built from that, so the store says which parts it reached and the
  // chunks holding those parts are marked for rebuilding.
  onSettled(() =>
    onGeometryChange((changed) => {
      if ("everything" in changed) {
        meshes.dirtyEverything();
        return;
      }

      for (const { part, box } of changed.parts) {
        const on = parts().find((one) => one.name === part);

        if (on !== undefined) {
          meshes.dirty(part, box, partDimensions(on));
        }
      }
    }),
  );

  // Changing a colour re-uploads a row of texels rather than re-meshing the
  // figure: what a vertex carries is which colour it shows, not the colour.
  createEffect(palette, (colours) => {
    meshes.bakePalette(colours);
  });

  createEffect(preview.autorotate, (autoRotate) => {
    if (autoRotate) {
      timeOffset = performance.now();
    } else {
      spinOffset = spin;
    }
  });

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
      if (untrack(preview.autoframe) && !untrack(flying)) {
        fitToView();
      }

      render(0);
    };
    sizeToCanvas();

    const resizeObserver = new ResizeObserver(sizeToCanvas);
    resizeObserver.observe(canvas);

    let lastFrameTime = 0;
    let rafId = requestAnimationFrame(function renderLoop(time: number) {
      const dt = lastFrameTime > 0 ? (time - lastFrameTime) / 1000 : 1 / 60;
      lastFrameTime = time;

      render(dt);
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
