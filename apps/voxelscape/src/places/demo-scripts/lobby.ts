// The "Lobby" demo's place script — the world at the site's own root: a round
// terrace of grass and stone ringed by nine walk-in nether-portal frames and
// holding an arcade machine. Walking into a portal teleports to the demo its
// label names; approaching the arcade and using it opens the place catalog, the
// search over published places anyone can play.
//
// The terrace is the plan: the terrain graded flat, the ground skinned with
// dirt and grass, a stone hub under the spawn, and one obsidian frame per
// portal. The running world — the teleport zones, the churning violet rifts
// inside the frames, the glow lights, the labels, the arcade prop, and the use
// prompt on it — is raised on the first tick, like every demo here.
import {
  blocks,
  createBillboard,
  createLight,
  createParticle,
  createProp,
  createRift,
  dispatch,
  log,
  onPlan,
  onTick,
  openCatalog,
  teleport,
} from "voxelscape";

/** The voxel row the terrace is graded to; its top sits at world y `GROUND * 2`. */
const GROUND = 30;
/** The world height of the terrace top, and the height a player's feet stand at. */
const FEET = GROUND * 2 + 2;
/** How many voxels the opening reaches either side of the portal's centre. */
const OPEN_HALF = 1;
/** The voxel row the opening's top sits on. */
const OPEN_TOP = GROUND + 4;
/** The voxel row the lintel sits on, one above the opening. */
const LINTEL_ROW = OPEN_TOP + 1;
/** The radius of the ring the portals stand on, in voxels from the spawn. */
const RING_RADIUS = 32;
/** The violet every portal churns and glows with, the nether portal's own. */
const PORTAL_COLOR: [number, number, number] = [0.55, 0.16, 0.9];

/** Every walk-in portal: the demo it opens, the label above it, and its turn around the ring. */
const PORTALS: Array<[string, string, number]> = [
  ["get-a-snack-at-4-am", "Get a Snack at 4 AM", 0],
  ["late-to-school", "Late to School", 40],
  ["zombies", "Zombies", 80],
  ["zombies-mansion", "Zombies: The Mansion", 120],
  ["dont-poop-yourself-at-school", "Don't Poop Yourself at School", 160],
  ["a-dusty-trip", "A Dusty Trip", 200],
  ["baldi-basics", "Baldi's Basics", 240],
  ["cube-cavern", "Cube Cavern", 280],
  ["raise-a-floppa", "Raise a Floppa", 320],
];

let started = false;

onPlan(() => {
  const b = blocks;
  const shapes: unknown[] = [];
  const box = (
    x0: number,
    y0: number,
    z0: number,
    x1: number,
    y1: number,
    z1: number,
    id: number,
  ): void => {
    shapes.push({ kind: "box", min: [x0, y0, z0], max: [x1, y1, z1], id });
  };
  // The terrace graded flat, then skinned, so every frame stands on level
  // ground whatever the terrain raised before it.
  shapes.push({
    kind: "surface",
    min: [-90, 0, -90],
    max: [90, 0, 90],
    level: GROUND,
    depth: 2,
    id: b.grass,
  });
  box(-90, 0, -90, 90, GROUND - 1, 90, b.dirt);
  box(-90, GROUND, -90, 90, GROUND, 90, b.grass);
  // The hub: a stone terrace with an ice spawn pad at its centre and an ice
  // plinth for the arcade.
  box(-45, GROUND, -45, 45, GROUND, 45, b.greystone);
  box(-2, GROUND, -2, 2, GROUND, 2, b.ice);
  box(-2, GROUND, 22, 2, GROUND, 26, b.ice);

  for (const [_id, _name, degrees] of PORTALS) {
    const rad = (degrees * Math.PI) / 180;
    const vx = Math.round(Math.sin(rad) * RING_RADIUS);
    const vz = Math.round(Math.cos(rad) * RING_RADIUS);
    // A nether portal is a one-voxel-thick obsidian ring with a walk-through
    // hole: two posts and a lintel, open to the ground. It faces the hub,
    // standing in the x column when the portal is east or west of it and in the
    // z column when it is north or south.
    if (Math.abs(vx) >= Math.abs(vz)) {
      box(
        vx,
        GROUND + 1,
        vz - OPEN_HALF - 1,
        vx,
        OPEN_TOP,
        vz - OPEN_HALF - 1,
        b.obsidian,
      );
      box(
        vx,
        GROUND + 1,
        vz + OPEN_HALF + 1,
        vx,
        OPEN_TOP,
        vz + OPEN_HALF + 1,
        b.obsidian,
      );
      box(
        vx,
        LINTEL_ROW,
        vz - OPEN_HALF - 1,
        vx,
        LINTEL_ROW,
        vz + OPEN_HALF + 1,
        b.obsidian,
      );
    } else {
      box(
        vx - OPEN_HALF - 1,
        GROUND + 1,
        vz,
        vx - OPEN_HALF - 1,
        OPEN_TOP,
        vz,
        b.obsidian,
      );
      box(
        vx + OPEN_HALF + 1,
        GROUND + 1,
        vz,
        vx + OPEN_HALF + 1,
        OPEN_TOP,
        vz,
        b.obsidian,
      );
      box(
        vx - OPEN_HALF - 1,
        LINTEL_ROW,
        vz,
        vx + OPEN_HALF + 1,
        LINTEL_ROW,
        vz,
        b.obsidian,
      );
    }
  }
  return JSON.stringify(shapes);
});

/** Stands one portal's zone, rift, glow, swirl, and label. */
function openPortal(id: string, name: string, degrees: number): void {
  const rad = (degrees * Math.PI) / 180;
  const vx = Math.round(Math.sin(rad) * RING_RADIUS);
  const vz = Math.round(Math.cos(rad) * RING_RADIUS);
  const eastWest = Math.abs(vx) >= Math.abs(vz);
  // The centre of the 3x4-voxel opening, in world units.
  const cx = vx * 2 + 1;
  const cz = vz * 2 + 1;
  const cy = (GROUND + 1) * 2 + 4;
  const gate = `gate-${id}`;
  // The zone is the opening's own volume, so a player steps through the frame
  // rather than brushing its side; the facing axis reaches a little past the
  // one-voxel frame so entering the mouth is enough.
  dispatch("zone", {
    id: gate,
    name,
    min: [cx - (eastWest ? 2 : 3), cy - 4, cz - (eastWest ? 3 : 2)],
    max: [cx + (eastWest ? 2 : 3), cy + 4, cz + (eastWest ? 3 : 2)],
  });
  createRift({
    id: `${gate}-rift`,
    x: cx,
    y: cy,
    z: cz,
    width: 6,
    height: 8,
    yaw: eastWest ? Math.PI / 2 : 0,
    color: PORTAL_COLOR,
  });
  createParticle({
    id: `${gate}-swirl`,
    kind: "spark",
    x: cx,
    y: cy - 2,
    z: cz,
    color: PORTAL_COLOR,
    size: 0.35,
    spread: 1.4,
    lifeMs: 1600,
    loop: true,
  });
  createLight({
    id: `${gate}-glow`,
    x: cx,
    y: cy,
    z: cz,
    color: PORTAL_COLOR,
    range: 12,
    intensity: 1.3,
  });
  createBillboard({
    id: `${gate}-label`,
    text: name,
    x: cx,
    y: cy + 8,
    z: cz,
    scale: 1.1,
  });
}

/** Raises the running world: a pinned noon, every portal, and the arcade. */
function open(): void {
  dispatch("time", { seconds: 12 * 60 * 60, speed: 0 });
  for (const [id, name, degrees] of PORTALS) {
    openPortal(id, name, degrees);
  }
  createProp({
    id: "arcade",
    model: "arcade",
    x: 0,
    z: 24,
    y: FEET,
    name: "Arcade Machine",
    height: 2.4,
    solid: true,
  });
  dispatch("prompt", {
    id: "search-places",
    entityId: "arcade",
    verb: "Search places",
    range: 6,
  });
  log("the lobby is open");
}

onTick((_clockMs, events) => {
  if (!started) {
    started = true;
    open();
  }
  for (const event of events) {
    if (event.kind === "zone-entered" && event.zoneId !== undefined) {
      const next = PORTALS.find(([id]) => `gate-${id}` === event.zoneId);
      if (next !== undefined) {
        teleport(`demo:${next[0]}`);
      }
    } else if (
      event.kind === "prompt-triggered" &&
      event.promptId === "search-places"
    ) {
      openCatalog();
    }
  }
});
