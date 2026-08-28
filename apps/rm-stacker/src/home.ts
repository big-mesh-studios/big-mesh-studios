// Where the model being edited lives, if it lives anywhere yet.
//
// A drawing is always kept in the browser as it is worked on, but that is not
// somewhere it can be found from — it is this browser and nowhere else. Beyond
// that it may have a home: a file on disk, or a record in an atproto account.
// Both behave the same way. Saving writes back to the home it already has, and
// saving it somewhere new gives it a different one.
//
// Naming that in one place is what keeps the two apart from each other. Held as
// two separate facts — a file handle over here, a published name over there —
// they drift: opening a published model would leave a stale handle behind, and
// the next save would quietly write the wrong model over an unrelated file.
import type { Dimensions3D } from "@big-mesh-studios/maths";

export type Home =
  | { kind: "nowhere" }
  | { kind: "file"; id: string; handle: FileSystemFileHandle; name: string }
  | { kind: "published"; rkey: string; name: string };

/** What to call the model as things stand, for a title or a save dialogue. */
export function homeName(home: Home): string {
  return home.kind === "nowhere" ? "sprite-stack" : home.name;
}

/** What a listing shows for a model, whichever kind of home it has. */
export interface Listed {
  home: Home;
  /** The model's picture, as an address a browser can draw from. */
  preview: string | null;
  dimensions: Dimensions3D;
  at: number;
}
