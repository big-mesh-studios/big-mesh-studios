// The editor page: the panels down one side, the viewport across the rest, and
// the bar that opens and saves a whole rig.
//
// On a wide screen the panels sit beside the viewport. On a narrow one or a
// touch screen they become a sheet drawn over the viewport — from the bottom
// when held upright, from the side when held flat — so the rig keeps the whole
// screen and the transport stays within reach.
import { createMediaQuery } from "@big-mesh-studios/utils/create-media-query";
import { fileOpen, fileSave } from "browser-fs-access";
import { createSignal, Show, useContext, type Component } from "solid-js";
import { RigContext } from "./context";
import { readProject, writeProject } from "./file/project";
import AnimationPanel from "./AnimationPanel";
import PartsPanel from "./PartsPanel";
import RigView from "./RigView";
import SkeletonPanel from "./SkeletonPanel";
import Transport from "./Transport";
import styles from "./EditorPage.module.css";

type Tab = "skeleton" | "parts" | "animation";

/** How far a sheet has to be dragged to be sent away. */
const SHEET_DISMISS = 60;

const EditorPage: Component = () => {
  const rig = useContext(RigContext);
  const [tab, setTab] = createSignal<Tab>("skeleton");
  const [panelsOpen, setPanelsOpen] = createSignal(false);

  // A touch screen or a narrow window gets the sheet; a wide screen keeps the
  // panels beside the viewport.
  const compact = createMediaQuery("(pointer: coarse), (max-width: 760px)");

  let handleStart: { x: number; y: number } | null = null;

  const handlePointerDown = (event: PointerEvent) => {
    handleStart = { x: event.clientX, y: event.clientY };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent) => {
    if (handleStart === null) {
      return;
    }

    const dx = event.clientX - handleStart.x;
    const dy = event.clientY - handleStart.y;

    // Down sends a bottom sheet away, left a side drawer.
    if (dy > SHEET_DISMISS || dx < -SHEET_DISMISS) {
      setPanelsOpen(false);
      handleStart = null;
    }
  };

  const handlePointerUp = () => {
    handleStart = null;
  };

  const openProject = async () => {
    try {
      const file = await fileOpen({
        extensions: [".zip"],
        mimeTypes: ["application/zip"],
        description: "Rig project",
      });
      rig.restoreProject(await readProject(file));
    } catch (error) {
      rig.setStatus(`Could not open the project: ${String(error)}`);
    } finally {
      setPanelsOpen(false);
    }
  };

  const saveProject = async () => {
    try {
      const blob = await writeProject({
        skeleton: rig.skeleton(),
        bindings: rig.bindings(),
        motions: rig.motions(),
        figure: {
          parts: rig.parts().map((part) => part.part),
          palette: rig.palette(),
        },
      });
      await fileSave(blob, {
        fileName: "rig.zip",
        extensions: [".zip"],
        mimeTypes: ["application/zip"],
      });
      rig.setStatus("Saved the rig.");
    } catch (error) {
      rig.setStatus(`Could not save the project: ${String(error)}`);
    }
  };

  return (
    <div class={[styles.shell, { [styles.compact]: compact() }]}>
      <div class={styles.topbar}>
        <Show when={compact()}>
          <button
            class={styles.menuButton}
            aria-label="Panels"
            aria-expanded={panelsOpen() ? "true" : "false"}
            onClick={() => setPanelsOpen((open) => !open)}
          >
            ☰
          </button>
        </Show>
        <span class={styles.title}>voxel-rigger</span>
        <button disabled={!rig.canUndo()} onClick={() => rig.undo()}>
          Undo
        </button>
        <button disabled={!rig.canRedo()} onClick={() => rig.redo()}>
          Redo
        </button>
        <button onClick={() => rig.requestFrame()}>Frame</button>
        <span class={styles.spacer} />
        <button class={styles.primary} onClick={openProject}>
          Open
        </button>
        <button onClick={saveProject}>Save</button>
      </div>

      <div class={styles.body}>
        <Show when={compact() && panelsOpen()}>
          <div class={styles.scrim} onClick={() => setPanelsOpen(false)} />
        </Show>

        <div
          class={[styles.sidebar, { [styles.sheetOpen]: panelsOpen() }]}
          // A sheet slid out of sight must not take keyboard focus; on a wide
          // screen the panels are always in view and never inert.
          inert={compact() && !panelsOpen() ? true : undefined}
        >
          <div
            class={styles.sheetHandle}
            role="presentation"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          />
          <div class={styles.tabs}>
            <button
              class={[styles.tab, { [styles.tabActive]: tab() === "skeleton" }]}
              onClick={() => setTab("skeleton")}
            >
              Skeleton
            </button>
            <button
              class={[styles.tab, { [styles.tabActive]: tab() === "parts" }]}
              onClick={() => setTab("parts")}
            >
              Parts
            </button>
            <button
              class={[
                styles.tab,
                { [styles.tabActive]: tab() === "animation" },
              ]}
              onClick={() => setTab("animation")}
            >
              Motion
            </button>
          </div>
          <Show when={tab() === "skeleton"}>
            <SkeletonPanel />
          </Show>
          <Show when={tab() === "parts"}>
            <PartsPanel />
          </Show>
          <Show when={tab() === "animation"}>
            <AnimationPanel />
          </Show>
        </div>

        <RigView />
      </div>

      <Transport />
      <div class={styles.status}>{rig.status()}</div>
    </div>
  );
};

export default EditorPage;
