/**
 * A project file: a manifest and the model, as a zip.
 *
 * ## Why the operations go out as the bytes they already are
 *
 * **`packages/csg/src/serialise` is already a versioned, seekable, fixed-width format and is
 * already in use on the multiplayer wire** (`apps/spacescape/src/session.ts`). Writing a second
 * encoding of the same list — JSON, a bespoke binary layout — would be two implementations of
 * one idea to keep in step, and the modeller's file would be the one nobody else reads.
 *
 * So `model.bin` is `serialiseOperations`' output verbatim, and the manifest beside it carries
 * the three things that format cannot (see `./project-file` for why each one is there rather
 * than in a version bump of the shared format).
 *
 * ## What is refused, and how loudly
 *
 * **Every refusal names what is wrong.** Somebody who opened the wrong file, or whose editor
 * wrote a manifest this version does not understand, has to be told which — and the whole list
 * is short enough that each refusal can say its own reason rather than collapsing to "not a
 * model file".
 *
 * ## The bytes are read to an array buffer first
 *
 * **`JSZip.loadAsync` reads a `Blob` through the browser's `FileReader`, which Node does not
 * provide**, so the array-buffer path is the one that works in a browser and in this
 * repository's tests. `apps/spacescape/src/places/load-place.ts` records the same thing having
 * been found the same way.
 *
 * ## What this does not claim to defend against
 *
 * **A zip bomb.** Every entry is decompressed before its length can be read, so the peak is one
 * entry's uncompressed size rather than a bound this code applies. The bound that does apply is
 * `MAX_PARTS`, on the count of operations the manifest declares — which is checked against the
 * manifest *and* against what the model actually parses to, so a zip whose manifest says five
 * parts and whose binary holds five hundred is refused rather than meshed.
 */
import JSZip from "jszip";
import {
  deserialiseOperations,
  serialiseOperations,
} from "@big-mesh-studios/csg";
import type { RGBA } from "@big-mesh-studios/core";

import { MAX_PARTS } from "../model/model-store";
import type { Part } from "../model/part";
import { PaintSurface } from "../unwrapping/paint-surface";
import type { UnwrappedMesh } from "../unwrapping/unwrap";
import {
  readReference,
  writeReference,
  type ReferenceFile,
} from "../unwrapping/reference-file";
import type { AtlasInfo } from "../unwrapping/bake";
import {
  PROJECT_MANIFEST_FILE,
  PROJECT_MODEL_FILE,
  PROJECT_REFERENCE_FILE,
  PROJECT_TEXTURE_FILE,
  isSaveableProject,
  projectManifest,
  type ProjectView,
  type SaveableProjectManifest,
} from "./project-file";

/** The model as a file, plus the things about it that are not the model. */
export interface Project {
  readonly parts: readonly Part[];
  readonly palette: readonly RGBA[];
  readonly view: ProjectView;

  /**
   * The painted texture, when the file had one.
   *
   * **`undefined` for every file written before texturing, which is the whole compatibility
   * case** — see `@big-mesh-studios/csg`'s `model-file` for why the manifest field is optional.
   * Absent is not a degraded texture; it is an untextured model, which is what every model was
   * until somebody painted one.
   */
  readonly texture?: SavedTexture;
}

/**
 * A texture as it came out of a file: the picture, the coordinates, and one setting.
 *
 * **Decoded on load and nothing more.** Turning this back into something paintable needs a
 * model to compare the coordinates against, which is `unwrapping/bake`'s `loadTexture` and not
 * this file's business — the file reader's job ends at "these are the numbers".
 */
export interface SavedTexture {
  readonly picture: PaintSurface;
  readonly reference: ReferenceFile;
  /** How much of the texture replaces a part's colour, `0..1`. A document setting, so saved. */
  readonly blend: number;
}

/**
 * What a caller offers the writer when the model has been painted on.
 *
 * **The picture arrives as bytes, not as a surface to encode.** The caller is the one who knows
 * whether the atlas has changed since the last time it was encoded, and the writer runs on a
 * debounced autosave — so making the cache live here would mean either encoding on every save
 * or passing the cache in as an option, and this is the smaller of the two.
 */
export interface TextureToSave {
  readonly png: Blob;
  readonly atlas: AtlasInfo;
  /** Two numbers a reference vertex, naming a place in that atlas. */
  readonly uvs: Float32Array;
  /** The unwelded surface the brush raycasts, charts included. */
  readonly painted: UnwrappedMesh;
  /** The welded vertex list the unwrap was taken over; saved so a reloaded file can be checked. */
  readonly source: {
    readonly positions: Float32Array;
    readonly vertexCount: number;
  };
  readonly blend: number;
}

/**
 * The model as the bytes of a project file.
 *
 * **The operations go out in list order and the ids go out beside them in the same order**,
 * because position is the only thing joining them — `Operation.index` is a position in a fold
 * and `deserialiseOperations` assigns it by position, so the two arrays are the same sequence
 * read two ways.
 */
export const writeProject = async (
  parts: readonly Part[],
  palette: readonly RGBA[],
  view: ProjectView,
  texture?: TextureToSave,
): Promise<Blob> => {
  const operations = parts.map((part, index) => ({
    index,
    origin: part.origin,
    orientation: part.orientation,
    shape: part.shape,
    softness: part.softness,
    combine: part.combine,
    // **The colour is conditional and the opacity is not**, because the serialiser writes an
    // opacity either way and `Operation` requires one. Whether the part *had* a colour is not
    // recovered from these bytes — it is in the manifest, which is the whole reason the manifest
    // carries `coloured`.
    opacity: part.opacity ?? 1,
    ...(part.colour === undefined ? {} : { colour: part.colour }),
    // **Conditional, and for the same reason the colour is.** Zero on the wire is read back as
    // absent, so storing an explicit `0` for a part that has no material would make the two
    // the same thing on disk — and `0` is `plain`, so it would be right by accident rather
    // than by meaning. See `Part.material`.
    ...(part.material === undefined || part.material === 0
      ? {}
      : { material: part.material }),
  }));

  // **Through `projectManifest`, not as a literal.** That constructor checks the manifest
  // against the same `isSaveableProject` the reader uses, so the writer cannot produce a file
  // this application would then refuse to open — and it means the empty-model defaults and
  // the version live in one place rather than at every call site that builds a manifest.
  const manifest = projectManifest(view, {
    ids: parts.map((part) => part.id),
    // **Positions, not colours.** The colour is in the binary; this is only the fact that a
    // part did not fall through to the default the serialiser writes.
    coloured: parts.flatMap((part, index) =>
      part.colour === undefined ? [] : [index],
    ),
    palette: palette.map(({ r, g, b, a }) => ({ r, g, b, a })),
    // **Conditional, and the condition is the texture's existence rather than anything about
    // it.** An untextured model gets no field at all, which is what makes its file byte-for-byte
    // what it was before texturing existed.
    ...(texture === undefined
      ? {}
      : {
          texture: {
            width: texture.atlas.width,
            height: texture.atlas.height,
            vertices: texture.painted.vertexCount,
            blend: texture.blend,
          },
        }),
  });

  const zip = new JSZip();
  const add = (path: string, data: string | ArrayBuffer | Blob) =>
    zip.file(path, data, { createFolders: false });

  // **The manifest first, for the same reason the 3MF writer puts its content types first.**
  // An archive that buries the file describing it is one some tools will not find.
  add(PROJECT_MANIFEST_FILE, `${JSON.stringify(manifest, null, 2)}\n`);
  add(PROJECT_MODEL_FILE, serialiseOperations(operations));

  // **The two texture entries only when there is a texture**, and the manifest has already said
  // so by the time these are added — so a reader that finds a manifest naming a texture knows
  // to look for exactly these two names, and a reader with an old manifest never looks.
  if (texture !== undefined) {
    add(PROJECT_TEXTURE_FILE, texture.png);
    add(
      PROJECT_REFERENCE_FILE,
      writeReference(
        {
          width: texture.atlas.width,
          height: texture.atlas.height,
          texelsPerUnit: texture.atlas.texelsPerUnit,
          utilization: texture.atlas.utilization,
          chartCount: texture.atlas.chartCount,
        },
        texture.uvs,
        texture.painted,
        texture.source,
      ),
    );
  }

  return zip.generateAsync({ type: "blob", compression: "DEFLATE" });
};

/**
 * The model as a project file, or a sentence about why it is not one.
 *
 * @throws with its own reason for: bytes that are not a zip, no manifest, a manifest this
 *   cannot open, no model, a model this cannot read, and a model whose parts disagree with the
 *   ids the manifest named.
 */
export const readProject = async (blob: Blob): Promise<Project> => {
  const zip = await openZip(blob);
  const manifest = await readManifest(zip);

  const entry = zip.file(PROJECT_MODEL_FILE);
  if (entry === null) {
    throw new Error(`no ${PROJECT_MODEL_FILE} in the file`);
  }

  let operations;
  try {
    operations = deserialiseOperations(await entry.async("arraybuffer"));
  } catch (reason) {
    // **The model's own refusal, carried through.** `deserialiseOperations` names the version it
    // found and the version it reads, which is the only sentence about this anybody can act on,
    // and a new `Error` here would replace it with "the model could not be read".
    throw new Error(`${PROJECT_MODEL_FILE} is not a model this build reads`, {
      cause: reason,
    });
  }

  // **Both counts checked, and the manifest's first.** A manifest naming five hundred parts is
  // refused before the binary is looked at, which is the cheaper of the two refusals; the
  // second check catches a zip whose manifest and whose model were written by different tools.
  if (operations.length > MAX_PARTS) {
    throw new Error(
      `this model holds ${operations.length} parts and the limit is ${MAX_PARTS}`,
    );
  }
  if (operations.length !== manifest.ids.length) {
    throw new Error(
      `the manifest names ${manifest.ids.length} parts and ${PROJECT_MODEL_FILE} holds ${operations.length}`,
    );
  }

  const coloured = new Set(manifest.coloured);
  const texture = await readTexture(zip, manifest);

  return {
    parts: operations.map((operation, index) => {
      // **`Paint` is refused rather than read as an `Add`, and inside the map so that the
      // narrowing is the compiler's rather than a cast.** `deserialiseOperations` will happily
      // return one — `Combine` has three members and the byte for it exists — but a `Part` has
      // no `Paint`, and the reason it has none is a decision (see `../model/part`: Paint adds no
      // material, only colour, and a coloured `Add` already expresses it). A file naming one is
      // describing a model this application cannot represent, and quietly turning it into a
      // union would put material in a file that said there was none.
      if (operation.combine === "Paint") {
        throw new Error(
          `part ${index + 1} of the model is a Paint, which this application has no part for`,
        );
      }

      return {
        id: manifest.ids[index] as string,
        shape: operation.shape,
        origin: operation.origin,
        orientation: operation.orientation,
        combine: operation.combine,
        softness: operation.softness,
        // **`undefined` for a part the manifest did not name**, which is the whole reason the
        // manifest carries `coloured`. The binary wrote white for these, and a part that means
        // "the surface falls through to what is underneath" cannot come back as white.
        ...(coloured.has(index)
          ? {
              colour: operation.colour ?? { r: 255, g: 255, b: 255 },
              opacity: operation.opacity,
            }
          : {}),
      };
    }),
    palette: manifest.palette.map(({ r, g, b, a }) => ({ r, g, b, a })),
    view: manifest.view,
    ...(texture === undefined ? {} : { texture }),
  };
};

/**
 * The texture in a file, or `undefined` for a file that never had one.
 *
 * **The manifest decides whether there is one, never the other way round.** A zip holding a
 * `texture.png` that its manifest does not mention is a file something put there, and reading it
 * would mean believing the archive over the description — which is how a file ends up with a
 * picture belonging to a model that does not exist. The reverse is refused rather than tolerated,
 * because a manifest naming an atlas that is not there is a promise the file does not keep.
 */
const readTexture = async (
  zip: JSZip,
  manifest: SaveableProjectManifest,
): Promise<SavedTexture | undefined> => {
  const described = manifest.texture;
  if (described === undefined) return undefined;

  const image = zip.file(PROJECT_TEXTURE_FILE);
  if (image === null) {
    throw new Error(
      `the manifest describes a ${described.width} by ${described.height} texture and the file has no ${PROJECT_TEXTURE_FILE}`,
    );
  }
  const coordinates = zip.file(PROJECT_REFERENCE_FILE);
  if (coordinates === null) {
    throw new Error(
      `the manifest describes ${described.vertices} reference vertices and the file has no ${PROJECT_REFERENCE_FILE}`,
    );
  }

  const reference = readReference(await coordinates.async("arraybuffer"));

  // **The manifest's count against the file's own, after the file has spoken.** Either side
  // could be the liar, so both are reported in the sentence: a mismatch means a file whose two
  // halves describe different models, and knowing which is wrong is the difference between a
  // message somebody can act on and one they have to guess at.
  if (reference.painted.vertexCount !== described.vertices) {
    throw new Error(
      `the manifest names ${described.vertices} reference vertices and ${PROJECT_REFERENCE_FILE} holds ${reference.painted.vertexCount}`,
    );
  }
  if (
    reference.width !== described.width ||
    reference.height !== described.height
  ) {
    throw new Error(
      `${PROJECT_REFERENCE_FILE} describes a ${reference.width} by ${reference.height} atlas and the manifest says ${described.width} by ${described.height}`,
    );
  }

  const picture = await PaintSurface.fromPng(await image.async("blob"));
  if (picture === undefined) {
    throw new Error(`${PROJECT_TEXTURE_FILE} could not be read as an image`);
  }
  if (
    picture.width !== described.width ||
    picture.height !== described.height
  ) {
    throw new Error(
      `${PROJECT_TEXTURE_FILE} is ${picture.width} by ${picture.height} and the manifest says ${described.width} by ${described.height}`,
    );
  }

  return { picture, reference, blend: described.blend };
};

/** Opens the archive, or says what the bytes were not. */
const openZip = async (blob: Blob): Promise<JSZip> => {
  try {
    return await JSZip.loadAsync(await blob.arrayBuffer());
  } catch (reason) {
    // **Its own error, not the zip library's.** The library says things like "Can't read end
    // of central directory", which is a sentence about a format and not an answer to "what did
    // I just try to open".
    throw new Error("not a file a model was saved as", { cause: reason });
  }
};

/**
 * Reads and checks `manifest.json`.
 *
 * **Parsed, then validated, then trusted — in that order, with nothing in between.** `JSON.parse`
 * on bytes from a file is the one genuinely untrusted parse in this file, and everything after
 * it is a check on a value of known shape.
 */
const readManifest = async (zip: JSZip): Promise<SaveableProjectManifest> => {
  const entry = zip.file(PROJECT_MANIFEST_FILE);
  if (entry === null) {
    throw new Error(`no ${PROJECT_MANIFEST_FILE} at the file's root`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(await entry.async("text"));
  } catch {
    throw new Error(`${PROJECT_MANIFEST_FILE} is not valid JSON`);
  }

  // **`isSaveableProject` rather than the shared `isProjectManifest`.** The shared one asks
  // whether the file is well formed; this asks whether it is well formed *and* names a mesher
  // and a resolution this build has. A file that fails only the second is a file written by a
  // build with a different viewport, and the message has to say that rather than blame the
  // bytes.
  if (!isSaveableProject(parsed)) {
    throw new Error(
      `${PROJECT_MANIFEST_FILE} is not a model manifest this build can open`,
    );
  }
  return parsed;
};
