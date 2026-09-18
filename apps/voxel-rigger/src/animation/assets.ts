// The royalty-free animations that ship with the editor, kept small and
// credited. RobotExpressive is a CC0 robot with walk and jump clips; Fox is a
// CC0 quadruped whose walk and run show that a rig need not be humanoid.
export interface BundledAnimation {
  /** What to call the import in the panel. */
  label: string;
  /** The path under the public folder it is served from. */
  path: string;
  /** Who made it and under what licence. */
  credits: string;
}

export const BUNDLED_ANIMATIONS: BundledAnimation[] = [
  {
    label: "Human — walk & jump",
    path: "animations/human.glb",
    credits:
      "Barbarian by Kay Lousberg (KayKit Adventurers, CC0), trimmed by scripts/fetch-human.mjs",
  },
  {
    label: "Robot — walk & jump",
    path: "animations/RobotExpressive.glb",
    credits: "RobotExpressive by Tomás Laulhé, CC0, via three.js examples",
  },
  {
    label: "Fox — walk & run",
    path: "animations/Fox.glb",
    credits: "Fox by PixelMannen, CC0, via the Khronos glTF Sample Assets",
  },
];

/** The address `path` is served from, wherever the app is hosted. */
export function animationUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path}`;
}
