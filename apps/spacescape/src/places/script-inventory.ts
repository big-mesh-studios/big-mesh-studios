/**
 * What the player is carrying, and what they have in their hands.
 *
 * ## Names and counts, and nothing else
 *
 * **An item is a name and a number.** There is no sprite, no slot, no weight and no durability,
 * and that is not a first version to be filled in later — it is the shape the thing has. The
 * sibling engine's `ScriptInventory` carries a `stackable` flag and an empty sprite for every
 * item, and neither means anything there either: this engine has no inventory panel to show a
 * slot in and no icon to draw. **A field that nothing can act on reads as a feature and is not
 * one**, so `item-define` takes a name and nothing else, and when a panel arrives the flag comes
 * with it.
 *
 * ## A place declares an item before it can hand one out
 *
 * **`item-give` of a name the place has not declared is a refusal, and that is the whole reason
 * `item-define` exists.** In the shop this was built for, the difference between "the player has
 * a cola" and "the player has a cloa" is the entire puzzle, and a typo that quietly created a
 * junk item would be invisible until the moment the player could not buy anything with it. One
 * declaration per item is a cheap price for a misspelling being an error at the line it was
 * written rather than a symptom three hundred lines later.
 *
 * ## Taking is best-effort and giving is not
 *
 * **`take` hands back whatever is there, up to the count asked for, and never refuses.**
 * Removing something you do not have is a normal thing for a place to do — a player who already
 * drank the milk has none, and a script that treated that as an error would crash on the ordinary
 * path. The cost is that a script cannot learn how much it got, which is why the rule above about
 * declaring items matters: a place knows what it gave, and a place that needs to check keeps its
 * own count in `saveData`.
 *
 * ## The held slot is part of the inventory, not beside it
 *
 * **Because holding something is what decides whether a crosshair on a character is a
 * conversation or a use**, so the two cannot be separate pieces of state that could disagree. The
 * one rule worth stating: **a held item whose count reaches zero is dropped**, because a hand
 * holding nothing that is nevertheless in the inventory is a state the interaction routing would
 * read as occupied.
 */

import { MAX_ITEMS, MAX_ITEM_COUNT } from "./limits";

/** Why an inventory call was refused. Read by the host, never shown raw. */
export type InventoryRefusal =
  | { readonly why: "too many items" }
  | { readonly why: "undeclared"; readonly item: string }
  | { readonly why: "count too large"; readonly item: string }
  | { readonly why: "not a count"; readonly count: number };

export class ScriptInventory {
  /** Every item this place has declared, in the order it declared them. */
  private readonly declared = new Set<string>();
  private readonly counts = new Map<string, number>();
  private held: string | undefined;

  /** How many items are declared, for a readout and for the limit test. */
  get itemCount(): number {
    return this.declared.size;
  }

  /** How many distinct items are actually carried, for a readout. */
  get carried(): number {
    return this.counts.size;
  }

  /** What is in hand, or `undefined` for empty hands. */
  get heldItem(): string | undefined {
    return this.held;
  }

  /** Whether a name has been declared. */
  declares(item: string): boolean {
    return this.declared.has(item);
  }

  /** How many of something the player has. Zero for anything undeclared. */
  count(item: string): number {
    return this.counts.get(item) ?? 0;
  }

  /** Every carried item with its count, for a readout. Sorted, so a readout is stable. */
  contents(): readonly { item: string; count: number }[] {
    return [...this.counts.entries()]
      .filter(([, count]) => count > 0)
      .map(([item, count]) => ({ item, count }))
      .sort((a, b) => (a.item < b.item ? -1 : a.item > b.item ? 1 : 0));
  }

  /**
   * Declares an item.
   *
   * **Idempotent, and deliberately.** A place that declares the same item twice — which a loop
   * over its own table will do the first time it runs and again every time it reloads — has
   * said the same thing twice, and refusing it would make reloading a place a failure. It is a
   * declaration rather than a definition: nothing about the item changes, and nothing is
   * created.
   */
  define(item: string): InventoryRefusal | undefined {
    if (this.declared.has(item)) return undefined;
    if (this.declared.size >= MAX_ITEMS) return { why: "too many items" };
    this.declared.add(item);
    return undefined;
  }

  /**
   * Puts items in, refusing an undeclared name.
   *
   * **The refusal is on the name rather than on the count**, because an undeclared name is a
   * misspelling and a count over the cap is arithmetic. Both are worth catching, and they are
   * caught where they can be told apart.
   */
  give(item: string, count: number): InventoryRefusal | undefined {
    if (!this.declared.has(item)) return { why: "undeclared", item };
    if (!isCount(count)) return { why: "not a count", count };
    const next = this.count(item) + count;
    if (next > MAX_ITEM_COUNT) return { why: "count too large", item };
    this.counts.set(item, next);
    return undefined;
  }

  /**
   * Takes items out, up to the count asked for, and never refuses.
   *
   * **The best-effort rule, and it is the one place in this file where a caller is told nothing
   * about what happened.** See the header: removing something the player does not have is an
   * ordinary state, not a failure, and a script that treated it as one would crash on the
   * ordinary path.
   *
   * **And the held slot is dropped when its count reaches zero**, which is the whole reason the
   * held slot lives in here. A hand holding an item the inventory says is gone is a state the
   * interaction routing would read as occupied.
   */
  take(item: string, count: number): number {
    if (!isCount(count)) return 0;
    const had = this.count(item);
    if (had === 0) return 0;

    const taken = Math.min(had, count);
    const left = had - taken;
    if (left === 0) this.counts.delete(item);
    else this.counts.set(item, left);

    if (this.held === item && left === 0) this.held = undefined;
    return taken;
  }

  /**
   * Puts something in the hands, or empties them.
   *
   * **An empty hand is always reachable, and holding nothing you have is refused.** A hand that
   * can hold something the inventory says is gone is a hand the routing reads as occupied, and
   * the ordinary path — the player pressed use and the thing ran out — is exactly when it would
   * be tried.
   */
  hold(item: string | undefined): InventoryRefusal | undefined {
    if (item === undefined) {
      this.held = undefined;
      return undefined;
    }
    if (this.count(item) === 0) return { why: "undeclared", item };
    this.held = item;
    return undefined;
  }

  /**
   * Forgets everything, including the declarations.
   *
   * **Taken with the place, as the hands are.** A place that is gone cannot leave the player
   * holding something it invented, which would be the first thing the next place's crosshair read.
   */
  clear(): void {
    this.declared.clear();
    this.counts.clear();
    this.held = undefined;
  }
}

/**
 * Whether a number is a count: a whole number, and not negative.
 *
 * **Zero is a count**, because handing out nothing and taking nothing are both ordinary — a
 * place with a stack it has run out of says `giveItem("cola")` with no count at all and means
 * one, and a place deliberately taking nothing says `takeItem("cola", 0)`.
 */
const isCount = (count: number): boolean =>
  Number.isInteger(count) && count >= 0;
