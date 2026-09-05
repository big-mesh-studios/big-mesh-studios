// The replicated fact store a place's derived rules read from: a set of script
// events keyed by id, deduplicated on arrival, handed back in a deterministic
// total order. Every peer keeps one, feeds it every event it receives over the
// mesh or reads from a place's atproto records, and folds its rules over
// `inOrder`, so two peers converge to the same rule state no matter the order
// their copies of the events arrived in. The log only grows — compaction is a
// later decision, recorded in ADR 0026.
import { compareScriptEvents, type ScriptEvent } from "./events";

/**
 * The local copy of a place's script facts. Additions are idempotent: an event
 * whose id is already present is ignored, so a broadcast that arrives twice or
 * an event re-read from a durable record never double-fires a rule.
 */
export class EventLog {
  private readonly events = new Map<string, ScriptEvent>();

  /** Number of distinct events held. */
  get size(): number {
    return this.events.size;
  }

  /** Whether the log holds the event with `id`. */
  has(id: string): boolean {
    return this.events.has(id);
  }

  /** The event with `id`, or undefined when the log has none. */
  get(id: string): ScriptEvent | undefined {
    return this.events.get(id);
  }

  /**
   * Records one event, ignoring it when an event with the same id is already
   * present. Returns whether the log grew.
   */
  add(event: ScriptEvent): boolean {
    if (this.events.has(event.id)) {
      return false;
    }
    this.events.set(event.id, event);
    return true;
  }

  /**
   * Records a batch of events, each idempotently like `add`. Returns the number
   * of events the log did not already hold. The single entry-point for inbound
   * events — the mesh broadcast and the atproto merge both funnel through here.
   */
  apply(events: ScriptEvent[]): number {
    let changed = 0;
    for (const event of events) {
      if (this.add(event)) {
        changed++;
      }
    }
    return changed;
  }

  /** Every event, in the deterministic total order rules fold over. */
  inOrder(): ScriptEvent[] {
    return [...this.events.values()].sort(compareScriptEvents);
  }

  /** An unordered snapshot of every event, for persistence. */
  snapshot(): ScriptEvent[] {
    return [...this.events.values()];
  }
}
