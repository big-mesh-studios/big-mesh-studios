// Builds the sample voxel models that demonstrate binding a stacker figure to
// an imported skeleton.
//
// Every part is named after the bone it belongs on and drawn where that bone
// rests, so importing a model and pressing "Auto-bind" lands each box on its
// joint with nothing to line up by hand. Each file is written in the same
// shape `saveFigure` writes: one folder a part, six indexed pngs each, a
// one-row palette, and a version-4 `parts.json`.
//
//     node scripts/make-models.mjs
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";
import { encode } from "fast-png";
import * as THREE from "three";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

/** `#rrggbb` as the { r, g, b, a } a palette holds. */
function hex(value) {
  const n = Number.parseInt(value.replace("#", ""), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 255 };
}

/** The six shapes a part's box is drawn on, each a solid fill of one index. */
function sides(width, height, depth, index) {
  const fill = (w, h) => {
    const data = new Uint8Array(w * h);
    data.fill(index);
    return { width: w, height: h, data };
  };

  return {
    front: fill(width, height),
    back: fill(width, height),
    left: fill(depth, height),
    right: fill(depth, height),
    top: fill(width, depth),
    bottom: fill(width, depth),
  };
}

/** `bitmap` as the eight-bit indexed png a side is written as. */
function sidePng(bitmap) {
  return encode({
    width: bitmap.width,
    height: bitmap.height,
    data: bitmap.data,
    channels: 1,
    depth: 8,
  });
}

/** The palette as a one-row four-channel png. */
function palettePng(palette) {
  const data = new Uint8Array(palette.length * 4);
  palette.forEach(({ r, g, b, a }, i) => {
    data[i * 4 + 0] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = a;
  });
  return encode({
    width: palette.length,
    height: 1,
    data,
    channels: 4,
    depth: 8,
  });
}

/** A normalized three vector as the { x, y, z } the manifest holds. */
const xyz = (v) => ({ x: v.x, y: v.y, z: v.z });

/** The three angles a quaternion turns by, in the order the rig builds them. */
function quaternionToEuler({ x, y, z, w }) {
  const m02 = 2 * (x * z + y * w);
  const m01 = 2 * (x * y - z * w);
  const m00 = 1 - 2 * (y * y + z * z);
  const m11 = 1 - 2 * (x * x + z * z);
  const m12 = 2 * (y * z - x * w);
  const m21 = 2 * (y * z + x * w);
  const m22 = 1 - 2 * (x * x + y * y);

  const upright = Math.max(-1, Math.min(1, m02));
  const out = { x: 0, y: Math.asin(upright), z: 0 };

  if (Math.abs(upright) < 0.999999) {
    out.x = Math.atan2(-m12, m22);
    out.z = Math.atan2(-m01, m00);
  } else {
    out.x = Math.atan2(m21, m11);
  }

  return out;
}

/** The turn from `from` to `to`, as the x/y/z angles the rig poses in. */
function turnBetween(from, to) {
  const dot = Math.max(-1, Math.min(1, from.dot(to)));
  const quaternion = new THREE.Quaternion();
  const axis = new THREE.Vector3().crossVectors(from, to);

  if (axis.lengthSq() < 1e-8) {
    if (dot > 0) {
      quaternion.identity();
    } else {
      quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI);
    }
  } else {
    axis.normalize();
    quaternion.setFromAxisAngle(axis, Math.acos(dot));
  }

  return quaternionToEuler(quaternion);
}

/**
 * The joints of the glb at `path`, each with the point it rests at, scaled so
 * the skeleton is `height` voxel units tall — the same scale the editor's
 * importer draws it at, so a part authored here rests where the bone does.
 */
async function jointsOf(path, height = 30) {
  const data = await readFile(join(root, path));
  const jsonLength = data.readUInt32LE(12);
  const json = JSON.parse(data.subarray(20, 20 + jsonLength).toString("utf8"));

  const nodes = json.nodes.map((def, index) => {
    const object = new THREE.Object3D();
    object.name = def.name ?? String(index);
    if (def.translation) object.position.fromArray(def.translation);
    if (def.rotation) object.quaternion.fromArray(def.rotation);
    if (def.scale) object.scale.fromArray(def.scale);
    return object;
  });
  json.nodes.forEach((def, index) => {
    for (const child of def.children ?? []) nodes[index].add(nodes[child]);
  });

  const scene = new THREE.Group();
  for (const index of json.scenes[0].nodes) scene.add(nodes[index]);
  scene.updateMatrixWorld(true);

  const jointList = json.skins[0].joints.map((index) => nodes[index]);
  const jointSet = new Set(jointList);
  const point = new THREE.Vector3();
  let low = Infinity;
  let high = -Infinity;
  for (const joint of jointList) {
    joint.getWorldPosition(point);
    low = Math.min(low, point.y);
    high = Math.max(high, point.y);
  }
  const scale = height / (high - low);

  return jointList.map((joint) => ({
    name: joint.name,
    object: joint,
    position: joint.getWorldPosition(new THREE.Vector3()).multiplyScalar(scale),
    children: joint.children.filter((child) => jointSet.has(child)),
  }));
}

/**
 * The parts a joint list makes under `config`: a box a bone, either centred on
 * the joint or spanning it to the child below.
 */
function buildParts(joints, config) {
  const byObject = new Map(joints.map((joint) => [joint.object, joint]));
  const parts = [];

  for (const joint of joints) {
    if (!config.include(joint.name)) {
      continue;
    }

    const centred = config.centred[joint.name];
    if (centred !== undefined) {
      parts.push({
        name: joint.name,
        root: xyz(joint.position),
        pivot: {
          x: centred.width / 2,
          y: centred.height / 2,
          z: centred.depth / 2,
        },
        turn: { x: 0, y: 0, z: 0 },
        scale: 1,
        parent: null,
        sections: [],
        sides: sides(
          centred.width,
          centred.height,
          centred.depth,
          config.colour(joint.name),
        ),
      });
      continue;
    }

    const { thickness, leaf } = config.proportions(joint.name);
    const child = joint.children[0];
    const childJoint = child === undefined ? undefined : byObject.get(child);
    let direction;
    let tip;

    if (childJoint !== undefined) {
      // The child's rest point is already measured in the skeleton's space, so
      // it is read against the joint's directly.
      tip = childJoint.position;
      direction = new THREE.Vector3()
        .subVectors(tip, joint.position)
        .normalize();
    } else {
      const above =
        joint.object.parent !== null
          ? byObject.get(joint.object.parent)
          : undefined;
      const from =
        above !== undefined ? above.position : new THREE.Vector3(0, 0, -1);
      direction = new THREE.Vector3().subVectors(joint.position, from);
      if (direction.lengthSq() < 1e-8) {
        direction.set(0, 1, 0);
      }
      direction.normalize();
      tip = joint.position.clone().addScaledVector(direction, leaf);
    }

    const length = Math.max(2, Math.round(joint.position.distanceTo(tip)));
    const middle = new THREE.Vector3()
      .addVectors(joint.position, tip)
      .multiplyScalar(0.5);

    parts.push({
      name: joint.name,
      root: xyz(middle),
      pivot: { x: thickness / 2, y: length / 2, z: thickness / 2 },
      turn: turnBetween(new THREE.Vector3(0, 1, 0), direction),
      scale: 1,
      parent: null,
      sections: [],
      sides: sides(thickness, length, thickness, config.colour(joint.name)),
    });
  }

  return parts;
}

const FOX = {
  glb: "public/animations/Fox.glb",
  palette: ["#df7126", "#222034", "#f5ffe8", "#8f563b"].map(hex),
  include: (name) => name !== "_rootJoint" && name !== "b_Root_00",
  centred: {
    b_Hip_01: { width: 7, height: 9, depth: 10 },
    b_Spine02_03: { width: 8, height: 8, depth: 15 },
  },
  proportions(name) {
    if (name.includes("Head")) return { thickness: 7, leaf: 8 };
    if (name.includes("Neck")) return { thickness: 4, leaf: 5 };
    if (name.includes("Hand")) return { thickness: 4, leaf: 5 };
    if (name.includes("Foot02")) return { thickness: 5, leaf: 6 };
    if (name.includes("Foot01")) return { thickness: 5, leaf: 5 };
    if (name.includes("Tail03")) return { thickness: 4, leaf: 8 };
    if (name.includes("Tail")) return { thickness: 4, leaf: 6 };
    if (name.includes("Arm")) return { thickness: 4, leaf: 6 };
    if (name.includes("Leg")) return { thickness: 4, leaf: 6 };
    return { thickness: 6, leaf: 7 };
  },
  colour(name) {
    if (name.includes("Head")) return 3;
    if (name.includes("Tail03")) return 2;
    if (name.includes("Hand") || name.includes("Foot")) return 1;
    return 0;
  },
};

/** A blocky human: a head, a body, and an upper and lower box a limb, bound to
 * the fifteen-joint rig the trimmed KayKit character carries. */
const HUMAN = {
  glb: "public/animations/human.glb",
  palette: ["#eec39a", "#5b6ee1", "#30346d", "#222034"].map(hex),
  include: (name) =>
    [
      "head",
      "spine",
      "upperarm.l",
      "lowerarm.l",
      "upperarm.r",
      "lowerarm.r",
      "upperleg.l",
      "lowerleg.l",
      "upperleg.r",
      "lowerleg.r",
    ].includes(name),
  centred: {
    spine: { width: 8, height: 12, depth: 4 },
  },
  proportions(name) {
    if (name === "head") return { thickness: 8, leaf: 8 };
    if (name.startsWith("upperarm") || name.startsWith("lowerarm")) {
      return { thickness: 4, leaf: 6 };
    }
    return { thickness: 4, leaf: 6 };
  },
  colour(name) {
    if (name === "spine") return 1;
    if (name.startsWith("upperleg") || name.startsWith("lowerleg")) return 2;
    if (name.startsWith("upperarm") || name.startsWith("lowerarm")) return 0;
    return 0;
  },
};

/** `parts` and `palette` as the `.zip` an rm-stacker editor opens. */
async function figureZip(parts, palette) {
  const zip = new JSZip();

  for (const part of parts) {
    for (const [side, bitmap] of Object.entries(part.sides)) {
      zip.file(`${part.name}/${side}.png`, sidePng(bitmap));
    }
  }

  const manifest = {
    version: 4,
    parts: parts.map(
      ({ name, root, pivot, turn, scale, parent, sections }) => ({
        name,
        root,
        pivot,
        turn,
        scale,
        parent,
        sections,
      }),
    ),
    motions: [],
  };

  zip.file("parts.json", JSON.stringify(manifest, null, 2));
  zip.file("palette.png", palettePng(palette));

  return zip.generateAsync({ type: "nodebuffer" });
}

const MODELS = [
  { file: "fox.zip", config: FOX },
  { file: "human.zip", config: HUMAN },
];

await mkdir(join(root, "public", "models"), { recursive: true });

for (const { file, config } of MODELS) {
  const joints = await jointsOf(config.glb);
  const parts = buildParts(joints, config);
  const bytes = await figureZip(parts, config.palette);
  await writeFile(join(root, "public", "models", file), bytes);
  console.log(
    `wrote public/models/${file} (${parts.length} parts, ${bytes.length} bytes)`,
  );
}
