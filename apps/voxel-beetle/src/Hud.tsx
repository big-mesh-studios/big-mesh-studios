// The controls over both views: what to draw with, in what colour, which slice,
// and the things the model needs rather than the view.
//
// A model here is one box of voxels with nothing to animate and nothing to
// arrange, so the bars over the model are the tool, the colour and the slice,
// and the file the model is in. There is no transport, because there is no
// motion, and no parts list, because there are no parts.
import { Component, For, useContext } from "solid-js";
import { BeetleContext } from "./context";
import {
  Bar,
  Button,
  buttonStyle,
  Colour,
  colourTabStyle,
  createDialog,
  IconButton,
  IconTab,
  popoverStyle,
  tabStyle,
} from "./components/components";
import { createPopover } from "@big-mesh-studios/utils/create-popover";
import { PLANE_KINDS, PLANE_MASK } from "./constants";
import Palette from "./components/Palette";
import { FilesDialog } from "./FilesDialog";
import type { IconKind } from "./icon-kinds";
import type { ModeKind, Plane } from "./types";
import styles from "./Hud.module.css";

const MODES: { kind: ModeKind; icon: IconKind; label: string }[] = [
  { kind: "Idle", icon: "hand", label: "Move the view and nothing else" },
  { kind: "Draw", icon: "pen", label: "Draw on the slice" },
  { kind: "Fill", icon: "fill-drip", label: "Fill the run around a press" },
  {
    kind: "Rectangle",
    icon: "square",
    label: "Draw a block from a press to a release",
  },
  { kind: "Pick", icon: "eye-dropper", label: "Take a colour off a cell" },
];

const maskColour = (mask: number) =>
  `rgb(${mask & 1 ? 255 : 150} ${mask & 2 ? 255 : 150} ${mask & 4 ? 255 : 150})`;

export const Hud: Component = () => {
  const beetle = useContext(BeetleContext);
  const {
    mode,
    setMode,
    plane,
    setPlane,
    mirror,
    setMirror,
    selectedColour,
    erase,
    undoRedoManager,
    preview,
    compact,
    sliceAt,
    sliceCount,
    stepSlice,
  } = beetle;

  const Files = createDialog();
  const PalettePopover = createPopover();

  return (
    <div class={styles.hud}>
      <Bar class={styles.files}>
        <IconButton
          kind="folder-open"
          title="Your models"
          onClick={Files.open}
        />
        <IconButton
          kind="rotate-left"
          title={undoRedoManager.undoDescription() ?? "Nothing to undo"}
          disabled={!undoRedoManager.hasUndo()}
          onClick={() => undoRedoManager.undo()}
        />
        <IconButton
          kind="rotate-right"
          title={undoRedoManager.redoDescription() ?? "Nothing to redo"}
          disabled={!undoRedoManager.hasRedo()}
          onClick={() => undoRedoManager.redo()}
        />
      </Bar>

      <Bar class={styles.tools}>
        <Bar class={styles.modes}>
          <For each={MODES}>
            {(tool) => (
              <IconTab
                kind={tool.icon}
                title={tool.label}
                selected={mode() === tool.kind}
                onClick={() => setMode(tool.kind)}
              />
            )}
          </For>
        </Bar>

        <Bar class={styles.planes}>
          <For each={PLANE_KINDS}>
            {(kind) => (
              <IconTab
                kind="square"
                title={`The ${kind.toUpperCase()} plane, cut along ${planeAxis(kind)}`}
                selected={plane() === kind}
                class={[styles.planeTab, styles[kind]]}
                onClick={() => setPlane(kind)}
              />
            )}
          </For>
        </Bar>

        <Bar class={styles.slices}>
          <IconButton
            kind="chevron-up"
            title="The slice before"
            onClick={() => stepSlice(-1)}
          />
          <Button
            class={[buttonStyle, styles.sliceCount]}
            title="The slice in front of you, and how many there are"
          >
            {sliceAt() + 1}/{sliceCount()}
          </Button>
          <IconButton
            kind="chevron-down"
            title="The slice after"
            onClick={() => stepSlice(1)}
          />
        </Bar>

        <Bar class={styles.mirror}>
          <IconTab
            kind="arrows-left-right"
            title="Mirror the stroke across the slice"
            selected={mirror().across}
            onClick={() => setMirror({ ...mirror(), across: !mirror().across })}
          />
          <IconTab
            kind="arrows-up-down"
            title="Mirror the stroke down the slice"
            selected={mirror().down}
            onClick={() => setMirror({ ...mirror(), down: !mirror().down })}
          />
        </Bar>

        <Bar class={styles.colour}>
          <PalettePopover.Trigger
            class={[tabStyle, colourTabStyle]}
            title="The colours"
          >
            <Colour colour={selectedColour()} />
          </PalettePopover.Trigger>
          <IconTab
            kind="eraser"
            title="Erase, or draw again"
            selected={beetle.erasing()}
            onClick={erase}
          />
          <PalettePopover.PopOver
            class={[popoverStyle, styles.palettePopover]}
            popover="manual"
          >
            <Palette />
          </PalettePopover.PopOver>
        </Bar>
      </Bar>

      <Bar class={styles.view}>
        <IconTab
          kind="rotate"
          title="Turn the model on its own"
          selected={preview.autorotate()}
          onClick={() => preview.setAutorotate(!preview.autorotate())}
        />
        <IconTab
          kind="sun"
          title="Show the colours flat rather than lit"
          selected={preview.unlit()}
          onClick={() => preview.setUnlit(!preview.unlit())}
        />
        <IconTab
          kind="layer-group"
          title="Stand the slice in the model"
          selected={preview.showSlice()}
          onClick={() => preview.setShowSlice(!preview.showSlice())}
        />
        <IconTab
          kind="expand"
          title="Fit the model to the view"
          selected={preview.autoframe()}
          onClick={() => preview.setAutoframe(!preview.autoframe())}
        />
      </Bar>

      <Files.Dialog class={styles.filesDialog}>
        <FilesDialog />
      </Files.Dialog>
    </div>
  );
};

const planeAxis = (plane: Plane) =>
  plane === "xy" ? "z" : plane === "yz" ? "x" : "y";
