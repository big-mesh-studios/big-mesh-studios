// @vitest-environment node
// The world's human avatar as a file: the motions it carries must be the ones
// the avatar registry names, or the world draws a walking figure that never
// walks, and nothing else in the source would say so.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadFigure } from "@big-mesh-studios/stacker/format";
import {
  lastFrame,
  poseAt,
  type Motion,
} from "@big-mesh-studios/stacker/renderer";
import { AVATAR_TYPES, avatarOfModel } from "./avatars";
import { gaitPose } from "../places/voxel-figures";

const BUNDLED = join(
  import.meta.dirname,
  "..",
  "..",
  "public",
  "models",
  "player-human.zip",
);

const read = async () => {
  const bytes = new Uint8Array(readFileSync(BUNDLED));
  return loadFigure(bytes as unknown as Blob);
};

describe("the bundled human avatar", () => {
  it("is the file the registry names", () => {
    expect(avatarOfModel(AVATAR_TYPES.human.model)?.kind).toBe("human");
  });

  it("carries a motion for every role the world plays", async () => {
    const loaded = await read();
    const named = AVATAR_TYPES.human.motions!;
    expect(loaded.motions.map((motion) => motion.name).sort()).toEqual(
      [named.idle, named.walk, named.run].sort(),
    );
  });

  it("has a body of more than one part to walk", async () => {
    const loaded = await read();
    expect(loaded.parts.length).toBeGreaterThan(1);
  });

  it("moves a part through its walk, rather than holding one pose", async () => {
    const loaded = await read();
    const walk = loaded.motions.find(
      (motion) => motion.name === AVATAR_TYPES.human.motions!.walk,
    )!;
    // A stride is a swing, so some part's turn has to cover a real arc rather
    // than sit on one value: a bake that lost the skeleton would key every
    // frame the same and still pass a check for the file having motions.
    const widest = Math.max(
      ...walk.parts.map((part) => {
        const turns = part.keys.map((key) => key.turn.x);
        return Math.max(...turns) - Math.min(...turns);
      }),
    );
    expect(widest).toBeGreaterThan(1);
  });

  it("loops its motions, so a stride lands back where it started", async () => {
    const loaded = await read();
    for (const motion of loaded.motions) {
      expect(motion.loop).toBe(true);
    }
  });
});

describe("the human's motions against a gait", () => {
  /** A stride's first and last frame, which a looping clip must agree on. */
  const seam = (motion: Motion): number => lastFrame(motion);

  it("poses a walk from the phase the player's gait counts", async () => {
    const loaded = await read();
    const names = AVATAR_TYPES.human.motions!;
    const found = gaitPose(loaded.motions, names, "walk", 0.5);
    expect(found).toBeDefined();
    // The frame is inside the clip, so the pose it reads is a real one.
    expect(found!.frame).toBeGreaterThan(0);
    expect(found!.frame).toBeLessThanOrEqual(seam(found!.motion));
  });

  it("holds its legs up in a pose at every phase of a stride", async () => {
    const loaded = await read();
    const names = AVATAR_TYPES.human.motions!;
    for (let step = 0; step <= 8; step += 1) {
      const found = gaitPose(loaded.motions, names, "walk", step / 8)!;
      const keys = found.motion.parts[0].keys;
      expect(poseAt(keys, found.frame)).toBeDefined();
    }
  });
});
