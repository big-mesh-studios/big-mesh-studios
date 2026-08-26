# Cluster-based multiplayer mesh over atproto

Players sign in to atproto (ADR 0009) and form a live cluster: each player
links to only its handful of nearest peers over WebRTC, so an unbounded number
of players can coexist without any server or all-to-all mesh. Discovery runs on
atproto public data, the WebRTC handshake runs over atproto records, and the
live payload — positions and facing — travels peer-to-peer on data channels.

## Why a cluster instead of a full mesh or a server

All-to-all is O(n²): a room of 100 players means ~5,000 data channels, beyond
any browser. A central server inverts the model — it would relay every pose for
everyone, which is exactly what this project avoids. A cluster keeps each
player's degree constant: connections open to the whole candidate set (k
selected plus a small buffer, so ≤ k+buffer = 8 links), so regardless of
population the whole network carries ≤ 4n links and each player's uplink cost
is bounded.

## Topology: k-nearest by world distance

- Every player writes a **presence record** to its own repo at a low rate
  (`app.bms.voxelscape.presence`, fixed rkey `latest`, upserted so the
  collection never grows). It carries a coarse position plus the terrain seed,
  so peers can sanity-check they share the same world. Coarse by design: it
  drives _discovery and selection only_, never the real-time pose stream.
- Discovery polls the public relay's `com.atproto.sync.listReposByCollection`
  for every repo holding a presence record, then fetches each repo's `latest`
  record. This is the only permissionless global view of who is around; a
  firehose subscription can later make join/leave real-time without changing
  the records.
- `selectNeighbors` (pure, unit-tested) ranks fresh presence by horizontal
  distance, caps the selection at `k`, and applies **hysteresis**: a peer
  hovering around the cutoff stays connected through a grace window instead of
  flapping, and peers beyond a `maxDistance` are never linked even when alone.
  The k+buffer set (`candidates`) is who may _offer_ us a connection.

## Connection lifecycle

- Exactly one `MeshPeer` per peer DID. Roles are deterministic by DID (the
  lexicographically lower DID initiates), so there is never a double offer and
  never role ambiguity.
- The initiator's offer and the responder's answer each travel as one atproto
  **signal mailbox record** (`app.bms.voxelscape.signal`, rkey ordered by
  per-recipient `seq`), written to the _sender's own repo_ and polled from the
  _recipient's_ side via `listRecords` — the same put/list pattern as ADR 0009.
  Non-trickle ICE gathers every candidate into that single offer/answer, so a
  full handshake is exactly two short records and a brief polling loop.
- The responder accepts because it polls its own candidate set for inbound
  offers; a peer in our buffer we never selected is still heard. Handshakes
  time out after 20 s and retry on a 30 s cooldown, so out-of-mutual-range
  pairs fail quietly rather than hot-looping.

## Data plane and poses

Once a data channel opens, `MeshPeer.sendPose` broadcasts the player's pose
(`{x,y,z,yaw,pitch}`, the entire network-relevant surface of `Player`) at a
deliberately low rate — ~6.7 Hz while moving, a 2 s heartbeat when idle —
rounded to cut bytes. With ≤ 6 links this is a few KB/s worst case. Remote
avatars are cube meshes with handle labels (`RemotePlayers`), eased toward each
received pose; velocity and ground contact are recomputed locally per player.

## Considered options

- **Public signal mailbox now, atproto Spaces later.** atproto Spaces (the
  permissioned-data protocol, alpha Aug 2026) provides access control but not
  confidentiality, is explicitly unstable, and needs an operated space
  authority. Handshake records are ephemeral and public by design; the
  `to/kind/seq/payload` shape is transport-agnostic, so re-pointing it at a
  Space later is a swap of read/write transport, not a redesign.
- **Firehose discovery.** `subscribeRepos` gives real-time join/leave, but the
  global firehose is heavy for a browser at Bluesky scale. `listReposByCollection`
  polling is O(players) and browser-trivial; a firehose filter can layer on
  later for larger populations.
- **MeshP2P / PeerPigeon.** Spatial position-based selection isn't what these
  offer (XOR/Kademlia routing, hub signaling servers) and they'd displace the
  atproto transport entirely; `simple-peer` supplies just the SDP/ICE layer and
  the topology logic stays pure and tested here.
- **Yjs over the mesh.** CRDT pose sync is attractive for richer shared state,
  but one-way position broadcast doesn't need it; noted as a future option.
- **simple-peer's `main` entry.** Its `index.js` pulls `readable-stream` and
  `buffer`, which Vite cannot bundle without Node polyfills; the package's
  self-contained `simplepeer.min.js` browser bundle avoids that entirely.

## Consequences

- Signing in (`/connect` or a restored session) auto-starts the mesh via
  `AtprotoController.onConnected`; `/logout` stops it.
  `/multiplayer start|stop|status` controls and reports it.
  `AtprotoController` now also exposes an `AtprotoRepoClient` over its
  signed-in session.
- The mesh is built against injected seams — an `AtprotoRepoClient` (the four
  `com.atproto.repo.*` calls used, declared in `src/atproto/repo-client.ts`
  and adapted there from the `@atcute/client` `Client` of ADR 0009), a
  `PeerFactory` transport, and a discovery directory — so
  `createVoxelscape` wires the real simple-peer transport while a harness
  (`src/multiplayer/harness`) drives real `MultiplayerController`s against an
  in-memory atproto stand-in and a deterministic fake transport.
  The harness verifies the theory in-process: a pair completes a handshake
  through exactly one offer + one answer record; 30 players form a connected
  mesh with degree bounded by k+buffer and no out-of-range edges; the buffer
  and hysteresis window prevent cutoff churn (a control without them flaps);
  stopping a player removes its presence and disconnects it (restarting
  reconnects); distant clusters form independently with no cross edges; and a
  dead transport closes the link on the survivor.
- Discovery and handshake are public atproto records: presence and handshake
  traffic are visible to anyone. This is accepted — coarse positions and
  ephemeral SDP/ICE are not sensitive — and is the explicit trade for zero
  infrastructure.
- Player-authoritative poses are trivially spoofable; acceptable for a casual
  voxel game and worth revisiting if griefing appears.
- Presence writes and `listReposByCollection` polls grow with player count
  (O(n) per poll); fine at this scale, and the relay enforces practical caps.
- Connection completion is _semi-symmetric_: it requires both peers to be in
  each other's locality (the candidate set), so a player exactly on another's
  selection edge won't link. This is the intended spatial-mesh behavior.
