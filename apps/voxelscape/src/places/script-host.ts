// The place script host: the trusted side that runs one creator script in the
// sandbox, feeds it the replicated facts added since the last step, and applies
// whatever it asks for. What a script asks for is limited to the effect
// vocabulary (`effects.ts`), and what it is fed is the shared event log
// (`event-log.ts`), so two peers stepping the same script with the same clock
// converge to the same NPCs and the same dialogs (ADR 0026, 0027). The host is
// a plain domain object: no scene, no DOM, no network — the NPCs it keeps and
// the dialogs it reports are what a caller renders and a player acts on.
import { createQuickJSSandbox } from "./quickjs-sandbox";
import { EventLog } from "./event-log";
import { parseEffect, type ParsedEffect } from "./effects";
import type { ScriptSandbox } from "./sandbox";
import type { ScriptEventPayload } from "./events";

/** One scripted NPC: where it stands, and what it is called. */
export interface ScriptedNpc {
  id: string;
  name: string;
  /** Feet position, in world units; the renderer stands a figure on it. */
  x: number;
  y: number;
  z: number;
}

/** The dialog one player is currently in, as the script last set it. */
export interface DialogState {
  npcId: string;
  /** What the NPC is called, for the dialog's speaker line. */
  name: string;
  prompt: string;
  options: string[];
}

export interface ScriptHostParams {
  /** Seeds the interpreter's randomness; a place's peers all pass the same one. */
  seed: number;
  /** The shared clock, in milliseconds, that drives steps and event timestamps. */
  now: () => number;
  /** The terrain surface at (`x`, `z`), where an NPC's feet are grounded. */
  heightAt: (x: number, z: number) => number;
  /** Called with a line meant for `player` (empty means every local player). */
  onToast?: (player: string, text: string) => void;
  /** Called when `player`'s dialog changes; null when it closed. */
  onDialog?: (player: string, state: DialogState | null) => void;
  /** Called when a step could not run, or the script logged a line. */
  onNotice?: (message: string) => void;
}

/**
 * Runs one place script and owns what it creates. Not tied to a renderer: the
 * NPC map, the dialogs, and the actions a player can take are the whole of
 * what the world needs.
 */
export class ScriptHost {
  private readonly ready: Promise<ScriptSandbox>;
  private readonly heightAt: (x: number, z: number) => number;
  private readonly now: () => number;
  private readonly onToast?: (player: string, text: string) => void;
  private readonly onDialog?: (
    player: string,
    state: DialogState | null,
  ) => void;
  private readonly onNotice?: (message: string) => void;

  private readonly log = new EventLog();
  private readonly sent = new Set<string>();
  private readonly npcs = new Map<string, ScriptedNpc>();
  private readonly dialogs = new Map<string, DialogState>();
  private loaded = false;
  private sequence = 0;
  private problem: string | undefined;
  private disposed = false;

  constructor(params: ScriptHostParams) {
    this.now = params.now;
    this.heightAt = params.heightAt;
    this.onToast = params.onToast;
    this.onDialog = params.onDialog;
    this.onNotice = params.onNotice;
    this.ready = createQuickJSSandbox({
      seed: params.seed,
      now: params.now,
    });
  }

  /** Every scripted NPC currently standing in the world. */
  get npcList(): ScriptedNpc[] {
    return [...this.npcs.values()];
  }

  /** The NPC with `id`, or null when the script has not placed one. */
  npc(id: string): ScriptedNpc | null {
    return this.npcs.get(id) ?? null;
  }

  /** The dialog `player` is in, or null when they are not talking. */
  dialogFor(player: string): DialogState | null {
    return this.dialogs.get(player) ?? null;
  }

  /** What the last step said, if anything — a script error or a log line. */
  get lastError(): string | undefined {
    return this.problem;
  }

  /** Loads the script, applies anything it did while loading, and steps it once. */
  async load(source: string): Promise<void> {
    const sandbox = await this.ready;
    this.assertAlive();
    sandbox.load(source);
    this.loaded = true;
    await this.drain(sandbox);
    await this.step();
  }

  /** The player started talking to `npcId`: a fact for the script to answer. */
  async talk(npcId: string, player: string): Promise<void> {
    this.assertAlive();
    this.dialogs.delete(player);
    this.notifyDialog(player, null);
    this.author({ kind: "npc-talk", npcId }, player);
    await this.step();
  }

  /** The player picked option `option` of the dialog `npcId` is showing. */
  async choose(npcId: string, option: number, player: string): Promise<void> {
    const dialog = this.dialogs.get(player);
    if (dialog === undefined || dialog.npcId !== npcId) {
      return;
    }
    this.author({ kind: "npc-choose", npcId, option }, player);
    await this.step();
  }

  /** The player walked away from `npcId`, ending the dialog. */
  async leave(npcId: string, player: string): Promise<void> {
    this.assertAlive();
    this.author({ kind: "npc-leave", npcId }, player);
    this.dialogs.delete(player);
    this.notifyDialog(player, null);
    await this.step();
  }

  /** One line about the script and what it has created, for a debug console. */
  describe(): string {
    return `script: ${this.loaded ? "loaded" : "not loaded"} · ${this.npcs.size} NPC(s), ${this.dialogs.size} dialog(s)${
      this.problem === undefined ? "" : ` — ${this.problem}`
    }`;
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    void this.ready.then((sandbox) => sandbox.dispose());
  }

  /** Advances the script one step: new facts in, effects out and applied. */
  private async step(): Promise<void> {
    if (!this.loaded) {
      return;
    }
    const sandbox = await this.ready;
    const events = this.log
      .inOrder()
      .filter((event) => !this.sent.has(event.id));
    for (const event of events) {
      this.sent.add(event.id);
    }
    this.problem = undefined;
    try {
      sandbox.tick(this.now(), JSON.stringify(events));
    } catch (cause) {
      this.problem = cause instanceof Error ? cause.message : String(cause);
      this.onNotice?.(this.problem);
    } finally {
      await this.drain(sandbox);
    }
  }

  /** Applies whatever the script queued since the last drain. */
  private async drain(sandbox: ScriptSandbox): Promise<void> {
    const { effects, logs } = sandbox.drain();
    for (const line of logs) {
      this.onNotice?.(line);
    }
    for (const effect of effects) {
      const parsed = parseEffect(effect);
      if (parsed !== null) {
        this.apply(parsed);
      }
    }
  }

  /** A fact the local player caused, stamped and added to the shared log. */
  private author(payload: ScriptEventPayload, producer: string): void {
    const at = this.now();
    this.sequence += 1;
    this.log.add({
      ...payload,
      id: `${producer === "" ? "local" : producer}:${at}:${this.sequence}`,
      at,
      producer,
    });
  }

  private apply(effect: ParsedEffect): void {
    switch (effect.tag) {
      case "npc": {
        const { id, x, z, name } = effect.payload;
        this.npcs.set(id, {
          id,
          name: name ?? "NPC",
          x,
          y: this.heightAt(x, z),
          z,
        });
        break;
      }
      case "npc-remove":
        this.npcs.delete(effect.payload.id);
        break;
      case "toast":
        this.onToast?.(effect.payload.player, effect.payload.text);
        break;
      case "dialog": {
        const { player, npcId, prompt, options } = effect.payload;
        const state = {
          npcId,
          name: this.npcs.get(npcId)?.name ?? npcId,
          prompt,
          options,
        };
        this.dialogs.set(player, state);
        this.notifyDialog(player, state);
        break;
      }
      case "dialog-close":
        this.dialogs.delete(effect.payload.player);
        this.notifyDialog(effect.payload.player, null);
        break;
    }
  }

  private notifyDialog(player: string, state: DialogState | null): void {
    if (this.onDialog !== undefined) {
      this.onDialog(player, state);
    }
  }

  private assertAlive(): void {
    if (this.disposed) {
      throw new Error("script host disposed");
    }
  }
}
