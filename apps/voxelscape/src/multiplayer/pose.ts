// The multiplayer pose: what every player broadcasts to its neighbors — cube
// centre in world units plus heading. Everything else about a player
// (velocity, ground contact) is client-side physics that remote clients
// recompute locally, so this is the entire network-relevant surface of the
// `Player` object. The pose's wire form lives in `messages.ts`, which wraps
// it in the shared message envelope.
export interface Pose {
  /** Cube centre, in world units. */
  x: number;
  y: number;
  z: number;
  /** Heading, in radians; 0 faces +Z. */
  yaw: number;
  /** Look elevation, in radians. */
  pitch: number;
}

/** One pose sent over a data channel: a `Pose` plus sender bookkeeping. */
export interface PoseMessage {
  /** Per-sender sequence number, for ordering and dedupe. */
  seq: number;
  /** Sender clock, milliseconds since epoch. */
  t: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
}

/** Rounds a number to `digits` decimals, keeping wire payloads small. */
export const round = (n: number, digits: number): number => {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
};
