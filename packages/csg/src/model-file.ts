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
 * - **A painted texture, if the model has one** — `texture.png` and `texture.bin`, named by an
 *   optional `texture` field. The same kind of thing for the same reason: the coordinates are
 *   not an operation, and they are far too large to be one.
 *
 * The alternative for each was a version bump of the shared binary format, and all of them
 * would have changed the bytes on the landscape's wire at the same time.
 *
 * ## What the texture costs, and who pays for it
 *
 * **A model that was never textured is unchanged, byte for byte.** The two entries are optional
 * and the manifest field describing them is optional, so the files this writes are mostly the
 * two-entry files they have always been. That is the entire backwards compatibility story and
 * it is one word long.
 *
 * **A textured model read by a build that does not know about textures opens without its
 * texture, silently.** This is ADR 0017's trade on a real case rather than a hypothetical one:
 * an unknown field is inert, so an older build sees a manifest it can parse and a zip whose
 * extra entries it never looks for. The alternative — a reader refusing fields it does not
 * recognise — makes every addition to the manifest a breaking change, and a format that cannot
 * be extended is a format that gets replaced instead of extended.
 *
 * So a new reader of an old file gets an untextured model, and an old reader of a new file gets
 * an untextured model, and both beat refusing to open. **What must not happen is a manifest that
 * names a texture whose files are not there**, because that promises something the file does
 * not contain — and that is caught on load by the reader holding both halves, rather than by a
 * validator that only ever sees one.
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

/** The file inside the zip that carries the painted atlas, when there is one. */
export const PROJECT_TEXTURE_FILE = "texture.png";

/**
 * The file inside the zip that carries the atlas's coordinates.
 *
 * **Two files rather than one because they answer different questions.** The image is the
 * picture and can be shown by anything with a PNG decoder; the coordinates are the only way
 * back to *where on the model* that picture was painted, and a reader with only the image has a
 * picture it cannot put back on the figure.
 */
export const PROJECT_REFERENCE_FILE = "texture.bin";

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
 *
 * **Adding `texture` did not move it, and that is the whole argument.** Those three fields
 * would have to be re-read by an existing build to get a *different answer* from a file it
 * already opens; `texture` is a field an existing build ignores entirely, so the only thing a
 * bump would buy is refusing a file this build is happy to open. A version number that goes up
 * every time the format is extended stops being a compatibility guarantee and starts being a
 * rename.
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
 * The longest edge an atlas may have, in texels.
 *
 * **A bound on a number somebody else chose.** The unwrapper picks its own output size from the
 * chart area it was given, so this build does not choose these and cannot promise a reader a
 * particular one — which is exactly why the size is written in the manifest rather than assumed,
 * and why this number exists at all: a manifest naming an atlas the size of a wall would have a
 * reader allocate it before anything could refuse.
 */
export const MAX_TEXTURE_EDGE = 8192;

/**
 * The most reference vertices a manifest may name.
 *
 * **The same reasoning as the edge, on the other side of the pair.** The coordinates are
 * twenty bytes a vertex, so a manifest naming millions of them is naming twenty megabytes a
 * loader would allocate before its own length check could speak. The real protection against a
 * lying count is that check — this is the sanity bound, and the two are not the same job.
 */
export const MAX_REFERENCE_VERTICES = 1 << 20;

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
 * What a manifest says about a painted texture, if it has one.
 *
 * **A description rather than the thing, and kept off the model for the reason the rest of the
 * manifest is.** `texture.png` holds the picture and `texture.bin` holds the coordinates, and
 * this says which of the two to expect, how big they are, and one setting about how to read the
 * result — so that a reader can refuse a file whose parts disagree before it allocates them.
 */
export interface ProjectTexture {
  /** The atlas's own width, in texels. Not the resolution that was asked for. */
  readonly width: number;
  /** The atlas's own height, in texels. */
  readonly height: number;
  /**
   * How many reference vertices `texture.bin` holds coordinates for.
   *
   * **Cross-checked against that file's real length on load.** A count is cheap to write and
   * cheap to lie about, and the length of twenty bytes a vertex is not — so the count is here to
   * make the check possible and to make the refusal legible, not because it can be believed.
   */
  readonly vertices: number;
  /**
   * How much of the texture replaces a part's colour rather than tinting it, `0..1`.
   *
   * **In the manifest because it is a document setting rather than a view preference**, for the
   * same reason `view` is: a file reopened should show the picture the way it was left, and
   * "tint" is a claim about what the file *is*. It is a number and not the two names the user
   * chose because the shader's input is a number and the names are the application’s.
   */
  readonly blend: number;
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
  // **The texture is checked only when it is there, and that is the compatibility rule.** A
  // manifest written before texturing has no `texture` field and has to keep opening, so the
  // field is optional and its absence is not a failure. What *is* refused is a texture that is
  // present and malformed — a half-written one would otherwise be read as a model with no
  // texture, which is a silently different model rather than an error.
  if (record.texture !== undefined && !isTexture(record.texture)) return false;
  return isView(record.view);
};

/** Whether these are the dimensions and counts an atlas may be described by. */
const isTexture = (value: unknown): value is ProjectTexture => {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;

  // **Both edges in range rather than merely positive**, for the reason `MAX_TEXTURE_EDGE`
  // exists: this is the number a reader would allocate a row of, and a manifest is not a place
  // to accept a number and regret it.
  if (!isTextureEdge(record.width) || !isTextureEdge(record.height))
    return false;

  if (
    typeof record.vertices !== "number" ||
    !Number.isInteger(record.vertices) ||
    record.vertices <= 0 ||
    record.vertices > MAX_REFERENCE_VERTICES
  ) {
    return false;
  }

  // **A finite number in 0..1, which is the range the shader's blend uniform is read in.** Not a
  // list of the two settings a person chooses from, because this package does not know the
  // control exists — only what its value has to be able to mean.
  return (
    typeof record.blend === "number" &&
    Number.isFinite(record.blend) &&
    record.blend >= 0 &&
    record.blend <= 1
  );
};

/** A texel count along one edge of an atlas. */
const isTextureEdge = (value: unknown): boolean =>
  typeof value === "number" &&
  Number.isInteger(value) &&
  value > 0 &&
  value <= MAX_TEXTURE_EDGE;

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
  /**
   * This model's painted texture, if it has one.
   *
   * **Optional, and that is a compatibility requirement rather than a convenience.** Every file
   * written before texturing has no such field, and refusing those would make the feature a
   * reason nobody could open their old work. Absent means untextured, which is not a degraded
   * mode: it is what every model in the application was until somebody painted one.
   */
  readonly texture?: ProjectTexture;
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
