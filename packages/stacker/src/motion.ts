// What a figure does over time: the poses its parts stand in at given frames,
// and the figure those poses make at any frame between two of them.
//
// A motion says nothing about what a part looks like. It carries poses — a
// root, a turn and a size — for the parts it moves, and whoever draws a figure
// asks for the figure posed at a frame and draws that. A part the motion does
// not name stands as it was drawn.
import { Matrix3x3, Vector3D } from "@big-mesh-studios/maths";
import { turnAngles, turnMatrix, type Figure } from "./data";

/**
 * How a pose moves from the key carrying it to the key after it: at a steady
 * rate, gathering speed, losing it, both, or not at all — `hold` keeps the
 * earlier pose until the next key and then snaps to it.
 */
export type Ease = "linear" | "in" | "out" | "in-out" | "hold";

/** How a part stands: where its root sits, how it is turned, how large it is drawn. */
export interface Pose {
  root: Vector3D;
  turn: Vector3D;
  scale: number;
}

/** A pose a part stands in at one frame of a motion, and how it leaves it. */
export interface Key extends Pose {
  /** The frame it stands at, counted from the start of the motion. */
  at: number;
  /** How the pose moves from here to the key after it. */
  ease: Ease;
}

/** The keys one part stands at, in the order they stand. */
export interface PartKeys {
  /** The name of the part they move. */
  part: string;
  keys: Key[];
}

/** What a figure does over time. */
export interface Motion {
  name: string;
  /** How many frames it runs for, which is where a looping motion comes round. */
  frames: number;
  /** How many of those frames stand in a second, which is how fast it is played. */
  framesPerSecond: number;
  loop: boolean;
  /** One entry per part the motion moves, in no particular order. */
  parts: PartKeys[];
}

/** A motion that moves nothing, which is what a figure drawn but never posed has. */
export const NO_MOTION: Motion = {
  name: "",
  frames: 24,
  framesPerSecond: 12,
  loop: true,
  parts: [],
};

/** How far along the run from one key to the next a pose stands, `share` of the way there. */
function eased(ease: Ease, share: number): number {
  switch (ease) {
    case "hold":
      return 0;
    case "in":
      return share * share;
    case "out":
      return share * (2 - share);
    case "in-out":
      return share * share * (3 - 2 * share);
    default:
      return share;
  }
}

/** The element of a column-major turn at `row` and `column`. */
const at = (turn: Matrix3x3, row: number, column: number) =>
  turn[column * 3 + row];

/** A turn as the four numbers that turn about one axis by one angle. */
type Turning = [x: number, y: number, z: number, w: number];

/** `turn` as a turn about one axis, which is what can be run between two of. */
function turningOf(turn: Matrix3x3): Turning {
  const trace = at(turn, 0, 0) + at(turn, 1, 1) + at(turn, 2, 2);

  if (trace > 0) {
    const span = Math.sqrt(trace + 1) * 2;
    return [
      (at(turn, 2, 1) - at(turn, 1, 2)) / span,
      (at(turn, 0, 2) - at(turn, 2, 0)) / span,
      (at(turn, 1, 0) - at(turn, 0, 1)) / span,
      0.25 * span,
    ];
  }

  // Away from that, the axis the turn leaves longest is the one to divide by,
  // the others having come out too small to divide by safely.
  const longest =
    at(turn, 0, 0) > at(turn, 1, 1) && at(turn, 0, 0) > at(turn, 2, 2)
      ? 0
      : at(turn, 1, 1) > at(turn, 2, 2)
        ? 1
        : 2;
  const next = (longest + 1) % 3;
  const last = (longest + 2) % 3;
  const span =
    Math.sqrt(
      1 +
        at(turn, longest, longest) -
        at(turn, next, next) -
        at(turn, last, last),
    ) * 2;
  const axis = [0, 0, 0];

  axis[longest] = 0.25 * span;
  axis[next] = (at(turn, next, longest) + at(turn, longest, next)) / span;
  axis[last] = (at(turn, longest, last) + at(turn, last, longest)) / span;

  return [
    axis[0],
    axis[1],
    axis[2],
    (at(turn, last, next) - at(turn, next, last)) / span,
  ];
}

/** The turn `turning` describes. */
function turnOf([x, y, z, w]: Turning): Matrix3x3 {
  const turn = Matrix3x3.create();

  turn[0] = 1 - 2 * (y * y + z * z);
  turn[1] = 2 * (x * y + z * w);
  turn[2] = 2 * (x * z - y * w);
  turn[3] = 2 * (x * y - z * w);
  turn[4] = 1 - 2 * (x * x + z * z);
  turn[5] = 2 * (y * z + x * w);
  turn[6] = 2 * (x * z + y * w);
  turn[7] = 2 * (y * z - x * w);
  turn[8] = 1 - 2 * (x * x + y * y);

  return turn;
}

/**
 * The turn `share` of the way from `from` to `to`, taken the short way about.
 *
 * A part turned nearly the whole way round is a small turn from where it
 * started, and that small turn is the one an animation wants: an arm keyed at
 * ten degrees and again at three hundred and fifty swings twenty degrees back
 * rather than three hundred and forty forwards. A key in between is what asks
 * for the long way round.
 */
function turnBetween(from: Vector3D, to: Vector3D, share: number): Vector3D {
  const start = turningOf(turnMatrix(from));
  let end = turningOf(turnMatrix(to));
  let along =
    start[0] * end[0] +
    start[1] * end[1] +
    start[2] * end[2] +
    start[3] * end[3];

  // The same turn is described by two of these, one the negative of the other.
  // The nearer of the two is the short way about.
  if (along < 0) {
    end = [-end[0], -end[1], -end[2], -end[3]];
    along = -along;
  }

  // Two turns this close leave nothing to divide by, and running straight
  // between them is within a rounding error of the arc.
  if (along > 0.9995) {
    return turnAngles(
      turnOf(
        [0, 1, 2, 3].map(
          (i) => start[i] + (end[i] - start[i]) * share,
        ) as Turning,
      ),
    );
  }

  const angle = Math.acos(along);
  const arc = Math.sin(angle);
  const before = Math.sin((1 - share) * angle) / arc;
  const after = Math.sin(share * angle) / arc;

  return turnAngles(
    turnOf(
      [0, 1, 2, 3].map((i) => start[i] * before + end[i] * after) as Turning,
    ),
  );
}

/** The pose `share` of the way from `from` to `to`. */
function poseBetween(from: Pose, to: Pose, share: number): Pose {
  const between = (one: number, other: number) => one + (other - one) * share;

  return {
    root: Vector3D.create(
      between(from.root.x, to.root.x),
      between(from.root.y, to.root.y),
      between(from.root.z, to.root.z),
    ),
    turn: turnBetween(from.turn, to.turn, share),
    scale: between(from.scale, to.scale),
  };
}

/** `key` as the pose it carries, without what it says about leaving it. */
const poseOf = ({ root, turn, scale }: Key): Pose => ({ root, turn, scale });

/**
 * The pose `keys` stand in at `frame`, or undefined where there are none.
 *
 * Before the first key and after the last, the pose is that key's own: a motion
 * holds a part where it was keyed rather than running off past it.
 */
export function poseAt(keys: readonly Key[], frame: number): Pose | undefined {
  if (keys.length === 0) {
    return undefined;
  }

  const first = keys[0];
  const last = keys[keys.length - 1];

  if (frame <= first.at) {
    return poseOf(first);
  }

  if (frame >= last.at) {
    return poseOf(last);
  }

  let low = 0;
  let high = keys.length - 2;
  let index = 0;

  while (low <= high) {
    index = Math.floor((low + high) / 2);

    if (frame < keys[index].at) {
      high = index - 1;
    } else if (frame > keys[index + 1].at) {
      low = index + 1;
    } else {
      break;
    }
  }

  const from = keys[index];
  const to = keys[index + 1];
  const span = to.at - from.at;

  return poseBetween(
    poseOf(from),
    poseOf(to),
    eased(from.ease, span === 0 ? 1 : (frame - from.at) / span),
  );
}

/** The keys `motion` holds for the part called `part`, or none where it moves it not at all. */
export function keysFor(motion: Motion, part: string): Key[] {
  return motion.parts.find((entry) => entry.part === part)?.keys ?? [];
}

/** The key standing at `frame` for `part`, where one stands there. */
export function keyAt(
  motion: Motion,
  part: string,
  frame: number,
): Key | undefined {
  return keysFor(motion, part).find((key) => key.at === frame);
}

/**
 * `motion` with `key` standing for `part`, in place of any key already at that
 * frame, and with the part's keys left in the order they stand.
 */
export function withKey(motion: Motion, part: string, key: Key): Motion {
  const keys = keysFor(motion, part)
    .filter((standing) => standing.at !== key.at)
    .concat(key)
    .sort((one, other) => one.at - other.at);
  const entry = { part, keys };

  return {
    ...motion,
    parts: motion.parts.some((held) => held.part === part)
      ? motion.parts.map((held) => (held.part === part ? entry : held))
      : [...motion.parts, entry],
  };
}

/**
 * `motion` with the key at `frame` taken off `part`, and the part itself taken
 * off once it has no keys left.
 */
export function withoutKey(
  motion: Motion,
  part: string,
  frame: number,
): Motion {
  const keys = keysFor(motion, part).filter((key) => key.at !== frame);

  return {
    ...motion,
    parts: motion.parts.flatMap((held) =>
      held.part !== part ? [held] : keys.length === 0 ? [] : [{ part, keys }],
    ),
  };
}

/** Whether `motion` moves anything at all. */
export const movesNothing = (motion: Motion): boolean =>
  motion.parts.every(({ keys }) => keys.length === 0);

/**
 * `figure` with every part `motion` moves standing where it puts that part at
 * `frame`, and every other part standing as it was drawn.
 *
 * The drawings are the figure's own throughout: a motion moves parts about and
 * never touches what is drawn on them. A motion that moves nothing gives back
 * the figure it was handed, so a figure that has never been posed costs
 * nothing to draw.
 */
export function poseFigure(
  figure: Figure,
  motion: Motion,
  frame: number,
): Figure {
  if (movesNothing(motion)) {
    return figure;
  }

  return {
    ...figure,
    parts: figure.parts.map((part) => {
      const pose = poseAt(keysFor(motion, part.name), frame);
      return pose === undefined ? part : { ...part, ...pose };
    }),
  };
}
