/**
 * The top of a model file: `manifest.json`, and what a file has to say about itself before
 * anything will open it.
 *
 * ## Why a zip with a manifest beside the model
 *
 * **Because the model is already a format and the manifest is the part of it that is not.**
 * `./serialise` writes and reads a fixed-width binary list of operations, and it is the
 * same bytes `apps/spacescape` puts on the wire for a session and the same bytes it will
 * read back out of a place's model attachments. Reusing it means the modeller's file, the
 * landscape's session and a place's figures agree by construction rather than by three
 * implementations of one idea staying in step.
 *
 * What that format cannot carry is **anything about a part that is not an operation**,
 * and there are three such things:
 *
 * - **An id.** `Operation` has an `index` that means a position in a fold and no name at
 *   all, while a part has one that a selection, an undo entry and a save file all refer
 *   to. So the manifest carries `ids`, in the same order as the operations, and the two
 *   are joined by position.
 * - **Whether a part has a colour of its own.** `Operation.colour` is optional, and
 *   `serialiseOperations` writes white for a part that has none — which is the right
 *   default for a brush that was always going to be painted and the wrong one here, where
 *   "no colour" means _the surface falls through to whatever is underneath_. So the
 *   manifest carries `coloured`: which of the parts were not relying on that white.
 * - **The palette and the view settings**, which are about the document rather than the
 *   model.
 *
 * The alternative for each was a version bump of the shared binary format, and all three
 * would have changed the bytes on the landscape's wire at the same time.
 *
 * ## Why this lives here rather than in the application that wrote it
 *
 * **Because two applications now read it and only one writes it.** `apps/sdf-modeller`
 * saves `.sdfmod` files; `apps/spacescape` reads them, because a place attaches its props
 * and NPCs as models and a model is one of these. A second copy of the rules would be a
 * second thing to keep in step with the first, and this one is the kind of format whose
 * rules are a list of little decisions — sorted, duplicate-free, trimmed, in range — each
 * of which looks arbitrary alone and is not obvious from the other end.
 *
 * `apps/sdf-modeller/src/file/project-file.ts` is now the application's half: it
 * re-exports this, narrows `view` to the mesher modes and resolutions the viewport
 * actually offers, and asserts that the bounds here are the same numbers as the
 * application's own. What is *not* here is the mesher vocabulary — this package does not
 * know what a mesher is, so it validates `view` structurally and leaves `mode` to whoever
 * has a list to check it against.
 *
 * ## What is checked, and what is not
 *
 * **Every field is checked and nothing is coerced.** A resolution that arrived as the
 * string `"0.25"` is refused rather than parsed, because a manifest is written by a tool
 * and a tool that writes a string where a number belongs has a bug that would otherwise
 * surface as a model that is silently the wrong resolution.
 *
 * **An unknown field is not refused**, and for the reason ADR 0017 gives: a manifest is
 * read once by this code and never reaches anywhere that could act on it, so a field from
 * a future version is inert here rather than dangerous — and refusing it would make every
 * added field a breaking change.
 */

/** The file inside the zip that carries a project's manifest. */
export const PROJECT_MANIFEST_FILE = "manifest.json";

/** The file inside the zip that carries the operations. */
export const PROJECT_MODEL_FILE = "model.bin";

/** The extension a model file is written under, and what a picker should accept. */
export const PROJECT_EXTENSION = ".sdfmod";

/** The media type a model zip is written under. */
export const PROJECT_MIME_TYPE = "application/zip";

/**
 * The version this build writes.
 *
 * **One, and it is a manifest version rather than the model format's.** The operations are in
 * `model.bin` under this package's own `FORMAT_VERSION`, which refuses a version it does not
 * know rather than reading a later one at this version's field widths. This number is the
 * manifest's shape, and it goes up when `ids`, `coloured` or `view` changes meaning.
 */
export const PROJECT_VERSION = 1;

/**
 * The most parts a manifest may name.
 *
 * **A bound, and not a claim that this many parts is a sensible model.** It is here so that a
 * file cannot hand a reader an array it will copy into a list it does not know how big, and
 * the application that wrote it applies its own bound of a similar size — `apps/sdf-modeller`
 * asserts that the two agree, which is what makes this number safe to write down here rather
 * than a copy waiting to rot.
 */
export const MAX_MANIFEST_PARTS = 512;

/**
 * The most colours a manifest may name.
 *
 * **The same reasoning.** A file naming more colours than a palette can hold is a file whose
 * extra entries nothing would ever show.
 */
export const MAX_MANIFEST_COLOURS = 32;

/**
 * The longest one part id may be.
 *
 * **An id is a label, not a path.** Ids are shown in lists and written as metadata, and a
 * hundred and twenty-eight characters is more than any of those can show — the bound is here
 * so that a file cannot make a list unreadable by handing it a paragraph.
 */
export const MAX_PART_ID = 128;

/**
 * How the model was being looked at when it was saved.
 *
 * **Saved because it is a document setting and not a view preference.** The mesher is the one
 * control in a model editor that alters what the model *is* — it decides the geometry the
 * file a person is working towards is built from — so it belongs with the model rather than
 * with the camera, which is left where the window left it.
 *
 * **Both fields are checked as shapes and not against a list of allowed values**, because
 * this package does not know what a mesher is: `mode` is a name and `resolution` is a size.
 * `apps/sdf-modeller` narrows this to the two meshers its viewport offers, and that is
 * where the vocabulary belongs.
 */
export interface ProjectView {
  readonly mode: string;
  readonly resolution: number;
}

/**
 * Whether a value read out of `manifest.json` is a manifest this can open.
 *
 * **The ids and the `coloured` positions are checked against each other**, which is the one
 * cross-field check here and the only one worth making: a `coloured` naming a part that does
 * not exist is a manifest whose model and whose parts disagree, and the loader would otherwise
 * either colour a part that has none or refuse a file that is fine.
 */
export const isProjectManifest = (value: unknown): value is ProjectManifest => {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;

  if (record.version !== PROJECT_VERSION) return false;
  if (!isIdList(record.ids)) return false;
  if (!isIndexList(record.coloured, record.ids.length)) return false;
  if (!isPalette(record.palette)) return false;
  return isView(record.view);
};

/** Whether these are ids that can be put in a list. */
const isIdList = (value: unknown): value is readonly string[] => {
  if (!Array.isArray(value)) return false;
  // An empty model is a legitimate thing to save, so an empty list is not refused here.
  if (value.length > MAX_MANIFEST_PARTS) return false;

  const seen = new Set<string>();
  for (const id of value) {
    if (typeof id !== "string") return false;
    // **Whitespace is refused rather than trimmed**, because a trimmed id is a different id and
    // a list would show one thing while the file said another.
    if (id.length === 0 || id.length > MAX_PART_ID) return false;
    if (id.trim() !== id) return false;
    // Duplicates refused rather than collapsed: two ids that are the same string are one part as
    // far as a selection is concerned, and a file carrying both cannot be loaded into anything
    // that identifies its parts by id.
    if (seen.has(id)) return false;
    seen.add(id);
  }
  return true;
};

/**
 * Whether these are positions in a model of `count` parts.
 *
 * **Sorted and duplicate-free rather than merely in range.** The writer emits them in order, so a
 * list that is not ordered is a list written by something else — and a duplicate is one part
 * claiming to be coloured twice, which would make the loader's own answer depend on which of the
 * two it read last.
 */
const isIndexList = (
  value: unknown,
  count: number,
): value is readonly number[] => {
  if (!Array.isArray(value)) return false;
  if (value.length > count) return false;

  let previous = -1;
  for (const index of value) {
    if (typeof index !== "number" || !Number.isInteger(index)) return false;
    if (index < 0 || index >= count) return false;
    if (index <= previous) return false;
    previous = index;
  }
  return true;
};

/** Whether these are colours a file may name. */
const isPalette = (value: unknown): value is ProjectManifest["palette"] => {
  if (!Array.isArray(value)) return false;
  if (value.length > MAX_MANIFEST_COLOURS) return false;

  return value.every(
    (entry) =>
      typeof entry === "object" &&
      entry !== null &&
      isChannel((entry as Record<string, unknown>).r) &&
      isChannel((entry as Record<string, unknown>).g) &&
      isChannel((entry as Record<string, unknown>).b) &&
      isChannel((entry as Record<string, unknown>).a),
  );
};

/** A colour channel, as the four whole numbers an 8-bit channel is. */
const isChannel = (value: unknown): boolean =>
  typeof value === "number" &&
  Number.isInteger(value) &&
  value >= 0 &&
  value <= 255;

/**
 * What a project file says about itself.
 *
 * A type rather than an interface with everything optional, so a manifest that has passed
 * `isProjectManifest` has all of these — the alternative is every reader carrying a check for a
 * case that is decided once, in the validator.
 */
export interface ProjectManifest {
  readonly version: number;
  /**
   * One id per operation, in the same order.
   *
   * **Required and exactly as long as the model, rather than optional.** An id is what a
   * selection and an undo entry refer to, so a part with none is a part that cannot be selected
   * and a part with two is a part that cannot be told apart from the other — both of which the
   * caller would have to invent something for.
   */
  readonly ids: readonly string[];
  /**
   * Which parts carry a colour of their own, as positions in `ids`.
   *
   * **Positions rather than a parallel array of colours**, because the colour itself is in
   * `model.bin` and this is only the fact of its presence. A part that is not named here took
   * the default the serialiser wrote, which is what "no colour of its own" means.
   */
  readonly coloured: readonly number[];
  /** The colours this model has used, most-recent first, as the panel shows them. */
  readonly palette: readonly { r: number; g: number; b: number; a: number }[];
  readonly view: ProjectView;
}

/** The mesher modes a manifest may name. Narrowed by the application, which knows its own. */
const isView = (value: unknown): value is ProjectView => {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;

  // **A non-empty string rather than a member of a list.** See `ProjectView`: this package has
  // no mesher vocabulary, so it checks that the field says something and leaves whether the
  // something is one this repository offers to whoever does.
  if (typeof record.mode !== "string" || record.mode.length === 0) return false;
  // **A positive finite number**, which is what "a resolution" means. An `Infinity` here
  // would survive `typeof` and produce a sample count of zero or a division by it.
  return (
    typeof record.resolution === "number" &&
    Number.isFinite(record.resolution) &&
    record.resolution > 0
  );
};

/** A file name a person would recognise, from a file name that may be anything. */
export const projectName = (fileName: string): string =>
  fileName.endsWith(PROJECT_EXTENSION)
    ? fileName.slice(0, -PROJECT_EXTENSION.length)
    : fileName;
