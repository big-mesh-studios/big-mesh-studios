import { fileOpen, fileSave, FileWithHandle } from "browser-fs-access";
import { createSignal, onSettled, Show, useContext } from "solid-js";
import {
  Bar,
  ColourTab,
  Column,
  createPopOver,
  IconButton,
  IconTab,
} from "../components/components";
import { LayoutContext, StackerContext } from "../context";
import { DAWNBRINGER_32_PALETTE } from "../default_palette";
import { load, save } from "../load-save";
import Palette from "../Palette";
import { createInitialSides } from "../stacker-store";
import { ModeKind, RGBA } from "../types";
import styles from "./Hud.module.css";

export function Hud(props: {
  mode: ModeKind;
  setMode(kind: ModeKind): void;
  selectedColour: RGBA;
  onSelectColour(colour: RGBA): void;
  render(): void;
}) {
  const { store, setSides, undoRedoManager, updateVoxels } = useContext(StackerContext);

  const layout = useContext(LayoutContext);

  const [fileHandle, setFileHandle] = createSignal<FileSystemFileHandle | null>(null);
  const [palette, setPalette] = createSignal<RGBA[]>(DAWNBRINGER_32_PALETTE);
  const [isMenuOpen, setIsMenuOpen] = createSignal(false);
  const [isPaletteOpen, setIsPaletteOpen] = createSignal(false);

  const onLoad = async () => {
    const file = await fileOpen<false>({
      extensions: [".zip"],
      description: "Sprite stack",
      mimeTypes: ["application/zip"],
    });
    const sides = await load(file);
    setSides(sides);
    updateVoxels();
    setFileHandle((file as FileWithHandle).handle ?? null);
    onSettled(() => {
      props.render();
    });
  };

  const onSave = async () => {
    const blob = await save(store.sides);
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
    const blob = await save(store.sides);
    setFileHandle(
      await fileSave(blob, {
        fileName: "sprite-stack.zip",
        extensions: [".zip"],
        description: "Sprite stack",
      }),
    );
  };

  const Menu = createPopOver();
  const Colour = createPopOver();

  return (
    <>
      <div class={styles.hud}>
        <div class={styles.side}>
          <Bar>
            <Menu.Trigger
              as={IconTab}
              kind="bars"
              selected={isMenuOpen()}
              onClick={() => setIsMenuOpen(bool => !bool)}
              class={styles.menuTrigger}
            />
            <Menu.PopOver class={styles.menuPopover}>
              <IconButton
                kind="file"
                label="New File"
                onClick={() => {
                  if (!window.confirm("Start a new file? This will discard your current work.")) {
                    return;
                  }
                  undoRedoManager.clear();
                  setSides(createInitialSides(store.dimensions));

                  updateVoxels();
                  props.render();
                }}
              />
              <IconButton kind="floppy-disk" label="Save File" onClick={onSave} />
              <IconButton kind="floppy-disk" label="Save As" onClick={onSaveAs} />
              <IconButton onClick={onLoad} kind="folder" label="Load" />
            </Menu.PopOver>
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
            <Show when={layout() === "column"}>
              <Column>
                <Bar>
                  <IconTab
                    kind="up-down-left-right"
                    onClick={() => props.setMode("Idle")}
                    selected={props.mode === "Idle"}
                  />
                  <IconTab
                    kind="pen"
                    onClick={() => props.setMode("Draw")}
                    selected={props.mode === "Draw"}
                  />
                  <IconTab
                    kind="fill"
                    onClick={() => props.setMode("Fill")}
                    selected={props.mode === "Fill"}
                  />
                  <IconTab
                    kind="eraser"
                    onClick={() => props.setMode("Erase")}
                    selected={props.mode === "Erase"}
                  />
                  <IconTab
                    kind="eye-dropper"
                    onClick={() => props.setMode("Eyedrop")}
                    selected={props.mode === "Eyedrop"}
                  />
                </Bar>
              </Column>
            </Show>
            <Bar>
              <Colour.Trigger
                as={ColourTab}
                colour={props.selectedColour}
                class={styles.paletteTrigger}
                onClick={() => setIsPaletteOpen(bool => !bool)}
              />
              <Colour.PopOver class={styles.palettePopover} popover="manual">
                <Palette
                  onSelect={props.onSelectColour}
                  palette={palette()}
                  selectedColour={props.selectedColour}
                />
              </Colour.PopOver>
            </Bar>
          </div>
        </div>
        <div class={styles.main}></div>
        <Show when={layout() === "row"}>
          <Column>
            <Bar>
              <IconTab
                kind="up-down-left-right"
                onClick={() => props.setMode("Idle")}
                selected={props.mode === "Idle"}
              />
              <IconTab
                kind="pen"
                onClick={() => props.setMode("Draw")}
                selected={props.mode === "Draw"}
              />
              <IconTab
                kind="fill"
                onClick={() => props.setMode("Fill")}
                selected={props.mode === "Fill"}
              />
              <IconTab
                kind="eraser"
                onClick={() => props.setMode("Erase")}
                selected={props.mode === "Erase"}
              />
              <IconTab
                kind="eye-dropper"
                onClick={() => props.setMode("Eyedrop")}
                selected={props.mode === "Eyedrop"}
              />
            </Bar>
          </Column>
        </Show>
      </div>
    </>
  );
}
