// @vitest-environment node
import { describe, expect, it } from "vitest";
import { Bitmap, Vector3D } from "@big-mesh-studios/maths";
import {
  centrePivot,
  sideAxes,
  sideKinds,
  type Figure,
  type Part,
} from "@big-mesh-studios/stacker/renderer";
import { saveFigure } from "@big-mesh-studios/stacker/format";
import { RemoteMonsters } from "./remote-monsters";
import type { MonsterSnapshot } from "./monster";

/** Half the box a corpse pivots about; pose.y minus this is the ground. */
const HALF_HEIGHT = 1.1;
const GROUND = 10;

const snapshot = (
  hp: number,
  overrides: Partial<MonsterSnapshot> = {},
): MonsterSnapshot => ({
  id: "m1_0_0_0",
  kind: "zombie",
  pose: {
    x: 0,
    y: GROUND + HALF_HEIGHT,
    z: 5,
    yaw: 0,
    vx: 0,
    vz: 0,
  },
  hp,
  maxHp: 20,
  state: "attack",
  wanderLeft: 0,
  cooldown: 0,
  owner: "me",
  authoritativeAt: 0,
  updatedAt: Date.now(),
  ...overrides,
});

const makeRender = (snapshots: MonsterSnapshot[]): RemoteMonsters =>
  new RemoteMonsters({ getMonsters: () => snapshots });

const cube = (
  render: RemoteMonsters,
): {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
} => render.group.children[0] as never;

/** A part of the given size, pivoting on its own middle, rooted where told. */
const partOf = (
  name: string,
  extent: { width: number; height: number; depth: number },
  root = Vector3D.create(),
): Part => ({
  name,
  sides: Object.fromEntries(
    sideKinds.map((kind) => {
      const [across, down] = sideAxes[kind];
      return [kind, Bitmap.create(extent[across], extent[down])];
    }),
  ) as Part["sides"],
  sections: [],
  turn: Vector3D.create(),
  scale: 1,
  root,
  pivot: centrePivot(extent),
  parent: null,
});

const figureOf = (...parts: Part[]): Figure => ({ parts, palette: [] });

/** The meshes a monster's copy of the figure is drawn as, top and bottom of each. */
const partMeshes = (
  render: RemoteMonsters,
): {
  position: { y: number };
  scale: { y: number };
  geometry: { attributes: { position: { array: Float32Array } } };
}[] => (render.group.children[0] as never as { children: never[] }).children;

/** How tall the whole figure one monster is drawn as stands, in world units. */
const drawnHeight = (render: RemoteMonsters): number => {
  const copy = render.group.children[0] as never as { scale: { y: number } };
  let highest = -Infinity;
  let lowest = Infinity;

  for (const mesh of partMeshes(render)) {
    const yValues = mesh.geometry.attributes.position.array.filter(
      (_v: number, index: number) => (index - 1) % 3 === 0,
    );
    highest = Math.max(
      highest,
      mesh.position.y + Math.max(...yValues) * mesh.scale.y,
    );
    lowest = Math.min(
      lowest,
      mesh.position.y + Math.min(...yValues) * mesh.scale.y,
    );
  }

  return (highest - lowest) * copy.scale.y;
};

describe("remote monsters death animation", () => {
  it("falls a dead monster over half a second, lies it out, then removes it", () => {
    const snapshots = [snapshot(20)];
    const render = makeRender(snapshots);
    render.tick(1 / 60);
    expect(render.size).toBe(1);
    expect(render.group.children.length).toBe(1);

    snapshots[0] = snapshot(0);
    render.tick(1 / 60);
    // the corpse leaves the live set but the mesh stays to animate
    expect(render.size).toBe(0);
    expect(render.group.children.length).toBe(1);

    // by half a second it has fallen flat: rotated a quarter turn back
    render.tick(0.5 - 1 / 60);
    expect(cube(render).rotation.x).toBeCloseTo(-Math.PI / 2, 5);
    // and it lies with its centre on the ground, feet having stayed planted
    expect(cube(render).position.y).toBeCloseTo(GROUND, 5);

    // after the remaining half second it is gone
    render.tick(0.5);
    expect(render.group.children.length).toBe(0);
  });

  it("keeps a corpse animating after its snapshot is forgotten", () => {
    const snapshots = [snapshot(20)];
    const render = makeRender(snapshots);
    render.tick(1 / 60);

    snapshots[0] = snapshot(0);
    render.tick(1 / 60);
    snapshots.length = 0; // the controller forgot it once the tombstone was written
    render.tick(0.3);
    expect(render.group.children.length).toBe(1);
    expect(cube(render).rotation.x).toBeLessThan(0);

    render.tick(0.8);
    expect(render.group.children.length).toBe(0);
  });

  it("removes a monster that leaves the area without a corpse", () => {
    const snapshots = [snapshot(20)];
    const render = makeRender(snapshots);
    render.tick(1 / 60);
    expect(render.group.children.length).toBe(1);

    snapshots.length = 0; // the monster walked out of the window, alive
    render.tick(1 / 60);
    expect(render.group.children.length).toBe(0);
  });

  it("draws nothing for a monster until a figure has been loaded", () => {
    const render = makeRender([snapshot(20)]);
    render.tick(1 / 60);

    expect(render.group.children.length).toBe(1);
    expect(partMeshes(render).length).toBe(0);
  });

  it("does not re-animate a corpse whose dead snapshot lingers", () => {
    const snapshots = [snapshot(20)];
    const render = makeRender(snapshots);
    render.tick(1 / 60);

    snapshots[0] = snapshot(0);
    render.tick(1 / 60);
    // the dead snapshot outlives the animation (the tombstone write was slow)
    render.tick(1);
    expect(render.group.children.length).toBe(0);
    render.tick(1 / 60);
    expect(render.group.children.length).toBe(0);
  });
});

describe("remote monsters wearing a figure", () => {
  const TORSO = { width: 10, height: 12, depth: 6 };
  const HEAD = { width: 6, height: 6, depth: 6 };

  it("draws a mesh for every part the figure has", () => {
    const render = makeRender([snapshot(20)]);
    render.setFigure(
      figureOf(
        partOf("torso", TORSO),
        partOf("head", HEAD, Vector3D.create(0, 9, 0)),
      ),
    );
    render.tick(1 / 60);

    expect(partMeshes(render).length).toBe(2);
  });

  it("stands a figure of several parts as tall as one of a single part", () => {
    const single = makeRender([snapshot(20)]);
    single.setFigure(figureOf(partOf("body", TORSO)));
    single.tick(1 / 60);

    const several = makeRender([snapshot(20)]);
    several.setFigure(
      figureOf(
        partOf("torso", TORSO),
        partOf("head", HEAD, Vector3D.create(0, 9, 0)),
      ),
    );
    several.tick(1 / 60);

    // Both stand the AI cube's 2.2 units, so the hitbox covers either.
    expect(drawnHeight(single)).toBeCloseTo(2.2, 6);
    expect(drawnHeight(several)).toBeCloseTo(2.2, 6);
  });

  it("dresses the monsters in every part of a figure saved from the editor", async () => {
    const figure: Figure = {
      ...figureOf(
        partOf("torso", TORSO),
        partOf("head", HEAD, Vector3D.create(0, 9, 0)),
      ),
      palette: [{ r: 0, g: 0, b: 0, a: 0 }],
    };
    const render = makeRender([snapshot(20)]);
    // JSZip reads a blob only where a browser's FileReader is to read it, and
    // these tests run in node, so the saved zip is handed over as its bytes.
    const saved = await (await saveFigure(figure)).arrayBuffer();

    const line = await render.loadModelFromBlob(saved as unknown as Blob);
    render.tick(1 / 60);

    // The torso stands -6..6 high about the origin and the head 6..12, so the
    // figure the file gives back is eighteen voxels high.
    expect(line).toBe("zombie model set: 10×18×6 voxel model in 2 parts");
    expect(partMeshes(render).length).toBe(2);
  });

  it("draws the monsters already in the world from a newly loaded figure", () => {
    const render = makeRender([snapshot(20)]);
    render.setFigure(figureOf(partOf("body", TORSO)));
    render.tick(1 / 60);
    expect(partMeshes(render).length).toBe(1);

    render.setFigure(
      figureOf(
        partOf("torso", TORSO),
        partOf("head", HEAD, Vector3D.create(0, 9, 0)),
      ),
    );
    render.tick(1 / 60);

    expect(render.group.children.length).toBe(1);
    expect(partMeshes(render).length).toBe(2);
    expect(drawnHeight(render)).toBeCloseTo(2.2, 6);
  });
});
