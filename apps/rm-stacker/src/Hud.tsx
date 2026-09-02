import { Bitmap } from "@big-mesh-studios/maths";
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
    erasing,
    setErasing,
    mode,
    setMode,
    mirror,
    setMirror,
    preview,
    requestAutoSave,
    atproto,
  } = useContext(StackerContext);

  const PalettePopover = createPopover();
  const PartsPopover = createPopover();
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
          kind="square"
          onClick={() => setMode("Rectangle")}
          selected={isModeSelected("Rectangle")}
        />
        <IconTab
          kind="eye-dropper"
          onClick={() => setMode("Eyedrop")}
          selected={isModeSelected("Eyedrop")}
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
      <Bar class={styles.mirror}>
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
      <Bar class={styles.colour}>
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
      <div class={styles.view}>
        <Bar>
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
        </Bar>
        <Bar>
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
      </div>
      <Bar class={styles.partsBar}>
        <PartsPopover.Trigger
          class={[tabStyle, iconTabStyle]}
          title="The figure's parts"
        >
          <Icon kind="cubes" />
        </PartsPopover.Trigger>
        <PartsPopover.PopOver popover="manual" class={[styles.partsPopover]}>
          <PartsPanel />
        </PartsPopover.PopOver>
      </Bar>
    </div>
  );
}
