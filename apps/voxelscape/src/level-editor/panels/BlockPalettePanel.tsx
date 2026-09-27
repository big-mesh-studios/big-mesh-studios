import {
  For,
  Show,
  createSignal,
  onSettled,
  useContext,
  type Accessor,
} from "solid-js";
import { LevelEditorContext } from "../context";
import {
  VOXEL_BLOCKS,
  blocksOfGroup,
  type VoxelBlock,
  type VoxelBlockGroup,
} from "../../world/voxel-blocks";
import {
  BLOCK_ICON_SIZE,
  loadBlockIcons,
  sheetIconStyle,
  type BlockIcon,
} from "../view/block-icons";
import styles from "./panels.module.css";

/** The families the blocks are grouped under, in the order they are shown. */
const GROUPS: VoxelBlockGroup[] = ["Terrain", "Nature", "Built", "Wool"];

/** How far each horizontal arrow key moves through the grid. */
const HORIZONTAL_STEP: Record<string, number> = {
  ArrowLeft: -1,
  ArrowRight: 1,
};

/** How many chips share a row, which the vertical arrows step by. */
const columnsIn = (chips: HTMLElement | null | undefined): number => {
  const first = chips?.firstElementChild as HTMLElement | undefined;
  if (chips === null || chips === undefined || first === undefined) {
    return 1;
  }
  let columns = 0;
  for (const child of chips.children) {
    if ((child as HTMLElement).offsetTop !== first.offsetTop) {
      break;
    }
    columns += 1;
  }
  return Math.max(1, columns);
};

/**
 * One block's tile. A tile cropped out of the sheet carries its background
 * properties through the `style` prop as an object, whose keys Solid applies
 * verbatim and are therefore written kebab-case.
 */
function BlockSwatch(props: { icon: BlockIcon | undefined }) {
  return (
    <span class={styles.swatch} data-icon={props.icon?.kind ?? "pending"}>
      <Show when={props.icon?.kind === "sheet" && props.icon} keyed>
        {(icon) => (
          <span class={styles.tile} style={sheetIconStyle(icon.rect)} />
        )}
      </Show>
      <Show when={props.icon?.kind === "painted" && props.icon} keyed>
        {(icon) => <span class={styles.tile}>{icon.canvas}</span>}
      </Show>
    </span>
  );
}

function BlockChip(props: {
  block: VoxelBlock;
  icons: Accessor<Map<number, BlockIcon>>;
}) {
  const editor = useContext(LevelEditorContext);
  const selected = () => editor.activeBlockId() === props.block.id;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected() ? "true" : "false"}
      tabindex={selected() ? 0 : -1}
      data-block={props.block.id}
      class={styles.chip}
      title={`${props.block.name} · block ${props.block.id}`}
      onClick={() => editor.setActiveBlockId(props.block.id)}
    >
      <BlockSwatch icon={props.icons().get(props.block.id)} />
      <span class={styles.chipLabel}>{props.block.name}</span>
      <Show when={selected()}>
        <span class={styles.chipTick} aria-hidden="true">
          ✓
        </span>
      </Show>
    </button>
  );
}

function BlockGrid(props: { icons: Accessor<Map<number, BlockIcon>> }) {
  const editor = useContext(LevelEditorContext);
  const indexOf = new Map(
    VOXEL_BLOCKS.map((block, index) => [block.id, index]),
  );

  // Moving through the grid with the keyboard both checks the block it lands on
  // and moves focus onto it, which is what a radio group does, and leaves the
  // roving tab stop following the active block however it was last changed.
  const focusBlock = (id: number) => {
    editor.setActiveBlockId(id);
    grid?.querySelector<HTMLElement>(`[data-block="${id}"]`)?.focus();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const from = indexOf.get(editor.activeBlockId());
    if (from === undefined) {
      return;
    }
    // The chips are laid out one family at a time, each in as many columns as it
    // has room for, so the row stride is read off the family the first chip is in.
    const row = columnsIn(
      grid?.querySelector<HTMLElement>("[data-block]")?.parentElement,
    );
    const horizontal = HORIZONTAL_STEP[event.key];
    const stride =
      horizontal ??
      (event.key === "ArrowDown"
        ? row
        : event.key === "ArrowUp"
          ? -row
          : undefined);
    if (stride === undefined) {
      return;
    }
    const to = Math.min(VOXEL_BLOCKS.length - 1, Math.max(0, from + stride));
    event.preventDefault();
    focusBlock(VOXEL_BLOCKS[to].id);
  };

  let grid: HTMLElement | undefined;

  return (
    <div
      class={styles.palette}
      role="radiogroup"
      aria-label="Block"
      ref={(element) => {
        grid = element;
      }}
      onKeyDown={onKeyDown}
    >
      <For each={GROUPS}>
        {(group) => (
          <section class={styles.group}>
            <h3 class={styles.groupHeading}>{group}</h3>
            <div class={styles.grid}>
              <For each={blocksOfGroup(group)}>
                {(block) => <BlockChip block={block} icons={props.icons} />}
              </For>
            </div>
          </section>
        )}
      </For>
    </div>
  );
}

/** Every block a structure can be built from, drawn as the tile the world draws it with. */
export function BlockPalettePanel() {
  // The grid and its captions are on screen before the sheet has been read, so
  // each block shows an empty well until its own tile arrives.
  const [icons, setIcons] = createSignal<Map<number, BlockIcon>>(new Map());
  onSettled(() => {
    void loadBlockIcons().then((loaded) => setIcons(() => loaded));
  });

  return (
    <div
      class={styles.panel}
      style={{ "--block-icon-size": `${BLOCK_ICON_SIZE}px` }}
    >
      <h2 class={styles.heading}>Blocks</h2>
      <BlockGrid icons={icons} />
    </div>
  );
}
