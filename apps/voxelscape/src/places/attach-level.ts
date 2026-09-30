// Writing a level plan into a place as that place carries levels: the plan
// becomes a level file, and a script registers it by name. Both editors' "add
// a level" affordances go through here, so the plan a creator drew in the
// level editor and the plan they picked from a file reach a place the same
// way, and neither is carried across as text to be pasted by hand.
import {
  levelFileFor,
  levelSpecifierFor,
  MAX_LEVEL_FILE,
  MAX_PLACE_LEVELS,
} from "./place";
import { parseLevelPlan, type LevelPlan } from "./plan";
import type { PlaceProject } from "./project";

/** The script file every level a place carries is registered from. */
export const LEVEL_SCRIPT_FILE = "level.ts";

/** The specifier the entry script imports the registering script by. */
const LEVEL_SCRIPT_SPECIFIER = "./level";

/**
 * The first line of every registering script written here, which is what tells
 * one this module wrote from one a creator wrote by hand under the same name.
 */
const GENERATED_HEADER = 'import { onPlan, plan } from "voxelscape";';

/** The level name a plan the level editor holds is written under. */
export const DEFAULT_LEVEL_NAME = "level";

/** What adding a level to a place did, or the words for why it did not. */
export type AttachLevelResult =
  | { ok: true; project: PlaceProject; added: boolean }
  | { ok: false; reason: string };

/** A name a place can carry a level under: a bare word, the extension belonging to the file. */
const isLevelName = (name: string): boolean =>
  name.length >= 1 &&
  name.length <= MAX_LEVEL_FILE &&
  !name.includes(".") &&
  !name.includes("/") &&
  !name.includes("\\");

/** Whether `source` already brings the registering script in, however it spells it. */
const importsLevelScript = (source: string): boolean =>
  /import\s+["'][^"']*\.\/level(\.[tj]s)?["']/.test(source);

/** The plan text a level file holds: the pretty JSON a creator reads in the editor. */
export const levelSource = (plan: LevelPlan): string =>
  `${JSON.stringify(plan, null, 2)}\n`;

/**
 * The script registering every level `names` names, written from the level set
 * alone so that attaching a level rewrites the whole file and the levels
 * already registered in it survive.
 *
 * One level is handed to `onPlan` as the text it is. Several are parsed and
 * concatenated, because a script registers one plan: a second `onPlan` call
 * would take the first one's place rather than add to it.
 */
const registrationFor = (names: string[]): string => {
  if (names.length === 1) {
    return `${GENERATED_HEADER}

onPlan(plan(${JSON.stringify(names[0])}));
`;
  }
  const variable = (at: number): string =>
    at === 0 ? "level" : `level${at + 1}`;
  const read = names
    .map(
      (name, at) =>
        `const ${variable(at)} = JSON.parse(plan(${JSON.stringify(name)}));`,
    )
    .join("\n");
  const merged = (field: string): string =>
    names.map((_, at) => `...${variable(at)}.${field}`).join(", ");
  return `${GENERATED_HEADER}

${read}

onPlan(() =>
  JSON.stringify({
    structures: [${merged("structures")}],
    npcs: [${merged("npcs")}],
    props: [${merged("props")}],
  }),
);
`;
};

/**
 * The project with its registering script written to register every level it
 * now carries, and the entry script brought in so the place actually builds
 * it. The entry is left alone where it is the registering script itself — a
 * place whose only script is the one being written already runs it.
 */
const withLevelScript = (
  project: PlaceProject,
  levels: Record<string, string>,
): PlaceProject => {
  const scripts: Record<string, string> = { ...project.scripts };
  const entry = project.manifest.scripts?.[0];
  if (entry !== undefined && entry !== LEVEL_SCRIPT_FILE) {
    const source = scripts[entry];
    if (source !== undefined && !importsLevelScript(source)) {
      scripts[entry] =
        `import ${JSON.stringify(LEVEL_SCRIPT_SPECIFIER)};\n${source}`;
    }
  }
  scripts[LEVEL_SCRIPT_FILE] = registrationFor(Object.keys(levels));
  const named = project.manifest.scripts ?? [];
  return {
    ...project,
    manifest: {
      ...project.manifest,
      scripts: named.includes(LEVEL_SCRIPT_FILE)
        ? named
        : [...named, LEVEL_SCRIPT_FILE],
    },
    scripts,
    levels,
  };
};

/**
 * The place that carries `plan` as the level `name`, registering it from a
 * script that reads every level the place already had.
 *
 * A level already under that name is replaced, which is what re-attaching an
 * edited plan is. A name a script or model file already holds is refused: the
 * files share one flat namespace, and a name two of them answer to resolves
 * to whichever one is there.
 */
export const attachLevel = (
  project: PlaceProject,
  name: string,
  plan: LevelPlan,
): AttachLevelResult => {
  if (!isLevelName(name)) {
    return {
      ok: false,
      reason: `"${name}" cannot be a level name — a level's name is a bare word, with no extension or path`,
    };
  }
  const existing = project.scripts[LEVEL_SCRIPT_FILE];
  if (existing !== undefined && !existing.startsWith(GENERATED_HEADER)) {
    return {
      ok: false,
      reason: `this place has a script called ${LEVEL_SCRIPT_FILE} of your own — rename it before adding a level`,
    };
  }
  const file = levelFileFor(name);
  if (
    project.scripts[file] !== undefined ||
    project.models[file] !== undefined
  ) {
    return {
      ok: false,
      reason: `this place already has a file called ${file}`,
    };
  }
  const levels = { ...project.levels, [name]: levelSource(plan) };
  if (Object.keys(levels).length > MAX_PLACE_LEVELS) {
    return {
      ok: false,
      reason: `a place may carry ${MAX_PLACE_LEVELS} levels at once`,
    };
  }
  return {
    ok: true,
    added: project.levels[name] === undefined,
    project: withLevelScript(project, levels),
  };
};

/**
 * The place without the level `name`. The registering script goes with the
 * last level, and the entry's import of it with the script, so a place whose
 * last level is removed is left holding neither a plan it cannot build nor an
 * import of a file that is gone.
 */
export const removeLevel = (
  project: PlaceProject,
  name: string,
): PlaceProject => {
  const levels = { ...project.levels };
  delete levels[name];
  const names = Object.keys(levels);
  if (names.length > 0) {
    return withLevelScript(project, levels);
  }
  const scripts = { ...project.scripts };
  delete scripts[LEVEL_SCRIPT_FILE];
  const entry = project.manifest.scripts?.[0];
  if (entry !== undefined && scripts[entry] !== undefined) {
    scripts[entry] = scripts[entry].replace(
      new RegExp(
        `^import ["'][^"']*${LEVEL_SCRIPT_SPECIFIER}(\\.[tj]s)?["'];\\n`,
      ),
      "",
    );
  }
  return {
    ...project,
    manifest: {
      ...project.manifest,
      scripts: (project.manifest.scripts ?? []).filter(
        (file) => file !== LEVEL_SCRIPT_FILE,
      ),
    },
    scripts,
    levels,
  };
};

/**
 * The place that carries the level a picked file holds, named for the file
 * itself, or a refusal naming why that file is not a plan this world can
 * generate.
 */
export const attachLevelFile = async (
  project: PlaceProject,
  file: { name: string; text(): Promise<string> },
): Promise<AttachLevelResult> => {
  const name = levelSpecifierFor(file.name);
  if (name === null) {
    return {
      ok: false,
      reason: `"${file.name}" is not a .json file, which is what a level is`,
    };
  }
  const text = await file.text();
  const plan = parseLevelPlan(text);
  if (plan === null) {
    return {
      ok: false,
      reason: "that is not a level plan this world can generate",
    };
  }
  return attachLevel(project, name, plan);
};
