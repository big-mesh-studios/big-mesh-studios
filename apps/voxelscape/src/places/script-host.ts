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
import { ScriptInventory } from "./script-items";
import { bundlePlaceProject } from "./bundle";
import type { ScriptSandbox } from "./sandbox";
import type { ScriptEvent, ScriptEventPayload } from "./events";

/**
 * How long, in milliseconds on the shared clock, a blast stays in the host's
 * list. A renderer needs it only long enough to start its burst, so an older
 * one is dropped rather than kept for the life of a run.
 */
const EXPLOSION_MEMORY_MS = 5_000;

/**
 * How long an NPC dispatched as `npc-die` is kept around after it, still
 * standing in `npcs` so the renderer has something to fall over and lie
 * flat with, before it is forgotten the same way `npc-remove` forgets one
 * outright.
 */
const DEATH_ANIMATION_MS = 1_000;

/** One scripted NPC: where it stands, how it faces, and what it is called. */
export interface ScriptedNpc {
  id: string;
  name: string;
  /** The place model file the NPC wears, or "" for the world's own pick. */
  model: string;
  /**
   * The NPC's model, read live from its own `at://` address, or "" to wear
   * `model` instead — takes precedence over `model` when set.
   */
  modelUri: string;
  /** Feet position, in world units; the renderer stands a figure on it. */
  x: number;
  y: number;
  z: number;
  /** Heading in radians; the renderer turns the figure to it. */
  yaw: number;
  /**
   * The clock moment `npc-die` played this NPC's death fall, or undefined
   * while it is standing. The renderer times its fall from this rather than
   * the host, which only uses it to know when `DEATH_ANIMATION_MS` has
   * passed and the NPC is finally forgotten.
   */
  dyingAt?: number;
}

/** One scripted prop: where it stands, and which place model it wears. */
export interface ScriptedProp {
  id: string;
  /** The model file the prop wears, as the place's manifest names it. */
  model: string;
  name: string;
  /** Feet position, in world units. */
  x: number;
  y: number;
  z: number;
  yaw: number;
  height: number;
  /** Whether the prop blocks the player rather than being walked through. */
  solid: boolean;
}

// The blaze record the host reports lives in the world area, whose types both
// the host and the renderer may import; it is re-exported so a caller of the
// host need not know where it is kept.
import type { ScriptedFire } from "../world/fire-ember";
export type { ScriptedFire };

// The blast record, kept in the world area beside the blaze record and
// re-exported for the same reason.
import type { ScriptedExplosion } from "../world/explosion-blast";
export type { ScriptedExplosion };

/** One named box a script watches the players move through. */
export interface ScriptZone {
  id: string;
  name: string;
  min: [number, number, number];
  max: [number, number, number];
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
  /** Whether (`x`, `y`, `z`) is inside solid ground, for a script to feel its way around. */
  solidAt?: (x: number, y: number, z: number) => boolean;
  /** Whether (`x`, `y`, `z`) is water, for a script to keep a creature out of it. */
  waterAt?: (x: number, y: number, z: number) => boolean;
  /** Every player's live position: the local player first, then connected peers. */
  getPlayers?: () => Array<{ did: string; x: number; y: number; z: number }>;
  /** Called with a line meant for `player` (empty means every local player). */
  onToast?: (player: string, text: string) => void;
  /** Called when `player`'s dialog changes; null when it closed. */
  onDialog?: (player: string, state: DialogState | null) => void;
  /** Called when a step could not run, or the script logged a line. */
  onNotice?: (message: string) => void;
  /** Called when `player`'s game reaches an ending, or null to close it. */
  onEnding?: (
    player: string,
    state: { title: string; text: string } | null,
  ) => void;
  /** Called when `player`'s game asks to start over. */
  onRestart?: (player: string) => void;
  /** Called when the script pins, jumps, or releases the day-night clock. */
  onTime?: (command: {
    seconds?: number;
    speed?: number;
    clear?: boolean;
  }) => void;
  /** Called when a player is shown a line with no figure speaking it. */
  onNarrate?: (player: string, line: { name: string; text: string }) => void;
  /** Called when the script moves a player, optionally turning them. */
  onPlayerPlace?: (
    player: string,
    at: { x: number; z: number; y?: number; yaw?: number },
  ) => void;
  /** Called when the script turns a player to look at a world point. */
  onPlayerFace?: (player: string, at: { x: number; z: number }) => void;
  /** Called when the script scales a player's walk speed. */
  onPlayerSpeed?: (player: string, multiplier: number) => void;
  /** Called when the script scales a player's jump. */
  onPlayerJump?: (player: string, multiplier: number) => void;
  /** Called when the script takes hit points off a player, naming the
   * entity that dealt it when the script said whose swing it was. */
  onPlayerDamage?: (player: string, amount: number, source?: string) => void;
  /**
   * Called when the script's current owner of a live-tracked NPC reports its
   * new position, to broadcast to other peers rather than leave them to
   * compute their own guess from the same live, latency-skewed data.
   */
  onEntityMove?: (state: {
    id: string;
    x: number;
    y: number;
    z: number;
    yaw: number;
  }) => void;
  /**
   * Called with every fact this host itself authors — a player's own talk,
   * use, or swing — so it can be broadcast to other peers. Without this, a
   * fact this host's script folds into its NPCs and dialogs stays true only
   * here: every other peer's own script never hears of it and quietly
   * diverges.
   */
  onEvent?: (event: ScriptEvent) => void;
  /** Called when the script lights a fire; the world seeds its ember light. */
  onFire?: (fire: ScriptedFire) => void;
  /** Called when the script sets off a blast; the world draws the burst. */
  onExplosion?: (explosion: ScriptedExplosion) => void;
  /** The ending titles the place has already reached, read back by a collecting game. */
  endings?: () => string[];
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
  private readonly onEnding?: (
    player: string,
    state: { title: string; text: string } | null,
  ) => void;
  private readonly onRestart?: (player: string) => void;
  private readonly onTime?: (command: {
    seconds?: number;
    speed?: number;
    clear?: boolean;
  }) => void;
  private readonly onNarrate?: (
    player: string,
    line: { name: string; text: string },
  ) => void;
  private readonly onPlayerPlace?: (
    player: string,
    at: { x: number; z: number; y?: number; yaw?: number },
  ) => void;
  private readonly onPlayerFace?: (
    player: string,
    at: { x: number; z: number },
  ) => void;
  private readonly onPlayerSpeed?: (player: string, multiplier: number) => void;
  private readonly onPlayerJump?: (player: string, multiplier: number) => void;
  private readonly onPlayerDamage?: (
    player: string,
    amount: number,
    source?: string,
  ) => void;
  private readonly onEntityMove?: (state: {
    id: string;
    x: number;
    y: number;
    z: number;
    yaw: number;
  }) => void;
  private readonly onEvent?: (event: ScriptEvent) => void;
  private readonly onFire?: (fire: ScriptedFire) => void;
  private readonly onExplosion?: (explosion: ScriptedExplosion) => void;

  /** The items this place's script defines and the local player carries. */
  readonly inventory = new ScriptInventory();
  private readonly log = new EventLog();
  private readonly sent = new Set<string>();
  private readonly npcs = new Map<string, ScriptedNpc>();
  private readonly props = new Map<string, ScriptedProp>();
  private readonly fires = new Map<string, ScriptedFire>();
  private readonly explosions = new Map<string, ScriptedExplosion>();
  private readonly zones = new Map<string, ScriptZone>();
  /** Which zones each player currently stands in, keyed by player. */
  private readonly playerZones = new Map<string, Set<string>>();
  private readonly dialogs = new Map<string, DialogState>();
  /** Timer ids waiting to fire, each against the shared clock it is due at. */
  private readonly pendingTimers = new Map<string, number>();
  private pumping = false;
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
    this.onEnding = params.onEnding;
    this.onRestart = params.onRestart;
    this.onTime = params.onTime;
    this.onNarrate = params.onNarrate;
    this.onPlayerPlace = params.onPlayerPlace;
    this.onPlayerFace = params.onPlayerFace;
    this.onPlayerSpeed = params.onPlayerSpeed;
    this.onPlayerJump = params.onPlayerJump;
    this.onPlayerDamage = params.onPlayerDamage;
    this.onEntityMove = params.onEntityMove;
    this.onEvent = params.onEvent;
    this.onFire = params.onFire;
    this.onExplosion = params.onExplosion;
    this.ready = createQuickJSSandbox({
      seed: params.seed,
      now: params.now,
      endings: params.endings,
      heightAt: params.heightAt,
      solidAt: params.solidAt,
      waterAt: params.waterAt,
      getPlayers: params.getPlayers,
    });
  }

  /** Every scripted NPC currently standing in the world. */
  get npcList(): ScriptedNpc[] {
    return [...this.npcs.values()];
  }

  /**
   * Moves an NPC to where a peer reported it, without asking the local
   * script for a position of its own — the counterpart to the `npc` effect's
   * `live` flag, for whichever peer is not the one currently computing it.
   * A no-op for an id the local script has never placed, since there is
   * nothing to move.
   */
  applyRemoteNpc(
    id: string,
    x: number,
    y: number,
    z: number,
    yaw: number,
  ): void {
    const npc = this.npcs.get(id);
    if (npc === undefined) {
      return;
    }
    this.npcs.set(id, { ...npc, x, y, z, yaw });
  }

  /** The NPC with `id`, or null when the script has not placed one. */
  npc(id: string): ScriptedNpc | null {
    return this.npcs.get(id) ?? null;
  }

  /**
   * Merges facts a peer authored into the shared log and, when any of them
   * are new, steps the script so it reacts to them exactly as it would to
   * one of its own — the counterpart to `author`, so every peer's script
   * folds over the same facts and converges on the same NPCs and dialogs.
   */
  async applyRemoteEvents(events: ScriptEvent[]): Promise<void> {
    if (this.disposed || this.log.apply(events) === 0) {
      return;
    }
    await this.step();
  }

  /** Every prop the script has placed in the world. */
  get propList(): ScriptedProp[] {
    return [...this.props.values()];
  }

  /** The prop with `id`, or null when the script has not placed one. */
  prop(id: string): ScriptedProp | null {
    return this.props.get(id) ?? null;
  }

  /** Every blaze the script has lit in the world. */
  get fireList(): ScriptedFire[] {
    return [...this.fires.values()];
  }

  /** The blaze with `id`, or null when the script has not lit one. */
  fire(id: string): ScriptedFire | null {
    return this.fires.get(id) ?? null;
  }

  /** Every blast the script has set off that the world may still be drawing. */
  get explosionList(): ScriptedExplosion[] {
    return [...this.explosions.values()];
  }

  /** The blast with `id`, or null when the script has not set one off. */
  explosion(id: string): ScriptedExplosion | null {
    return this.explosions.get(id) ?? null;
  }

  /** The dialog `player` is in, or null when they are not talking. */
  dialogFor(player: string): DialogState | null {
    return this.dialogs.get(player) ?? null;
  }

  /** What the last step said, if anything — a script error or a log line. */
  get lastError(): string | undefined {
    return this.problem;
  }

  /**
   * Compiles the project's scripts, loads the bundle into the sandbox, applies
   * anything it did while loading, and steps it once. The entry file is where
   * execution starts; its module must export `bmsTick`.
   */
  async loadProject(
    files: Record<string, string>,
    entry: string,
  ): Promise<void> {
    const sandbox = await this.ready;
    this.assertAlive();
    const code = await bundlePlaceProject(files, entry);
    sandbox.load(code);
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

  /**
   * The player used the NPC or prop with `entityId`, optionally while holding
   * `item` — a fact the script's rules answer, such as a vending machine taking
   * a soda.
   */
  async use(entityId: string, player: string, item = ""): Promise<void> {
    this.assertAlive();
    this.author({ kind: "entity-used", entityId, item }, player);
    await this.step();
  }

  /**
   * A weapon struck the NPC `entityId` for `amount` hit points, from an
   * attacker standing at (`attackerX`, `attackerZ`) — a fact for the
   * script's own rules to apply, the same way a vending machine answers
   * `entity-used`.
   */
  async hit(
    entityId: string,
    player: string,
    amount: number,
    attackerX: number,
    attackerZ: number,
  ): Promise<void> {
    this.assertAlive();
    this.author(
      { kind: "entity-hit", entityId, amount, attackerX, attackerZ },
      player,
    );
    await this.step();
  }

  /** The player used the item with `itemId` on its own, away from any object. */
  async useItem(itemId: string, player: string): Promise<void> {
    this.assertAlive();
    this.author({ kind: "item-used", item: itemId }, player);
    await this.step();
  }

  /**
   * Tells the host where a player now stands, so it can author the
   * `zone-entered` and `zone-left` facts for the zones they crossed. A step
   * that crosses nothing is not run, so walking around costs nothing.
   */
  async movePlayer(
    player: string,
    x: number,
    y: number,
    z: number,
  ): Promise<void> {
    this.assertAlive();
    const inside = new Set<string>();
    for (const zone of this.zones.values()) {
      if (
        x >= zone.min[0] &&
        x <= zone.max[0] &&
        y >= zone.min[1] &&
        y <= zone.max[1] &&
        z >= zone.min[2] &&
        z <= zone.max[2]
      ) {
        inside.add(zone.id);
      }
    }
    const was = this.playerZones.get(player) ?? new Set<string>();
    const entered = [...inside].filter((id) => !was.has(id));
    const left = [...was].filter((id) => !inside.has(id));
    if (entered.length === 0 && left.length === 0) {
      return;
    }
    this.playerZones.set(player, inside);
    for (const id of left) {
      this.author({ kind: "zone-left", zoneId: id }, player);
    }
    for (const id of entered) {
      this.author({ kind: "zone-entered", zoneId: id }, player);
    }
    await this.step();
  }

  /**
   * Fires every timer the shared clock has reached, in id order so peers agree,
   * and steps the script once if any fired. A script that sets no timer costs
   * nothing to pump, so the world may call this every frame.
   */
  async pump(): Promise<void> {
    if (!this.loaded || this.pendingTimers.size === 0 || this.pumping) {
      return;
    }
    const now = this.now();
    const due = [...this.pendingTimers]
      .filter(([, at]) => at <= now)
      .map(([id]) => id)
      .sort();
    if (due.length === 0) {
      return;
    }
    this.pumping = true;
    try {
      for (const id of due) {
        this.pendingTimers.delete(id);
        this.author({ kind: "timer", timerId: id }, "");
      }
      await this.step();
    } finally {
      this.pumping = false;
    }
  }

  /** One line about the script and what it has created, for a debug console. */
  describe(): string {
    return `script: ${this.loaded ? "loaded" : "not loaded"} · ${this.npcs.size} NPC(s), ${this.props.size} prop(s), ${this.fires.size} fire(s), ${this.explosions.size} blast(s), ${this.dialogs.size} dialog(s)${
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
    const dyingCutoff = this.now() - DEATH_ANIMATION_MS;
    for (const [id, npc] of this.npcs) {
      if (npc.dyingAt !== undefined && npc.dyingAt < dyingCutoff) {
        this.npcs.delete(id);
      }
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

  /**
   * A fact the local player caused, stamped, added to the shared log, and
   * handed to `onEvent` so it reaches every other peer's copy of it too.
   */
  private author(payload: ScriptEventPayload, producer: string): void {
    const at = this.now();
    this.sequence += 1;
    const event: ScriptEvent = {
      ...payload,
      id: `${producer === "" ? "local" : producer}:${at}:${this.sequence}`,
      at,
      producer,
    };
    this.log.add(event);
    this.onEvent?.(event);
  }

  private apply(effect: ParsedEffect): void {
    switch (effect.tag) {
      case "npc": {
        const { id, x, y, z, name, model, modelUri, yaw, live } =
          effect.payload;
        const grounded = y ?? this.heightAt(x, z);
        const heading = yaw ?? 0;
        this.npcs.set(id, {
          id,
          name: name ?? "NPC",
          model: model ?? "",
          modelUri: modelUri ?? "",
          x,
          y: grounded,
          z,
          yaw: heading,
        });
        if (live === true) {
          this.onEntityMove?.({ id, x, y: grounded, z, yaw: heading });
        }
        break;
      }
      case "npc-remove":
        this.npcs.delete(effect.payload.id);
        break;
      case "npc-die": {
        const npc = this.npcs.get(effect.payload.id);
        if (npc !== undefined) {
          this.npcs.set(npc.id, { ...npc, dyingAt: this.now() });
        }
        break;
      }
      case "prop": {
        const { id, model, x, y, z, name, yaw, height, solid } = effect.payload;
        this.props.set(id, {
          id,
          model,
          name: name ?? id,
          x,
          y: y ?? this.heightAt(x, z),
          z,
          yaw: yaw ?? 0,
          height: height ?? 2,
          solid: solid ?? false,
        });
        break;
      }
      case "prop-remove":
        this.props.delete(effect.payload.id);
        break;
      case "fire": {
        const { id, x, y, z, height } = effect.payload;
        const fire: ScriptedFire = {
          id,
          x,
          y: y ?? this.heightAt(x, z),
          z,
          height: height ?? 2,
        };
        this.fires.set(id, fire);
        this.onFire?.(fire);
        break;
      }
      case "explosion": {
        const { id, x, y, z, radius } = effect.payload;
        const cutoff = this.now() - EXPLOSION_MEMORY_MS;
        for (const [held, blast] of this.explosions) {
          if (blast.at < cutoff) {
            this.explosions.delete(held);
          }
        }
        const explosion: ScriptedExplosion = {
          id,
          x,
          y: y ?? this.heightAt(x, z),
          z,
          radius: radius ?? 4,
          at: this.now(),
        };
        this.explosions.set(id, explosion);
        this.onExplosion?.(explosion);
        break;
      }
      case "item-define":
        this.inventory.define(effect.payload);
        break;
      case "item-give":
        this.inventory.give(effect.payload.item, effect.payload.count);
        break;
      case "item-take":
        this.inventory.take(effect.payload.item, effect.payload.count);
        break;
      case "item-hold":
        this.inventory.hold(
          effect.payload.item === "" ? null : effect.payload.item,
        );
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
      case "zone": {
        const { id, name, min, max } = effect.payload;
        this.zones.set(id, { id, name: name ?? id, min, max });
        break;
      }
      case "zone-remove":
        this.zones.delete(effect.payload.id);
        break;
      case "narrate":
        this.onNarrate?.(effect.payload.player, {
          name: effect.payload.name,
          text: effect.payload.text,
        });
        break;
      case "ending":
        this.onEnding?.(effect.payload.player, {
          title: effect.payload.title,
          text: effect.payload.text,
        });
        break;
      case "restart":
        this.onRestart?.(effect.payload.player);
        break;
      case "time":
        this.onTime?.({
          seconds: effect.payload.seconds,
          speed: effect.payload.speed,
          clear: effect.payload.clear,
        });
        break;
      case "timer":
        this.pendingTimers.set(
          effect.payload.id,
          this.now() + effect.payload.afterMs,
        );
        break;
      case "player-place": {
        const { player, x, y, z, yaw } = effect.payload;
        this.onPlayerPlace?.(player, { x, z, y, yaw });
        break;
      }
      case "player-face": {
        const { player, x, z } = effect.payload;
        this.onPlayerFace?.(player, { x, z });
        break;
      }
      case "player-speed":
        this.onPlayerSpeed?.(effect.payload.player, effect.payload.multiplier);
        break;
      case "player-jump":
        this.onPlayerJump?.(effect.payload.player, effect.payload.multiplier);
        break;
      case "player-damage":
        this.onPlayerDamage?.(
          effect.payload.player,
          effect.payload.amount,
          effect.payload.source,
        );
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
