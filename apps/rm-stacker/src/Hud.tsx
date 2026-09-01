import { createPopover } from "@big-mesh-studios/utils/create-popover";
import { flush, useContext } from "solid-js";
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
import { PartsPanel } from "./PartsPanel";
import { ProfileModal } from "./profile/ProfileModal";
import { ModeKind } from "./types";

export function Hud() {
  const {
    undoRedoManager,
    selectedColour,
    mode,
    setMode,
    mirror,
    setMirror,
    preview,
    requestAutoSave,
    requestFitToView,
    atproto,
  } = useContext(StackerContext);

  const PalettePopover = createPopover();
  const PartsPopover = createPopover();
  const ProfileDialog = createDialog();

  const isModeSelected = (_mode: ModeKind) =>
    !ProfileDialog.isOpen() && _mode === mode();

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
      <Bar class={styles.history}>
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
      <Bar class={styles.tools}>
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
          kind="eraser"
          onClick={() => setMode("Erase")}
          selected={isModeSelected("Erase")}
        />
        <IconTab
          kind="square"
          onClick={() => setMode("Rectangle")}
          selected={isModeSelected("Rectangle")}
        />
        <IconTab
          kind="eye-dropper"
          onClick={() => setMode("Eyedrop")}
          selected={isModeSelected("Eyedrop")}
        />
      </Bar>
      <Bar class={styles.mirror}>
        <IconTab
          kind="left-right"
          onClick={() =>
            setMirror((current) => ({ ...current, x: !current.x }))
          }
          selected={!ProfileDialog.isOpen() && mirror().x}
          title="Mirror what is drawn across the panel's vertical middle"
        />
        <IconTab
          kind="up-down"
          onClick={() =>
            setMirror((current) => ({ ...current, y: !current.y }))
          }
          selected={!ProfileDialog.isOpen() && mirror().y}
          title="Mirror what is drawn across the panel's horizontal middle"
        />
      </Bar>
      <Bar class={styles.colour}>
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
      <Bar class={styles.view}>
        <IconTab
          onClick={() => {
            preview.setAutorotate((rotate) => !rotate);
            flush();
            requestAutoSave();
          }}
          selected={!ProfileDialog.isOpen() && preview.autorotate()}
          kind="rotate"
        />
        <IconTab
          onClick={() => {
            preview.setUnlit((unlit) => !unlit);
            flush();
            requestAutoSave();
          }}
          selected={!ProfileDialog.isOpen() && !preview.unlit()}
          kind="lightbulb"
        />
        <IconTab
          onClick={() => {
            preview.setAxesVisible((unlit) => !unlit);
            flush();
            requestAutoSave();
          }}
          selected={!ProfileDialog.isOpen() && preview.axesVisible()}
          kind="arrows-up-down-left-right"
        />
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
        <IconButton
          onClick={requestFitToView}
          kind="expand"
          title="Frame the whole figure"
        />
      </Bar>
      <Bar class={styles.partsBar}>
        <PartsPopover.Trigger
          class={[tabStyle, iconTabStyle]}
          title="The figure's parts"
        >
          <Icon kind="cubes" />
        </PartsPopover.Trigger>
        <PartsPopover.PopOver
          popover="manual"
          class={[popoverStyle, styles.partsPopover]}
        >
          <PartsPanel />
        </PartsPopover.PopOver>
      </Bar>
    </div>
  );
}
