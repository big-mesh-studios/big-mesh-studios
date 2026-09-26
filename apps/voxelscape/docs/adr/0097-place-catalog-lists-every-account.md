# The place catalog lists every published place, bounded by what a page can afford

The place catalog is how a player finds anything anybody has built, and as it
stood it could only find things if you already knew whose they were: opened
with no account named, it showed an empty search box and waited to be told a
handle. That is a directory of other people's work with the directory part
missing. Publishing a place put it on its author's account and nowhere else, so
a player who made something and told nobody had no way to be found, and a player
browsing had no way to stumble across anything. This decision makes every
published place discoverable by default, and bounds what finding them costs.

## A place is discoverable because it was published, not because it was listed

The catalog opened with no account named now asks the world for every published
place (`PlaceLibrary.listAll`) instead of showing an empty search box and
waiting to be told a handle. That is a directory of other people's work with the
directory part missing: publishing a place put it on its author's account and
nowhere else, so a player who made something and told nobody had no way to be
found, and a player browsing had no way to stumble across anything. This
decision makes every published place discoverable by default, and bounds what
finding them costs.

The route is the one atproto already gives every reader for free: the public
relay's directory of which repositories hold a record in the place collection
(`com.atproto.sync.listReposByCollection`), then each of those accounts' own
servers for its place records. No account, registry, or index is named in a
place record, and none is needed. A catalog opened with an account named is
unchanged: the field starts on that account, and searching it answers with that
account's own places.

## The listing is one bounded pass, and the overlay pages what it found

`listAll` reads the relay's directory a page at a time up to 200 accounts, and
each account's records up to 20 places, and returns at most 200 places — with a
per-listing budget of eight megabytes of response, which is the ceiling that
actually matters, since a place record carries its scripts inline and a hundred
records can weigh far more than their count suggests. Accounts are read eight at
a time, so a listing spreads its requests instead of firing two hundred at a
relay, and an account that cannot be read is passed over rather than failing
the listing: one unreachable server is not a reason to hide the other two
hundred places.

Every one of those ceilings counts something, and a count does not bound time:
a request that is accepted and never answered would hold a worker of the pool
open for as long as the browser felt patient, and the listing waits for its
workers. So a listing is bounded in time as well as in weight — a request is
given ten seconds before its account counts as gone, an account is asked for at
most twenty pages before a server whose cursor never reaches its end is left
behind, and the listing stops starting new accounts after twenty seconds and
answers with what it found. What the ceilings are is gathered in one place
rather than scattered through the walk, so a test narrows them and a reader
sees the whole budget at once.

The relay's directory order is not stable, so the listing does not hand a cursor
onward for a second call to resume from. It is a single pass that stops at a
ceiling, and the overlay draws the twenty-five places it has on show at a time,
saying how many the listing found, and saying so plainly when that count is a
ceiling rather than the whole network — a listing that hid its own limits would
be indistinguishable from a network holding that many places. An account the
relay names twice is one account, read once.

## The catalog names an account per place, and navigates by repository

A network-wide row is somebody's place, so each row shows the account it came
from, as the handle that account's own identity document claims or as the
account's identifier when it has no handle that could be confirmed, and a pick
routes to that account's repository for the record's key — the place's
`handle/name` route for whoever has a handle, its `did:.../name` route
otherwise. The overlay keeps the last network-wide listing for the life of the
page and reads it again on request, because the catalog opens every time the
lobby's arcade is used and the answer changes only when somebody publishes.

## Considered options

- **A server-side index of published places.** Rejected: the world's records
  are already the index. A directory service would be a second thing to keep
  true about the same records, and a place would stop being findable the moment
  somebody's index forgot it.
- **A registry, the way model registries work.** Rejected: a registry is a list
  its own author has to add to, which is exactly the step this decision is
  removing. A place needs no claim on a list; publishing it is the claim.
- **Paging the network on demand, cursor by cursor, as the player scrolls.**
  Rejected: the relay's directory order is not stable, so a cursor does not
  identify a position, and re-reading from the top on every page would cost the
  whole directory again to show place twenty-six. One bounded pass plus the
  overlay's own paging is the same work done once.
- **Leaving a published place out of the listing when its author asks.** That
  is a registry with a "hidden" flag bolted on, and it puts every author's
  choice back in the path. The catalog lists what was published; withdrawing a
  place is deleting it.
- **A per-page view of the account a player named, kept as the only mode.** That
  is what the catalog did, and it is the problem: nothing that exists is
  reachable without knowing whose it is.

## Consequences

- `PlaceLibrary` gains `listAll`, answering a `PlaceListing`: the places found
  and whether the listing stopped at a ceiling with places or accounts left
  unread. `PlaceListing` is declared beside `PublishedPlace` in the place
  vocabulary, since it is a shape the interface area reads.
- `PlacesBrowser` opens on the network-wide listing when nothing seeded it,
  pages the result, refreshes it on request, and labels each row with the
  account that published the place.
- The `catalog` effect, the `openCatalog()` helper, and `CatalogOptions` are
  unchanged in shape: an absent or empty `query` now means every published
  place rather than an empty search box.
- `createPlaceLibrary` takes the relay to read the directory from, defaulting
  to the public relay `MonsterSync` already discovers through, so a test can
  answer for a directory that does not exist.
