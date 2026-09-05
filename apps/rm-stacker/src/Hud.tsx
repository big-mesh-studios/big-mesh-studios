import { createPopover } from "@big-mesh-studios/utils/create-popover";
import { flush, For, Show, useContext } from "solid-js";
import {
  Bar,
  Colour,
  colourTabStyle,
  createDialog,
  Icon,
  IconButton,
  IconTab,
  iconTabStyle,
  popoverStyle,
  tabStyle,
} from "./components/components";
import Palette from "./components/Palette";
import { StackerContext } from "./context";
import styles from "./Hud.module.css";
import type { IconKind } from "./icon-kinds";
import { PartsPanel } from "./PartsPanel";
import { ProfileModal } from "./profile/ProfileModal";
import { HandleKind, ModeKind } from "./types";

/** The handles that can stand at the part being drawn on, and what each says. */
const HANDLES = [
  {
    kind: "move",
    icon: "arrows-up-down-left-right",
    title: "Arrows to move the part, a voxel at a time",
  },
  {
    kind: "turn",
    icon: "arrows-spin",
    title: "Rings to turn the part about its own pivot",
  },
  {
    kind: "size",
    icon: "up-right-and-down-left-from-center",
    title: "Arms to draw the part larger or smaller",
  },
] as const satisfies { kind: HandleKind; icon: IconKind; title: string }[];

export function Hud() {
  const {
    viewMode,
    nextViewMode,
    undoRedoManager,
    frame,
    setFrame,
    endFrame,
    previousKey,
    nextKey,
    standAtKey,
    removableKey,
    removeKey,
    playing,
    play,
    stop,
    selectedColour,
    erasing,
    setErasing,
    mode,
    setMode,
    mirror,
    setMirror,
    preview,
    requestAutoSave,
  } = useContext(StackerContext);

  const PalettePopover = createPopover();
  const ViewSettingsPopover = createPopover();

  const ProfileDialog = createDialog();

  const isModeSelected = (_mode: ModeKind) =>
    !ProfileDialog.isOpen() && _mode === mode();

  const togglePanelMirror = (axis: "x" | "y") =>
    setMirror((current) => ({
      ...current,
      panel: { ...current.panel, [axis]: !current.panel[axis] },
    }));

  return (
    <div class={styles.hud}>
      <Bar class={styles.files}>
        <IconTab
          kind="table-cells"
          onClick={() => ProfileDialog.open()}
          selected={ProfileDialog.isOpen()}
          title="Your files"
        />
      </Bar>
      <ProfileDialog.Dialog class={styles.profileDialog}>
        <ProfileModal
          open={ProfileDialog.isOpen()}
          onClose={() => ProfileDialog.close()}
        />
      </ProfileDialog.Dialog>
      <div class={styles.left}>
        <Bar>
          <IconButton
            onClick={() => {
              undoRedoManager.undo();
            }}
            disabled={!undoRedoManager.hasUndo()}
            kind="arrow-rotate-left"
          />
          <IconButton
            onClick={() => {
              undoRedoManager.redo();
            }}
            disabled={!undoRedoManager.hasRedo()}
            kind="arrow-rotate-right"
          />
        </Bar>
        <Show when={viewMode() === "Animate"}>
          <Bar>
            <IconTab
              onClick={() => (playing() ? stop() : play())}
              disabled={endFrame() === 0}
              selected={!ProfileDialog.isOpen() && playing()}
              kind={playing() ? "pause" : "play"}
              title="Play the motion on from the frame it stands at, as far as its last key"
            />
            <IconTab
              kind="backward-step"
              disabled={previousKey() === undefined}
              onClick={() => standAtKey(previousKey())}
              title="Stand at the part's previous key"
            />
            <IconTab
              kind="forward-step"
              disabled={nextKey() === undefined}
              onClick={() => standAtKey(nextKey())}
              title="Stand at the part's next key"
            />
            <IconTab
              kind="trash"
              disabled={removableKey() === undefined}
              onClick={removeKey}
              title="Take the part's key at this frame away"
            />
            <input
              class={styles.frame}
              type="number"
              min={0}
              step={1}
              value={Math.round(frame())}
              onInput={(event) => {
                stop();
                setFrame(Number(event.currentTarget.value) || 0);
              }}
              title="The frame the preview stands at"
            />
          </Bar>
        </Show>
        <Show when={viewMode() === "Edit"}>
          <Bar>
            <IconTab
              kind="up-down-left-right"
              onClick={() => setMode("Idle")}
              selected={isModeSelected("Idle")}
            />
            <IconTab
              kind="pen"
              onClick={() => setMode("Draw")}
              selected={isModeSelected("Draw")}
            />
            <IconTab
              kind="fill"
              onClick={() => setMode("Fill")}
              selected={isModeSelected("Fill")}
            />
            <IconTab
              kind="square"
              onClick={() => setMode("Rectangle")}
              selected={isModeSelected("Rectangle")}
            />
            <IconTab
              kind="grip-lines-vertical"
              onClick={() => setMode("CutDown")}
              selected={isModeSelected("CutDown")}
              title="Cut with a line down the panel, so the two sides of the cut can be carved apart"
            />
            <IconTab
              kind="grip-lines"
              onClick={() => setMode("CutAcross")}
              selected={isModeSelected("CutAcross")}
              title="Cut with a line across the panel, so the two sides of the cut can be carved apart"
            />
          </Bar>
          <Bar>
            <IconTab
              kind="left-right"
              onClick={() => togglePanelMirror("x")}
              selected={!ProfileDialog.isOpen() && mirror().panel.x}
              title="Mirror across the panel's vertical middle, staying on that panel"
            />
            <IconTab
              kind="up-down"
              onClick={() => togglePanelMirror("y")}
              selected={!ProfileDialog.isOpen() && mirror().panel.y}
              title="Mirror across the panel's horizontal middle, staying on that panel"
            />
            <IconTab
              kind="clone"
              onClick={() =>
                setMirror((current) => ({
                  ...current,
                  opposing: !current.opposing,
                }))
              }
              selected={!ProfileDialog.isOpen() && mirror().opposing}
              title="Mirror onto the panel opposite the one drawn on: front to back, top to bottom, left to right"
            />
          </Bar>
          <Bar>
            <IconTab
              kind="eye-dropper"
              onClick={() => setMode("Eyedrop")}
              selected={isModeSelected("Eyedrop")}
            />
            <IconTab
              kind="eraser"
              onClick={() => setErasing((erasing) => !erasing)}
              selected={!ProfileDialog.isOpen() && erasing()}
              title="Draw in nothing, which takes away what is drawn. Put it down again to draw in the colour below it."
            />
            <PalettePopover.Trigger class={[tabStyle, colourTabStyle]}>
              <Colour colour={selectedColour()} />
            </PalettePopover.Trigger>
            <PalettePopover.PopOver
              class={[popoverStyle, styles.palettePopover]}
              popover="manual"
              style={{ "anchor-name": "--palette-popover" }}
            >
              <Palette />
            </PalettePopover.PopOver>
          </Bar>
        </Show>
      </div>
      <div class={styles.view}>
        <Bar>
          <IconTab
            kind={viewMode() === "Animate" ? "film" : "pen-ruler"}
            onClick={nextViewMode}
            title={
              viewMode() === "Animate"
                ? "Moving the parts over the frames of a motion. Press to draw on a part's sides."
                : "Drawing on a part's sides. Press to move the parts over the frames of a motion."
            }
          />
        </Bar>
        <Bar>
          <IconTab
            onClick={() => {
              preview.setHandleAxes((axes) =>
                axes === "part" ? "figure" : "part",
              );
              flush();
              requestAutoSave();
            }}
            selected={ProfileDialog.isOpen() || preview.handleAxes() !== "part"}
            kind="globe"
            title={
              preview.handleAxes() === "part"
                ? "Handles lying along the part's own axes"
                : "Handles lying along the figure's axes"
            }
          />
          <For each={HANDLES}>
            {({ kind, icon, title }) => (
              <IconTab
                onClick={() => {
                  // Taking up the handles that are already up puts them down,
                  // there being nowhere else for the button to send them.
                  preview.setHandles((standing) =>
                    standing === kind ? "none" : kind,
                  );
                  flush();
                  requestAutoSave();
                }}
                selected={!ProfileDialog.isOpen() && preview.handles() === kind}
                kind={icon}
                title={title}
              />
            )}
          </For>
        </Bar>
        <Bar>
          <IconTab
            onClick={() => {
              preview.setFocus((focus) => (focus === "part" ? "root" : "part"));
              flush();
              requestAutoSave();
            }}
            selected={!ProfileDialog.isOpen() && preview.focus() === "part"}
            kind="crosshairs"
            title={
              preview.focus() === "part"
                ? "Turning about the part being drawn on"
                : "Turning about the figure's root"
            }
          />
          <IconTab
            onClick={() => {
              preview.setAutoframe((autoframe) => !autoframe);
              flush();
              requestAutoSave();
            }}
            selected={!ProfileDialog.isOpen() && preview.autoframe()}
            kind="expand"
            title="Autoframe: keep the whole figure in the view as it is drawn"
          />
        </Bar>
        <Bar>
          <ViewSettingsPopover.Trigger
            class={[tabStyle, iconTabStyle]}
            title="How the view is drawn"
          >
            <Icon kind="gear" />
          </ViewSettingsPopover.Trigger>
          <ViewSettingsPopover.PopOver
            class={[popoverStyle, styles.viewSettingsPopover]}
          >
            <IconTab
              onClick={() => {
                preview.setAutorotate((rotate) => !rotate);
                flush();
                requestAutoSave();
              }}
              selected={!ProfileDialog.isOpen() && preview.autorotate()}
              kind="rotate"
              title="Turn the figure on a turntable"
            />
            <IconTab
              onClick={() => {
                preview.setUnlit((unlit) => !unlit);
                flush();
                requestAutoSave();
              }}
              selected={!ProfileDialog.isOpen() && !preview.unlit()}
              kind="lightbulb"
              title="Light the figure, rather than showing its colours flat"
            />
            <IconTab
              onClick={() => {
                preview.setDebug((debug) => !debug);
                flush();
                requestAutoSave();
              }}
              selected={!ProfileDialog.isOpen() && preview.debug()}
              kind="bug"
              title="Stand every part's sides and cuts in the view as planes"
            />
          </ViewSettingsPopover.PopOver>
        </Bar>
      </div>
      <Bar class={styles.partsBar}>
        <PartsPanel />
      </Bar>
    </div>
  );
}
