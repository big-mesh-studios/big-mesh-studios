// The motion panel: the clips imported with a skeleton and the one the
// transport plays. Importing a glTF or GLB replaces the skeleton too, because
// the motions are keyed to the bones that came with it.
import { fileOpen } from "browser-fs-access";
import { For, Show, useContext, type Component } from "solid-js";
import { RigContext } from "./context";
import { animationUrl, BUNDLED_ANIMATIONS } from "./animation/assets";
import { readRigFile, readRigUrl } from "./file/project";
import styles from "./EditorPage.module.css";

const AnimationPanel: Component = () => {
  const rig = useContext(RigContext);

  const importSkeleton = async () => {
    try {
      const file = await fileOpen({
        extensions: [".glb", ".gltf"],
        mimeTypes: ["model/gltf-binary", "model/gltf+json"],
        description: "Skeleton and animations",
      });
      const imported = await readRigFile(file);
      rig.importRig(imported.skeleton, imported.motions);
    } catch (error) {
      rig.setStatus(`Could not read the skeleton: ${String(error)}`);
    }
  };

  const importBundled = async (
    label: string,
    path: string,
    credits: string,
  ) => {
    try {
      rig.setStatus(`Loading ${label}…`);
      const imported = await readRigUrl(animationUrl(path), label);
      rig.importRig(imported.skeleton, imported.motions);
      rig.setStatus(`Imported ${label}. ${credits}`);
    } catch (error) {
      rig.setStatus(`Could not load ${label}: ${String(error)}`);
    }
  };

  return (
    <div class={styles.panel}>
      <div class={styles.section}>
        <div class={styles.row}>
          <button class={styles.primary} onClick={importSkeleton}>
            Import .glb / .gltf
          </button>
        </div>
        <div class={styles.sectionTitle}>Bundled (CC0)</div>
        <div class={styles.motions}>
          <For each={BUNDLED_ANIMATIONS}>
            {(bundled) => (
              <button
                class={styles.item}
                onClick={() =>
                  importBundled(bundled.label, bundled.path, bundled.credits)
                }
              >
                <span class={styles.itemName}>{bundled.label}</span>
              </button>
            )}
          </For>
        </div>
        <div class={styles.sectionTitle}>Motions</div>
        <div class={styles.motions}>
          <For
            each={rig.motions()}
            fallback={<div class={styles.empty}>No motions imported.</div>}
          >
            {(motion) => (
              <button
                class={[
                  styles.item,
                  { [styles.itemActive]: rig.motionName() === motion.name },
                ]}
                onClick={() => rig.selectMotion(motion.name)}
              >
                <span class={styles.itemName}>{motion.name}</span>
                <span class={styles.tag}>{motion.duration.toFixed(2)}s</span>
              </button>
            )}
          </For>
        </div>
      </div>

      <Show when={rig.motion()}>
        {(motion) => (
          <div class={styles.section}>
            <div class={styles.sectionTitle}>Selected motion</div>
            <div class={styles.row}>
              <span class={styles.tag}>{motion().tracks.length} bones</span>
              <span class={styles.tag}>{motion().framesPerSecond} fps</span>
              <span class={styles.tag}>{motion().loop ? "loops" : "once"}</span>
            </div>
          </div>
        )}
      </Show>
    </div>
  );
};

export default AnimationPanel;
