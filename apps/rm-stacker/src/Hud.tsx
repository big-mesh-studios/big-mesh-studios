import { createPopover } from "@big-mesh-studios/utils/create-popover";
import { flush, useContext } from "solid-js";
import {
  Bar,
  Colour,
  colourTabStyle,
  Column,
  createDialog,
  IconButton,
  IconTab,
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
    preview,
    requestAutoSave,
    atproto,
  } = useContext(StackerContext);

  const PalettePopover = createPopover();
  const ProfileDialog = createDialog();

  const isModeSelected = (_mode: ModeKind) =>
    !ProfileDialog.isOpen() && _mode === mode();

  return (
    <>
      <div class={styles.hud}>
        <div class={styles.side}>
          <Bar>
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
          <div class={styles.bottom}>
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
            <Column>
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
            </Column>
            <Bar>
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
          </div>
        </div>
        <div class={styles.main}></div>
        <div class={[styles.side, styles.right]}>
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

          <div class={styles.bottom}>
            <PartsPanel />
          </div>
        </div>
      </div>
    </>
  );
}
