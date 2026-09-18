// Downloads the royalty-free animations the editor ships with into the public
// folder. Both are CC0: RobotExpressive by Tomás Laulhé via three.js examples,
// and Fox by PixelMannen via the Khronos glTF Sample Assets.
//
//     node scripts/fetch-animations.mjs
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const target = join(here, "..", "public", "animations");

const FILES = [
  {
    name: "RobotExpressive.glb",
    url: "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/RobotExpressive/RobotExpressive.glb",
  },
  {
    name: "Fox.glb",
    url: "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Fox/glTF-Binary/Fox.glb",
  },
];

await mkdir(target, { recursive: true });

for (const file of FILES) {
  const response = await fetch(file.url);
  if (!response.ok) {
    throw new Error(`Could not fetch ${file.url}: ${response.status}`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  await writeFile(join(target, file.name), bytes);
  console.log(`wrote ${file.name} (${bytes.byteLength} bytes)`);
}
