/**
 * The application shell: a canvas, a parts list, a primitive picker, and the selected
 * part's transform.
 *
 * ## Why the mesh is rebuilt on a timer rather than on every edit
 *
 * **Because meshing a model is tens of milliseconds and a drag sends a change a frame.**
 * The rebuild is debounced, so a drag that moves a part continuously shows the model
 * updating a few times a second rather than re-meshing on every pointer move. On a phone
 * that is the difference between a control that follows a finger and one that does not.
 *
 * The mesh is the *result* of the model and never the model itself, so a mesh a few tens
 * of milliseconds behind is a picture that is briefly late rather than a state that
 * disagrees with itself.
 */
import { Group, type PerspectiveCamera } from "@random-mesh/rmsl/scene";

import {
  createEffect,
  createMemo,
  createSignal,
  onSettled,
  Show,
  untrack,
} from "solid-js";
import { PRIMITIVE_NAMES } from "@big-mesh-studios/sdf";
import { describeReport } from "@big-mesh-studios/meshing";
import {
  getPointerSize,
  pointer,
  type PointerDrag,
} from "@big-mesh-studios/ui/pointer";

import {
  budgetFor,
  DEFAULT_BUDGET,
  DEFAULT_MESH_MODE,
  MESH_MODES,
  meshParts,
  primitivePartMesh,
  RESOLUTIONS,
  type MeshMode,
  operationsField,
  partsToOperations,
} from "./model/mesh-model";
import {
  axisAngle,
  IDENTITY,
  isAxial,
  modelBounds,
  multiply,
  placedPart,
  type Part,
} from "./model/part";
import { createGhost, type Ghost } from "./view/ghost";
import {
  armUnderPointer,
  distanceDragged,
  type Axis,
  type ScreenPoint,
} from "./view/move-handle";
import { createMoveHandles, type MoveHandles } from "./view/move-handles";
import { distanceToPart, pickPartAt, pointInPartFrame } from "./view/pick-part";
import { fieldHit, type BrushSurface } from "./view/field-hit";
import { report } from "./view/paint-report";
import { rayThroughScreen, toNdc } from "@big-mesh-studios/picking";
import { radiansDragged, ringUnderPointer } from "./view/rotate-handle";
import { createRotateHandles, type RotateHandles } from "./view/rotate-handles";
import { createSelectionBox, type SelectionBox } from "./view/selection-box";
import { createModelStore } from "./model/model-store";
import { createPaintCursor, type PaintCursor } from "./view/paint-cursor";
import { BrushPanel, defaultBrush, type BrushState } from "./ui/brush-panel";
import { PaintJournal } from "./unwrapping/paint-journal";
import { BRICK, GRID_RES, PaintField } from "./unwrapping/paint-field";
import { PaintBrush, type Localiser } from "./unwrapping/paint-brush";
import type { RemovedDabs } from "./unwrapping/paint-journal";
import { rasterise, type Placed } from "./unwrapping/paint-rasterise";
import type { Field } from "@big-mesh-studios/csg";
import { conjugate, rotate } from "@big-mesh-studios/csg";
import {
  createOrbit,
  createViewport,
  type OrbitController,
} from "./view/viewport";
import { createModelView, type ModelView } from "./view/model-view";
import { PartsPanel } from "./ui/parts-panel";
import { createPalette } from "./ui/palette";
import { TransformPanel } from "./ui/transform-panel";
// **From `./print/print-problem` and not from `./print/export-model`, and that is the whole
// reason the module is split.** The export control's default height is a number about the
// printer; importing it through the writer would put `jszip` on the first frame, and the build
// says `INEFFECTIVE_DYNAMIC_IMPORT` out loud when it happens. `print-budget` is beside it for
// the same reason and reaches no further than the meshing package does.
import { DEFAULT_HEIGHT_MM } from "./print/print-problem";
import {
  DEFAULT_PRINT_VOXEL_SIZE,
  MIN_PRINT_VOXEL_SIZE,
  printVoxelSizeIn,
} from "./print/print-budget";
import { PROJECT_EXTENSION, PROJECT_MIME_TYPE } from "./file/project-file";
import {
  chooseFileToRead,
  choosePlaceToWrite,
  downloadBlob,
  remembersFiles,
  type OpenedFile,
  type WriteTarget,
} from "./file/save-file";
import { autosave, clearDraft, readDraft, saveDraft } from "./file/autosave";
import { NOWHERE, homeWriter, type Home } from "./file/home";
import {
  canRemember,
  forgetFile,
  listRecentFiles,
  readThrough,
  rememberFile,
  type RecentFile,
} from "./file/recent-files";
import { createDialog } from "./ui/dialog";
import { FilesPanel } from "./ui/files-panel";
import { DEFAULT_MAX_COLOURS } from "./print/quantise";
import {
  loadTexture,
  DRIFT_LIMIT,
  type LoadedTexture,
  type TextureBake,
} from "./unwrapping/bake";
import type { PaintSurface } from "./unwrapping/paint-surface";
import type { ReferenceFile } from "./unwrapping/reference-file";
import type { MeshResult } from "./model/mesh-model";
import styles from "./app.module.css";

/** How long the model has to be still before it is re-meshed, in milliseconds. */
const REBUILD_MS = 90;

/**
 * How far a finger may travel and still count as a tap rather than a drag, in CSS pixels.
 *
 * **Because the select tool and the camera want the same press.** A press on the canvas
 * either picks a part or turns the view, and the two are told apart the way every touch
 * interface tells them apart: by whether the finger stayed put. Eight pixels is small enough
 * that aiming at a part and holding still is a tap, and large enough that the settle of a
 * finger landing is not read as an orbit.
 */
const TAP_SLOP = 8;

/**
 * The paint field's voxel, in world units.
 *
 * **An absolute number, and that is the whole point.** The atlas's resolution came out of
 * whatever xatlas packed into a 1024 atlas, so it varied with the model and with how many
 * charts it made. Here the same figure gets the same number of voxels per unit at any model
 * size, and the resolution is a quality setting rather than a consequence of an unwrap.
 *
 * **A twentieth of a unit, which is a 2 MB pool.** Twenty voxels a unit gives the smallest
 * brush on the panel — a tenth of a unit across, so two voxels — something to be, and puts the
 * whole upload below the 4.15 MB atlas it replaces. The plan's table has the rest: 0.08 is
 * 0.6 MB, 0.05 is 2 MB, and 0.02 is 12 MB and wants M1's partial upload first.
 */
const PAINT_VOXEL = 0.05;

/**
 * How wide a model's paint field can be, in world units.
 *
 * **The indirection grid's reach: 64 bricks a side of 8 voxels at `PAINT_VOXEL`**, which at a
 * fiftieth of a unit is twenty-five and a half units across. A figure that big is far beyond
 * anything this app is for, and the number is here so the brush says so rather than throwing.
 */
const PAINT_REACH = GRID_RES * BRICK * PAINT_VOXEL;

/**
 * How many bricks the field can hold along each edge — twelve, which is 1728 bricks and 7 MB.
 *
 * **Sized to what a figure needs, with room over.** The plan's table puts a 5-unit sphere at
 * 491 bricks at this resolution; a real figure with limbs runs to perhaps three times that, so
 * twelve a side is generous rather than tight. It is a fixed number because **the pool is
 * allocated whole and never grows** — rmsl's texture is created once, and growing storage under
 * a live `DataTexture` is a repack.
 *
 * **Which is why nineteen was too many.** The first cut took 19 a side for margin, which is
 * 6859 bricks and 27 MB allocated before a single mark was made — and the test suite, which
 * builds a few fields, ran the worker out of memory. Twelve costs less than half and still has
 * 3× the headroom a figure needs.
 *
 * Running out is not fatal: `PaintField.set` returns false and the stroke loses its outermost
 * millimetre. M6 turns this into a real setting once the width ladder knows the voxel size.
 */
const PAINT_TILES = 12;

/**
 * What the panel says about the field.
 *
 * **One line, and no chart count.** The atlas reported its size, its chart count and its
 * utilisation because those were things a person could act on — a nearly-full atlas was about
 * to run out. A field has none of them: its resolution is the constant above and its capacity
 * is the tile count, neither of which anything in the panel can change.
 */
const PAINT_DETAIL = `${1 / PAINT_VOXEL} paint texels a world unit`;

/** What a project file is called when nothing has said otherwise. */
const DEFAULT_PROJECT_NAME = `model${PROJECT_EXTENSION}`;

/**
 * An id for a home, so a list can key on it.
 *
 * **The same shape as the recent list's ids and for the same reason**: a `FileSystemFileHandle`
 * cannot be compared cheaply, and `isSameEntry` is asynchronous and only answers whether two
 * handles are one file. A document's home needs a name that a list can key on.
 */
const newEntryId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `home-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;

/** What a project picker accepts, as the two things that ask for one need to agree. */
const PROJECT_CHOICE = {
  description: "SDF model",
  extension: PROJECT_EXTENSION,
  mimeType: PROJECT_MIME_TYPE,
} as const;

/** What a 3MF picker accepts, which is a zip like a project file and so says so. */
const THREE_MF_CHOICE = {
  description: "3D print model",
  extension: ".3mf",
  mimeType: PROJECT_MIME_TYPE,
} as const;

/**
 * The model a new document starts from.
 *
 * **A capsule rather than nothing**, for the reason on the store's initial state: an empty
 * canvas with an empty list tells a first-time visitor nothing about what the application is.
 * One capsule is the smallest figure that reads as a figure.
 */
const newModel = (): Part[] => [
  placedPart(
    "body",
    { type: "Capsule", len: 2.2, radius: 0.7 },
    { x: 0, y: 1.1, z: 0 },
  ),
];

/**
 * The direction one arrow lies along, in the model's own axes.
 *
 * **The model's axes and not the part's**, for the reason on `MoveHandles.place`: a move
 * tool that slid a part along its own turn would send a limb on its side travelling the
 * wrong way.
 */
const unitAlong = (axis: Axis): { x: number; y: number; z: number } =>
  axis === "x"
    ? { x: 1, y: 0, z: 0 }
    : axis === "y"
      ? { x: 0, y: 1, z: 0 }
      : { x: 0, y: 0, z: 1 };

export function App() {
  let canvas!: HTMLCanvasElement;

  /**
   * Which tool the pointer is holding.
   *
   * **Named tools rather than a "handles up" flag**, because the interesting case is coming
   * back. A single toggle answers "are the handles showing" and leaves the question of what
   * the canvas does instead to be inferred; naming the tools says that with the handles down
   * the canvas is picking, with the arrows up it is moving and with the rings up it is
   * turning, which is the whole of what the toolbar is for.
   *
   * **`paint` is the one tool that costs something to pick, and that is deliberate.** Choosing
   * it is the only thing in the application that starts an unwrap, so a model nobody paints on
   * never pays for texture coordinates at all. See `startBake`.
   */
  const [tool, setTool] = createSignal<"select" | "move" | "rotate" | "paint">(
    "select",
  );

  /**
   * Whether a handle drag is running.
   *
   * **A plain boolean rather than a signal**: nothing renders from it, and a signal would
   * mean a write per frame for a value only a pointer handler ever reads.
   */
  let dragging = false;

  const store = createModelStore(newModel());

  /**
   * The colours this model has used, so a colour can be reached again.
   *
   * **Held here rather than in the panel**, because a panel's memory dies with the panel —
   * and on a phone a width query tears the layout down and rebuilds it on every rotation.
   */
  const palette = createPalette([
    { r: 214, g: 96, b: 84, a: 255 },
    { r: 111, g: 207, b: 151, a: 255 },
    { r: 96, g: 150, b: 214, a: 255 },
  ]);

  const [status, setStatus] = createSignal("meshing…");

  /**
   * Which mesher a rebuild uses.
   *
   * **A signal because it changes the mesh and nothing else**, and it is the one setting here
   * that alters what the model *is* rather than how it is drawn — which is why it is saved with
   * the project rather than with the camera.
   *
   * **`DEFAULT_MESH_MODE` rather than a literal here**, because this is the one default a person
   * ever actually sees and the one `meshParts` has its own argument default for, and two literals
   * that are allowed to disagree is a way of shipping the wrong one without noticing. See that
   * constant for the measurement behind the change and the three things it bought.
   */
  const [mode, setMode] = createSignal<MeshMode>(DEFAULT_MESH_MODE);

  /**
   * How fine to mesh, as one of `RESOLUTIONS`.
   *
   * **A union of the offered sizes rather than a number**, so that a slider's value cannot be
   * something the mesher was never measured at. Widening it to `number` would also mean deciding
   * what to do with a value that is not in the list, and the answer would be to round it — which is
   * the same decision made invisibly.
   */
  const [resolution, setResolution] = createSignal<
    (typeof RESOLUTIONS)[number]
  >(DEFAULT_BUDGET.voxelSize as (typeof RESOLUTIONS)[number]);

  /**
   * Which panel the bottom sheet is showing, on a narrow screen.
   *
   * **One at a time, because two panels side by side on a phone is neither of them.**
   * The parts list needs a list's worth of height and the transform needs a form's worth of
   * width, and a screen cannot give both. Tabs are also the reason the two cannot overlap:
   * on a narrow screen the canvas and the sheet are siblings in one flex column, so the
   * sheet takes height from the canvas rather than being laid over it.
   */
  const [sheet, setSheet] = createSignal<"parts" | "shape" | "paint">("parts");

  /**
   * Whether the sheet's content is showing, on a narrow screen.
   *
   * **A chevron folds the sheet down to its tab row**, so the canvas — which is the flex child
   * above it — gets the height back on a short phone. This is the arrangement `voxelscape`'s
   * level editor uses for its own sheet, and the reason to have one at all is that the canvas
   * is the thing being worked on: on a 640px-tall phone the sheet's share plus four rows of
   * `--ui-size` chrome is most of the screen.
   *
   * **Open by default, because the tabs are how a first-time visitor finds the parts list.**
   * Collapsing is a thing to do once the model is what matters, not a state to open the
   * application in.
   */
  const [sheetOpen, setSheetOpen] = createSignal(true);

  /**
   * Where the document came from, and therefore where Save writes.
   *
   * **`nowhere` until something has been opened or saved**, which is the whole of what "unsaved"
   * means here: there is nowhere to write back to, so Save becomes Save as. See `./file/home` for
   * why this is one value and not a name and a handle side by side.
   *
   * A restored draft is also `nowhere`, and deliberately: the bytes came from this browser's own
   * database rather than from a file, so saving it should ask where it goes rather than quietly
   * claiming the draft slot can be written back to.
   */
  const [home, setHome] = createSignal<Home>(NOWHERE);

  /** The files this browser has opened, drawn as cards. */
  const [recent, setRecent] = createSignal<readonly RecentFile[]>([]);

  /** When the draft was written, which is the only way a restore can say how stale it is. */
  const [draftAt, setDraftAt] = createSignal<number | undefined>();

  /** Something in a file operation is in flight, which is what disables the actions. */
  const [busy, setBusy] = createSignal(false);

  /**
   * The last mesh a rebuild produced.
   *
   * **Held so the export controls can say whether the model is printable without meshing it
   * again.** The export re-meshes at its own resolution when it runs, but the question "can this
   * be printed" is asked while somebody is looking at the panel, and answering it by meshing
   * would put a hundred milliseconds on opening a menu.
   *
   * **The viewport's mesh and not the export's**, and the button's title says so: at a
   * resolution chosen so a rebuild lands while a finger is down, an open edge is a warning about
   * what is on screen rather than a prediction about the file.
   */
  const [mesh, setMesh] = createSignal<MeshResult | undefined>();

  /**
   * The model's painted texture, once somebody has baked one.
   *
   * **Held as a plain value rather than a signal, for the same reason `mesh` is one and not two.**
   * Nothing renders from it directly: the rebuild reads it, and what the viewport draws comes
   * from the geometry the rebuild installed. A signal here would mean a write per rebuild to
   * render nothing, and a second source of truth for "is this model textured" beside the one the
   * material already carries.
   *
   * **The atlas outlives the mesh it was baked against.** That is the whole point — an unwrap is
   * global and a rebuild is not, so the coordinates are pinned here and carried onto whatever
   * the viewport is showing rather than derived again on every edit. See `./unwrapping/bake`.
   */
  let bake: TextureBake | undefined;

  /**
   * The model's paint journal — every dab, in order, and the only durable paint state.
   *
   * **Held for the life of the document rather than rebuilt on demand**, because the field
   * below is derived from it and a derived thing that is thrown away and remade on every edit
   * would be a repaint nobody asked for. It is not a signal: nothing renders from it, the
   * render loop reads the field.
   */
  const paintJournal = new PaintJournal();

  /**
   * How many dabs the journal holds, as a signal.
   *
   * **Only so the panel can say so.** A paint tool that records nothing and shows nothing is
   * indistinguishable from one that records nothing and cannot show what it recorded, and that
   * ambiguity cost two rounds of debugging: the number moving or not moving separates "the
   * brush is not finding the surface" from "the brush is painting and the picture is not
   * updating" in one glance. It is also the one thing about a painting worth reporting, since
   * a field has no atlas size to quote.
   */
  const [dabCount, setDabCount] = createSignal(0);

  /**
   * The paint field, or nothing until a first stroke needs one.
   *
   * **Made on first use rather than on load**, because a field is sized to the painted area
   * and an untouched document has none. The box comes from the model's bounds, which is what
   * makes the field's resolution an absolute world size rather than a fraction of the model.
   */
  const [paintField, setPaintField] = createSignal<PaintField | undefined>();

  /**
   * The folded SDF, held across rebuilds so the brush can hit it without building one a frame.
   *
   * **The one thing the old brush did not need and this one does.** The atlas's brush read
   * coordinates off a triangle, so it wanted a mesh. This one resolves the surface against the
   * field itself — three Newton steps from the mesh hit — and `pickPart` already builds a
   * field of exactly this kind for a tap. Building one per pointer move would be a field walk
   * and a sort sixty times a second.
   */
  let surfaceField: Field | undefined;

  /**
   * The brush surface the field hit works against, rebuilt with the mesh.
   *
   * **Assembled here rather than inside `field-hit.ts`**, because it needs the BVH from the
   * last rebuild and the parts list, and those are the app's business.
   */
  const brushSurface = (): BrushSurface | undefined => {
    const parts = untrack(store.parts);
    if (surfaceField === undefined || parts.length === 0) {
      report({
        what: "no-surface",
        hasField: surfaceField !== undefined,
        parts: parts.length,
      });
      return undefined;
    }
    return {
      field: surfaceField,
      partCount: parts.length,
      partDistance: (part, point) => distanceToPart(parts[part]!, point),
    };
  };

  /**
   * Puts a world point and normal into a part's own frame, and back out again.
   *
   * **Two functions, one transform, and they are inverses.** Dabs are stored part-local so paint
   * follows its part, and rasterising has to put them back where the part currently is. Both
   * ends use `pick-part.ts`'s `pointInPartFrame`, which is the frame `sdShape` measures in and
   * therefore the frame the surface the brush found is actually on.
   */
  const partTransforms = (
    parts: readonly Part[],
  ): {
    localise: Localiser;
    place: (
      part: number,
      centre: { x: number; y: number; z: number },
      normal: { x: number; y: number; z: number },
    ) => Placed | undefined;
  } => {
    const localise: Localiser = (part, point, normal) => {
      const own = pointInPartFrame(parts[part]!, point);
      // **The normal turns with the point and is not translated.** A rotation preserves lengths,
      // so the unit vector the brush found is still a unit vector once it is in the part's
      // frame — and forgetting the distinction would give a dab a normal that leans as the part
      // moved.
      const turned = rotate(normal, conjugate(parts[part]!.orientation));
      return {
        centre: [own.x, own.y, own.z],
        normal: [turned.x, turned.y, turned.z],
      };
    };
    const place = (
      part: number,
      centre: { x: number; y: number; z: number },
      normal: { x: number; y: number; z: number },
    ): Placed | undefined => {
      const own = parts[part];
      if (own === undefined) return undefined;
      const turned = rotate(centre, own.orientation);
      return {
        centre: {
          x: turned.x + own.origin.x,
          y: turned.y + own.origin.y,
          z: turned.z + own.origin.z,
        },
        // **The normal is the same rotation with no origin added**, and normalising it because a
        // frame that has drifted off unit length would tilt every stroke as the part turns.
        normal: (() => {
          const n = rotate(normal, own.orientation);
          const length = Math.hypot(n.x, n.y, n.z);
          return length === 0
            ? { x: 0, y: 1, z: 0 }
            : { x: n.x / length, y: n.y / length, z: n.z / length };
        })(),
      };
    };
    return { localise, place };
  };

  /** Whether the last carry drifted far enough to be worth rebaking, which M5 will surface. */
  let drift = 0;

  /**
   * What the last file operation had to say, or nothing.
   *
   * **One notice for the whole dialogue**, because there is one surface: a refusal from
   * `readProject` and a refusal from the print gate are the same kind of thing and are both
   * about a file somebody asked for. Cleared when an action starts, so a refusal does not sit
   * beside a control somebody has since fixed.
   */
  const [fileNotice, setFileNotice] = createSignal<string>();

  /**
   * The height a print should stand at, **held as text rather than as a number**.
   *
   * Because a number in a number input is a number on every keystroke, so typing "1" on the way
   * to "150" would export a one-millimetre model. The text is what the person typed; the number
   * is derived from it and refused when it is not one.
   */
  const [height, setHeight] = createSignal(String(DEFAULT_HEIGHT_MM));

  /**
   * How many filaments the destination printer has, as text, for the same reason.
   *
   * **Four by default, because that is what the printer this was written for has** — and a
   * number in a file that a slicer will act on is not a number to leave to chance.
   */
  const [filaments, setFilaments] = createSignal(String(DEFAULT_MAX_COLOURS));

  /**
   * How finely the export meshes, as text, for the same reason as the two above.
   *
   * **Held separately from `resolution`, and this is the one that is not a preview.** The
   * viewport's resolution is about how fast a picture arrives and is saved with the project;
   * this one is about how good a file is and changes nothing until somebody presses Export.
   * One signal for both would mean opening the files dialogue moved the preview.
   */
  const [printResolution, setPrintResolution] = createSignal(
    String(DEFAULT_PRINT_VOXEL_SIZE),
  );

  /**
   * How far the export's meshing has got, or `undefined` when none is running.
   *
   * **`undefined` rather than zero while idle**, so the export popover's `<Show>` takes the bar
   * out of the panel rather than leaving a full-width element sitting at nothing between
   * exports — and so that a failure, which clears it in a `finally`, leaves no bar behind at
   * all rather than a frozen one that says the export is still going.
   */
  const [printProgress, setPrintProgress] = createSignal<number | undefined>();

  /**
   * The `.3mf` that has been built and is waiting for somebody to say where it goes.
   *
   * **Held rather than written immediately, because a file dialog needs a user gesture and the
   * meshing spends the one there was.** `showSaveFilePicker` throws
   * _"Must be handling a user gesture to show a file picker"_ when it is called without recent
   * user activation, and Chrome's activation lasts five seconds — where the finest export is
   * seven and a half and the coarsest is one. So the export is two clicks: one to mesh and
   * encode, which needs no gesture and may take as long as it takes, and one to write, which
   * is a fresh gesture on a button that says what it will write.
   *
   * **The bytes are held, not re-encoded.** Nothing between the two clicks can change them, so
   * saving is a `Blob` going to a handle and the eight seconds are not paid twice.
   */
  const [printFile, setPrintFile] = createSignal<
    { readonly blob: Blob; readonly name: string } | undefined
  >();

  /**
   * The name and size of the file waiting to be saved, or `undefined` when none is.
   *
   * **On the button rather than in a line of its own**, because the button is what a person
   * presses next and what it says is the last chance to say something wrong. The size is here
   * because a `.3mf` of a finely-meshed model is tens of megabytes and somebody about to write
   * one to a phone's storage would rather know before than after.
   */
  const printFileLabel = (): string | undefined => {
    const built = printFile();
    if (built === undefined) return undefined;
    return `${built.name} · ${Math.max(1, Math.round(built.blob.size / 1e6))} MB`;
  };

  /**
   * Setting one of the export's numbers throws away a file built with the old ones.
   *
   * **Three wrappers rather than an effect watching the three signals**, because an effect would
   * fire once on mount and take the file with it — and because this way the connection between
   * "the settings changed" and "the thing it produced is stale" is written down at the setter
   * rather than inferred from a dependency list somewhere else.
   *
   * **Height and filaments included, not only the resolution**, because all three go into the
   * bytes: a file meshed at 100 mm offered after the field says 150 is a wrong file, and a
   * person who cannot see that from a filename deserves to be told by the button disappearing.
   */
  const forgetPrintFile = (set: (value: string) => void) => (value: string) => {
    setPrintFile(undefined);
    set(value);
  };
  const setHeightForPrint = forgetPrintFile(setHeight);
  const setFilamentsForPrint = forgetPrintFile(setFilaments);
  const setPrintResolutionForPrint = forgetPrintFile(setPrintResolution);

  // **Assigned inside `onSettled` and read outside it, which is the shape this needs.**
  //
  // The renderer cannot be built in the component body, because `ref={canvas}` is
  // assigned *after* the body runs: at that point `canvas` is still `undefined`, and
  // `createViewport` hands it straight to `ResizeObserver.observe`, which throws
  // "parameter 1 is not of type 'Element'". So everything that needs the canvas waits
  // for the DOM.
  //
  // The rebuild reads them from outside, which is why they are declared here and
  // assigned later — and why `rebuild` has to cope with them not existing yet.
  const Files = createDialog();

  let picker!: HTMLInputElement;
  let view: ModelView | undefined;
  let orbit: OrbitController | undefined;
  let handles: MoveHandles | undefined;
  let turns: RotateHandles | undefined;
  let ghost: Ghost | undefined;
  let selection: SelectionBox | undefined;
  let camera: PerspectiveCamera | undefined;

  let pending: ReturnType<typeof setTimeout> | undefined;
  let elapsed = 0;

  /**
   * Rebuilds the mesh for `parts`.
   *
   * **The parts are an argument rather than read from the store inside.** A Solid 2 effect's
   * second function is the *effect* callback, and reading a reactive value there warns
   * `STRICT_READ_UNTRACKED` and does not update — which for a mesher means the second edit
   * would mesh the first edit's model. The compute function's value is handed in instead,
   * so the only reactive read happens where it is tracked.
   */
  const rebuild = (parts: readonly Part[]): void => {
    // The canvas may not be up yet, in which case the effect that drives this fires
    // before there is anything to mesh into. `onSettled` triggers the first rebuild
    // itself once there is.
    //
    // **Taken into locals rather than read through the outer `let`s inside the timeout.**
    // The guard narrows `view` and `orbit` here, but the narrowing does not reach a
    // closure — and reading the outer variables inside the callback would also mean a
    // rebuild that lands after teardown installs into a disposed renderer.
    const target = view;
    const camera = orbit;
    if (target === undefined || camera === undefined) return;
    // **The mode and the resolution are read here, not inside the timeout**, so they are part
    // of what this rebuild is *for*. Read inside, a rebuild would use whatever they happened to
    // be when the timer fired, so moving the resolution slider would mesh the old one and the
    // picture would come back looking like the control had not worked.
    const budget = budgetFor(resolution());
    const mesher = mode();
    if (pending !== undefined) clearTimeout(pending);
    pending = setTimeout(() => {
      pending = undefined;
      const started = performance.now();
      const result = meshParts(parts, budget, mesher);
      // **Kept for the export controls to read**, which is the only reason it is here: the
      // popover has to say whether the model is printable without meshing it again. See the
      // signal's own note about this being the viewport's mesh and not the export's.
      setMesh(result);
      // **Translucent only if something in the model is.** A mesh cannot say so itself, and
      // an always-transparent material with depth writes off makes a solid self-overlap.
      //
      // **The bake rides along rather than being read from a signal.** It is carried onto the
      // mesh being installed inside `install`, which is the only place that knows the mesh's
      // vertex order, and reading it here would mean knowing it twice.
      const carried =
        result !== undefined && bake !== undefined
          ? bake.carry(result.mesh)
          : undefined;
      if (carried !== undefined) {
        drift = carried.drift;
        setStale(drift);
      }
      // **The field the brush traces is replaced with the model it describes**, together.
      // A field over one model paired with a part list from another would trace a shape that is
      // not on screen and name parts that do not exist.
      surfaceField =
        result === undefined
          ? undefined
          : operationsField(partsToOperations(parts), DEFAULT_BUDGET);
      hoverReported = 0;
      strokeMisses = 0;
      report({
        what: "rebuild",
        triangles: result?.triangles ?? 0,
        parts: parts.length,
        hasSurfaceField: surfaceField !== undefined,
      });
      target.install(result, {
        translucent: parts.some((part) => (part.opacity ?? 1) < 1),
        ...(bake === undefined ? {} : { bake }),
        ...(paintField() === undefined ? {} : { field: paintField() }),
        blend: untrack(blend),
      });
      elapsed = performance.now() - started;

      const bounds = modelBounds(parts);
      if (bounds !== undefined) {
        const size = Math.max(
          bounds.max.x - bounds.min.x,
          bounds.max.y - bounds.min.y,
          bounds.max.z - bounds.min.z,
        );
        camera.frame(
          {
            x: (bounds.min.x + bounds.max.x) / 2,
            y: (bounds.min.y + bounds.max.y) / 2,
            z: (bounds.min.z + bounds.max.z) / 2,
          },
          size,
        );
      }

      /**
       * **The draft is armed from the rebuild rather than watched separately.**
       *
       * The rebuild is the one place that runs when the model has actually changed, after the
       * debounce that keeps it off a finger's every frame — so arming the draft here means it is
       * written once per settled model rather than once per keystroke, with no second timer to
       * keep in step with this one.
       */
      draft.changed();

      const count = parts.length;
      setStatus(
        result === undefined
          ? "no parts yet — add one below"
          : `${count} part${count === 1 ? "" : "s"} · ${result.triangles} triangles · ${Math.round(result.samples / 1000)}k samples · ${Math.round(elapsed)} ms · ${describeReport(result.report)}`,
      );
    }, REBUILD_MS);
  };

  /**
   * How far through a bake is, or `undefined` when none is running.
   *
   * **A signal, because this one is rendered.** The bake itself lives in a plain value — nothing
   * draws from it — but a control that says nothing for a second and a half while the page is
   * blocked needs to say something, and it can only say it if something re-renders.
   */
  const [baking] = createSignal<number | undefined>();

  /** Whether the model carries a baked atlas, which is what the tool's label turns on. */
  const [textured, setTextured] = createSignal(false);

  /**
   * How far the model has moved from the surface its coordinates were baked on.
   *
   * **A signal for the same reason `baking` is**, and set from the rebuild's carry. A vertex that
   * has drifted past the reference mesh's own voxel is borrowing coordinates from a surface it is
   * no longer on, and that is where a painted stroke starts to smear — so it is worth saying so
   * rather than waiting for somebody to notice.
   */
  const [stale, setStale] = createSignal(0);

  /**
   * What the paint tool says about itself: what it will do, how far along it is, or that the
   * texture has drifted.
   *
   * **A function rather than a constant, because all three change.** The other three tools have a
   * hint that is true for the life of the session; this one starts with nothing baked, spends a
   * second being baked, and afterwards may have gone out of date as the model was edited. The
   * drift number goes in the hint because a person's only way of acting on it is to reach for this
   * tool again.
   */
  const paintHint = (): string => {
    if (baking() !== undefined) {
      return `Baking texture coordinates, ${Math.round(baking()! * 100)}% done`;
    }
    if (!textured()) {
      return "Draw on the model with a brush. Choosing this bakes the texture coordinates.";
    }
    if (stale() > DRIFT_LIMIT) {
      return `Paint on the model. The texture is ${stale().toFixed(2)} world units out of date; choosing this again rebakes it.`;
    }
    return "Draw on the model with a brush.";
  };

  /**
   * Puts a texture that came out of a file back into the document.
   *
   * **Kicked off after the parts are loaded rather than awaited inside them**, because
   * `loadTexture` meshes the parts itself and has no reason to wait for the store to be told
   * about them — and an open that blocked on a re-project would look like a hang.
   *
   * **A file with no texture clears the last one's**, which is the case that is easy to miss and
   * looks like a bug when it is missed: opening an untextured model while a textured one was
   * open would otherwise carry the first model's picture onto the second.
   */
  const installTexture = async (
    parts: readonly Part[],
    loaded: LoadedTexture | undefined,
  ): Promise<void> => {
    if (loaded === undefined) {
      bake = undefined;
      textureRevision++;
      setBlend(0);
      setTextured(false);
      setStale(0);
      return;
    }

    setBlend(untrack(blend));
    if (loaded.bake === undefined) return;

    bake = loaded.bake;
    textureRevision++;
    // **And the draft is armed**, because a file that arrived with a texture in it is a document
    // that differs from the empty one — and on the *next* reload this draft is what comes back.
    // Without this the restored painting would be shown, never saved, and lost on the next
    // reload, which would look exactly like the bug that was just fixed.
    draft.changed();
    setTextured(true);
    setStale(0);
    rebuild(parts);

    // **Said out loud, because "reopened" and "reopened, re-projected" are different promises.**
    // The coordinates in that file belonged to a surface this build does not produce any more,
    // and the picture has been resampled onto a fresh layout — recognisable, and not identical.
    if (!loaded.exact) {
      setFileNotice(
        "this file's texture was painted against a differently-shaped mesh, so the picture has been fitted to the current one",
      );
    }
  };

  /**
   * The brush, as the panel set it.
   *
   * **A signal, and this was a plain object for most of the paint tool's life — which meant the
   * panel never saw a colour change.** The reasoning was that nothing outside the panel and the
   * paint drag reads it, and the drag reads it dozens of times a second, so four signals were
   * thought to be the wrong shape. But a plain object is not reactive at all: reading it in the
   * panel's JSX creates no dependency, so assigning `brush = { ...brush, colour }` changed the
   * value and drew nothing. The brush colour swatch showed whatever was there on first render,
   * and the picker appeared to do nothing — which is exactly what it looks like when a control
   * is broken rather than when it is subtle.
   *
   * **One signal rather than four**, so a width change and a colour change are the same shape of
   * update, and a drag's reads are a getter rather than a graph walk. The drag takes one
   * `untrack` snapshot when it starts rather than reading per move, which is the part of the
   * original worry that was actually worth acting on: a drag's brush settings cannot change
   * under it, so there is nothing to be reactive about.
   */
  const [brush, setBrush] = createSignal<BrushState>(
    defaultBrush({ r: 255, g: 255, b: 255, a: 255 }),
  );

  /**
   * How many times the atlas's *pixels* have changed since the file was last opened.
   *
   * **A counter rather than the surface's own `dirty` flag**, because that is a flag and this
   * needs a number to compare. It is bumped in exactly three places — a finished stroke, a
   * clear, and a rebake — which are the three ways the picture can change.
   */
  let textureRevision = 0;

  /**
   * The picture changed, so say so to both things that care.
   *
   * **The autosave has to be armed here, and that is the whole of this function.** The draft was
   * armed from the rebuild, on the reasoning that the rebuild is the one place that runs when the
   * document has actually changed — which was true until the texture arrived. A stroke writes
   * atlas texels and nothing else: no part moves, so no rebuild, so the draft was never armed,
   * so the painting was written out only when some *later* model edit happened to come along.
   * That is a failure that looks intermittent — strokes followed by a slider drag survive, the
   * last stroke before a reload does not — and it loses exactly the thing a person would be
   * angriest to lose.
   *
   * **Bumping the revision and arming the draft are the same event** and are called together for
   * that reason. One is "the encoded copy is out of date", the other is "there is something worth
   * writing down", and a stroke that misses either one is a stroke that is either invisible or
   * unsaved.
   */
  const pictureChanged = (): void => {
    textureRevision++;
    draft.changed();
  };

  /**
   * The atlas as a PNG, encoded once per revision.
   *
   * **Cached because autosave writes the document once a second while somebody is dragging a
   * slider, and encoding a 1225 by 847 PNG takes long enough to be felt.** Without this, every
   * debounced autosave during an ordinary editing session would re-encode a picture that has not
   * changed, which is the single most expensive thing in the file writer for nothing.
   *
   * **Keyed on the revision and not on the bake**, so that a rebake — which replaces the surface
   * but happens once per drift warning — and a stroke invalidate it through the same door.
   */
  let cachedRevision = -1;
  let cachedPng: Promise<Blob | undefined> | undefined;
  const atlasPng = (): Promise<Blob | undefined> => {
    if (cachedPng === undefined || cachedRevision !== textureRevision) {
      cachedRevision = textureRevision;
      // **`Promise.resolve` rather than a nullish check**, so a caller gets one shape back
      // whether or not there is a bake — an untextured document resolves to undefined instead
      // of not resolving, which would be a promise-shaped difference nobody would notice.
      cachedPng = Promise.resolve(bake?.surface.toPng());
    }
    return cachedPng;
  };

  /**
   * How much of the texture replaces a part's colour rather than tinting it.
   *
   * **A signal rather than part of `brush`,** because it is read on every rebuild and written
   * from a radio button, and those are the two ends of a control rather than two ends of a
   * brush setting. It is handed to each install because every rebuild builds a new material and
   * a value left on the old one would spring back on the first edit.
   */
  const [blend, setBlend] = createSignal(0);

  /** The cursor, which only exists once the scene does. */
  let cursor: PaintCursor | undefined;

  /**
   * Where the pointer last was on the canvas, in CSS pixels.
   *
   * **Held rather than taken from an event, because the cursor follows the pointer between
   * pointer moves** — a finger held still on a model is still over a place on it, and a cursor
   * that vanished the moment a drag stopped moving would be a cursor nobody could aim with. It is
   * updated by a listener rather than read from an event object, which does not exist outside a
   * drag.
   */
  let lastPointer: ScreenPoint | undefined;

  /**
   * Puts the cursor where the pointer is, or takes it off the screen.
   *
   * **Run from the render loop and not from the panel**, because the camera moves under a
   * stationary pointer too: orbit, a pinch, a rebuild. Following only pointer moves would leave
   * the ring behind whenever the view moved, which is exactly when it is most out of date.
   */
  /**
   * The paint field for a model, made once and then kept.
   *
   * **Sized from the model's bounds and a fixed world resolution**, which is the point of the
   * whole exercise: `voxelSize` is an absolute number of world units, so a figure twice as big
   * gets twice the voxels and the brush is the same physical size on both. The atlas could not
   * say that — its texels-per-unit came out of whatever xatlas packed.
   *
   * **The box is padded**, because a brush at the silhouette of a figure writes outside the
   * mesh's bounds by its own radius, and a field that stopped at the bounds would drop the edge
   * of every stroke that ran off it.
   */
  const ensureField = (parts: readonly Part[]): PaintField | undefined => {
    const existing = paintField();
    if (existing !== undefined) return existing;
    const bounds = modelBounds(parts);
    if (bounds === undefined) return undefined;
    const pad = 4;
    const origin: [number, number, number] = [
      bounds.min.x - pad,
      bounds.min.y - pad,
      bounds.min.z - pad,
    ];
    const span = (lo: number, hi: number): number => hi - lo + pad * 2;
    // **A cube, not the model's own box.** The indirection grid is cubic, so a model that is
    // long and thin would pay for a cubic grid and get nothing for it — but a cube also means
    // one number to reason about, and the figures this app makes are roughly round.
    const side = Math.max(
      span(bounds.min.x, bounds.max.x),
      span(bounds.min.y, bounds.max.y),
      span(bounds.min.z, bounds.max.z),
    );
    // **The indirection grid is the ceiling, and it is checked rather than assumed.**
    // `PaintField.over` throws on a box the grid cannot address, because a brick past the grid's
    // edge would alias onto the ones at the start — paint on the wrong side of the model. A
    // figure far larger than this is not something to crash over, so it gets no field and says
    // so; M1's coarser-voxel setting is what will lift the ceiling.
    report({
      what: "field-sizing",
      side: Number(side.toFixed(2)),
      reach: PAINT_REACH,
      origin: origin.map((v) => Number(v.toFixed(2))),
      voxel: PAINT_VOXEL,
      tiles: PAINT_TILES,
    });
    if (side > PAINT_REACH) {
      setFileNotice(
        "this model is too large for the paint field at its current resolution; move the parts closer together or use a smaller model",
      );
      return undefined;
    }
    const made = PaintField.over(
      PAINT_VOXEL,
      origin,
      [side, side, side],
      PAINT_TILES,
    );
    setPaintField(made);
    made.ensureTextures();
    // **Attached now, because a material compiles what it samples.** The field is made on the
    // first stroke rather than on load — there is nothing to size a field by until something
    // has been painted — so without this the material on screen was built with no field sampler
    // and the stroke would accumulate invisibly until the next edit remade the model.
    view?.attachField(made);
    return made;
  };

  /**
   * Rasterises the journal into the field, if there is one.
   *
   * **A pure function of the journal and the parts**, which is what makes undo, redo and
   * "the model moved" all the same operation. Nothing here is incremental: the field is
   * derived, and a derived thing that was built by mutation could not be rebuilt.
   *
   * **Cleared first, and that word is the whole of the fix.** Replaying the remaining dabs over
   * a field that still holds the removed ones leaves the removed ones exactly where they were —
   * compositing only ever adds. So "take the last stroke off the journal and draw the rest"
   * drew the rest *on top of* the stroke that was supposed to be gone, and undo appeared to do
   * nothing while the dab count fell. This is the plan's rule 2, "rasterise always starts from
   * a cleared region", and it was the one rule in the file that had not been applied where it
   * said.
   *
   * **Clearing releases every brick**, so the field's memory and its upload both go back to
   * what an unpainted model costs rather than being held by a stroke nobody can reach any more.
   */
  const rasteriseJournal = (): void => {
    const field = paintField();
    if (field === undefined) return;
    const parts = untrack(store.parts);
    const { place } = partTransforms(parts);
    field.clearAll();
    rasterise(paintJournal, field, place);
    field.markChanged();
  };

  /**
   * Throws away the paint on the document, for a new one or another file.
   *
   * **Three things, and the field is the one that is easy to forget.** The journal is the truth
   * and the field is derived from it, so clearing the journal and leaving the field in place
   * would show a painting no dabs account for; clearing the field and leaving the journal would
   * show nothing and then quietly re-appear on the next undo, redo or "the model moved".
   *
   * **The field is dropped rather than emptied.** It was sized to the bounds of the model it
   * was made for, and a file's model may be a different size in every direction; holding the
   * old one would paint a new figure into a grid that does not cover it. An empty field costs
   * its pool until the first stroke makes a new one, and the pool is seven megabytes, so the
   * next document starts unpainted and allocates when there is something to allocate it for.
   *
   * **The journal is emptied rather than replaced**, because it is a document-lifetime object
   * and the field is signalled into every material that might hold it.
   */
  const resetPaint = (): void => {
    paintJournal.clear();
    setDabCount(0);
    setPaintField(undefined);
    view?.attachField(undefined);
  };

  let hoverReported = 0;

  /** Rounded for a log line, because a full double is unreadable and the digits are noise. */
  const round3 = (value: number): number => Number(value.toFixed(3));

  const standCursor = (): void => {
    const ring = cursor;
    const eye = camera;
    const pointer = lastPointer;
    const surface = brushSurface();
    if (ring === undefined || eye === undefined || pointer === undefined)
      return;
    // **`dragging` is not a reason to hide the ring.** It was, and it made a stroke look
    // broken: the ring stayed where it was before the press and vanished for the whole drag,
    // so the one thing a person uses to aim was unavailable exactly when they were aiming.
    // A miss still hides it — that is what a miss means.
    if (untrack(tool) !== "paint" || surface === undefined) {
      ring.hide();
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const size = { width: rect.width, height: rect.height };
    // **The SDF rather than the mesh.** The ring stands where the surface actually is, to a
    // hundredth of a unit, rather than on a facet of a mesh that may be a quarter of a unit
    // across — which is the whole reason the atlas needed a pinned reference mesh to be honest
    // about where anything was.
    const hit = fieldHit(surface, eye, size, pointer);
    if (hit === undefined) {
      // **A few of these, and no more.** The cursor asks the same question sixty times a second
      // and "no" sixty times a second is not news; what is news is the ray that could not find
      // the surface, and eight of those is enough to see what it looked like.
      if (hoverReported < 8) {
        hoverReported += 1;
        const ndc = toNdc(pointer.x, pointer.y, size.width, size.height);
        const ray = rayThroughScreen(eye, ndc.x, ndc.y);
        report({
          what: "hover-miss",
          pointer,
          size,
          eye: { x: eye.position.x, y: eye.position.y, z: eye.position.z },
          origin: { x: ray.origin.x, y: ray.origin.y, z: ray.origin.z },
          direction: {
            x: round3(ray.direction.x),
            y: round3(ray.direction.y),
            z: round3(ray.direction.z),
          },
        });
      }
      ring.hide();
      return;
    }
    if (hoverReported < 8) {
      hoverReported += 1;
      report({
        what: "hover-hit",
        pointer,
        part: hit.part,
        point: {
          x: round3(hit.point.x),
          y: round3(hit.point.y),
          z: round3(hit.point.z),
        },
        normal: {
          x: round3(hit.normal.x),
          y: round3(hit.normal.y),
          z: round3(hit.normal.z),
        },
      });
    }
    ring.place(hit.point, hit.normal, untrack(brush).width / 2);
  };

  /**
   * Where the handles stand this frame, or nowhere.
   *
   * **Placed inside the render loop rather than in an effect**, because they depend on the
   * camera's distance as well as on the part, and the camera is not a signal — it changes
   * under a finger, with nothing observable to hang an effect off. An effect would place
   * them when the part changed and leave them the size they were when the view was last
   * orbited, which is a handle that shrinks as you zoom out and never catches up.
   */
  const standHandles = (): void => {
    const controller = orbit;
    const arrows = handles;
    const rings = turns;
    const part = untrack(selected);
    if (controller === undefined || arrows === undefined || rings === undefined)
      return;

    const current = untrack(tool);
    const radius = controller.state().radius;
    // **One set stands at a time**, because they occupy the same place and a person is
    // holding one tool. Both are placed even when hidden, so a tool switch shows handles
    // already the right size rather than growing from wherever the camera last was.
    arrows.setVisible(current === "move" && part !== undefined);
    rings.setVisible(current === "rotate" && part !== undefined);
    if (part !== undefined) {
      arrows.place(part.origin, radius);
      rings.place(part.origin, radius);
    }
  };

  /**
   * Marks the selected part, or clears the mark, this frame.
   *
   * **Read through `untrack`, like the handles**, because this runs inside the render loop
   * where a tracked read is a warning rather than a dependency. Updating every frame rather
   * than from an effect is the same choice as `standHandles`, and for a related reason: the
   * selection can change from a tap, from the list, from an undo and from a file, and a
   * per-frame read needs none of those to remember to tell it.
   */
  const standSelection = (): void => {
    const box = selection;
    if (box === undefined) return;
    const part = untrack(selected);
    if (part === undefined) box.hide();
    else box.show(part);
  };

  /**
   * The pointer's position on the canvas, in CSS pixels from its top left.
   *
   * **CSS pixels rather than device pixels**, and both ends of the comparison are: the
   * projection is given the canvas's CSS size, so a threshold written in pixels is the same
   * physical size on every display rather than half the size of the drawn buffer's.
   */
  const pointerOnCanvas = (event: PointerEvent): ScreenPoint => {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  /**
   * Paints a stroke, or leaves the press to the camera.
   *
   * **The atlas is written per move and the model is not touched at all until the finger
   * lifts.** A stroke is dozens of pointer events and is one undo entry; the rebuild it would
   * otherwise cause is forty times too often, and re-meshing a figure mid-stroke to show paint
   * that is already in a texture would be an argument for painting in a 2D view instead.
   *
   * **The ray goes at the reference mesh, not the one on screen** — see `brushHit`. The texture
   * coordinates belong to the reference, and a stroke placed from a hit on the display mesh
   * would be reading coordinates off a triangle that has none.
   */
  const grabPaint = async (
    initial: PointerEvent & { currentTarget: HTMLElement },
  ): Promise<void> => {
    try {
      await paintStroke(initial);
    } catch (reason) {
      // **Said out loud rather than swallowed.** `grabPaint` is called with `void`, so an
      // exception here is an unhandled rejection and the app looks inert: no stroke, no ring,
      // no error. A paint tool that fails silently is the worst failure a paint tool has.
      setFileNotice(
        reason instanceof Error
          ? `painting failed: ${reason.message}`
          : "painting failed",
      );
    }
  };

  let strokeMisses = 0;

  const paintStroke = async (
    initial: PointerEvent & { currentTarget: HTMLElement },
  ): Promise<void> => {
    const controller = orbit;
    const eye = camera;
    const ring = cursor;
    const parts = untrack(store.parts);
    const surface = brushSurface();
    if (
      controller === undefined ||
      eye === undefined ||
      ring === undefined ||
      untrack(tool) !== "paint" ||
      surface === undefined ||
      parts.length === 0 ||
      dragging
    ) {
      return;
    }

    const field = ensureField(parts);
    if (field === undefined) {
      report({ what: "no-field" });
      return;
    }
    // **Taken once, at the start of the drag, and not read again.** A drag's brush settings
    // cannot change under it — the panel is not reachable while a finger is down — so reading a
    // signal per pointer move would be sixty graph reads a second for a value that cannot differ.
    const held = untrack(brush);
    report({
      what: "stroke-start",
      radius: held.width / 2,
      parts: parts.length,
    });
    const { localise, place } = partTransforms(parts);
    const recorder = new PaintBrush(
      paintJournal,
      field,
      // **Half the panel's width, because the panel says "across" and a radius is what a disc
      // is.** The atlas recorder did the same division, in `StrokeRecorder`.
      {
        radius: held.width / 2,
        hardness: held.hardness,
        colour: held.colour,
      },
      localise,
      place,
    );

    dragging = true;
    controller.setInteractive(false);

    const rect = canvas.getBoundingClientRect();
    const size = { width: rect.width, height: rect.height };

    let ended: PointerDrag<HTMLElement> | undefined;
    try {
      ended = await pointer(initial, ({ event }) => {
        const at = pointerOnCanvas(event);
        lastPointer = at;
        const hit = fieldHit(surface, eye, size, at);
        if (hit === undefined || hit.part < 0) {
          if (strokeMisses < 3) {
            strokeMisses += 1;
            const ndc = toNdc(at.x, at.y, size.width, size.height);
            const ray = rayThroughScreen(eye, ndc.x, ndc.y);
            report({
              what: "hit-miss",
              part: hit?.part ?? -1,
              pointer: at,
              size,
              eye: { x: eye.position.x, y: eye.position.y, z: eye.position.z },
              origin: { x: ray.origin.x, y: ray.origin.y, z: ray.origin.z },
              direction: {
                x: ray.direction.x,
                y: ray.direction.y,
                z: ray.direction.z,
              },
              eyeAtHit: hit === undefined ? undefined : round3(hit.point.y),
            });
          }
          return;
        }
        if (strokeMisses === -1)
          report({ what: "hit", point: hit.point, part: hit.part });
        recorder.moveTo(hit);
      });
    } finally {
      ring?.hide();
      controller.setInteractive(true);
      dragging = false;
    }

    /**
     * **A press that painted nothing was a tap, and a tap means "select this".**
     *
     * The same argument as the atlas path had: the paint tool takes every press, so without
     * this a click on a part would select nothing and draw nothing, and a tool that makes it
     * impossible to choose a part is a wall rather than a tool.
     */
    // **No rasterise here, and none is needed.** `moveTo` has been writing each dab into the
    // field as it was made, so by the time the finger lifts the picture on screen is already the
    // painting. All that is left is to close the stroke so the drag is one undo step.
    const painted = recorder.finish();
    setDabCount(paintJournal.count);
    report({
      what: "stroke-end",
      dabs: painted.dabs,
      live: painted.live,
      total: paintJournal.count,
      bricks: field.brickCount,
      dirtySinceSync: field.dirtySinceSync,
    });
    if (painted.dabs === 0) {
      if (ended !== undefined && tapOnly(ended)) pickAt(initial);
      return;
    }

    /**
     * **One history entry, and its inverse is a re-rasterise rather than a restore.**
     *
     * There are no bytes underneath a dab to put back — a dab is a parameter, not a delta — so
     * the atlas's rectangle-of-before-bytes has nothing to snapshot. Truncating the journal and
     * rasterising what is left is the exact inverse, and it is bounded by the journal rather
     * than by the size of the picture, which for a stroke on a small model is a few hundred
     * bytes rather than a few hundred kilobytes.
     */
    let taken: RemovedDabs | undefined;
    pictureChanged();
    store.record({
      label: "Paint",
      // **Redo replays the dabs the undo took back**, which is the thing the person did.
      // `taken` is written by `invert` and read here, which is the store's own command/inverse
      // contract (`model-store.ts:32-42`): undo calls `invert`, redo calls `apply`, and undo
      // always comes first.
      apply: () => {
        if (taken !== undefined) paintJournal.redoStroke(taken);
        rasteriseJournal();
        setDabCount(paintJournal.count);
        pictureChanged();
      },
      invert: () => {
        taken = paintJournal.undoStroke();
        rasteriseJournal();
        setDabCount(paintJournal.count);
        pictureChanged();
      },
    });
    // **No rasterise here, because `finish` already did it.** An earlier version called
    // `rasteriseJournal` as well, which meant every stroke rasterised the whole journal twice —
    // and since a rasterise is O(journal), that made a session quadratic in its own history for
    // no benefit at all. `finish` writes the field and the writes mark it dirty.
  };

  /**
   * Takes hold of an arrow, or leaves the press to the camera.
   *
   * **The whole model is left alone until the finger lifts.** The part stays where it is and
   * a copy follows the pointer; the store is written once, on pointer-up, which is what
   * makes the drag one undo entry and one rebuild rather than one per frame.
   */
  const grabHandle = async (
    initial: PointerEvent & { currentTarget: HTMLElement },
  ): Promise<void> => {
    const controller = orbit;
    const arrows = handles;
    const copy = ghost;
    const eye = camera;
    const part = untrack(selected);
    if (
      controller === undefined ||
      arrows === undefined ||
      copy === undefined ||
      eye === undefined ||
      untrack(tool) !== "move" ||
      part === undefined ||
      dragging
    ) {
      return;
    }

    // Placed and measured now rather than read off the last frame, so a grab reads the same
    // picture the finger is looking at even if the camera has moved since the last frame.
    arrows.place(part.origin, controller.state().radius);
    const rect = canvas.getBoundingClientRect();
    const arms = arrows.armsOnScreen(eye, {
      width: rect.width,
      height: rect.height,
    });
    const axis = armUnderPointer(pointerOnCanvas(initial), arms);
    if (axis === undefined) return;

    dragging = true;
    controller.setInteractive(false);
    arrows.setHeld(axis);

    // **The primitive on its own, in its own frame, built once.** See `primitivePartMesh`: a
    // move changes where a part is and never what it is shaped like, so every frame after the
    // first would produce identical vertices. The part's own turn is carried on the ghost
    // object rather than meshed in, which is what lets the rotate tool turn the same ghost by
    // writing a quaternion instead of meshing again. See `createGhost`.
    copy.show(
      primitivePartMesh({ ...part, orientation: IDENTITY }, DEFAULT_BUDGET)
        ?.mesh,
      part.origin,
      part.orientation,
    );

    const start = part.origin;
    const arm = arms.find((candidate) => candidate.axis === axis);
    let moved = start;

    try {
      await pointer(initial, ({ totalDelta }) => {
        if (arm === undefined) return;
        // **The distance is read off the arrow's own screen length**, so it is a fraction of
        // the arrow rather than an independent scale — and it is recomputed from the grab
        // every time rather than accumulated, so a drag that returns to its start returns
        // the part to its start.
        const along = distanceDragged(totalDelta, arm, arrows.armLength());
        const direction = unitAlong(axis);
        moved = {
          x: start.x + direction.x * along,
          y: start.y + direction.y * along,
          z: start.z + direction.z * along,
        };
        copy.moveTo(moved);
        // **The arrows follow the copy**, so the handle under the finger is the handle the
        // finger is on.
        arrows.place(moved, controller.state().radius);
      });
    } finally {
      arrows.setHeld(undefined);
      copy.hide();
      controller.setInteractive(true);
      dragging = false;
    }

    // **One write, on the way out.** Everything above was a proposal.
    if (moved.x !== start.x || moved.y !== start.y || moved.z !== start.z) {
      store.transform(part.id, { origin: moved });
    }
  };

  /**
   * Takes hold of a ring, or leaves the press to the camera.
   *
   * **The same shape as `grabHandle`, and deliberately so**: the model is left alone until the
   * finger lifts, a copy follows the pointer, and the store is written once on pointer-up. The
   * one difference is that a turn is read from the pointer's bearing about the ring's middle
   * every frame rather than from its travel along a line, which is why this watches the
   * event's position rather than its `totalDelta`.
   */
  const grabRing = async (
    initial: PointerEvent & { currentTarget: HTMLElement },
  ): Promise<void> => {
    const controller = orbit;
    const rings = turns;
    const copy = ghost;
    const eye = camera;
    const part = untrack(selected);
    if (
      controller === undefined ||
      rings === undefined ||
      copy === undefined ||
      eye === undefined ||
      untrack(tool) !== "rotate" ||
      part === undefined ||
      dragging
    ) {
      return;
    }

    // Placed and measured now rather than read off the last frame, so a grab reads the same
    // picture the finger is looking at even if the camera has moved since the last frame.
    rings.place(part.origin, controller.state().radius);
    const rect = canvas.getBoundingClientRect();
    const onScreen = rings.ringsOnScreen(eye, {
      width: rect.width,
      height: rect.height,
    });
    const axis = ringUnderPointer(pointerOnCanvas(initial), onScreen);
    if (axis === undefined) return;
    const ring = onScreen.find((candidate) => candidate.axis === axis);
    if (ring === undefined) return;

    dragging = true;
    controller.setInteractive(false);
    rings.setHeld(axis);

    // **The primitive in its own frame**, so the turn is a quaternion on the ghost rather than
    // a re-mesh. See `createGhost` and the note in `grabHandle`.
    copy.show(
      primitivePartMesh({ ...part, orientation: IDENTITY }, DEFAULT_BUDGET)
        ?.mesh,
      part.origin,
      part.orientation,
    );

    const start = part.orientation;
    const from = pointerOnCanvas(initial);
    // **The ring lies along one of the model's axes**, so the turn is about that world axis —
    // which is `swept` applied before whatever the part already had. See `multiply`.
    const direction = unitAlong(axis);
    let turned = start;

    try {
      await pointer(initial, ({ event }) => {
        const now = pointerOnCanvas(event);
        // **Absolute rather than accumulated**: the angle is read from where the finger took
        // hold every time, so a drag that returns to its start returns the part to its turn.
        const swept = axisAngle(
          direction.x,
          direction.y,
          direction.z,
          radiansDragged(from, now, ring),
        );
        turned = multiply(swept, start);
        copy.turnTo(turned);
      });
    } finally {
      rings.setHeld(undefined);
      copy.hide();
      controller.setInteractive(true);
      dragging = false;
    }

    // **One write, on the way out.** The store refuses the edit when nothing turned, so a tap
    // that did not sweep a ring records no history entry. See `ModelStore.transform`.
    store.transform(part.id, { orientation: turned });
  };

  /**
   * Takes a tap on a part as a selection, or leaves a drag to the camera.
   *
   * **Follows the whole press and decides on the way out, because the camera is watching
   * too.** The select tool's drag turns the view — that is what the tool's own hint says —
   * and the camera and this want the same press, so the two are told apart by whether the
   * finger stayed put. A press that never moved is a tap and picks; anything that moved
   * further than `TAP_SLOP` was a person turning the model and picks nothing.
   *
   * **A tap on empty space clears the selection**, which is what deselecting is everywhere
   * else and what lets a person put the transform panel away. `select` already refuses an id
   * that is not there, so the only two outcomes are a part and nothing.
   */
  const tapSelect = async (
    initial: PointerEvent & { currentTarget: HTMLElement },
  ): Promise<void> => {
    if (untrack(tool) !== "select") return;

    // **A second finger is a pinch, not a tap.** The camera zooms with two fingers, and
    // without this a pinch that barely travelled would select whatever one fingertip landed
    // on. The count is the pointer package's own, which is where the drags it is following
    // are registered.
    if (getPointerSize(canvas) > 0) return;

    const ended = await pointer(initial);
    if (tapOnly(ended)) pickAt(initial);
  };

  /**
   * Whether a press ended was a tap rather than a drag.
   *
   * **The same test for the select tool and the paint tool**, and it has to be: both are
   * competing with the camera for the same press, so both need the same answer to "was that
   * somebody aiming, or somebody turning the model", and two thresholds that happened to be
   * equal today would drift apart by accident.
   */
  const tapOnly = (ended: PointerDrag<HTMLElement>): boolean => {
    // **A finger that lifted while another was still down was part of a gesture**, however
    // little that finger itself moved.
    if (ended.pointers.size > 0) return false;
    return Math.hypot(ended.totalDelta.x, ended.totalDelta.y) <= TAP_SLOP;
  };

  /**
   * Selects whatever is under a press, or nothing.
   *
   * **Separate from the press-following, because the press has already been followed by then.**
   * The select tool follows it and decides; the paint tool follows it too and decides, and
   * arrives here having painted nothing. Sharing this is what stops the two tools disagreeing
   * about what is under the pointer.
   */
  const pickAt = (event: PointerEvent): void => {
    const eye = camera;
    if (eye === undefined) return;

    const rect = canvas.getBoundingClientRect();
    const part = pickPartAt(
      store.parts(),
      eye,
      { width: rect.width, height: rect.height },
      pointerOnCanvas(event),
    );
    store.select(part?.id);
  };

  /**
   * A number somebody typed, or nothing.
   *
   * **A blank or unparseable field is `undefined` rather than a default**, because the export
   * button's whole question is whether the numbers in this form are a model somebody asked for.
   * Substituting a default would silently print at a height nobody chose, which is the one
   * outcome a size field exists to prevent.
   */
  const numberIn = (text: string, minimum: number): number | undefined => {
    const value = Number.parseFloat(text);
    return Number.isFinite(value) && value >= minimum ? value : undefined;
  };

  /**
   * Runs a file operation, putting its refusal where it can be read.
   *
   * **One place that reports, because every operation here refuses with a sentence that names
   * what is wrong** — `readProject`'s reasons and the print gate's are the same kind of thing,
   * and a caller that summarised them would throw away the only line a person can act on.
   *
   * @param notice Where to put a refusal: this popover's or that one's.
   */
  const attempt = async (
    notice: (message: string | undefined) => void,
    /** Put in the status line on success, or `undefined` to leave the mesh readout alone. */
    done: string | undefined,
    action: () => Promise<void>,
  ): Promise<void> => {
    notice(undefined);
    setBusy(true);
    try {
      await action();
    } catch (reason) {
      notice(reason instanceof Error ? reason.message : String(reason));
    } finally {
      // **In a `finally`, because a refusal must not leave the actions disabled.** Every button
      // in the panel reads `busy`, and the most likely thing to be refused is an open — which is
      // exactly the moment the buttons most need to be live again.
      setBusy(false);
    }
    if (done !== undefined) setStatus(done);
  };

  /** Puts a model, a palette and a view into the store as one undoable step. */
  const loadInto = (
    project: {
      parts: readonly Part[];
      palette: readonly { r: number; g: number; b: number; a: number }[];
      view: { mode: MeshMode; resolution: number };
      // **Declared structurally, like the three above**, so this module keeps naming no type
      // from `./file/project` — which is behind a dynamic import on purpose, because it pulls in
      // a zip library that nothing on the first frame needs.
      texture?: {
        picture: PaintSurface;
        reference: ReferenceFile;
        blend: number;
      };
      // **The journal, declared structurally like the three above**, for the same reason: this
      // module keeps naming no type from `./file/project`. Six arrays and two counts rather than
      // a `PaintJournal`, because what a file holds is decoded bytes and not a journal — the
      // journal is made from them on the other side.
      paint?: {
        dabs: number;
        strokes: readonly number[];
        centre: Float32Array;
        normal: Float32Array;
        radius: Float32Array;
        hardness: Float32Array;
        colour: Uint8Array;
        part: Uint32Array;
      };
    },
    label: string,
  ): boolean => {
    // **The view settings come back too**, because the mesher is the one control here that
    // alters what the model *is* rather than how it is drawn — so a file that set the mesher
    // to cubes and was reopened at nets would be a model that quietly changed.
    setMode(project.view.mode as MeshMode);
    setResolution(project.view.resolution as (typeof RESOLUTIONS)[number]);
    // **The palette outside the history, deliberately.** A palette entry is not a fact about
    // the model's geometry, so rewinding it alongside would take a colour away from a model
    // that is still using it. See `createPalette`.
    palette.set(project.palette);
    const loaded = store.load(project.parts, label);

    // **The paint is reset before anything else happens to it.** A field is sized to a model's
    // bounds and a journal belongs to the document that made it, so opening a file into a
    // session that had paint on screen would otherwise leave the old painting on the new model
    // and the new painting drawn on the old field.
    resetPaint();

    // **Adopted synchronously, before the model is drawn, so the panel's dab count is right from
    // the first frame.** A journal is forty bytes a dab and adopting it is a copy; the
    // expensive half is the field, and that waits for the model like the texture does.
    if (project.paint !== undefined) {
      paintJournal.adopt(project.paint);
      setDabCount(paintJournal.count);
    }

    // **Not awaited, and the reasons are on `installTexture`.** The texture is restored after
    // the document rather than before it: the picture is attached to a model, and the model is
    // what has just changed.
    void (async (): Promise<void> => {
      const parts = untrack(store.parts);
      try {
        installTexture(
          parts,
          project.texture === undefined
            ? undefined
            : await loadTexture(
                parts,
                project.texture.reference,
                project.texture.picture,
              ),
        );
      } catch (reason) {
        setFileNotice(
          reason instanceof Error
            ? reason.message
            : "this file's texture could not be read",
        );
      }

      // **The field is built here, from the model that has just loaded, and not before** — a
      // field is sized to a model's bounds, so building it earlier would mean sizing it to the
      // model that was open before. And `ensureField` is the same call the first stroke makes,
      // because a loaded journal and a drawn one are in exactly the same position: truth in the
      // journal, nothing in the field.
      if (paintJournal.count === 0) return;
      const field = ensureField(parts);
      if (field === undefined) return;
      const { place } = partTransforms(parts);
      rasterise(paintJournal, field, place);
      field.markChanged();
      report({ what: "paint-restored", dabs: paintJournal.count });
    })();

    return loaded;
  };

  /**
   * Starts a document over, with the default model in it.
   *
   * **And throws the draft away**, which is the half that is easy to leave out. Without it a
   * person who starts over, closes the tab and comes back would be given the document they
   * discarded — and that is how an autosave becomes something people stop trusting.
   */
  const newDocument = (): void => {
    void clearDraft();
    setDraftAt(undefined);
    palette.set([]);
    // **Before the model is replaced, because `resetPaint` detaches the field from the material
    // that is currently on screen.** Doing it afterwards would leave the old field sampled by a
    // material that survives until the next rebuild, which is long enough for somebody to open a
    // file and see the previous document's paint on it.
    resetPaint();
    void installTexture(untrack(store.parts), undefined);
    setHome(NOWHERE);
    store.load(newModel(), "new model");
    setStatus("new model");
  };

  /** Writes the document to the browser's own store, as the debounced thing it is. */
  const draft = autosave(async () => {
    const blob = await writeBlob();
    await saveDraft(blob);
    setDraftAt(Date.now());
  });

  /** Opens the file somebody picks and loads it. */
  const openFromDisk = async (
    picker: HTMLInputElement | undefined,
  ): Promise<void> =>
    attempt(setFileNotice, "opened", async () => {
      // **No filter on this one, and that is the fix rather than an omission.** `.sdfmod` is
      // not a media type, so a dialog told to show `application/zip → .sdfmod` shows the zips
      // the device knows about and greys the model out — on a phone, Open opens a dialog with
      // nothing in it. `readProject` is the validation and says a sentence when the file is
      // wrong; see `chooseFileToRead` for the rest of it.
      const opened: OpenedFile | undefined = await chooseFileToRead(picker);
      // **A dismissed picker is not a failure and says nothing.** An input's promise only
      // resolves on `change`, so without the `cancel` listener a person who backs out would
      // leave this waiting for the rest of the session.
      if (opened === undefined) return;

      // **Imported here rather than at the top of the module.** `jszip` is a hundred kilobytes
      // and nothing on the first frame needs it, so opening a model costs opening a model and
      // not everybody's first paint.
      const { readProject } = await import("./file/project");
      const project = await readProject(opened.blob);

      if (!loadInto(project, `open ${opened.name}`)) {
        throw new Error(
          "this file holds parts or ids this application cannot use — see the parts limit",
        );
      }
      // **A file with no handle — an opened download — has no home**, which means the next Save
      // asks rather than downloading a second copy under a name the browser invented.
      setHome(
        opened.handle === undefined
          ? NOWHERE
          : {
              kind: "file",
              id: newEntryId(),
              handle: opened.handle,
              name: opened.name,
            },
      );
      if (opened.handle !== undefined) {
        await rememberFile(opened.handle, store.parts().length);
        await refreshRecent();
      }
      setFileNotice(undefined);
    });

  /** Opens a file this browser has opened before, asking for permission in the click. */
  const openRecent = async (file: RecentFile): Promise<void> =>
    attempt(setFileNotice, "opened", async () => {
      const blob = await readThrough(file.handle);
      // **One sentence for every reason it could not be read** — permission refused, the file
      // moved, the disk unplugged — because the caller does one thing about all of them and a
      // message naming which would be a niceness rather than a difference.
      if (blob === undefined) {
        throw new Error(
          `could not read ${file.name} — permission or the file is gone`,
        );
      }

      const { readProject } = await import("./file/project");
      const project = await readProject(blob);

      if (!loadInto(project, `open ${file.name}`)) {
        throw new Error(
          "this file holds parts or ids this application cannot use — see the parts limit",
        );
      }
      setHome({
        kind: "file",
        id: file.id,
        handle: file.handle,
        name: file.name,
      });
      setFileNotice(undefined);
      await refreshRecent();
    });

  /** Re-reads the list from storage, which is where it survives a reload. */
  const refreshRecent = async (): Promise<void> => {
    setRecent(await listRecentFiles());
  };

  /**
   * Writes the document where it came from, or asks where if that is not known.
   *
   * **One function rather than Save and Save as**, because the difference between them is
   * entirely whether the document has a home, and a caller that had to choose would be choosing
   * on the person's behalf.
   */
  const saveToDisk = async (): Promise<void> =>
    attempt(setFileNotice, "saved", async () => {
      const here = home();
      const writer = homeWriter(here);

      const target: WriteTarget | undefined =
        writer !== undefined && here.kind === "file"
          ? { name: here.name, handle: here.handle, write: writer }
          : await choosePlaceToWrite(
              PROJECT_CHOICE,
              here.kind === "file" ? here.name : DEFAULT_PROJECT_NAME,
            );

      // **Two different reasons the picker can be `undefined`, and they are told apart.**
      // On a browser with no such dialog it is "there is nowhere to write", where a download is
      // the only way to put a file anywhere. On a browser that has one it is "the person closed
      // it", where writing a file anyway would be the last thing they asked for — and the same
      // `undefined` for both is a download landing on every accidental Escape.
      if (target === undefined) {
        if (writer !== undefined || remembersFiles()) return;
        await writeDownload();
        return;
      }

      const blob = await writeBlob();
      await target.write(blob);

      // **The handle the picker handed back becomes the document's home**, which is the whole
      // reason for asking through the File System Access API at all: the next Save writes to the
      // same file rather than asking again, and the file joins the list under a name that is
      // there rather than one the browser guessed.
      setHome({
        kind: "file",
        id: newEntryId(),
        handle: target.handle,
        name: target.name,
      });
      await rememberFile(target.handle, store.parts().length);
      await refreshRecent();
      setFileNotice(undefined);
    });

  /**
   * The document as a project file.
   *
   * **The texture is offered only when there is one to offer, and when there is not the file is
   * exactly what it was before texturing existed** — same two entries, same manifest, no field.
   * That is the whole backwards compatibility promise, kept in one place where it is easy to
   * check.
   */
  const writeBlob = async (): Promise<Blob> => {
    const { writeProject } = await import("./file/project");
    const held = bake;
    const png = await atlasPng();

    return await writeProject(
      store.parts(),
      palette.colours(),
      { mode: mode(), resolution: resolution() },
      // **All three or none.** A picture without coordinates is a picture of nothing, and
      // coordinates without a picture are numbers nobody can see, so the condition is one
      // expression over both rather than two that could disagree.
      held === undefined || png === undefined
        ? undefined
        : {
            png,
            atlas: held.atlas,
            uvs: held.uvs,
            painted: held.reference,
            source: held.source,
            blend: untrack(blend),
          },
      // **The journal, last and separately.** Without it a painted model saved with no paint in
      // it at all: the field the shader samples is derived, nothing else in the file carried
      // the dabs, and `writeProject` had no parameter through which they could travel. It is
      // the whole of what was missing, and it is the first argument that is not about geometry.
      paintJournal,
    );
  };

  /** Offers the document as a download, which is all a browser without the API can do. */
  const writeDownload = async (): Promise<void> => {
    const blob = await writeBlob();
    const here = home();
    const name = here.kind === "file" ? here.name : DEFAULT_PROJECT_NAME;
    downloadBlob(blob, name);
    // **The name is remembered even for a download**, and the home stays `nowhere`. A download
    // gives back no handle, so a second Save should ask again rather than pretend to know where
    // the last one went — but it should not ask about a name either, and somebody who has just
    // saved twice wants the same file name both times.
    setHome(here);
  };

  /**
   * Meshes and encodes the model as a `.3mf`, and holds it until somebody says where it goes.
   *
   * **Nothing is written from here, and that is the whole reason this is a separate click from
   * `savePrintFile`.** The meshing runs in a worker for up to eleven seconds and
   * `showSaveFilePicker` refuses to open without a user gesture, which Chrome's five-second
   * activation window will have expired by the time a fine export is finished. Writing from
   * here is what produced _"Must be handling a user gesture to show a file picker"_; the file is
   * built instead and the second button offers it under the name it will be written as.
   */
  const buildPrint = async (): Promise<void> =>
    // **Nothing in the status line**, because the status line is the mesh readout and a print
    // that worked says something the mesh did not: a file is sitting here waiting to be saved.
    attempt(setFileNotice, undefined, async () => {
      const heightMm = numberIn(height(), 0.1);
      if (heightMm === undefined) {
        throw new Error("a printed model needs a height above the bed");
      }
      const maxColours = numberIn(filaments(), 1);
      if (maxColours === undefined || !Number.isInteger(maxColours)) {
        throw new Error("a printed model needs room for at least one colour");
      }
      // **Refused here rather than clamped, and the sentence carries both ends of the range.**
      // Somebody who has typed `0.01` wants a mesh four times finer than this export will go
      // to, and quietly writing a coarser file than they asked for is the failure this whole
      // path was arranged to avoid — so the number is taken or the export does not happen.
      const voxelSize = printVoxelSizeIn(printResolution());
      if (voxelSize === undefined) {
        throw new Error(
          `a print meshes between ${MIN_PRINT_VOXEL_SIZE} and ${DEFAULT_PRINT_VOXEL_SIZE} world units a voxel`,
        );
      }

      const { exportThreeMf } = await import("./print/export-model");
      // **Cleared in a `finally`, so a worker that dies leaves no bar behind.** The bar is the
      // only thing standing between an eleven-second wait and a page that looks finished, and a
      // bar left up after a failed export is worse than no bar.
      let blob: Blob;
      try {
        blob = await exportThreeMf(store.parts(), {
          heightMm,
          maxColours,
          voxelSize,
          onProgress: setPrintProgress,
        });
      } finally {
        setPrintProgress(undefined);
      }

      setPrintFile({ blob, name: `${stemOf()}.3mf` });
    });

  /**
   * Writes the built `.3mf` where the second click says.
   *
   * **A fresh gesture, and the only thing in the export path that is.** `attempt` calls its
   * action synchronously, so `choosePlaceToWrite` is reached in the same task as the click and
   * the activation that pressed this button is the one that opens the dialog. `buildPrint` has
   * no such luck, which is the whole reason the two are apart.
   */
  const savePrintFile = async (): Promise<void> =>
    attempt(setFileNotice, undefined, async () => {
      const built = printFile();
      if (built === undefined) return;

      const target = await choosePlaceToWrite(THREE_MF_CHOICE, built.name);
      // **A download only where the browser has no dialog at all.** A dismissed dialog is
      // silence, not consent — and treating the two alike is how a print ends up on a disk
      // somebody did not ask for it to reach.
      if (target === undefined) {
        if (remembersFiles()) return;
        downloadBlob(built.blob, built.name);
        return;
      }
      await target.write(built.blob);
      // **Only once the bytes are down**, so a refusal — a full disk, a cancelled dialog —
      // leaves the file here to try again rather than throwing away eleven seconds of meshing.
      setPrintFile(undefined);
    });

  /**
   * A name for the print, taken from the document's.
   *
   * **The stem without its extension**, so a print of `duck.sdfmod` is `duck.3mf` rather than
   * `duck.sdfmod.3mf` — which is what every other tool on the machine would produce and what a
   * person who has five of these in a folder would expect.
   */
  const stemOf = (): string => {
    const here = home();
    const name = here.kind === "file" ? here.name : DEFAULT_PROJECT_NAME;
    const dot = name.lastIndexOf(".");
    return dot > 0 ? name.slice(0, dot) : name;
  };

  // **Two functions, because Solid 2's `createEffect` takes a compute and an effect.**
  // The single-function form is Solid 1 and throws `MISSING_EFFECT_FN` at runtime while
  // type-checking perfectly, because the type is a pair of optional-looking arguments.
  //
  // Splitting them is also the clearer shape here: the first says *what to watch* and the
  // second says *what to do about it*. Under Solid 1's form both were in one closure, and
  // the dependency was invisible — a reader could not tell that reading `store.parts()`
  // and discarding the result was the entire mechanism.
  createEffect(
    () => store.parts(),
    (parts) => rebuild(parts),
  );

  /*
   * **The mesher and the resolution watch their own effects, because both change the mesh and
   * neither changes the model.**
   *
   * A model is a list of parts, so `store.parts()` is the only thing a rebuild used to depend on and
   * turning a mode on was not a model edit — there was nothing for that effect to fire on. Reading
   * the parts again here is the point rather than an accident: the rebuild needs the list, and the
   * list has to come from a tracked read.
   *
   * They are two effects rather than one watching both, because `rebuild` debounces by ninety
   * milliseconds and one effect over two signals would re-arm the timer whenever either moved —
   * including when they moved together, which is not a thing a person does.
   */
  createEffect(
    () => mode(),
    () => rebuild(store.parts()),
  );
  createEffect(
    () => resolution(),
    () => rebuild(store.parts()),
  );

  // **Solid 2 replaced `onMount` with `onSettled`**, which fires once after the current
  // activity settles rather than on mount, and which does *not* return a disposal: the
  // callback returns the teardown itself. `onCleanup` *inside* one is a dev-mode error
  // that halts the reactive system, so the two halves of the lifecycle live in this one
  // block and the block's last statement is its own undo.
  /**
   * Restores whatever this browser was holding, once there is a scene to put it in.
   *
   * **Silently, and that is a decision.** Every editor worth using does it — a reload giving you
   * an empty canvas after you had just built something is how an autosave becomes something
   * people turn off. The cost is a person who wanted a new document and reloaded instead of
   * pressing New, and New is one tap further away than reloading is.
   *
   * **Restored through the same reader as a file**, on the same bytes, so a draft cannot be a
   * different shape from a `.sdfmod` and cannot be a version this build does not read. A draft
   * this build refuses is cleared rather than left to be refused again on every reload.
   *
   * **The home stays `nowhere`**, because the bytes came from this browser's database and not
   * from a file — so the first Save after a restore asks where the document goes, rather than
   * quietly claiming it can write the draft slot back.
   */
  const restoreDraft = async (): Promise<void> => {
    const held = await readDraft();
    if (held === undefined || held === null) return;

    try {
      const { readProject } = await import("./file/project");
      const project = await readProject(held.blob);
      if (!loadInto(project, "restore")) return;
      setDraftAt(held.at === 0 ? Date.now() : held.at);
      setStatus("restored from this browser");
    } catch (reason) {
      /**
       * **Said out loud, and the draft kept.**
       *
       * This used to clear the draft and say nothing, on the reasoning that a draft this
       * build cannot read will fail the same way every reload and a person cannot act on a
       * message about bytes they never asked to save. Both halves are wrong in the same
       * direction: **a draft is the only copy of somebody's unsaved work, and deleting it on a
       * failure — silent or loud — destroys that work to tidy up an error.**
       *
       * Worse, it is the kind of failure that looks like success. Without a message, a draft
       * that stopped opening looks exactly like a draft that was never there: the modeller
       * comes up with its default model, framed around the default model, and there is nothing
       * on screen to say that anything was lost. That is the worst shape a failure can have —
       * the user is looking at a document and is not looking at the one they had.
       *
       * **So the reason is reported and the bytes stay.** A repeated failure is the cheaper
       * problem, and it is visible, which a deleted draft never is.
       */
      setFileNotice(
        reason instanceof Error
          ? `this browser's draft could not be reopened — ${reason.message}. It has been kept.`
          : "this browser's draft could not be reopened. It has been kept.",
      );
    }
  };

  onSettled(() => {
    const viewport = createViewport(canvas);
    // **The model and the handles are siblings, and the handles come second.** The renderer
    // draws in scene-graph order, so the handles have to be the last thing added or the model
    // — which is re-added on every rebuild — would be drawn over them. The model's own group
    // is added first, so a rebuild can only reorder children inside it.
    const content = new Group();
    viewport.scene.add(content);
    const created = createModelView(content);
    const controller = createOrbit(viewport.camera);
    // **Between the model and the handles.** The box draws over the surface it marks, and the
    // handles — which switch the depth test off and must stay reachable — are added after it
    // and so draw over the box. See `createSelectionBox`.
    const madeSelection = createSelectionBox(viewport.scene);
    const madeHandles = createMoveHandles(viewport.scene);
    const madeRotate = createRotateHandles(viewport.scene);
    const madeGhost = createGhost(content);
    // **After the handles**, because the cursor switches the depth test off and has to be seen
    // through the model; the renderer draws in scene-graph order, so anything after it would
    // paint over the ring.
    const madeCursor = createPaintCursor(viewport.scene);
    cursor = madeCursor;
    view = created;
    orbit = controller;
    handles = madeHandles;
    turns = madeRotate;
    ghost = madeGhost;
    selection = madeSelection;
    camera = viewport.camera;

    /**
     * Takes a drag off the camera, or leaves it to the camera.
     *
     * **Attached before `controller.attach`, so that it is the first listener to see a
     * pointer-down.** The order matters: the camera's own handler takes the pointer capture
     * the moment it sees a press, and once it has, a handle drag cannot have it. So the
     * question of which of the two wants this press has to be settled first, and the only
     * way to settle it is to be first.
     */
    const onPointerDown = (event: PointerEvent): void => {
      const held = untrack(tool);
      if (held === "move") {
        void grabHandle(event as PointerEvent & { currentTarget: HTMLElement });
      } else if (held === "rotate") {
        void grabRing(event as PointerEvent & { currentTarget: HTMLElement });
      } else if (held === "paint" && store.parts().length > 0) {
        // The paint tool, and there is a model to paint on. The camera still gets the
        // press, so a drag on empty space turns the view and a drag on the model paints; see
        // `grabPaint`. A press that paints nothing falls through to a pick — see there.
        //
        // **The condition is a model, not a bake.** It used to ask whether an atlas existed,
        // which was right when painting onto one and is wrong now: the field is made on the
        // first stroke, so there is never an atlas to wait for and the test was always false on
        // a fresh document — which sent every press to the select tool, and the select tool's
        // press orbits the camera. The symptom was "the brush turns the view".
        void grabPaint(event as PointerEvent & { currentTarget: HTMLElement });
      } else {
        /**
         * **The select tool — and also the paint tool on an empty document.**
         *
         * A press has exactly one owner, so whichever tool claims it decides what a click means
         * everywhere: whether it selects, and therefore whether the selection box appears at
         * all. Handing every press to the paint tool therefore took selection away with it, and
         * picking something else to drag a slider is a small price for not being able to select
         * anything.
         *
         * **An empty model is the condition rather than the tool**, because "there is nothing to
         * paint on" is the case where the paint tool cannot do its job, and a press during it is
         * a person who has changed their mind and wants to select something instead.
         */
        // The select tool. The camera still gets the press and may turn the view; a press
        // that does not move is the tap that picks. See `tapSelect`.
        void tapSelect(event as PointerEvent & { currentTarget: HTMLElement });
      }
    };
    canvas.addEventListener("pointerdown", onPointerDown);

    // **Every move, not only during a drag,** so the ring follows a pointer that is merely
    // hovering over the model. `passive` because nothing here prevents a default.
    const onPointerMove = (event: PointerEvent): void => {
      lastPointer = pointerOnCanvas(event);
    };
    canvas.addEventListener("pointermove", onPointerMove);

    const detach = controller.attach(canvas);
    viewport.renderer.setAnimationLoop(() => {
      standHandles();
      standSelection();
      standCursor();
      // **The atlas is pushed to the GPU here, before the render, and not after a stamp.**
      //
      // A stroke writes texels; the texture the shader samples is a GPU copy of those texels,
      // and nothing in this application updates that copy on its own. So without this line the
      // paint accumulates correctly on the CPU and becomes visible only at the next install —
      // which reads as "the brush does not work" and is the single most confusing failure this
      // feature could have.
      //
      // **Once per frame, here, and nowhere else**, because rmsl re-uploads the whole atlas on
      // `needsUpdate` and a drag is dozens of stamps. `PaintSurface.dirty` clears itself when
      // read, so this is also what keeps a quiet model from re-uploading forever.
      // **Both sources, every frame, and neither gated on the other.** A field exists before
      // any atlas does — in fact the field *is* the paint now and the atlas is the thing being
      // retired — so a `sync` that skipped when `bake` was undefined would mean paint that
      // accumulates on the CPU and never reaches the screen.
      created.sync(bake?.surface, paintField());
      viewport.render();
    });

    // The first mesh, now that there is a scene to put it in. The effect above may have
    // run before this and found nothing to do.
    //
    // **Read through `untrack`, because this is outside the effect that tracks the parts.**
    rebuild(untrack(() => store.parts()));

    // **After the first mesh, and not before.** Restoring writes to the store, which arms the
    // rebuild effect — so restoring first would mesh the default model and then mesh the
    // restored one, and on a phone that is a second of nothing on screen. Restoring after also
    // means the first thing anybody sees is their model rather than the placeholder.
    //
    // **Awaits nothing.** A draft that takes a moment to arrive should not hold up the scene,
    // and the rebuild effect will pick it up when it lands.
    void Promise.all([restoreDraft(), refreshRecent()]);

    return () => {
      if (pending !== undefined) clearTimeout(pending);
      draft.dispose();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      madeCursor.dispose();
      detach();
      madeHandles.dispose();
      madeRotate.dispose();
      madeGhost.dispose();
      madeSelection.dispose();
      created.dispose();
      viewport.dispose();
      // Cleared, so a rebuild arriving after teardown cannot reach a disposed renderer.
      view = undefined;
      orbit = undefined;
      handles = undefined;
      turns = undefined;
      ghost = undefined;
      selection = undefined;
      camera = undefined;
    };
  });

  const selected = createMemo(() => {
    const id = store.selected();
    return id === undefined ? undefined : store.part(id);
  });

  /**
   * Whether the selected part's own axes mean anything to rotate.
   *
   * **So the Rotate tool is disabled for a round shape**, which is the same claim the
   * transform panel makes by hiding its rotation fields for one: turning a sphere is not an
   * error, but it is a tool that does nothing, and a tool that does nothing teaches a person
   * it is broken. Both read the one `isAxial`, so the two cannot come to disagree.
   */
  const rotatable = createMemo(() => {
    const part = selected();
    return part !== undefined && isAxial(part.shape.type);
  });

  return (
    <div class={styles.root}>
      <canvas ref={canvas} class={styles.canvas} />

      <header class={styles.header}>
        <h1 class={styles.title}>sdf-modeller</h1>
        {/*
         * **The readout carries its own full text in a `title`.** It is the longest string in
         * the shell and it is one line with an ellipsis, because a second line would push the
         * header's bottom edge down through the tool row — see `.status` in
         * `app.module.css`, and the chain it is measured against. A `title` is what keeps the
         * tail of the sentence reachable on a screen too narrow to show it.
         */}
        <p class={styles.status} title={status()}>
          {status()}
        </p>
      </header>

      {/*
       **Named tools, as a radio group, because they are one choice with several answers.**
       *
       * Buttons that each toggled something would leave the question of which tool is
       * current to be answered by which button looks pressed — and "looks pressed" is not an
       * answer a screen reader gives you either. `radiogroup` says out loud that exactly one
       * of these is in effect, which is the truth, and `aria-checked` carries it to assistive
       * technology the same way the appearance does.
       *
       * **Move and Rotate are disabled when there is nothing for them to act on** — move with
       * no selection, rotate with no selection or with a round shape whose turn would change
       * nothing. Rather than arming a tool that would refuse every press, which teaches the
       * button is broken, it says so.
       */}
      <div class={styles.tools} role="radiogroup" aria-label="Tool">
        {(
          [
            [
              "select",
              "Select",
              "Pick parts. Drag the canvas to turn the view.",
            ],
            [
              "move",
              "Move",
              "Arrow handles on the selected part. Drag one to move it.",
            ],
            [
              "rotate",
              "Rotate",
              "Rings around the selected part. Drag one to turn it.",
            ],
            ["paint", "Paint", paintHint()],
          ] as const
        ).map(([value, label, hint]) => (
          <button
            type="button"
            role="radio"
            class={styles.tool}
            aria-checked={tool() === value ? "true" : "false"}
            aria-busy={
              value === "paint" && baking() !== undefined ? "true" : undefined
            }
            title={hint}
            disabled={
              (value === "move" && selected() === undefined) ||
              (value === "rotate" && !rotatable()) ||
              // **Disabled only for a model with nothing in it**, and never while a bake is
              // running: the tool is where the progress is reported, so locking it would take the
              // place a person is looking away from.
              (value === "paint" && store.parts().length === 0)
            }
            onClick={() => {
              setTool(value);
              // **Choosing the tool no longer starts anything.** A field has no unwrap to run:
              // it is a fixed world-space grid with no per-vertex coordinates, so picking up the
              // brush costs nothing and the first stroke makes the field. The old path unwrapped
              // here, which took between a second and a minute depending on the model, and every
              // one of those seconds was paid before a single mark was made.
            }}
          >
            {value === "paint" && baking() !== undefined ? "Painting" : label}
          </button>
        ))}
      </div>

      {/*
        **The mesher chooser and the resolution, on their own row, for the same reason the tools
        are a radio group: one choice with several answers.**

        The mesher is a genuine choice rather than a quality slider, because the two produce
        different meshes from the same field — one is closed throughout and the other is not
        everywhere — so there is no ordering to slide along. What the resolution *is* a slider of is
        work: each step doubles the samples on every axis, and the cost is cubic in the reciprocal.
      */}
      <div class={styles.render}>
        <div class={styles.mesher} role="radiogroup" aria-label="Mesher">
          {MESH_MODES.map((option) => (
            <button
              type="button"
              role="radio"
              class={styles.tool}
              aria-checked={mode() === option.value ? "true" : "false"}
              title={option.hint}
              onClick={() => {
                setMode(option.value);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>

        <label class={styles.resolution}>
          <span class={styles.resolutionLabel}>Resolution</span>
          {/*
            **The slider's position is an index into `RESOLUTIONS` and not a voxel size.** The
            sizes halve as the index rises, so a slider whose value were the size itself would run
            backwards — the coarse end on the right — and a person would learn that by dragging it
            and watching the model get worse.

            `aria-valuetext` because the bare number a range reports is an index, and "2" is not a
            resolution. The text is what a screen reader says out loud, so it has to be the thing a
            person would have said.
          */}
          <input
            type="range"
            min={0}
            max={RESOLUTIONS.length - 1}
            step={1}
            value={RESOLUTIONS.indexOf(resolution())}
            aria-valuetext={`${resolution()} world units a voxel`}
            onInput={(event) => {
              const chosen = RESOLUTIONS[event.currentTarget.valueAsNumber];
              if (chosen !== undefined) setResolution(chosen);
            }}
          />
        </label>
      </div>

      {/*
        **The tab bar is only ever visible on a narrow screen** — a CSS rule, not a media
        query in the component, so that rotating a phone does not tear the tree down and
        rebuild it (ADR 0026's `Activity` exists for exactly that, and here the layout
        handles itself instead).

        `aria-selected` rather than a class, because it is the same attribute a screen
        reader asks about and the styling hangs off it rather than duplicating the state.

        **The chevron is a sibling of the `tablist` and not inside it.** A `role="tablist"` may
        contain only tabs, so a collapse button in it would be a button announced as a tab — the
        arrangement `voxelscape`'s sheet uses, and the reason the row is a container rather than
        the list itself.
      */}
      <div class={styles.tabs}>
        <div class={styles.tablist} role="tablist" aria-label="Panels">
          {(
            [
              [
                "parts",
                `Parts${store.parts().length > 0 ? ` (${store.parts().length})` : ""}`,
              ],
              ["shape", "Shape"],
              // **Its own tab rather than a section of Shape**, because a brush is not a part's
              // property: it belongs to the model's texture, and it stays meaningful with no
              // part selected, which is the only state Shape ever shows anything in.
              ["paint", "Paint"],
            ] as const
          ).map(([id, label]) => (
            <button
              type="button"
              role="tab"
              class={styles.tab}
              aria-selected={sheet() === id ? "true" : undefined}
              onClick={() => {
                // **Picking a tab opens a collapsed sheet**, so the tap that chooses a panel
                // is the tap that shows it rather than one that appears to do nothing.
                setSheet(id);
                setSheetOpen(true);
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          type="button"
          class={styles.chevron}
          aria-expanded={sheetOpen() ? "true" : "false"}
          aria-label={sheetOpen() ? "Collapse the panel" : "Expand the panel"}
          title={sheetOpen() ? "Collapse the panel" : "Expand the panel"}
          onClick={() => {
            setSheetOpen((open) => !open);
          }}
        >
          {sheetOpen() ? "▾" : "▴"}
        </button>
      </div>

      {/*
        **The right-hand column: the selected part above, the brush below.**
        *
        **A column rather than a third absolutely-positioned box, because the transform panel and
        the brush panel are both right-hand panels and two boxes given the same corner draw over
        each other** — nothing in CSS relates one absolute box to another, so the brush panel's
        size and softness sliders sat exactly on the shape's dimensions. The column relates them:
        each panel is given a share of the height and scrolls inside the share it was given, and
        no window size can put one on top of the other.
        *
        **The parts list is not in it,** because it is a different edge: it runs down the left of
        the window against the footer row, and it is the one panel worth having on screen while
        either of these two is being worked on.
        */}
      <div class={styles.column}>
        <Show when={selected()}>
          {(part) => (
            <div
              class={styles.sheet}
              data-hidden={sheet() !== "shape" || !sheetOpen() ? "" : undefined}
            >
              <TransformPanel part={part()} store={store} palette={palette} />
            </div>
          )}
        </Show>

        <div
          class={styles.sheet}
          data-hidden={sheet() !== "paint" || !sheetOpen() ? "" : undefined}
        >
          <BrushPanel
            brush={brush()}
            atlas={bake?.atlas}
            palette={palette}
            busy={untrack(baking) !== undefined}
            onWidth={(width) => {
              const held = brush();
              setBrush({ ...held, width });
            }}
            onHardness={(hardness) => {
              const held = brush();
              setBrush({ ...held, hardness });
            }}
            onColour={(colour) => {
              const held = brush();
              // **Deliberately does not `palette.remember`**, for the reason
              // `ui/palette.tsx:18-27` gives at length: the picker's `onColour` fires on every
              // pointer move, so one drag across the chart arrives as dozens of distinct
              // colours. Remembering them would fill the palette to its cap and push out the
              // colours the person had actually chosen. Keeping a colour is the add box's one
              // deliberate tap, which is what `PaletteRow`'s `onAdd` is for.
              setBrush({ ...held, colour });
            }}
            onClear={() => {
              // **Clear empties the journal and re-rasterises**, which is the same operation
              // undo and redo use. There is nothing else it could be: a field has no
              // independent picture to wipe, only dabs that produced it.
              if (paintJournal.count === 0 || paintField() === undefined)
                return;
              let taken: RemovedDabs | undefined;
              pictureChanged();
              store.record({
                label: "Clear paint",
                // **The other way round from the obvious reading, and this is why.** The clear has
                // *already happened* by the time this entry is recorded, so undo is `apply` and
                // redo is `invert`. The same inversion `StrokeRecorder`'s clear made, for the
                // same reason.
                apply: () => {
                  if (taken !== undefined) paintJournal.redoStroke(taken);
                  rasteriseJournal();
                  pictureChanged();
                },
                invert: () => {
                  taken = paintJournal.clearWithUndo();
                  rasteriseJournal();
                  pictureChanged();
                },
              });
              taken = paintJournal.clearWithUndo();
              rasteriseJournal();
              setDabCount(paintJournal.count);
            }}
            blend={blend()}
            onBlend={setBlend}
            fieldDetail={paintField() === undefined ? undefined : PAINT_DETAIL}
            dabs={dabCount()}
            hasPaint={paintJournal.count > 0}
          />
        </div>
      </div>

      <div
        class={styles.sheet}
        data-hidden={sheet() !== "parts" || !sheetOpen() ? "" : undefined}
      >
        <PartsPanel
          store={store}
          primitives={PRIMITIVE_NAMES}
          onDuplicate={() => {
            /**
             * **Straight into move mode, because the copy is on top of the original.**
             *
             * A duplicate lands at the same origin, so nothing on screen has moved and the
             * only thing that has happened is that there are now two rows in the list reading
             * the same three numbers. The move tool is what turns that into a second part
             * somebody can place: the arrows are already on the copy, and dragging one is the
             * next gesture the way drawing it was the last one.
             *
             * **Nothing else is needed for the copy to be selected** — `duplicate` selects it,
             * so the `selected` memo above is already pointing at it and the transform panel is
             * already showing it. See `standHandles`, which reads the tool every frame, which
             * is why the arrows appear on the next one rather than needing to be told.
             */
            setTool("move");
          }}
        />
      </div>

      {/*
        **The picker `/open` clicks, and the one nothing else needs to know about.**
        `display: none` rather than visually hidden, and it is a sibling of the canvas rather
        than inside a panel, because a file dialog is not a text field and giving the interface
        two of its own would be worse. Copied from `apps/spacescape/src/app.tsx`, which
        discovered that the browser's is not reliable everywhere.
      */}
      <input ref={picker} type="file" style={{ display: "none" }} />

      {/*
        **"Your files" as a modal dialogue rather than a menu in the corner.**
        The actions are five buttons and would fit anywhere; the list of files is a grid of cards
        and wants the whole screen. The dialogue's positioning is in `app.module.css` rather than
        here, so one stylesheet owns the whole screen's composition.
      */}
      <Files.Dialog class={styles.filesDialog}>
        <FilesPanel
          home={home}
          parts={() => store.parts().length}
          model={store.parts}
          palette={palette.colours}
          recent={recent}
          canRemember={canRemember}
          draftAt={draftAt}
          mesh={mesh}
          height={height}
          filaments={filaments}
          resolution={printResolution}
          printing={printProgress}
          builtFile={printFileLabel}
          notice={fileNotice}
          busy={busy}
          onNew={() => {
            newDocument();
          }}
          onOpen={() => {
            void openFromDisk(picker);
          }}
          onSave={() => {
            void saveToDisk();
          }}
          onExport={() => {
            void buildPrint();
          }}
          onSavePrint={() => {
            void savePrintFile();
          }}
          onHeight={setHeightForPrint}
          onFilaments={setFilamentsForPrint}
          onResolution={setPrintResolutionForPrint}
          onOpenRecent={(file) => {
            void openRecent(file);
          }}
          onForgetRecent={(id) => {
            void forgetFile(id).then(refreshRecent);
          }}
          onClose={() => {
            // **A file built and not saved goes with the dialogue.** It is a `Blob` of up to a
            // few tens of megabytes that nothing else refers to, and holding it for a panel
            // that is no longer on screen is a leak with no way to notice it.
            setPrintFile(undefined);
            Files.close();
          }}
        />
      </Files.Dialog>

      <footer class={styles.footer}>
        <button
          type="button"
          class={styles.action}
          disabled={!store.canUndo()}
          onClick={() => {
            store.undo();
          }}
        >
          Undo
        </button>
        <button
          type="button"
          class={styles.action}
          disabled={!store.canRedo()}
          onClick={() => {
            store.redo();
          }}
        >
          Redo
        </button>

        {/*
          **One button here, and the file actions are in a dialogue.**
          A footer of Undo, Redo, New, Open, Save and Export is six `--ui-size` targets across
          the bottom of a phone, which is most of the width and none of the height a thumb wants —
          and it is not even the right shape, because "your files" is a *list of files* and a list
          of files does not fit in the corner of a screen. The sibling keeps the tools in the
          shell and the files in a dialogue, and that is what this does.
        */}
        <button
          type="button"
          class={styles.action}
          aria-label="Your files"
          title="Your files"
          onClick={() => {
            Files.open();
          }}
        >
          Files
        </button>
        <span class={styles.hint}>drag to orbit · scroll or pinch to zoom</span>
      </footer>
    </div>
  );
}
