// The console's window onto a running place script, and the easy way to try a
// script without the world drawing its NPCs yet: the script loads, and the
// console drives the dialog — starting a talk, picking an option, walking away —
// while the script's toasts go wherever the caller sends them. Everything the
// methods return is one line-shaped answer for a console to print.
import {
  ScriptHost,
  type DialogState,
  type ScriptedExplosion,
  type ScriptedFire,
} from "./script-host";
import type { ScriptEvent } from "./events";
import { SAMPLE_PLACE_SCRIPT } from "./sample";
import { MAIN_SCRIPT_FILE } from "./project";
import type { RequireOnly, WorldQuery } from "./sandbox";

/**
 * The shared clock and world queries the console forwards to the
 * `ScriptHost` it drives — the same six `WorldQuery` functions, with only
 * `getHeightAt` required; unlike `ScriptHostParams`, `getNow` defaults to
 * `Date.now` (see the constructor) rather than demanding a caller supply it.
 */
export interface ScriptConsoleParams extends RequireOnly<
  WorldQuery,
  "getHeightAt"
> {
  /** Where a script's toast and error lines go — the notice channel. */
  report?: (line: string) => void;
  /** Called whenever a player's dialog changes, so the world can show it. */
  onDialog?: (player: string, state: DialogState | null) => void;
  /** Called when a player's game reaches an ending, or null to close it. */
  onEnding?: (
    player: string,
    state: { title: string; text: string } | null,
  ) => void;
  /** Called when a player's game asks to start over. */
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
   * new position, to broadcast to other peers.
   */
  onEntityMove?: (state: {
    id: string;
    x: number;
    y: number;
    z: number;
    yaw: number;
  }) => void;
  /** Called with every fact the local player's own actions caused, to broadcast to other peers. */
  onEvent?: (event: ScriptEvent) => void;
  /** Called when the script sets where `player` respawns. */
  onCheckpoint?: (
    player: string,
    at: { x: number; z: number; y?: number; yaw?: number },
  ) => void;
  /** Called when the script kills `player`; the world plays the fall and respawns. */
  onKill?: (player: string, cause: string) => void;
  /** Called when the script respawns `player` outright, with no fall. */
  onRespawn?: (player: string) => void;
  /** Called when the script sets the height below which the player is killed. */
  onVoid?: (y: number) => void;
  /** Called when the script lights a fire; the world seeds its ember light. */
  onFire?: (fire: ScriptedFire) => void;
  /** Called when the script sets off a blast; the world draws the burst. */
  onExplosion?: (explosion: ScriptedExplosion) => void;
  /** Called when the script asks for a sound effect, by one of the world's
   * fixed sound names. Empty `player` means every local peer plays its own
   * copy; a targeted name is meant for that one player alone. */
  onSound?: (player: string, name: string) => void;
}

/** The option a console prints for a dialog, numbered for `/script:choose`. */
const optionLines = (dialog: DialogState): string =>
  dialog.options.map((option, index) => `  ${index + 1}. ${option}`).join("\n");

/** One script, loaded on demand and driven by console commands. */
export class ScriptConsole {
  private readonly getHeightAt: (x: number, z: number) => number;
  private readonly getSolidAt?: (x: number, y: number, z: number) => boolean;
  private readonly getWaterAt?: (x: number, y: number, z: number) => boolean;
  private readonly getPlayers?: () => Array<{
    did: string;
    x: number;
    y: number;
    z: number;
  }>;
  private readonly report: (line: string) => void;
  private readonly onDialog: (
    player: string,
    state: DialogState | null,
  ) => void;
  private readonly onEnding: (
    player: string,
    state: { title: string; text: string } | null,
  ) => void;
  private readonly onRestart: (player: string) => void;
  private readonly onTime: (command: {
    seconds?: number;
    speed?: number;
    clear?: boolean;
  }) => void;
  private readonly onNarrate: (
    player: string,
    line: { name: string; text: string },
  ) => void;
  private readonly onPlayerPlace: (
    player: string,
    at: { x: number; z: number; y?: number; yaw?: number },
  ) => void;
  private readonly onPlayerFace: (
    player: string,
    at: { x: number; z: number },
  ) => void;
  private readonly onPlayerSpeed: (player: string, multiplier: number) => void;
  private readonly onPlayerJump: (player: string, multiplier: number) => void;
  private readonly onPlayerDamage: (
    player: string,
    amount: number,
    source?: string,
  ) => void;
  private readonly onEntityMove: (state: {
    id: string;
    x: number;
    y: number;
    z: number;
    yaw: number;
  }) => void;
  private readonly onEvent: (event: ScriptEvent) => void;
  private readonly onCheckpoint: (
    player: string,
    at: { x: number; z: number; y?: number; yaw?: number },
  ) => void;
  private readonly onKill: (player: string, cause: string) => void;
  private readonly onRespawn: (player: string) => void;
  private readonly onVoid: (y: number) => void;
  private readonly onFire: (fire: ScriptedFire) => void;
  private readonly onExplosion: (explosion: ScriptedExplosion) => void;
  private readonly onSound: (player: string, name: string) => void;
  private readonly getEndings: () => string[];
  private readonly _getNow: () => number;
  private host: ScriptHost | null = null;
  /** The last project loaded, so `restart` can run it once more from scratch. */
  private last: {
    files: Record<string, string>;
    entry: string;
    seed: number;
    models: Record<string, Uint8Array>;
  } | null = null;

  constructor(params: ScriptConsoleParams) {
    this.getHeightAt = params.getHeightAt;
    this.getSolidAt = params.getSolidAt;
    this.getWaterAt = params.getWaterAt;
    this.getPlayers = params.getPlayers;
    this.report = params.report ?? (() => {});
    this.onDialog = params.onDialog ?? (() => {});
    this.onEnding = params.onEnding ?? (() => {});
    this.onRestart = params.onRestart ?? (() => {});
    this.onTime = params.onTime ?? (() => {});
    this.onNarrate = params.onNarrate ?? (() => {});
    this.onPlayerPlace = params.onPlayerPlace ?? (() => {});
    this.onPlayerFace = params.onPlayerFace ?? (() => {});
    this.onPlayerSpeed = params.onPlayerSpeed ?? (() => {});
    this.onPlayerJump = params.onPlayerJump ?? (() => {});
    this.onPlayerDamage = params.onPlayerDamage ?? (() => {});
    this.onEntityMove = params.onEntityMove ?? (() => {});
    this.onEvent = params.onEvent ?? (() => {});
    this.onCheckpoint = params.onCheckpoint ?? (() => {});
    this.onKill = params.onKill ?? (() => {});
    this.onRespawn = params.onRespawn ?? (() => {});
    this.onVoid = params.onVoid ?? (() => {});
    this.onFire = params.onFire ?? (() => {});
    this.onExplosion = params.onExplosion ?? (() => {});
    this.onSound = params.onSound ?? (() => {});
    this.getEndings = params.getEndings ?? (() => []);
    this._getNow = params.getNow ?? (() => Date.now());
  }

  /** Whether a script is loaded and running. */
  get running(): boolean {
    return this.host !== null;
  }

  /** The NPCs the loaded script has placed, for the world to draw. */
  npcs() {
    return this.host?.npcList ?? [];
  }

  /** The NPC with `id`, or null when the script has not placed one. */
  npc(id: string) {
    return this.host?.npc(id) ?? null;
  }

  /** The props the loaded script has placed, for the world to draw. */
  props() {
    return this.host?.propList ?? [];
  }

  /** The prop with `id`, or null when the script has not placed one. */
  prop(id: string) {
    return this.host?.prop(id) ?? null;
  }

  /** The fields the loaded script has declared, for the world's physics. */
  fields() {
    return this.host?.fieldList ?? [];
  }

  /** The field with `id`, or null when the script has not declared one. */
  field(id: string) {
    return this.host?.field(id) ?? null;
  }

  /** The barriers the loaded script has stood, for the world's collision. */
  barriers() {
    return this.host?.barrierList ?? [];
  }

  /** The barrier with `id`, or null when the script has not stood one. */
  barrier(id: string) {
    return this.host?.barrier(id) ?? null;
  }

  /** Where the NPC `id` is at the shared clock, or null when it does not move. */
  npcPose(id: string) {
    return this.host?.npcPose(id) ?? null;
  }

  /** Where the prop `id` is at the shared clock, or null when it does not move. */
  propPose(id: string) {
    return this.host?.propPose(id) ?? null;
  }

  /** The HUD readouts the local player is showing, in the script's order. */
  hud() {
    return this.host?.hudFor("") ?? [];
  }

  /** The shared clock the host's deadlines and cutscenes are measured against. */
  getNow(): number {
    return this._getNow();
  }

  /** The cutscene `player` is watching, or null when none is running. */
  cutsceneFor(player: string) {
    return this.host?.cutsceneFor(player) ?? null;
  }

  /** Clears `player`'s cutscene once the world has played it out. */
  clearCutscene(player: string): void {
    this.host?.clearCutscene(player);
  }

  /** Whether the script has taken `player`'s movement and tools away. */
  controlsLocked(player: string): boolean {
    return this.host?.controlsLocked(player) ?? false;
  }

  /** The fires the loaded script has lit, for the world to draw. */
  fires() {
    return this.host?.fireList ?? [];
  }

  /** The blaze with `id`, or null when the script has not lit one. */
  fire(id: string) {
    return this.host?.fire(id) ?? null;
  }

  /** The blasts the loaded script has set off, for the world to draw. */
  explosions() {
    return this.host?.explosionList ?? [];
  }

  /** The blast with `id`, or null when the script has not set one off. */
  explosion(id: string) {
    return this.host?.explosion(id) ?? null;
  }

  /**
   * The local player uses the prop with `id` — a tap or click on it — with
   * `item` the id of whatever they are holding, or "" for bare hands.
   */
  async use(id: string, item = ""): Promise<void> {
    await this.host?.use(id, "", item);
  }

  /**
   * The local player's weapon struck the NPC `id` for `amount` hit points,
   * from where the local player is standing.
   */
  async hit(
    id: string,
    amount: number,
    attackerX: number,
    attackerZ: number,
  ): Promise<void> {
    await this.host?.hit(id, "", amount, attackerX, attackerZ);
  }

  /** Tells the script where the local player now stands, for its zones. */
  async updatePosition(x: number, y: number, z: number): Promise<void> {
    await this.host?.movePlayer("", x, y, z);
  }

  /** Fires any timer the shared clock has reached; cheap when none is set. */
  async pump(): Promise<void> {
    await this.host?.pump();
  }

  /** A peer reported a live-tracked NPC's new position; a no-op without a loaded script. */
  applyRemoteNpc(
    id: string,
    x: number,
    y: number,
    z: number,
    yaw: number,
  ): void {
    this.host?.applyRemoteNpc(id, x, y, z, yaw);
  }

  /** A peer's own facts, folded into this script's copy of the shared log. */
  async applyRemoteEvents(events: ScriptEvent[]): Promise<void> {
    await this.host?.applyRemoteEvents(events);
  }

  /** The local player uses the item they are holding, away from any object. */
  async useItem(id: string): Promise<void> {
    await this.host?.useItem(id, "");
  }

  /** The item the local player is holding, or null when they hold none. */
  heldItem() {
    return this.host?.inventory.heldItem() ?? null;
  }

  /** Reports the local player touching the hazardous prop `id`. */
  async touched(id: string): Promise<void> {
    await this.host?.touched("", id);
  }

  /** Reports the local player dying from a cause the world observed. */
  async died(cause = ""): Promise<void> {
    await this.host?.died("", cause);
  }

  /** Starts a talk straight away — the world's tap-and-click path, no console. */
  async talkTo(id: string): Promise<void> {
    await this.host?.talk(id, "");
  }

  /** Picks option `option` (0-based) of the local player's open dialog. */
  async chooseOption(option: number): Promise<void> {
    const current = this.host?.dialogFor("") ?? null;
    if (current === null) {
      return;
    }
    await this.host?.choose(current.npcId, option, "");
  }

  /** Ends the local player's open dialog. */
  async leaveTalk(): Promise<void> {
    const current = this.host?.dialogFor("") ?? null;
    if (current === null) {
      return;
    }
    await this.host?.leave(current.npcId, "");
  }

  /** Loads the bundled sample place script. */
  async loadSample(): Promise<string> {
    await this.loadProject(
      { [MAIN_SCRIPT_FILE]: SAMPLE_PLACE_SCRIPT },
      MAIN_SCRIPT_FILE,
      12_345,
    );
    return `sample script loaded — ${this.loadedLine()}`;
  }

  /**
   * Loads the place's scripts as the running project. The interpreter is built
   * fresh each load, so a creator iterating on a script starts from clean state
   * — no NPC or dialog from a previous run survives — and `seed` seeds its
   * randomness, the seed a place author means to publish. `entry` is the file
   * execution starts from; it or a file it imports registers with
   * `engine.onTick`.
   */
  async loadProject(
    files: Record<string, string>,
    entry: string,
    seed: number,
    models: Record<string, Uint8Array> = {},
  ): Promise<string> {
    this.last = { files, entry, seed, models };
    const host = await this.freshHost(seed);
    await host.loadProject(files, entry, models);
    return `script loaded — ${this.loadedLine()}`;
  }

  /**
   * Runs the last loaded project once more from a fresh interpreter, so a
   * place's own state starts over while the world it built stays standing.
   */
  async restart(): Promise<void> {
    if (this.last === null) {
      return;
    }
    await this.loadProject(
      this.last.files,
      this.last.entry,
      this.last.seed,
      this.last.models,
    );
  }

  /** What the script has made so far: NPCs, dialogs, and any last problem. */
  async describe(): Promise<string> {
    const host = this.host;
    if (host === null) {
      return "no script loaded — use /script:demo";
    }
    const dialog = host.dialogFor("");
    return (
      host.describe() +
      (dialog === null
        ? ""
        : `\n${host.npc(dialog.npcId)?.name ?? dialog.npcId}: ${dialog.prompt}\n${optionLines(dialog)}`)
    );
  }

  /** The player starts talking to the NPC with `id`. */
  async talk(id: string): Promise<string> {
    const host = this.host;
    if (host === null) {
      return "no script loaded — use /script:demo";
    }
    const npc = host.npc(id);
    if (npc === null) {
      return `there is no NPC "${id}" — /script:state lists them`;
    }
    await host.talk(id, "");
    return this.dialogLine() ?? `talking to ${npc.name}, who says nothing yet`;
  }

  /** The player picks option `option` (1-based, as the console numbered it). */
  async choose(option: number): Promise<string> {
    const host = this.host;
    if (host === null) {
      return "no script loaded — use /script:demo";
    }
    const dialog = host.dialogFor("");
    if (dialog === null) {
      return "nobody is talking — /script:talk <id> first";
    }
    if (option < 1 || option > dialog.options.length) {
      return `choose 1..${dialog.options.length}`;
    }
    await host.choose(dialog.npcId, option - 1, "");
    const after = this.dialogLine();
    return after ?? "the conversation is over";
  }

  /** The player walks away from whoever they were talking to. */
  async leave(): Promise<string> {
    const host = this.host;
    if (host === null) {
      return "no script loaded — use /script:demo";
    }
    const dialog = host.dialogFor("");
    if (dialog === null) {
      return "nobody is talking";
    }
    await host.leave(dialog.npcId, "");
    return "conversation ended";
  }

  dispose(): void {
    this.host?.dispose();
    this.host = null;
  }

  /** A fresh host for `seed`, leaving the previous one's NPCs and dialogs behind. */
  private async freshHost(seed: number): Promise<ScriptHost> {
    this.host?.dispose();
    this.host = new ScriptHost({
      seed,
      getNow: this._getNow,
      getHeightAt: this.getHeightAt,
      getSolidAt: this.getSolidAt,
      getWaterAt: this.getWaterAt,
      getPlayers: this.getPlayers,
      onToast: (player, text) => {
        if (player === "") {
          this.report(text);
        }
      },
      onDialog: (player, state) => this.onDialog(player, state),
      onNotice: this.report,
      onEnding: (player, state) => this.onEnding(player, state),
      onRestart: (player) => this.onRestart(player),
      onTime: (command) => this.onTime(command),
      onNarrate: (player, line) => this.onNarrate(player, line),
      onPlayerPlace: (player, at) => this.onPlayerPlace(player, at),
      onPlayerFace: (player, at) => this.onPlayerFace(player, at),
      onPlayerSpeed: (player, multiplier) =>
        this.onPlayerSpeed(player, multiplier),
      onPlayerJump: (player, multiplier) =>
        this.onPlayerJump(player, multiplier),
      onPlayerDamage: (player, amount, source) =>
        this.onPlayerDamage(player, amount, source),
      onEntityMove: (state) => this.onEntityMove(state),
      onEvent: (event) => this.onEvent(event),
      onCheckpoint: (player, at) => this.onCheckpoint(player, at),
      onKill: (player, cause) => this.onKill(player, cause),
      onRespawn: (player) => this.onRespawn(player),
      onVoid: (y) => this.onVoid(y),
      onFire: (fire) => this.onFire(fire),
      onExplosion: (explosion) => this.onExplosion(explosion),
      onSound: (player, name) => this.onSound(player, name),
      getEndings: () => this.getEndings(),
    });
    return this.host;
  }

  /** Where the loaded script's NPCs stand and how to talk to them, for a load line. */
  private loadedLine(): string {
    const npcs = this.host?.npcList ?? [];
    const where = npcs
      .map((npc) => `${npc.name} at (${npc.x}, ${npc.z})`)
      .join(", ");
    const ids = npcs.map((npc) => npc.id).join(" or ");
    const tail =
      npcs.length === 0
        ? "no NPCs placed yet"
        : `Talk with /script:talk <id> (${ids})`;
    return `${where}. ${tail}`;
  }

  /** The open dialog as console lines, or null when nobody is talking. */
  private dialogLine(): string | null {
    const host = this.host;
    if (host === null) {
      return null;
    }
    const dialog = host.dialogFor("");
    if (dialog === null) {
      return null;
    }
    const name = host.npc(dialog.npcId)?.name ?? dialog.npcId;
    return `${name}: ${dialog.prompt}\n${optionLines(dialog)}`;
  }
}
