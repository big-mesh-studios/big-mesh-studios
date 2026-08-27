import { flush, useContext } from "solid-js";
import { ProfileModal } from "./profile/ProfileModal";
import {
  Bar,
  Colour,
  colourTabStyle,
  Column,
  createDialog,
  createPopover,
  Icon,
  IconButton,
  IconTab,
  iconTabStyle,
  tabStyle,
} from "./components/components";
import { StackerContext } from "./context";
import styles from "./Hud.module.css";
import Palette from "./Palette";

export function Hud() {
  const { undoRedoManager, selectedColour, mode, setMode, preview, requestAutoSave, atproto } =
    useContext(StackerContext);

  const PalettePopover = createPopover();
  const ProfileDialog = createDialog();

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
            <ProfileModal open={ProfileDialog.isOpen()} onClose={() => ProfileDialog.close()} />
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
                  selected={mode() === "Idle"}
                />
                <IconTab kind="pen" onClick={() => setMode("Draw")} selected={mode() === "Draw"} />
                <IconTab kind="fill" onClick={() => setMode("Fill")} selected={mode() === "Fill"} />
                <IconTab
                  kind="eraser"
                  onClick={() => setMode("Erase")}
                  selected={mode() === "Erase"}
                />
                <IconTab
                  kind="square"
                  onClick={() => setMode("Rectangle")}
                  selected={mode() === "Rectangle"}
                />
                <IconTab
                  kind="eye-dropper"
                  onClick={() => setMode("Eyedrop")}
                  selected={mode() === "Eyedrop"}
                />
              </Bar>
            </Column>
            <Bar>
              <PalettePopover.Trigger class={[tabStyle, colourTabStyle]}>
                <Colour colour={selectedColour()} />
              </PalettePopover.Trigger>
              <PalettePopover.PopOver
                class={styles.palettePopover}
                popover="manual"
                style={{ "anchor-name": "--palette-popover" }}
              >
                <Palette />
              </PalettePopover.PopOver>
            </Bar>
          </div>
        </div>
        <div class={styles.main}></div>
        <div class={styles.bottom}>
          <Bar>
            <IconTab
              onClick={() => {
                preview.setAutorotate(rotate => !rotate);
                flush();
                requestAutoSave();
              }}
              selected={preview.autorotate()}
              kind="rotate"
            />
            <IconTab
              onClick={() => {
                preview.setUnlit(unlit => !unlit);
                flush();
                requestAutoSave();
              }}
              selected={!preview.unlit()}
              kind="lightbulb"
            />
          </Bar>
        </div>
      </div>
    </>
  );
}
