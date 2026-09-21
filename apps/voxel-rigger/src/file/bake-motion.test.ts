// @vitest-environment node
import { describe, expect, it } from "vitest";
import { Bitmap, Vector3D } from "@big-mesh-studios/maths";
import {
  figurePlacement,
  poseFigure,
  sideKinds,
  type Figure,
  type Part,
  type SideKind,
} from "@big-mesh-studios/stacker/renderer";
import { loadFigure } from "@big-mesh-studios/stacker/format";
import { bakeMotion, writeAnimatedModel } from "./bake-motion";
import { DEFAULT_PALETTE } from "../rig/palette";
import { bindingFrom } from "../rig/rig";
import { posedWorld, restWorld } from "../skeleton/pose";
import {
  composeTransforms,
  quaternionFromAxisAngle,
  quaternionFromMatrix3,
} from "../skeleton/transform";
import type { Binding, BoneMotion, Skeleton } from "../skeleton/types";

/** A part standing `at` from the origin, a two-voxel cube. */
const partAt = (name: string, x: number, y: number, z: number): Part => ({
  name,
  sides: Object.fromEntries(
    sideKinds.map((kind) => [kind, Bitmap.create(2, 2)]),
  ) as Record<SideKind, Bitmap>,
  sections: [],
  root: Vector3D.create(x, y, z),
  pivot: Vector3D.create(1, 1, 1),
  turn: Vector3D.create(),
  scale: 1,
  parent: null,
});

const figure = (): Figure => ({
  parts: [partAt("torso", 0, 0, 0), partAt("arm", 0, 4, 0)],
  palette: DEFAULT_PALETTE,
});

/** A two-bone skeleton, the arm hanging five above the root. */
const skeleton = (): Skeleton => ({
  name: "test",
  bones: [
    {
      id: "root",
      name: "root",
      parent: null,
      position: Vector3D.create(0, 0, 0),
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: 1,
    },
    {
      id: "arm",
      name: "arm",
      parent: "root",
      position: Vector3D.create(0, 4, 0),
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: 1,
    },
  ],
});

/** Torso bound to the root, arm bound to the arm bone, read off their rests. */
const bindings = (skel: Skeleton, model: Figure): Binding[] => {
  const { placements } = figurePlacement(model);
  const bind = (part: string, boneId: string): Binding => {
    const bone = skel.bones.find((held) => held.id === boneId)!;
    const anchor = {
      position:
        placements[model.parts.findIndex((p) => p.name === part)].position,
      rotation: quaternionFromMatrix3(
        placements[model.parts.findIndex((p) => p.name === part)].turn,
      ),
      scale: placements[model.parts.findIndex((p) => p.name === part)].scale,
    };
    const local = bindingFrom(anchor, restWorld(skel, bone));
    return { ...local, part, bone: boneId };
  };
  return [bind("torso", "root"), bind("arm", "arm")];
};

/** The arm swinging a quarter turn about x over one second. */
const wave = (): BoneMotion => ({
  name: "wave",
  framesPerSecond: 12,
  loop: false,
  duration: 1,
  tracks: [
    {
      bone: "arm",
      keys: [
        {
          at: 0,
          ease: "linear",
          position: Vector3D.create(0, 4, 0),
          rotation: { x: 0, y: 0, z: 0, w: 1 },
          scale: 1,
        },
        {
          at: 1,
          ease: "linear",
          position: Vector3D.create(0, 4, 0),
          rotation: quaternionFromAxisAngle(
            Vector3D.create(1, 0, 0),
            Math.PI / 2,
          ),
          scale: 1,
        },
      ],
    },
  ],
});

const closeTo = (a: number, b: number) => expect(a).toBeCloseTo(b, 5);

describe("baking a rig motion into a model motion", () => {
  it("poses a bound part where the rig carried it, at each key", () => {
    const model = figure();
    const skel = skeleton();
    const binds = bindings(skel, model);
    const motion = wave();
    const baked = bakeMotion(model, skel, binds, motion);
    // The model baking poses is the flattened figure, which is what is saved.
    const flattened: Figure = {
      ...model,
      parts: model.parts.map((part) => ({ ...part, parent: null })),
    };
    const armIndex = flattened.parts.findIndex((part) => part.name === "arm");

    for (const time of [0, 1]) {
      const world = posedWorld(skel, motion, time);
      const expected = composeTransforms(world.get("arm")!, {
        position: binds[1].position,
        rotation: binds[1].rotation,
        scale: binds[1].scale,
      });
      const actual = figurePlacement(
        poseFigure(flattened, baked, Math.round(time * 12)),
      ).placements[armIndex];
      closeTo(actual.position.x, expected.position.x);
      closeTo(actual.position.y, expected.position.y);
      closeTo(actual.position.z, expected.position.z);
      closeTo(actual.scale, expected.scale);
    }
  });

  it("writes a model zip whose motion plays back the same pose", async () => {
    const model = figure();
    const skel = skeleton();
    const binds = bindings(skel, model);
    const blob = await writeAnimatedModel(model, skel, binds, wave());
    const loaded = await loadFigure(blob);

    expect(loaded.motions).toHaveLength(1);
    expect(loaded.motions[0].name).toBe("wave");

    const armIndex = loaded.parts.findIndex((part) => part.name === "arm");
    const world = posedWorld(skel, wave(), 1);
    const expected = composeTransforms(world.get("arm")!, {
      position: binds[1].position,
      rotation: binds[1].rotation,
      scale: binds[1].scale,
    });
    const actual = figurePlacement(
      poseFigure(
        { parts: loaded.parts, palette: loaded.palette },
        loaded.motions[0],
        12,
      ),
    ).placements[armIndex];
    closeTo(actual.position.x, expected.position.x);
    closeTo(actual.position.y, expected.position.y);
    closeTo(actual.position.z, expected.position.z);
    // The turn is a quarter about x, whichever way it is read back.
    closeTo(actual.turn[4], 0);
    closeTo(actual.turn[5], 1);
  });
});
