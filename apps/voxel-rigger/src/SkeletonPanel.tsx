// The skeleton panel: every bone as a tree, the one in hand and what can be
// done to it. Drawing happens in the viewport; this is where a bone is picked,
// named, hung off another, and nudged a hair at a time.
import { Vector3D } from "@big-mesh-studios/maths";
import { createMemo, For, Show, useContext, type Component } from "solid-js";
import { RigContext } from "./context";
import { findBone } from "./skeleton/pose";
import type { Skeleton } from "./skeleton/types";
import styles from "./EditorPage.module.css";

interface Row {
  id: string;
  name: string;
  depth: number;
  parent: string | null;
}

/** Every bone of `skeleton` flattened depth-first, with how deep it sits. */
function rows(skeleton: Skeleton): Row[] {
  const children = new Map<string | null, string[]>();
  const known = new Set(skeleton.bones.map((bone) => bone.id));

  for (const bone of skeleton.bones) {
    const parent =
      bone.parent !== null && known.has(bone.parent) ? bone.parent : null;
    const held = children.get(parent) ?? [];
    held.push(bone.id);
    children.set(parent, held);
  }

  const out: Row[] = [];
  const walk = (parent: string | null, depth: number) => {
    for (const id of children.get(parent) ?? []) {
      const bone = findBone(skeleton, id)!;
      out.push({ id, name: bone.name, depth, parent: bone.parent });
      walk(id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

const SkeletonPanel: Component = () => {
  const rig = useContext(RigContext);
  const list = createMemo(() => rows(rig.skeleton()));
  const selected = createMemo(() => {
    const id = rig.selectedBone();
    return id === null ? undefined : findBone(rig.skeleton(), id);
  });

  const nudge = (axis: "x" | "y" | "z", direction: number) => {
    const id = rig.selectedBone();
    if (id === null) {
      return;
    }
    const delta = Vector3D.create(0, 0, 0);
    delta[axis] = direction;
    rig.nudgeBone(id, delta);
  };

  return (
    <div class={styles.panel}>
      <div class={styles.section}>
        <div class={styles.row}>
          <button onClick={() => rig.setMode("draw")}>Draw joints</button>
          <button onClick={() => rig.useDefaultSkeleton()}>
            Reset humanoid
          </button>
          <button class={styles.danger} onClick={() => rig.clearSkeleton()}>
            Clear
          </button>
        </div>
        <div class={styles.sectionTitle}>
          {rig.skeleton().name} · {rig.skeleton().bones.length} bones
        </div>
        <div class={styles.list}>
          <For
            each={list()}
            fallback={<div class={styles.empty}>No bones yet.</div>}
          >
            {(row) => (
              <button
                class={[
                  styles.item,
                  { [styles.itemActive]: rig.selectedBone() === row.id },
                ]}
                onClick={() => {
                  rig.setSelectedBone(row.id);
                  rig.setMode("bone");
                }}
              >
                <span
                  class={styles.depth}
                  style={{ width: `${row.depth * 12}px` }}
                />
                <span class={styles.itemName}>{row.name}</span>
              </button>
            )}
          </For>
        </div>
      </div>

      <Show when={selected()}>
        {(bone) => (
          <div class={styles.section}>
            <div class={styles.sectionTitle}>Selected bone</div>
            <input
              value={bone().name}
              onChange={(event) =>
                rig.renameBone(bone().id, event.currentTarget.value)
              }
            />
            <div class={styles.row}>
              <button
                onClick={() => {
                  rig.setMode("draw");
                  rig.setStatus(
                    "Click in the view to place a child of the selected bone.",
                  );
                }}
              >
                Add child
              </button>
              <button
                class={styles.danger}
                onClick={() => rig.deleteBone(bone().id)}
              >
                Delete
              </button>
            </div>
            <div class={styles.row}>
              <span class={styles.sectionTitle}>Parent</span>
              <select
                class={styles.grow}
                value={bone().parent ?? ""}
                onChange={(event) =>
                  rig.reparentBone(
                    bone().id,
                    event.currentTarget.value === ""
                      ? null
                      : event.currentTarget.value,
                  )
                }
              >
                <option value="">(none)</option>
                <For
                  each={rig
                    .skeleton()
                    .bones.filter((held) => held.id !== bone().id)}
                >
                  {(candidate) => (
                    <option value={candidate.id}>{candidate.name}</option>
                  )}
                </For>
              </select>
            </div>

            <div class={styles.sectionTitle}>Nudge</div>
            <div class={styles.row}>
              <button onClick={() => nudge("x", -1)}>x-</button>
              <button onClick={() => nudge("x", 1)}>x+</button>
              <button onClick={() => nudge("y", -1)}>y-</button>
              <button onClick={() => nudge("y", 1)}>y+</button>
              <button onClick={() => nudge("z", -1)}>z-</button>
              <button onClick={() => nudge("z", 1)}>z+</button>
            </div>
          </div>
        )}
      </Show>
    </div>
  );
};

export default SkeletonPanel;
