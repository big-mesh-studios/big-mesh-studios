// The shelf the built-in "Raise a Floppa" demo's Interwebs terminal draws:
// the meals and goods grouped the way the original's store tabs them, and the
// items-spritesheet sprite each bought item's hotbar icon takes. Kept apart
// from the demo's script so it carries no `"voxelscape"` import and can be
// unit-tested on its own; the prices and effects themselves live in
// `raise-a-floppa-care`.
import { FOODS, GOODS, type GoodsDef } from "./raise-a-floppa-care";

/** One buyable line on the shelf. */
export interface ShopEntry {
  readonly id: string;
  readonly name: string;
  readonly price: number;
}

/** One labelled group of shelf lines. */
export interface ShopGroup {
  readonly id: string;
  readonly name: string;
  readonly items: readonly ShopEntry[];
}

const line = (source: {
  id: string;
  name: string;
  price: number;
}): ShopEntry => ({
  id: source.id,
  name: source.name,
  price: source.price,
});

const ofKind = (kind: GoodsDef["kind"]): ShopEntry[] =>
  GOODS.filter((g) => g.kind === kind).map(line);

/** Every group the terminal shows, in the order it shows them. */
export const SHOP_GROUPS: readonly ShopGroup[] = [
  { id: "food", name: "Food", items: FOODS.map(line) },
  { id: "things", name: "Floppa's Things", items: ofKind("placeable") },
  { id: "help", name: "Helpers", items: ofKind("helper") },
  { id: "defense", name: "Defense", items: ofKind("weapon") },
  { id: "faith", name: "Faith", items: ofKind("faith") },
];

/** The items-spritesheet sprite each item's icon is cropped from, or "". */
const SPRITES: Record<string, string> = {
  sword: "sword_iron",
  milk: "bowl",
  kibble: "wheat",
  steak: "fish_cooked",
  cake: "stew",
};

/** The sprite name `id`'s hotbar icon draws, or "" when it has none. */
export const itemSprite = (id: string): string => SPRITES[id] ?? "";
