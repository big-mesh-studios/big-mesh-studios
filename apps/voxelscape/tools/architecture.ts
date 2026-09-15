// Draws the world's own shape from its imports, and checks it against the shape
// it is meant to have.
//
//   pnpm architecture           # redraw docs/architecture.md
//   pnpm architecture --check   # fail if the drawing is stale or a rule is broken
//
// A diagram nobody derives goes stale the week after it is drawn, so this one is
// read out of the source every time: every module under `src`, which area it
// belongs to, and which areas it imports from. The drawing is a Mermaid graph in
// a Markdown file, which reads as text in a terminal and as a picture on the
// forge.
//
// What makes it a check rather than a picture is `MAY_DEPEND_ON` below: one line
// per area naming the areas it is allowed to reach. It was seeded from what the
// world already did, so it passes today; its use is tomorrow, when a new edge
// between two areas has to be written down before the check will pass. Nothing
// here decides whether an edge is a good idea — it decides that somebody chose
// it on purpose.
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { format, resolveConfig } from "prettier";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

/** The application directory, whatever directory this was started from. */
const APP_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC_DIR = join(APP_DIR, "src");
const DRAWING = join(APP_DIR, "docs", "architecture.md");

/**
 * What each area of the world is for, in one line, and the order they are drawn
 * in — roughly the order a frame flows through them. An area is a directory
 * under `src`; the modules that sit directly in `src` are the shell that wires
 * the rest together.
 */
const AREAS: Record<string, string> = {
  shell: "the page, the console, and what wires a world into them",
  voxelscape: "one world: its frame, and every part below it",
  world: "voxels, light, the streaming window, and the workers that fill it",
  renderers: "turning voxels into geometry, and drawing it",
  render:
    "the frame loop, the resolution scaler, and the probe that times them",
  player: "the body, its input, its tools and what they do to the world",
  multiplayer: "other players, over a peer connection",
  places:
    "a published place: its script, its people, and the sandbox they run in",
  environment: "the sky, the clock, the weather and the sound",
  atproto: "being signed in, and reading and writing published records",
  ui: "what is drawn over the world in the page",
  "level-editor":
    "editing the running world's structures, as an overlay on its canvas",
};

/**
 * Which areas each area may import from. Seeded from what the world already
 * imported when this was written, so an edge missing here is an edge somebody
 * added since — which is the point: it has to be added here too, deliberately,
 * before the check passes.
 */
const MAY_DEPEND_ON: Record<string, readonly string[]> = {
  shell: [
    "atproto",
    "environment",
    "level-editor",
    "multiplayer",
    "places",
    "player",
    "render",
    "renderers",
    "ui",
    "voxelscape",
    "world",
  ],
  voxelscape: [
    "atproto",
    "environment",
    "level-editor",
    "multiplayer",
    "places",
    "player",
    "render",
    "renderers",
    "shell",
    "world",
  ],
  world: ["render", "renderers"],
  renderers: ["environment", "render", "world"],
  render: [],
  player: ["environment", "places", "renderers", "shell", "world"],
  multiplayer: ["places", "player"],
  places: ["environment", "world"],
  environment: [],
  atproto: ["places", "world"],
  ui: ["places", "player", "renderers", "shell", "voxelscape"],
  "level-editor": ["places", "voxelscape", "world"],
};

/** One module of the world: where it is, which area it belongs to, and its size. */
interface Module {
  /** Its path relative to `src`. */
  path: string;
  area: string;
  lines: number;
  /** The areas it imports from, itself excluded. */
  reaches: Set<string>;
}

/**
 * Which area a path under `src` belongs to: the directory it sits in, or the
 * shell for the handful of modules that sit in `src` itself. A specifier is
 * written without its extension, so what arrives here is either a file path or a
 * path with the extension left off; one segment means the shell either way.
 */
const areaOf = (path: string): string => {
  const parts = path.split("/");
  return parts.length === 1 ? "shell" : parts[0];
};

/** Every source file under `src`, tests and type declarations excluded. */
const sourcesUnder = (dir: string): string[] => {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...sourcesUnder(path));
      continue;
    }
    const isSource = entry.name.endsWith(".ts") || entry.name.endsWith(".tsx");
    const isTest = /\.test(-d)?\.tsx?$/.test(entry.name);
    const isTypes = entry.name.endsWith(".d.ts");
    if (isSource && !isTest && !isTypes) {
      found.push(path);
    }
  }
  return found;
};

/**
 * The module specifiers one file imports, from its syntax rather than from a
 * search for the word: an `import` of any form, a re-export, and the dynamic
 * `import()` a lazily-loaded module arrives through.
 */
export const importsOf = (source: string, fileName: string): string[] => {
  const tree = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.ESNext,
    true,
    fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const specifiers: string[] = [];
  const walk = (node: ts.Node): void => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier !== undefined &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      specifiers.push(node.moduleSpecifier.text);
    }
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length > 0 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      specifiers.push(node.arguments[0].text);
    }
    ts.forEachChild(node, walk);
  };
  walk(tree);
  return specifiers;
};

/**
 * The area a relative specifier points into, or null for anything outside `src`
 * — a package, or a file this does not read.
 *
 * @param from The importing file's path, relative to `src`.
 * @param specifier The specifier as written.
 */
export const areaOfImport = (
  from: string,
  specifier: string,
): string | null => {
  if (!specifier.startsWith(".")) {
    return null;
  }
  const target = relative(SRC_DIR, resolve(SRC_DIR, dirname(from), specifier));
  return target.startsWith("..") ? null : areaOf(target);
};

/** Every module of the world, with the areas each one reaches into. */
export const readModules = (): Module[] =>
  sourcesUnder(SRC_DIR).map((file) => {
    const path = relative(SRC_DIR, file).split("\\").join("/");
    const source = readFileSync(file, "utf8");
    const area = areaOf(path);
    const reaches = new Set<string>();
    for (const specifier of importsOf(source, file)) {
      const into = areaOfImport(path, specifier);
      if (into !== null && into !== area) {
        reaches.add(into);
      }
    }
    return { path, area, lines: source.split("\n").length, reaches };
  });

/** One area's dependencies on another, and how many modules make them. */
export interface Edge {
  from: string;
  to: string;
  /** How many modules of `from` import from `to`. */
  modules: number;
}

/** Every edge between two areas, as the modules draw them. */
export const edgesOf = (modules: Module[]): Edge[] => {
  const counted = new Map<string, Edge>();
  for (const module of modules) {
    for (const to of module.reaches) {
      const key = `${module.area}→${to}`;
      const held = counted.get(key);
      if (held === undefined) {
        counted.set(key, { from: module.area, to, modules: 1 });
      } else {
        held.modules++;
      }
    }
  }
  return [...counted.values()].sort(
    (one, two) =>
      one.from.localeCompare(two.from) || one.to.localeCompare(two.to),
  );
};

/** An edge no rule allows: what somebody added without writing it down. */
export const unruledEdges = (edges: Edge[]): Edge[] =>
  edges.filter((edge) => !(MAY_DEPEND_ON[edge.from] ?? []).includes(edge.to));

/** Two areas that import from each other, which is worth knowing about. */
export const mutualPairs = (edges: Edge[]): Array<[string, string]> => {
  const has = new Set(edges.map((edge) => `${edge.from}→${edge.to}`));
  const pairs: Array<[string, string]> = [];
  for (const edge of edges) {
    if (edge.from < edge.to && has.has(`${edge.to}→${edge.from}`)) {
      pairs.push([edge.from, edge.to]);
    }
  }
  return pairs;
};

/** A rule naming an area nothing imports from any more. */
export const staleRules = (edges: Edge[]): string[] => {
  const drawn = new Set(edges.map((edge) => `${edge.from}→${edge.to}`));
  const stale: string[] = [];
  for (const [from, allowed] of Object.entries(MAY_DEPEND_ON)) {
    for (const to of allowed) {
      if (!drawn.has(`${from}→${to}`)) {
        stale.push(`${from} → ${to}`);
      }
    }
  }
  return stale;
};

/** The commit the drawing was made from, so a stale one can be dated. */
const commit = (): string => {
  try {
    return execFileSync("git", ["rev-parse", "--short", "HEAD"], {
      cwd: APP_DIR,
      encoding: "utf8",
    }).trim();
  } catch {
    return "unknown";
  }
};

/** The Markdown the drawing is written as: a picture, then the numbers behind it. */
export const drawingOf = (modules: Module[], edges: Edge[]): string => {
  const areas = Object.keys(AREAS).filter((area) =>
    modules.some((module) => module.area === area),
  );
  const size = (area: string): { files: number; lines: number } => {
    const own = modules.filter((module) => module.area === area);
    return {
      files: own.length,
      lines: own.reduce((sum, module) => sum + module.lines, 0),
    };
  };
  const lines: string[] = [
    "# What voxelscape is made of",
    "",
    `Drawn from the imports under \`src\` at ${commit()} by \`pnpm architecture\`.`,
    "Nothing here is written by hand: change the code and run it again.",
    "",
    "```mermaid",
    "graph TD",
  ];
  for (const area of areas) {
    const { files, lines: count } = size(area);
    lines.push(`  ${area}["${area}<br/>${files} files · ${count} lines"]`);
  }
  for (const edge of edges) {
    lines.push(`  ${edge.from} --> ${edge.to}`);
  }
  lines.push("```", "", "## The areas", "");
  lines.push("| area | what it is for | files | lines |");
  lines.push("| --- | --- | --- | --- |");
  for (const area of areas) {
    const { files, lines: count } = size(area);
    lines.push(`| \`${area}\` | ${AREAS[area]} | ${files} | ${count} |`);
  }
  lines.push("", "## What reaches into what", "");
  lines.push("| area | imports from | modules doing it |");
  lines.push("| --- | --- | --- |");
  for (const edge of edges) {
    lines.push(`| \`${edge.from}\` | \`${edge.to}\` | ${edge.modules} |`);
  }
  const mutual = mutualPairs(edges);
  lines.push("", "## Areas that reach both ways", "");
  if (mutual.length === 0) {
    lines.push("None: every edge above runs one way.");
  } else {
    for (const [one, two] of mutual) {
      lines.push(`- \`${one}\` and \`${two}\``);
    }
  }
  lines.push("");
  return lines.join("\n");
};

/**
 * The drawing as Prettier would write it, which is how it is held on disk. The
 * repository formats everything it holds, so a drawing written any other way is
 * reformatted the next time the formatter runs and stops matching what this
 * draws — leaving `--check` failing until somebody redraws it, which puts it
 * straight back. Formatting here is what keeps the two agreeing.
 */
const formatted = async (drawing: string): Promise<string> =>
  format(drawing, { ...(await resolveConfig(DRAWING)), filepath: DRAWING });

const main = async (): Promise<void> => {
  const checking = process.argv.includes("--check");
  const modules = readModules();
  const edges = edgesOf(modules);
  const drawing = await formatted(drawingOf(modules, edges));
  const unruled = unruledEdges(edges);

  if (!checking) {
    writeFileSync(DRAWING, drawing);
    console.log(
      `drew ${modules.length} modules in ${new Set(modules.map((m) => m.area)).size} areas ` +
        `and ${edges.length} edges between them into ${relative(APP_DIR, DRAWING)}`,
    );
  }

  const problems: string[] = [];
  if (checking) {
    let held = "";
    try {
      held = readFileSync(DRAWING, "utf8");
    } catch {
      held = "";
    }
    // The commit line moves with every commit, so the drawing is compared
    // without it: what matters is whether the shape it describes still holds.
    const shapeOf = (text: string): string =>
      text.replace(/^Drawn from the imports.*$/m, "");
    if (shapeOf(held) !== shapeOf(drawing)) {
      problems.push(
        `${relative(APP_DIR, DRAWING)} is not what the imports say any more; run \`pnpm architecture\``,
      );
    }
  }
  for (const edge of unruled) {
    problems.push(
      `${edge.from} imports from ${edge.to} (${edge.modules} module${edge.modules === 1 ? "" : "s"}), which no rule allows — ` +
        `add it to MAY_DEPEND_ON in tools/architecture.ts if it is meant to`,
    );
  }
  if (problems.length > 0) {
    console.error(problems.map((line) => `  ${line}`).join("\n"));
    process.exit(1);
  }
  if (checking) {
    console.log(
      `the drawing matches the imports: ${edges.length} edges, all of them allowed`,
    );
    const stale = staleRules(edges);
    if (stale.length > 0) {
      // Not a failure: a permission nothing uses costs nothing but is worth
      // taking away, because a rule list that allows more than the world does
      // stops describing it.
      console.log(
        `${stale.length} permission${stale.length === 1 ? "" : "s"} nothing uses: ${stale.join(", ")}`,
      );
    }
  }
};

// Imported by its own tests, which want the reading and the rules without the
// writing, so the work only runs when this file is what was started.
if (
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
