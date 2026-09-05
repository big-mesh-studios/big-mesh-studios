// Reading the top of a place zip: the `manifest.json` that names the world and
// its scripts. A zip is the artifact a developer publishes and a player fetches
// when a place's scripts run, so opening one here is the one gate that code has
// to clear — a zip with no manifest, or one whose manifest is malformed or
// names scripts it does not carry, is refused before a byte of it goes anywhere.
import JSZip from "jszip";
import {
  isPlaceManifest,
  PLACE_MANIFEST_FILE,
  type PlaceManifest,
} from "./place";

/**
 * Reads and validates the manifest at the root of `blob`.
 *
 * @throws When the file is not a zip, carries no `manifest.json`, or carries a
 * manifest that is malformed or names a script file it does not hold.
 */
export const readPlaceZip = async (blob: Blob): Promise<PlaceManifest> => {
  let zip: JSZip;
  try {
    // The bytes are read to an array buffer up front: `JSZip.loadAsync` reads a
    // `Blob` through the browser's `FileReader`, which Node's test environment
    // does not provide, while an array buffer loads in both.
    zip = await JSZip.loadAsync(await blob.arrayBuffer());
  } catch {
    throw new Error("not a zip a place was saved as");
  }

  const entry = zip.file(PLACE_MANIFEST_FILE);
  if (entry === null) {
    throw new Error(`no ${PLACE_MANIFEST_FILE} at the zip's root`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(await entry.async("text"));
  } catch {
    throw new Error(`${PLACE_MANIFEST_FILE} is not valid JSON`);
  }

  if (!isPlaceManifest(parsed)) {
    throw new Error(
      `${PLACE_MANIFEST_FILE} is not a place manifest this can open`,
    );
  }

  for (const file of parsed.scripts ?? []) {
    if (zip.file(file) === null) {
      throw new Error(
        `the manifest names "${file}", which the zip does not hold`,
      );
    }
  }

  return parsed;
};
