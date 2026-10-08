# 0045 — A published place is public, and the catalog is an overlay

## Context

ADR 0044 settled what a place _is_ once published: a record in `app.bms.spacescape.place`, versioned
from the first write. It said nothing about how one is found, read, or shown. Those are the other
half of sharing, and each had an obvious-looking answer that is wrong.

**Finding a place.** There is no registry and no server of this project's own, so the only way to
answer "what has anyone published" is to ask the network. atproto offers exactly one primitive for
that: the public relay's directory of which repositories hold a record in a collection
(`com.atproto.sync.listReposByCollection`). That is a list of _accounts_, not places, so a full
listing is a directory walk followed by a read per account.

**Reading one.** A published place is public — no token, no account, no permission — and this is the
property that makes the catalog usable before anybody signs in. It also means every account a
listing reads is one this code did not choose.

**Showing one.** This engine's stated position was that _"the console is the only overlay"_ (ADR
0017), which is why it has no HUD. A catalog of places is the first thing that wanted to be more
than a line of text, and the question is whether that position was a decision or a description.

## Decision

**The read half and the write half are separate objects, the read half is anonymous, and a
network-wide listing is bounded by `ListingLimits`.**

- **`PlaceLibrary` is for anyone; `PlacePublisher` is for an account.** Reading takes no session,
  because a place is public — it builds a plain `Client` against whatever server a DID's document
  names. Writing needs the signed-in account, so it is a different object with different
  preconditions. The split is not stylistic: it is what lets browse work before sign-in.
- **The relay's directory is the whole index.** A network listing starts from
  `listReposByCollection`, reads each account it names, and deduplicates. No registry is written to,
  because writing one would be a server this project does not have and a place would then depend on
  its author having told the registry about it.
- **`ListingLimits` is the bound, and `capped` is reported rather than hidden.** A listing reads
  accounts it did not choose — some slow, some gone, one malicious — so `repos`, `placesPerAccount`,
  `places`, `bytes`, `concurrent`, `pagesPerAccount`, `requestMs` and `deadlineMs` cap it from every
  direction. `listAll` returns `{ places, capped }` and the catalog renders `the first` rather than
  `all` when it stopped early, because a list showing two hundred places and saying nothing is
  indistinguishable from a network holding two hundred.
- **One account that will not answer does not fail the listing.** Its places are passed over with a
  warning; the others arrive. The alternative makes the whole catalog hostage to any account the
  relay names.
- **The catalog is an overlay, and it is the first one that is not the console.** It is opened by
  `/place:browse` — the same command mechanism as `/place:editor` — and it lists, searches, pages,
  and loads.

### On ADR 0017's "the console is the only overlay"

It was **a decision about scripted UI, and it is still true of that.** ADR 0017's sentence is the
reason a place's effect vocabulary cannot ask for a HUD, a dialog, or a leaderboard: those would be
a subsystem with no gameplay behind it. The catalog is not that. It is the application's own
interface, built from the same primitives as the console and the editor panel, shown by a command
rather than by a script, and reachable by nobody's place. A place still cannot draw a pixel; the
application now draws three panels instead of one. The next reader should not read this as 0017
having been reversed.

## Consequences

**A catalog exists before an account does, and that is the point.** A person can open spacescape,
run `/place:browse`, load somebody else's place, and only then decide to sign in — which is the
order a new player actually arrives in.

**A network-wide listing costs up to two hundred account reads, so it is cached for the life of the
page.** Refresh is the only way to ask again. A catalog that re-read the network every time it
opened would spend a great deal of its patience redrawing a list that changes only when somebody
publishes.

**`listAll` is the largest piece of networked code in the application, and it is ported nearly
verbatim from `apps/voxelscape/src/atproto/places.ts`.** The ceilings, the bounded concurrency, the
per-request abort and the deadline are the sibling's, because they answer questions that have
nothing to do with what a place is.

**A place loaded from the catalog is adopted into the editor.** So a place somebody else published
can be edited and published under a different account, which is a feature and also the whole of the
attribution story: the record says who published _this copy_ and nothing about where the idea came
from. That is the same position voxelscape takes.

## Alternatives

**A registry collection that places announce themselves into.** One read instead of a directory
walk, and a listing that is fast and complete. It is also a second source of truth that can disagree
with the repositories it describes, it only holds places whose authors told it, and it would need a
writer that keeps working forever. The relay's directory is derived from the repositories
themselves, so it cannot be wrong about what exists.

**Read accounts only on demand, with no network-wide listing.** No ceilings to reason about and no
request the network might not answer. It also means a catalog cannot exist, and a person has to
already know an account's name to find anything — which is the state this phase exists to leave.

**Clamp the listing instead of reporting a ceiling.** Show the first two hundred and say nothing.
Simpler by one field, and it makes the catalog lie about the size of the world in the one case where
somebody would have looked further.

**A console-text browse, which is what this phase first built.** A `listAll` call printed as one
line per place, address and all. It works and it is a fifth of the code, and a list of two hundred
names in a scrollback is a list nobody scans — so it was replaced by the overlay and the command
now toggles, exactly as `/place:editor` does.

## What this does not decide

**Moderation, ranking, or search.** The catalog lists what the relay names, ordered by name then
account. There is no notion of a place being good, edited, reported, or removed, and the network
listing has no query beyond "all of them".

**Whether a place can be published anywhere but its author's own repository.** The publisher writes
to the signed-in account, full stop; there is no collaborative or delegated publishing.

**Whether a loaded place is attributed in the record.** It is not. A remix is a new place under a new
account with the same name, and nothing ties the two together.
