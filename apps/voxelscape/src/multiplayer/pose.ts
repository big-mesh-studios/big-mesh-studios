// The multiplayer wire pose: what every player broadcasts to its neighbors —
// cube centre in world units plus heading. Everything else about a player
// (velocity, ground contact) is client-side physics that remote clients
// recompute locally, so this is the entire network-relevant surface of the
// `Player` object.
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

const round = (n: number, digits: number): number => {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
};

/** Serializes a pose to its wire form (compact JSON, rounded fields). */
export const encodePose = (m: PoseMessage): string =>
  JSON.stringify({
    v: 1,
    seq: m.seq,
    t: Math.round(m.t),
    x: round(m.x, 2),
    y: round(m.y, 2),
    z: round(m.z, 2),
    yaw: round(m.yaw, 4),
    pitch: round(m.pitch, 4),
  });

const isPoseMessage = (v: unknown): v is PoseMessage => {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const r = v as Record<string, unknown>;
  return (
    r.v === 1 &&
    typeof r.seq === "number" &&
    typeof r.t === "number" &&
    typeof r.x === "number" &&
    typeof r.y === "number" &&
    typeof r.z === "number" &&
    typeof r.yaw === "number" &&
    typeof r.pitch === "number"
  );
};

/** Parses a data-channel chunk back into a pose message, or null when malformed. */
export const decodePose = (chunk: unknown): PoseMessage | null => {
  if (typeof chunk !== "string" && !(chunk instanceof Uint8Array)) {
    return null;
  }
  try {
    const parsed = JSON.parse(
      typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk),
    ) as unknown;
    return isPoseMessage(parsed) ? parsed : null;
  } catch {
    return null;
  }
};
