import { Note, Sample } from "../Sample";

/**
 * The plan: the one handler that runs before the world exists, and the six
 * shapes a place is written in. The rule that catches every newcomer is the
 * coordinate one — the plan speaks voxels, everything after it speaks feet.
 */
export function TerrainWithOnPlan() {
  return (
    <section class="guide" id="terrain-with-onplan">
      <h2>Terrain, with onPlan</h2>

      <p>
        Everything else in a place script happens during play. One thing does
        not: the terrain. A place&rsquo;s terrain is built once, before the
        first fill, by a handler registered with <code>onPlan</code>. The world
        calls it exactly once, with the place&rsquo;s seed and the region it may
        build in, and whatever plan string it returns becomes the land.
      </p>

      <Sample caption="A plan handler, from the Cube Cavern demo">
        {`import { onPlan } from "voxelscape";
import { hubShapes } from "./hub-level";

onPlan(() => JSON.stringify(hubShapes()));`}
      </Sample>

      <h3>What it is given</h3>
      <p>
        The argument is a JSON string, not an object, because it crosses the
        sandbox boundary as text. It parses to a <code>PlanContext</code>: the{" "}
        <code>seed</code> the place&rsquo;s world is generated from, and the{" "}
        <code>region</code> — a voxel box, inclusive at both corners — the plan
        may address. The return value is the same: a JSON string, parsing to a{" "}
        <code>LevelPlan</code>, or a bare array of shapes.
      </p>
      <p>
        Seed from the context rather than from anything else. Every peer
        generating this place has the same seed, so a plan that uses it lays the
        same land in every peer&rsquo;s world, and a plan that ignores it lays
        down whatever the local machine&rsquo;s <code>Math.random</code>{" "}
        produced.
      </p>

      <h3>The six shapes</h3>
      <p>
        A plan is a list of <strong>plan shapes</strong>, and there are six.
        Each carries a <code>kind</code> and its own fields, and the{" "}
        <a href="reference.html#shape-box">reference</a> draws every one of
        them:
      </p>
      <ul>
        <li>
          <code>box</code> — an axis-aligned voxel box, the workhorse.
        </li>
        <li>
          <code>road</code> — a flat strip between two points, for a path.
        </li>
        <li>
          <code>house</code> — a box with wall, roof, and floor depths, so a
          building gets a shell and an interior in one shape.
        </li>
        <li>
          <code>stairs</code> — a flight along one axis, with its own step,
          rise, and run.
        </li>
        <li>
          <code>ramp</code> — a walkable slope between two points.
        </li>
        <li>
          <code>surface</code> — a box skimmed with a different block, which is
          how a place gets a desert without becoming a different world.
        </li>
      </ul>

      <Sample caption="A ground, a building, and a road — the shapes side by side">
        {`import { blocks, onPlan } from "voxelscape";

onPlan((contextJson) => {
  const { region } = JSON.parse(contextJson);
  const b = blocks;
  const y = region.min[1];
  return JSON.stringify({
    structures: [
      // The ground: a slab of dirt, with a skin of grass skimmed over it.
      { kind: "box", min: [region.min[0], y - 2, region.min[2]], max: [region.max[0], y - 1, region.max[2]], id: b.dirt },
      { kind: "surface", min: [region.min[0], y, region.min[2]], max: [region.max[0], y, region.max[2]], depth: 1, id: b.grass },
      // A house, which brings its own walls, roof, and floor.
      { kind: "house", at: [8, y + 1, 8], size: [6, 5, 6], wall: 1, roof: 1, floor: 1 },
    ],
  });
});`}
      </Sample>

      <Note>
        A plan is in <strong>voxel</strong> coordinates; everything after it is
        in <strong>world feet</strong>. One voxel is two feet, so a plan
        coordinate is a world coordinate halved. Getting this wrong is the
        single most common way a place ends up floating in the sky or buried,
        and it is worth writing the conversion down at the top of the file — the
        demos do exactly that.
      </Note>

      <h3>Shaping the same land after the fact</h3>
      <p>
        A plan is not the only way to build. The <code>structure</code> effect
        stamps the same shapes into the running world during play, which is how
        a demo builds a floor per run rather than per place, and{" "}
        <code>block-set</code>, <code>block-fill</code>, and{" "}
        <code>block-clear</code> move single voxels and boxes. A scripted block
        edit travels the same path a player&rsquo;s own edit does — overlay,
        mesh, light, save, and broadcast — so it persists and reconciles exactly
        as a dug one does.
      </p>
      <p>
        The <strong>level editor</strong> ({"/place:level-editor"}) is a third
        route: a place can ship voxel edits made by hand, the same ones a player
        would make, and they are loaded before the plan is asked for anything.
      </p>
    </section>
  );
}
