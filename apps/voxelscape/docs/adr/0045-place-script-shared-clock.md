# A place reads its scripts from one peer-agreed clock

A place script's timers fire and its motions sample against the host's clock
(ADR 0036, 0039). In the running application that clock is the wall clock, and
wall clocks disagree between peers, so two players in the same place would
drive the same script from different moments: their deadlines drift and a
moving platform they both stand on disagrees. This decision picks how the
host's clock becomes a peer-agreed one once a `multi` place shares players.

## The timekeeper is the lowest DID among the players in the place

Every player knows the same candidate list: the set of DIDs in the place —
their own, plus the roster peers whose presence carries the same place
address. The lowest of those DIDs is the timekeeper, chosen by a total rule
over inputs everyone shares, so there is nothing to vote on and nothing to
broadcast. When the set changes (a player leaves, a new one arrives) the same
rule picks the new winner; this is the same "everyone derives the same answer
from shared inputs" shape the mesh already uses for handshake roles, where the
lower DID initiates a connection (ADR 0010).

Peers link to whoever they measure, because cluster selection (ADR 0010) picks
the same roster peers on every side; a link to a peer of a given candidate DID
especially lands when that peer is a timekeeper for the candidates involved,
so each side can always account its own offset to the shared reference for the
people it must hold, and a peer that has never held that DID measures the
moment one lands.

## A one-round-trip exchange measures the offset

A time exchange is one message pair over the data channel: a ping carrying the
initiator's wall-clock millisecond when it left, and an answer carrying the
responder's wall-clock millisecond when it arrived. The initiator reads its
own wall clock again when the answer lands, owns `rtt = t4 - t1` and
`offset = t2 - (t1 + t4) / 2`, and stores the offset. Samples with a round trip
beyond 10 seconds, an offset beyond a day, or a non-finite timestamp are
dropped; an exchange that never answers is dropped after half a minute. Every
open link re-measures on a cadence, so a peer whose clock drifts is re-sampled
rather than remembered.

The place clock is `wallNow + offsetTo(timekeeper)`, measured by each peer over
their own link to that peer. It is the classic NTP exchange, with a per-link
peer for the reference instead of a stratum of servers. A round trip measured
as zero — the two clock reads landed in the same millisecond — is still a
measurement; on a coarse wall clock it is no more biased than a one-millisecond
round trip.

## The reference stays the low-DID peer even before a measurement lands

The timekeeper's own offset is zero: a peer that has never exchanged with the
timekeeper reads `wallNow`, and a peer whose link is still opening reads
`wallNow` until the first answer comes back. Every peer in the place therefore
names the same DID as the reference whether or not it is measured yet, two
peers in the same place converge the moment their link measures, and a lone
player — or one whose mesh is offline — is their own timekeeper and reads the
same values a plain `Date.now` would.

## Considered options

- **Authoritative time from a fixed server.** Rejected: the world deliberately
  has no mandatory server (ADR 0010), and a central clock would make a `multi`
  place depend on one more piece of infrastructure and one more round trip to
  it before scripts could read the time at all.
- **Median-of-many samples per link.** Rejected: a single exchange's error is
  bounded by its own round trip, and the controller re-measures on a cadence
  anyway; the sample passed on is simply the lowest-rtt one kept per peer.
- **Name the timekeeper by pushing a clock message around the mesh.** Rejected:
  it is more chatty and more code than a total rule over a roster both sides
  already hold, and it ends at the same DID the rule picks anyway.

## Consequences

- Each player measures the peer they hold and reads the timekeeper's clock
  against it once a sample lands; ALONE falls back to the local wall clock.
- The place clock is a single, fresh offset — not a spread — so two peers
  agree to within the asymmetry of their paths to the timekeeper, and nothing
  more is claimed about it than that.
- The script console's `now` (SCRIPT clock seam, ADR 0036) is wired to the
  mesh controller's clock, so the host's deadlines and cutscenes read the
  shared time while multiplayer is up and `Date.now` when it is not.
- Script `setTimeout`/`Date.now` inside the sandbox already goes through the
  host clock (ADR 0036), so scripts gain the place clock for free.
