# A place script groups players into teams and keeps per-player values

A team game, a score, a leaderboard, and a win condition are the same few
pieces: players belong to a side, each player has a number that goes up, and
the game reads those numbers to decide who is winning. A script could keep
all of it in its own globals, keyed by the player strings it hears in facts —
and for a single peer that works — but a team assignment or a score that one
peer computes and another does not is exactly the divergence the derived tier
exists to prevent. This decision makes teams and values host state a script
writes with effects and reads with queries.

```ts
// effects.ts
| { tag: "team-define";  payload: { id: string; name?: string } }
| { tag: "player-team";  payload: { player: string; team: string } }
| { tag: "player-value"; payload: { player: string; key: string; value: number } }

// sandbox.ts's WorldQuery
getPlayerValue(did, key): number | null;
getLeaderboard(key, count): LeaderboardEntry[];
```

## Teams and values are derived state, so they author no facts

Every peer runs the same script over the same event log, so a rule that
computes "player X is on red" or "player X scored 5" computes it on every
peer and dispatches the same effect on each. Writing the value into the host
is the point; authoring a fact for it would mean N peers publishing the same
change under N ids, and the value is already a pure fold over facts the peers
agree on. `getPlayer`/`getPlayersInBox` report the team the host was told, so
a rule can read back what it set. This is the same reasoning the owned tier
uses to keep from broadcasting rule state it can recompute.

## The leaderboard is a query, and the readout is composed from the HUD

The host ranks players by a value key highest-first, ties by the player string,
and returns the first `count` — a fixed order every peer agrees on.
`showLeaderboard` in the standard library turns that into a HUD text readout
through the existing `hud` effect, so the leaderboard needs no new UI surface:
the ranking is a host read, and the line a player sees is a voice-tier HUD
element the world already knows how to draw. A script that wants names or a
different layout calls `getLeaderboard` and formats its own text.

## Considered options

- **Keep teams and scores in script globals.** Rejected: a join or a leave
  arrives as a fact on every peer, so a global counter would agree in the
  common case and quietly drift wherever a peer's rule ran on a different
  event order — the failure mode ADR 0026 was written to avoid.
- **A leaderboard UI widget with its own effect.** Rejected: it would
  duplicate the HUD, and a leaderboard is a list a script may want to style,
  translate, or compose with other text.
- **Replicate each value as a fact.** Rejected: derived state needs no writer;
  the facts already on the log are what the value folds over.

## Consequences

- `getPlayer`/`getPlayersInBox` gain the team field; `ScriptHost` keeps the
  team and value maps; `getPlayerValue`/`getLeaderboard` join `WorldQuery`.
- A script can build teams, scores, round wins, and a leaderboard with no new
  rendering, and the ranking is deterministic across peers.
- Values are bounded and flat (one finite number per key); anything richer is
  the script's own bookkeeping over facts.
