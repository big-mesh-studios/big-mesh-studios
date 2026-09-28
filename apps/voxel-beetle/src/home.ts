// Where the model being edited lives, if it lives anywhere yet.
//
// A model is always kept in the browser as it is worked on, but that is not
// somewhere it can be found from — it is this browser and nowhere else. Beyond
// that it may have a home: a file on disk. Saving writes back to the home it
// already has, and saving it somewhere new gives it a different one.
//
// Naming that in one place is what keeps the two apart from each other. Held as
// separate facts they drift: opening one model would leave a stale handle
// behind, and the next save would quietly write the wrong model over an
// unrelated file.
export type Home =
  | { kind: "nowhere" }
  | { kind: "file"; id: string; handle: FileSystemFileHandle; name: string };

/** What to call the model as things stand, for a title or a save dialogue. */
export function homeName(home: Home): string {
  return home.kind === "nowhere" ? "model" : home.name;
}

/** What the save dialogue offers as a file name, with the extension already on. */
export function fileName(home: Home): string {
  return `${homeName(home)}.cvox`;
}
