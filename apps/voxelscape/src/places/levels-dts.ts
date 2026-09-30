// The ambient `.d.ts` a place's attached levels generate for the script
// editor: one combined `declare module "voxelscape" { interface LevelsByName
// {...} } }` augmentation naming every level the place carries, so `plan`
// autocompletes and type-checks a level name against the place's own levels
// rather than a bare `string`. Read only by the editor's language-service
// worker — the bundler (bundle.ts) reaches the same levels through the
// project's own map, and neither depends on the other.

/**
 * The ambient `.d.ts` covering every level a place carries — a pure function
 * of the level set alone, so the editor never has to re-parse a script's own
 * text to know what to type. A level is typed as the string it is, which is
 * the whole of what a script ever sees of it.
 */
export function generateProjectLevelsDts(
  levels: Record<string, string>,
): string {
  const entries = Object.entries(levels).map(
    ([name]) => `    ${JSON.stringify(name)}: string;`,
  );
  if (entries.length === 0) {
    return "";
  }
  return `declare module "voxelscape" {
  interface LevelsByName {
${entries.join("\n")}
  }
}
`;
}
