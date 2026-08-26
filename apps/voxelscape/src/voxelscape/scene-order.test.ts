// @vitest-environment node
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SOURCE_ROOT = new URL("..", import.meta.url).pathname;

/** The one module allowed to put things in the scene, relative to `src`. */
const COMPOSER = "voxelscape/create-voxelscape.ts";

const sourceFiles = (directory: string): string[] => {
  const found: string[] = [];
  for (const entry of readdirSync(join(SOURCE_ROOT, directory), {
    withFileTypes: true,
  })) {
    const path = directory === "" ? entry.name : `${directory}/${entry.name}`;
    if (entry.isDirectory()) {
      found.push(...sourceFiles(path));
    } else if (path.endsWith(".ts") || path.endsWith(".tsx")) {
      found.push(path);
    }
  }
  return found;
};

describe("scene draw order", () => {
  // Draw order is the order the renderer walks the scene graph in, so a module
  // that adds itself to the scene decides where it lands by when it happens to
  // run. That is how a peer's avatar came to be drawn over the water it was
  // standing in: it joined minutes after the water pass was added. Every
  // component now owns a group and the composer places those groups in a
  // declared order, which only holds while nothing else touches the scene.
  it("is declared in one place, and nothing else adds to the scene", () => {
    const offenders = sourceFiles("")
      .filter((path) => path !== COMPOSER && !path.endsWith(".test.ts"))
      .filter((path) =>
        /\bscene\.add\(/.test(readFileSync(join(SOURCE_ROOT, path), "utf8")),
      );

    expect(offenders).toEqual([]);
  });

  it("puts every group the composer names into the scene", () => {
    const composer = readFileSync(join(SOURCE_ROOT, COMPOSER), "utf8");
    const declaration = composer.slice(
      composer.indexOf("scene.add("),
      composer.indexOf(");", composer.indexOf("scene.add(")),
    );
    const groups = [...declaration.matchAll(/^\s{4}([\w.]+),$/gm)].map(
      (match) => match[1],
    );

    // Reading the list is how anyone answers "what draws over what", so it has
    // to name every group rather than leaving some to be added elsewhere.
    expect(groups).toEqual([
      "environment.sky",
      "world.terrain",
      "avatar.body",
      "multiplayer.avatars",
      "world.water",
      "environment.weatherEffects",
      "world.underwaterTint",
    ]);
  });
});
