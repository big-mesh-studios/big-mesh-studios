// Pure logic for the hardware occlusion culler, with no DOM, GPU or renderer
// dependency so it can be unit-tested by feeding it synthetic readbacks.
//
// The culler learns what is visible by drawing the world's chunks into an
// offscreen target in one flat colour each — the chunk's slot id packed into a
// 24-bit RGB value — reading the pixels back, and keeping the set of ids that
// actually won a pixel. A chunk whose id never appears is behind something
// else, real or probe, and is not drawn on the main pass until a later query
// sees it again. The probe uses the very geometry the world draws, so it can
// only ever hide a chunk that is genuinely covered: visibility is read off the
// same depth the real render uses, not guessed in the CPU.

/**
 * Packs a chunk slot id into the three 8-bit colour channels of the flat pass.
 * Id 0 is left free as the clear colour, so a pixel the probes never painted
 * reads as no chunk at all.
 */
export const packId = (id: number): [number, number, number] => [
  id & 0xff,
  (id >>> 8) & 0xff,
  (id >>> 16) & 0xff,
];

/** The chunk slot id a flat-pass pixel's three 8-bit channels encode. */
export const unpackId = (r: number, g: number, b: number): number =>
  r | (g << 8) | (b << 16);

/**
 * The colour, 0..255 per channel, a flat-pass probe paints each of its
 * vertices in for `id`. The probe material multiplies it back into the 0..1
 * range the shader writes, so the readback rounds to exactly `id` per channel.
 */
export const probeColor = (id: number): [number, number, number] => {
  const [r, g, b] = packId(id);
  return [r / 255, g / 255, b / 255];
};

/**
 * The set of `chunkIds` that appear anywhere in one flat-pass readback. Walks
 * every pixel's first three channels, so a chunk with even a corner of a pixel
 * is counted; the rest of the buffer (alpha, and ids no chunk uses) is skipped
 * by construction.
 */
export const scanVisible = (
  pixels: Uint8Array,
  chunkIds: Iterable<number>,
): Set<number> => {
  let max = 0;
  for (const id of chunkIds) {
    if (id > max) {
      max = id;
    }
  }
  const seen = new Uint8Array(max + 1);
  for (let i = 0; i < pixels.length; i += 4) {
    const id = unpackId(pixels[i], pixels[i + 1], pixels[i + 2]);
    if (id > 0 && id <= max) {
      seen[id] = 1;
    }
  }
  const visible = new Set<number>();
  for (let id = 1; id <= max; id++) {
    if (seen[id] === 1) {
      visible.add(id);
    }
  }
  return visible;
};

/** The scheduling knobs of one culler: how often and how urgently it queries. */
export interface OcclusionTiming {
  /** Frames to hold a query's result before asking the GPU again. */
  intervalFrames: number;
  /**
   * World distance the camera must move since the last query before a new one
   * runs immediately — a player crossing a chunk boundary has stepped into
   * territory the stale result has not seen. Compared as a square against the
   * squared camera movement.
   */
  moveFastTrack: number;
  /**
   * Cosine threshold: when the camera's forward direction has turned this far
   * since the last query, a new one runs immediately — a view the stale result
   * never looked at cannot be trusted to keep hiding what it hides.
   */
  turnFastTrack: number;
}

/**
 * Whether a fresh query is owed this frame: the interval elapsed, the camera
 * moved far enough, or it has turned far enough that the stored result no
 * longer describes the view. Movement and turn are measured from whatever the
 * previous query recorded, and a query answers for the whole screen, so either
 * fast track forces an answer to the new view instead of guessing from stale.
 */
export const queryIsDue = (
  framesSince: number,
  cameraMovedSquared: number,
  cameraTurnedDot: number,
  timing: OcclusionTiming,
): boolean =>
  framesSince >= timing.intervalFrames ||
  cameraMovedSquared >= timing.moveFastTrack * timing.moveFastTrack ||
  cameraTurnedDot <= timing.turnFastTrack;

/**
 * Whether a chunk lives close enough to the player to be drawn without asking
 * the occluder: within `radiusCells` superchunk cells of the player's own
 * superchunk cell, in every axis. The camera can be inside or beside a chunk
 * whose surroundings the probe cannot see, so everything on the player's cell
 * and its immediate neighbours is trusted without a query.
 */
export const isNearCell = (
  key: string,
  playerKey: string,
  radiusCells: number,
): boolean => {
  const [x, y, z] = key.split(",").map(Number);
  const [px, py, pz] = playerKey.split(",").map(Number);
  return (
    Math.abs(x - px) <= radiusCells &&
    Math.abs(y - py) <= radiusCells &&
    Math.abs(z - pz) <= radiusCells
  );
};

/** The render-target side a flat pass of `displayPixels` should use. */
export const targetSizeFor = (displayPixels: number): number =>
  Math.max(64, displayPixels >> 3);
