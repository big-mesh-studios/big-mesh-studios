# A player's saved data lives in their own atproto repository

ADR 0076 gave a place a data table and named the page's own storage as its first
backing, with a durable one to come. This decision is that backing for the
player scope: a player's save is written as one custom record in the player's
own repository, so it follows the account across devices, and read back before
the script starts so a run picks up where another device left off.

```ts
// atproto/data.ts
DATA_COLLECTION = "app.bms.voxelscape.data";
encodeData / decodeData / parseDataRecord / dataRkey;
createAtprotoDataSource({ getClient, getRepo, place });
```

## The repository owner is the writer, which is exactly a player's save

Only the account that owns a repository can write to it, so a per-player save
belongs in that player's own repo: nobody else can change it, and every peer can
read it. One record per place, its key derived from the place address the same
way an edit chunk's is, so re-saving overwrites rather than piling up. The
record carries the values as one JSON string — a lexicon validates the
envelope, and the map inside is read back through the same filter the in-memory
table uses, so a value that is not a string, a finite number, or a boolean is
dropped rather than trusted.

Global scope has no such owner. It is one value everyone shares, and no single
account may write for everyone, so global data stays in the page's own storage
and in the session fold of `data-changed` facts — it is not made durable here.

## The table is loaded before the script, and written after a pause

A player's record is read while the place opens, before the script's first
tick, so the table the script reads is complete from the start. A change writes
to the page's own storage at once (the cache) and to the repository after a
pause, with `flush` writing any pending change out on the way down. A signed-out
player, or a record that does not exist or will not read, leaves the run with
the page's storage alone, so a place still plays.

For a value the table does not hold — a save made on another device since this
run began, or a peer's — a `data-get` effect re-reads the durable table through
the world's `refreshData` hook and answers with a `data-loaded` fact, so a
script can ask for a value it does not have without a second read API.

## Considered options

- **A shared repository for global data.** Rejected: no account may write for
  everyone, and standing up a server or relay is a different project; global
  data stays local and session-shared.
- **One record per key.** Rejected: a save is read and written whole, and one
  record per place is one call each way rather than one per value.
- **Reading a peer's save from their repo.** Rejected: the shared view of a
  save is what the `data-changed` facts already are; a per-player save is the
  player's own.
- **Making every read asynchronous.** Rejected: the table is in memory and read
  inside a step; `data-loaded` is only for a value not already held.

## Consequences

- `atproto/data.ts` holds the record's schema and the `DataSource`; the synced
  table in `place-data.ts` is unchanged in shape, so the script API does not
  move.
- A player's save now follows their account across devices; a game's progression
  reaches a signed-in player wherever they play.
- Global data and cross-device global leaderboards remain out of reach without a
  shared writer, and are recorded as such.
