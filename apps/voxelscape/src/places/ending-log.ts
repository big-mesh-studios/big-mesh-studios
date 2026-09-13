// The endings a player has already reached in a place, remembered across runs.
// A place's script runs in a fresh interpreter each time it restarts, so a game
// that unlocks something after collecting endings cannot keep that collection in
// the script; it is kept here instead, and the script reads it back through
// `engine.getEndings()`.

/** How the ending titles one place has reached are remembered. */
export interface EndingLog {
  /** The ending titles reached so far, in the order they were first reached. */
  seen(): string[];
  /** Remembers `title`, so a later run of the place reads it back. */
  record(title: string): void;
}

/**
 * The storage key one place's endings are kept under. The seed and entry file
 * name the place, so two different places never share a collection.
 *
 * @param seed The terrain seed the place runs against.
 * @param entry The script file execution starts from.
 */
export const endingLogKey = (seed: number, entry: string): string =>
  `bms-voxelscape:endings:${seed}:${entry}`;

/**
 * A place's ending log, backed by the page's own storage. Storage that is
 * absent or refuses to read or write — a private window, a full quota — reads
 * as no endings and drops a write, so the game still runs without remembering.
 */
export const createEndingLog = (key: string): EndingLog => {
  const read = (): string[] => {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) {
        return [];
      }
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) &&
        parsed.every((title) => typeof title === "string")
        ? (parsed as string[])
        : [];
    } catch {
      return [];
    }
  };
  return {
    seen: read,
    record(title: string): void {
      const seen = read();
      if (seen.includes(title)) {
        return;
      }
      seen.push(title);
      try {
        localStorage.setItem(key, JSON.stringify(seen));
      } catch {
        // A place whose storage is full still plays; the run just forgets.
      }
    },
  };
};
