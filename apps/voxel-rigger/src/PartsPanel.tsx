// The parts panel: the voxel models loaded into the rig, and the bone each one
// hangs off. A part with no bone still rests in the rig, ready to be bound.
import { fileOpen } from "browser-fs-access";
import {
  createMemo,
  flush,
  For,
  Show,
  useContext,
  type Component,
} from "solid-js";
import { RigContext } from "./context";
import { animationUrl } from "./animation/assets";
import { readModelFile, readModelUrl, readRigUrl } from "./file/project";
import { BUNDLED_MODELS, modelUrl } from "./rig/models";
import styles from "./EditorPage.module.css";

const PartsPanel: Component = () => {
  const rig = useContext(RigContext);

  const bindings = createMemo(() => rig.bindings());

  const boneName = (id: string): string =>
    rig.skeleton().bones.find((bone) => bone.id === id)?.name ?? id;

  const importModel = async () => {
    try {
      const file = await fileOpen({
        extensions: [".zip"],
        mimeTypes: ["application/zip"],
        description: "Voxel model",
      });
      const figure = await readModelFile(file);
      rig.loadFigure(figure);
    } catch (error) {
      rig.setStatus(`Could not read the model: ${String(error)}`);
    }
  };

  const loadSample = async (
    label: string,
    path: string,
    skeletonPath: string,
    credits: string,
  ) => {
    try {
      rig.setStatus(`Loading ${label}…`);
      const imported = await readRigUrl(animationUrl(skeletonPath), label);
      rig.importRig(imported.skeleton, imported.motions);
      // The model binds against the skeleton just imported, and a write only
      // reaches later reads on a flush.
      flush();
      rig.loadFigure(await readModelUrl(modelUrl(path)));
      rig.setStatus(`Loaded ${label}. ${credits}`);
    } catch (error) {
      rig.setStatus(`Could not load ${label}: ${String(error)}`);
    }
  };

  return (
    <div class={styles.panel}>
      <div class={styles.section}>
        <div class={styles.row}>
          <button class={styles.primary} onClick={importModel}>
            Import model .zip
          </button>
          <button onClick={() => rig.autoBind()}>Auto-bind</button>
        </div>
        <div class={styles.sectionTitle}>Sample (CC0)</div>
        <div class={styles.motions}>
          <For each={BUNDLED_MODELS}>
            {(sample) => (
              <button
                class={styles.item}
                onClick={() =>
                  loadSample(
                    sample.label,
                    sample.path,
                    sample.skeletonPath,
                    sample.credits,
                  )
                }
              >
                <span class={styles.itemName}>{sample.label}</span>
              </button>
            )}
          </For>
        </div>
        <div class={styles.sectionTitle}>
          {rig.parts().length} part(s) · {bindings().length} bound
        </div>
        <div class={styles.list}>
          <For
            each={rig.parts()}
            fallback={<div class={styles.empty}>No parts loaded.</div>}
          >
            {(part) => {
              const binding = () =>
                bindings().find((held) => held.part === part.name);
              return (
                <button
                  class={[
                    styles.item,
                    { [styles.itemActive]: rig.selectedPart() === part.name },
                  ]}
                  onClick={() => {
                    rig.setSelectedPart(part.name);
                    rig.setMode("part");
                  }}
                >
                  <span class={styles.itemName}>{part.name}</span>
                  <span class={styles.tag}>
                    {binding() === undefined
                      ? "unbound"
                      : boneName(binding()!.bone)}
                  </span>
                </button>
              );
            }}
          </For>
        </div>
      </div>

      <Show when={rig.selectedPart()}>
        {(part) => (
          <div class={styles.section}>
            <div class={styles.sectionTitle}>{part()} to bone</div>
            <div class={styles.row}>
              <button
                class={styles.primary}
                disabled={rig.selectedBone() === null}
                onClick={() => {
                  const bone = rig.selectedBone();
                  if (bone !== null) {
                    rig.bindPart(part(), bone);
                  }
                }}
              >
                Bind to{" "}
                {rig.selectedBone() === null
                  ? "…"
                  : boneName(rig.selectedBone()!)}
              </button>
              <button
                class={styles.danger}
                onClick={() => rig.unbindPart(part())}
              >
                Unbind
              </button>
            </div>
          </div>
        )}
      </Show>
    </div>
  );
};

export default PartsPanel;
