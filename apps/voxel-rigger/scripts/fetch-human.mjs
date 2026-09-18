// Fetches a royalty-free human character and trims it down to a rig with a few
// clips and no mesh.
//
// The source is the KayKit Adventurers pack by Kay Lousberg, released CC0. Its
// characters ship with a full set of animations and a mesh, and the mesh and
// IK controls are not wanted here: this editor draws voxel parts, not the
// character, and drops the control bones so the rig on screen is the handful
// of joints a body actually needs. What is kept — the joint tree and four
// clips — is written as a small glb.
//
//     node scripts/fetch-human.mjs
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const SOURCE =
  "https://raw.githubusercontent.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0/main/addons/kaykit_character_pack_adventures/Characters/gltf/Barbarian.glb";

/** The clips kept: a walk, a run, a jump and an idle. */
const KEEP = new Set(["Idle", "Walking_A", "Running_A", "Jump_Full_Short"]);

/** Bones that only carry the rig — IK targets and twist controls — dropped
 * so the skeleton on screen is the fifteen joints a body is posed on. */
const DROP_PREFIXES = [
  "kneeIK",
  "control-",
  "heelIK",
  "IK-",
  "elbowIK",
  "handIK",
  "hand.",
  "handslot.",
  "toes.",
];

const dropped = (name) =>
  DROP_PREFIXES.some((prefix) => name.startsWith(prefix));

const JSON_CHUNK = 0x4e4f534a;
const BIN_CHUNK = 0x004e4942;

/** The JSON and binary chunks a `.glb` is made of. */
function parseGlb(buffer) {
  let offset = 12;
  let json;
  let bin;
  const length = buffer.readUInt32LE(8);

  while (offset < length) {
    const chunkLength = buffer.readUInt32LE(offset);
    const chunkType = buffer.readUInt32LE(offset + 4);
    const data = buffer.subarray(offset + 8, offset + 8 + chunkLength);

    if (chunkType === JSON_CHUNK) {
      json = JSON.parse(data.toString("utf8"));
    } else if (chunkType === BIN_CHUNK) {
      bin = data;
    }

    offset += 8 + chunkLength;
  }

  return { json, bin };
}

/** A `.glb` holding `json` and `bin`. */
function writeGlb(json, bin) {
  const jsonBytes = Buffer.from(JSON.stringify(json), "utf8");
  const jsonPad = (4 - (jsonBytes.length % 4)) % 4;
  const jsonChunk = Buffer.concat([jsonBytes, Buffer.alloc(jsonPad, 0x20)]);
  const binPad = (4 - (bin.length % 4)) % 4;
  const binChunk = Buffer.concat([bin, Buffer.alloc(binPad, 0)]);

  const total = 12 + 8 + jsonChunk.length + 8 + binChunk.length;
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(total, 8);

  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(jsonChunk.length, 0);
  jsonHeader.writeUInt32LE(JSON_CHUNK, 4);

  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(binChunk.length, 0);
  binHeader.writeUInt32LE(BIN_CHUNK, 4);

  return Buffer.concat([header, jsonHeader, jsonChunk, binHeader, binChunk]);
}

/** The children of a dropped node are lifted to the node above it, so a joint
 * is never lost when the control bone carrying it is taken away. */
function keptChildren(nodes, keep, index) {
  const out = [];

  for (const child of nodes[index].children ?? []) {
    if (keep[child]) {
      out.push(child);
    } else {
      out.push(...keptChildren(nodes, keep, child));
    }
  }

  return out;
}

function trim(json, bin) {
  const oldNodes = json.nodes;
  const keep = oldNodes.map((node) => !dropped(node.name ?? ""));
  const newIndex = new Map();
  let count = 0;
  keep.forEach((held, index) => {
    if (held) {
      newIndex.set(index, count++);
    }
  });

  const nodes = oldNodes
    .map((node, index) => {
      if (!keep[index]) {
        return undefined;
      }
      const copy = { ...node };
      delete copy.children;
      delete copy.mesh;
      delete copy.camera;
      delete copy.skin;
      const children = keptChildren(oldNodes, keep, index).map((child) =>
        newIndex.get(child),
      );
      if (children.length > 0) {
        copy.children = children;
      }
      return copy;
    })
    .filter((node) => node !== undefined);

  for (const skin of json.skins ?? []) {
    skin.joints = skin.joints
      .filter((joint) => keep[joint])
      .map((joint) => newIndex.get(joint));
    if (skin.skeleton !== undefined) {
      skin.skeleton = keep[skin.skeleton]
        ? newIndex.get(skin.skeleton)
        : skin.joints[0];
    }
  }

  json.scenes = json.scenes.map((scene) => ({
    ...scene,
    nodes: (scene.nodes ?? [])
      .filter((node) => keep[node])
      .map((node) => newIndex.get(node)),
  }));

  const animations = [];
  for (const animation of json.animations ?? []) {
    if (!KEEP.has(animation.name)) {
      continue;
    }

    const channels = animation.channels.filter(
      (channel) => keep[channel.target.node],
    );
    const samplerMap = new Map();
    const samplers = [];

    for (const channel of channels) {
      if (!samplerMap.has(channel.sampler)) {
        samplerMap.set(channel.sampler, samplers.length);
        samplers.push(animation.samplers[channel.sampler]);
      }
      channel.target.node = newIndex.get(channel.target.node);
      channel.sampler = samplerMap.get(channel.sampler);
    }

    animations.push({ ...animation, channels, samplers });
  }

  return { ...json, nodes, animations, keep };
}

/** The accessors the trimmed file still uses, keyed by their old index. */
function usedAccessors(json) {
  const used = new Set();

  for (const animation of json.animations ?? []) {
    for (const sampler of animation.samplers) {
      used.add(sampler.input);
      used.add(sampler.output);
    }
  }

  for (const skin of json.skins ?? []) {
    if (skin.inverseBindMatrices !== undefined) {
      used.add(skin.inverseBindMatrices);
    }
  }

  return used;
}

/** Rewrites the file to hold only the accessors, buffer views and bytes the
 * kept animations and skin still read. */
function repack(json, bin) {
  const used = usedAccessors(json);
  const accessorIndex = new Map();
  const accessors = [];

  json.accessors.forEach((accessor, index) => {
    if (used.has(index)) {
      accessorIndex.set(index, accessors.length);
      accessors.push({ ...accessor });
    }
  });

  const viewIndex = new Map();
  const bufferViews = [];

  for (const accessor of accessors) {
    if (accessor.bufferView === undefined) {
      continue;
    }
    if (!viewIndex.has(accessor.bufferView)) {
      viewIndex.set(accessor.bufferView, bufferViews.length);
      bufferViews.push({ ...json.bufferViews[accessor.bufferView] });
    }
    accessor.bufferView = viewIndex.get(accessor.bufferView);
  }

  const pieces = [];
  let total = 0;
  for (const view of bufferViews) {
    const start = view.byteOffset ?? 0;
    const pad = (4 - (total % 4)) % 4;
    if (pad > 0) {
      pieces.push(Buffer.alloc(pad));
      total += pad;
    }
    pieces.push(bin.subarray(start, start + view.byteLength));
    view.byteOffset = total;
    total += view.byteLength;
  }
  const packed = Buffer.concat(pieces, total);

  for (const animation of json.animations ?? []) {
    for (const sampler of animation.samplers) {
      sampler.input = accessorIndex.get(sampler.input);
      sampler.output = accessorIndex.get(sampler.output);
    }
  }
  for (const skin of json.skins ?? []) {
    if (skin.inverseBindMatrices !== undefined) {
      skin.inverseBindMatrices = accessorIndex.get(skin.inverseBindMatrices);
    }
  }

  const trimmed = {
    ...json,
    accessors,
    bufferViews,
    buffers: [{ byteLength: packed.length }],
  };
  for (const key of [
    "meshes",
    "materials",
    "textures",
    "images",
    "samplers",
    "cameras",
  ]) {
    delete trimmed[key];
  }

  return { json: trimmed, bin: packed };
}

const response = await fetch(SOURCE);
if (!response.ok) {
  throw new Error(`Could not fetch the character: ${response.status}`);
}

const source = Buffer.from(await response.arrayBuffer());
const parsed = parseGlb(source);
const kept = trim(parsed.json, parsed.bin);
const packed = repack(kept, parsed.bin);
const out = writeGlb(packed.json, packed.bin);

await mkdir(join(root, "public", "animations"), { recursive: true });
await writeFile(join(root, "public", "animations", "human.glb"), out);
console.log(
  `wrote public/animations/human.glb (${packed.json.nodes.length} bones, ` +
    `${packed.json.animations.length} clips, ${out.length} bytes)`,
);
