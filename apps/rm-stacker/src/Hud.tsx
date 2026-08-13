import { fileOpen, fileSave, FileWithHandle } from "browser-fs-access";
import { createSignal, onSettled, useContext } from "solid-js";
import {
  Bar,
  Colour,
  colourTabStyle,
  Column,
  createPopover,
  Icon,
  IconButton,
  IconTab,
  iconTabStyle,
  tabStyle,
} from "./components/components";
import { StackerContext } from "./context";
import styles from "./Hud.module.css";
import { load, save } from "./load-save";
import Palette from "./Palette";

export function Hud() {
  const {
    sides,
    setSides,
    undoRedoManager,
    updateVoxels,
    selectedColour,
    requestRender,
    mode,
    setMode,
    reset,
    palette,
    setPalette,
  } = useContext(StackerContext);

  const [fileHandle, setFileHandle] = createSignal<FileSystemFileHandle | null>(null);

  const MenuPopover = createPopover();
  const PalettePopover = createPopover();

  const onLoad = async () => {
    const file = await fileOpen<false>({
      extensions: [".zip"],
      description: "Sprite stack",
      mimeTypes: ["application/zip"],
    });
    const result = await load(file, palette());
    setSides(result.sides);
    setPalette(result.palette);
    updateVoxels();
    setFileHandle((file as FileWithHandle).handle ?? null);
    onSettled(() => {
      requestRender();
    });
  };

  const onSave = async () => {
    const blob = await save(sides(), palette());
    setFileHandle(
      await fileSave(
        blob,
        {
          fileName: "sprite-stack.zip",
          extensions: [".zip"],
          description: "Sprite stack",
        },
        fileHandle(),
      ),
    );
  };

  const onSaveAs = async () => {
    const blob = await save(sides(), palette());
    setFileHandle(
      await fileSave(blob, {
        fileName: "sprite-stack.zip",
        extensions: [".zip"],
        description: "Sprite stack",
      }),
    );
  };

  return (
    <>
      <div class={styles.hud}>
        <div class={styles.side}>
          <Bar>
            <MenuPopover.Trigger class={[tabStyle, iconTabStyle]}>
              <Icon kind="bars" />
            </MenuPopover.Trigger>
            <MenuPopover.PopOver class={styles.menuPopover}>
              <IconButton
                kind="file"
                label="New File"
                onClick={() => {
                  if (!window.confirm("Start a new file? This will discard your current work.")) {
                    return;
                  }
                  undoRedoManager.clear();
                  reset();
                  MenuPopover.close();
                }}
              />
              <IconButton kind="floppy-disk" label="Save File" onClick={onSave} />
              <IconButton kind="floppy-disk" label="Save As" onClick={onSaveAs} />
              <IconButton onClick={onLoad} kind="folder" label="Load" />
            </MenuPopover.PopOver>
          </Bar>
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
      </div>
    </>
  );
}
