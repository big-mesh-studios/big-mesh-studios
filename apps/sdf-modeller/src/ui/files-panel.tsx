/**
 * "Your files": the document you are working on, what you can do to it, and what you have opened
 * before.
 *
 * ## Why this is a modal dialogue and not a menu in the corner
 *
 * **Because it is a list of files, and a list of files does not fit in a popover.** The actions
 * are five buttons and fit anywhere. The list is a grid of cards, and on a phone it wants the
 * whole screen — which is exactly the arrangement the sibling arrived at, and the reason its
 * dialogue goes full-bleed under 500px.
 *
 * ## Why the dialogue responds to its own width and not the window's
 *
 * **Because it is inset from the window by a clearance on a desktop screen.** A viewport query
 * would fire at the wrong size: at a 712px window the dialogue is 620px and wants the narrow
 * layout, while the window itself is nowhere near any breakpoint. So `.panel` declares
 * `container-type: inline-size` and everything below it is a `@container` query. That is the
 * single most worth-copying detail of the sibling's layout.
 *
 * ## Why the export's numbers are in here rather than in the shell
 *
 * **Because they are about the destination, and the destination is a decision somebody makes
 * once per file.** They sit with the current-document card they apply to, rather than in the
 * footer where they would be two more persistent controls competing with the tools for a thumb.
 */
import { For, Show } from "solid-js";
import type { RGBA } from "@big-mesh-studios/core";

import { homeName, type Home } from "../file/home";
import { REMEMBERED, type RecentFile } from "../file/recent-files";
import { DEFAULT_HEIGHT_MM, printReadout } from "../print/print-problem";
import {
  DEFAULT_PRINT_VOXEL_SIZE,
  MIN_PRINT_VOXEL_SIZE,
  PRINT_RESOLUTIONS,
  describePrintEstimate,
  printEstimate,
  printVoxelSizeIn,
} from "../print/print-budget";
import { DEFAULT_MAX_COLOURS } from "../print/quantise";
import type { MeshResult } from "../model/mesh-model";
import type { Part } from "../model/part";
import { createPopover } from "./popover";
import {
  CrossIcon,
  CubeIcon,
  FloppyIcon,
  FolderOpenIcon,
  Icon,
  PlusIcon,
  TrashIcon,
} from "./icons";
import controls from "./controls.module.css";
import styles from "./files-panel.module.css";

/**
 * The `id` of the `datalist` the resolution field draws its arrows from.
 *
 * **A literal rather than a counter**, because there is one of these panels in the application
 * and the id has to be written twice — once on the input's `list`, once on the list itself.
 * `createPopover` has a counter for the same job, but its names are generated inside the
 * factory and are not reachable from here.
 */
const PRINT_RESOLUTION_LIST = "sdf-modeller-print-resolutions";

export function FilesPanel(props: {
  /** Where the document lives, which is what the card under the bar is about. */
  home: () => Home;
  /** How many parts the document has, and whether that is worth showing. */
  parts: () => number;
  /** The document itself, which is what the export's cost is worked out from. */
  model: () => readonly Part[];
  palette: () => readonly RGBA[];
  recent: () => readonly RecentFile[];
  /** The browser can hold on to files at all, and so whether the list is worth drawing. */
  canRemember: () => boolean;
  /** The draft this browser is holding, and when it was written. */
  draftAt: () => number | undefined;
  /** The last mesh, for the export's readout. */
  mesh: () => MeshResult | undefined;
  height: () => string;
  filaments: () => string;
  /** The export's resolution as typed, which is text because a number is a number per keystroke. */
  resolution: () => string;
  /** How far the export's meshing has got, or `undefined` when none is running. */
  printing: () => number | undefined;
  /** The name and size of a built file waiting to be saved, or `undefined` when none is. */
  builtFile: () => string | undefined;
  notice: () => string | undefined;
  busy: () => boolean;
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  /** Meshes and encodes the model; needs no user gesture and may take as long as it takes. */
  onExport: () => void;
  /** Writes the built file; has to be a fresh click, because a file dialog needs the gesture. */
  onSavePrint: () => void;
  onHeight: (value: string) => void;
  onFilaments: (value: string) => void;
  onResolution: (value: string) => void;
  onOpenRecent: (file: RecentFile) => void;
  onForgetRecent: (id: string) => void;
  onClose: () => void;
}) {
  // **Not drawn through a portal**, because the trigger is inside a modal dialogue and a panel in
  // the body of the document is outside that dialogue — which the dialogue sits on top of. The
  // panel would open in the right place and take no clicks at all.
  const ExportPopover = createPopover({ portal: false });

  return (
    <div class={styles.panel}>
      {/*
        **A grid of named areas rather than a flex row, and the slack goes to the name.**

        `minmax(0, 1fr)` in the middle is what lets the document's name ellipsis instead of
        pushing the buttons off the end of the row, and it is the reason the fixed-width action
        columns are safe: the name absorbs everything and gives none of it back.
      */}
      <div class={styles.bar}>
        <button
          type="button"
          class={`${controls.button} ${styles.new}`}
          disabled={props.busy()}
          title="Start a new model"
          onClick={() => props.onNew()}
        >
          <span class={controls.icon}>
            <PlusIcon />
          </span>
          <span class={controls.label}>New</span>
        </button>

        <button
          type="button"
          class={`${controls.button} ${styles.open}`}
          disabled={props.busy()}
          title="Open a model from disk"
          onClick={() => props.onOpen()}
        >
          <span class={controls.icon}>
            <FolderOpenIcon />
          </span>
          <span class={controls.label}>Open</span>
        </button>

        <button
          type="button"
          class={`${controls.button} ${styles.save}`}
          disabled={props.busy()}
          title="Write this model to a file"
          onClick={() => props.onSave()}
        >
          <span class={controls.icon}>
            <FloppyIcon />
          </span>
          <span class={controls.label}>Save</span>
        </button>

        {/*
          **The export is a popover because it is three things and two of them are numbers.**
          Height in millimetres and filaments are questions about the printer, asked once per
          file rather than held on screen; the sibling puts them in exactly this shape for exactly
          this reason.
        */}
        <ExportPopover.Trigger
          class={`${controls.button} ${styles.export}`}
          title="Write this model out for a 3D printer"
        >
          <span class={controls.icon}>
            <CubeIcon />
          </span>
          <span class={controls.label}>Export</span>
        </ExportPopover.Trigger>

        <button
          type="button"
          class={`${controls.button} ${styles.close}`}
          title="Close"
          onClick={() => props.onClose()}
        >
          <span class={controls.icon}>
            <CrossIcon />
          </span>
        </button>

        <p class={styles.title}>
          <span class={controls.label}>{homeName(props.home())}</span>
          {props.home().kind === "nowhere" ? (
            <span class={styles.where}>not saved anywhere yet</span>
          ) : (
            <span class={styles.where}>· {props.parts()} parts</span>
          )}
        </p>
      </div>

      <ExportPopover.Panel class={`${controls.popover} ${styles.exportPanel}`}>
        <label class={controls.field}>
          <span>Height</span>
          <input
            type="number"
            min={1}
            step={1}
            value={props.height() === "" ? DEFAULT_HEIGHT_MM : props.height()}
            onInput={(event: Event & { currentTarget: HTMLInputElement }) => {
              props.onHeight(event.currentTarget.value);
            }}
          />
          <span>mm</span>
        </label>

        <label class={controls.field}>
          <span>Filaments</span>
          <input
            type="number"
            min={1}
            step={1}
            value={
              props.filaments() === "" ? DEFAULT_MAX_COLOURS : props.filaments()
            }
            onInput={(event: Event & { currentTarget: HTMLInputElement }) => {
              props.onFilaments(event.currentTarget.value);
            }}
          />
        </label>

        {/*
          **The export's resolution, as a number a person types rather than a slider.**

          **Because the cost is cubic in the reciprocal and this is the one control where that
          is worth spending.** Height and filaments are a printer's two facts and neither is
          expensive to get wrong. This one decides whether the export takes a second or ten of
          them, so it says what it will cost underneath itself and lets somebody who knows their
          machine type the value.

          **`step="any"` and a `datalist`, because the three settings that were measured are
          halvings of each other and `step` can only be linear.** Stepping by the halving
          between the two ends gives `0.046875`, which is not a resolution anybody measured;
          stepping by one, which is what a free field does, gives `1.0625`. A `datalist` is the
          control that means what is wanted: any value is accepted, the arrows walk the three
          that were, and the list is the same list `PRINT_RESOLUTIONS` is written from.

          **The bounds are the range the export will mesh at**, which is what makes typing
          something out of it an error at Export rather than a silently coarser file.
        */}
        <label class={controls.field}>
          <span>Resolution</span>
          <input
            type="number"
            min={MIN_PRINT_VOXEL_SIZE}
            max={DEFAULT_PRINT_VOXEL_SIZE}
            step="any"
            list={PRINT_RESOLUTION_LIST}
            value={props.resolution()}
            onInput={(event: Event & { currentTarget: HTMLInputElement }) => {
              props.onResolution(event.currentTarget.value);
            }}
          />
          <span>u</span>
        </label>

        <datalist id={PRINT_RESOLUTION_LIST}>
          {/*
            **Finest first, because that is the order `PRINT_RESOLUTIONS` is in and the order a
            list of resolutions is read in.**
          */}
          <For each={PRINT_RESOLUTIONS}>
            {(size) => <option value={String(size)} />}
          </For>
        </datalist>

        {/*
          **What the resolution above will cost, worked out without meshing anything.**

          **Because the model decides the cost as much as the number does**, which is the one
          thing a resolution control cannot show on its own: a model twenty units long and a
          model two units long differ by a hundredfold in the samples between them, so the same
          typed number is a one-second print of one and a ten-second print of the other. This
          is why the field is a number at all — the person who wants a fine print of a small
          model can have one, and they can see what it will be.

          **Empty rather than a placeholder when the model has nothing in it**, because there is
          no estimate to give and a dash would read as an error.
        */}
        <p class={styles.cost}>{describeEstimate(props)}</p>

        {/*
          **The mesh report, verbatim, because it is the same sentence the export refuses with.**
          Nothing here decides anything; it is there so that a person finds out a model is a
          lidless shell while they are looking at the control that would send it to a printer.
        */}
        <p class={styles.report}>{printReadout(props.mesh())}</p>

        {/*
          **The bar, and only while there is something to bar.**

          **A `<progress>` because it is the element that means this**, which is worth more than
          the styling it gives up: it carries `aria-valuenow` for a screen reader without a
          line of code. At the fine end this export is seven and a half seconds of arithmetic,
          and the page stays live throughout because the meshing is in a worker — so the bar is
          the difference between waiting and not knowing whether it has stopped.

          **`max` is one and `value` is the fraction**, which is what the mesher's work count
          becomes once its passes have been counted against each other. The element is drawn only
          while a mesh is being built, so it is never a bar sitting at nothing between exports —
          the `Show` removes it rather than zeroing it.
        */}
        <Show when={props.printing()}>
          {(fraction) => (
            <progress class={styles.progress} max={1} value={fraction()} />
          )}
        </Show>

        {/*
          **One button that is two steps, because a file dialog needs a gesture and meshing
          spends the one there was.**

          **`showSaveFilePicker` refuses without recent user activation** — Chrome throws
          _"Must be handling a user gesture to show a file picker"_ — and its activation lasts
          five seconds, where the fine end of this export takes eleven. So the first press
          meshes and encodes, which needs no gesture and draws the bar above; the second press
          writes, and is a fresh gesture from a button that names the file and its size.

          **One button rather than two**, because two would invite pressing the wrong one and
          the state that says which is right is exactly what the label carries. What it says is
          the last chance to say something wrong, so the name and the megabytes go on it.
        */}
        <button
          type="button"
          class={controls.button}
          disabled={props.busy()}
          onClick={() =>
            props.builtFile() === undefined
              ? props.onExport()
              : props.onSavePrint()
          }
        >
          <span class={controls.icon}>
            <CubeIcon />
          </span>
          <span class={controls.label}>
            <Show when={props.builtFile()} fallback="Export .3mf">
              {(name) => `Save ${name()}`}
            </Show>
          </span>
        </button>
      </ExportPopover.Panel>

      {/*
        **The refusal, in the body rather than in the popover it came from.**

        A message shown on a closed surface is a message nobody reads, and `readProject`'s
        reasons are the only sentence about what is wrong that a person can act on.
      */}
      <Show when={props.notice()}>
        {(message) => (
          <p class={styles.notice} role="alert">
            {message()}
          </p>
        )}
      </Show>

      {/*
        **The draft's age, because "your work was restored" is alarming without it.** Somebody
        who reloads after a week needs to know which week.
      */}
      <Show when={props.draftAt()}>
        {(at) => <p class={styles.draft}>saved in this browser {ago(at())}</p>}
      </Show>

      <Show
        when={props.canRemember() && props.recent().length > 0}
        fallback={
          <p class={styles.empty}>
            {props.canRemember()
              ? "No files opened yet. Open one and it will be here."
              : "This browser cannot hold on to files, so there is no list. Saving downloads a file instead."}
          </p>
        }
      >
        <div class={styles.grid}>
          {/*
            **Cards, not a list of names.** A list of file names tells somebody nothing about which
            file is which, and this is a list they pick out of rather than scan. The
            `auto-fill` with a `min()` guard is what makes it four across on a desktop, three on a
            full-width phone and two on a small one, with no media query anywhere.
          */}
          <For each={props.recent().slice(0, REMEMBERED)}>
            {(file) => (
              <div class={styles.card}>
                <button
                  type="button"
                  class={styles.openCard}
                  disabled={props.busy()}
                  title={`Open ${file.name}`}
                  onClick={() => props.onOpenRecent(file)}
                >
                  <div class={styles.preview}>
                    {/*
                      **A number rather than a picture.** Rendering a thumbnail per remembered
                      file means rendering on every autosave to store something that only one of
                      them will ever be looked at again, and the alternative costs nothing: how
                      many parts a file holds is what tells a sphere from a character, and it is
                      already known.
                    */}
                    <span class={styles.partCount}>{file.parts}</span>
                    <span class={styles.partLabel}>
                      {file.parts === 1 ? "part" : "parts"}
                    </span>
                  </div>
                  <span class={styles.name}>
                    <span class={controls.icon}>
                      <FloppyIcon />
                    </span>
                    <span class={controls.label}>{file.name}</span>
                  </span>
                </button>

                <span class={styles.when}>{ago(file.lastOpenedAt)}</span>

                {/*
                  **Hidden behind a hover on a pointer device and always there on a touch one**,
                  **and shown for keyboard focus as well**, because an affordance that only a
                  mouse can find is not available to everybody.
                */}
                <button
                  type="button"
                  class={styles.forget}
                  disabled={props.busy()}
                  title={`Forget ${file.name} — the file on disk is not touched`}
                  onClick={() => props.onForgetRecent(file.id)}
                >
                  <span class={controls.icon}>
                    <TrashIcon />
                  </span>
                </button>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}

/**
 * What the export's resolution control says it will cost, or nothing to say.
 *
 * **Three reasons it can be empty, and none of them is worth a sentence.** A field somebody has
 * cleared, a field holding something that is not a number yet, and a model with nothing in it
 * all produce no line; the export button refuses the second of those in its own words when it
 * is pressed. A line reading "enter a resolution" under a field halfway through being typed is
 * noise, and this runs on every keystroke.
 *
 * **Read through the props rather than memoised,** because Solid compiles a call in JSX into an
 * effect and so tracks the `resolution()` and `model()` reads inside it for free — which is
 * what makes the line follow the field without anything watching it.
 */
const describeEstimate = (props: {
  readonly model: () => readonly Part[];
  readonly resolution: () => string;
}): string => {
  const typed = props.resolution();
  if (typed === "") return "";
  const voxelSize = printVoxelSizeIn(typed);
  if (voxelSize === undefined) return "";
  const estimate = printEstimate(props.model(), voxelSize);
  return estimate === undefined ? "" : describePrintEstimate(estimate);
};

/**
 * How long ago something happened, in the fewest words that are still true.
 *
 * **"a moment ago" rather than a locale date**, because the list is ordered by time and the top
 * of it is what somebody reads. A date is the right answer for everything below three days and
 * the wrong one above it.
 */
export const ago = (at: number, now: number = Date.now()): string => {
  const seconds = Math.max(0, Math.round((now - at) / 1000));
  if (seconds < 45) return "a moment ago";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days < 2) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(at).toLocaleDateString();
};

/** The glyph for a home, which is what says where a document came from. */
export const HomeIcon = () => <Icon kind="floppy" />;
