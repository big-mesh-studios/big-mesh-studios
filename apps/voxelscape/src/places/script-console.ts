// The console's window onto a running place script, and the easy way to try a
// script without the world drawing its NPCs yet: the script loads, and the
// console drives the dialog — starting a talk, picking an option, walking away —
// while the script's toasts go wherever the caller sends them. Everything the
// methods return is one line-shaped answer for a console to print.
import { ScriptHost, type DialogState } from "./script-host";
import { SAMPLE_PLACE_SCRIPT } from "./sample";

export interface ScriptConsoleParams {
  /** The terrain surface at (`x`, `z`), where a script's NPCs are grounded. */
  heightAt: (x: number, z: number) => number;
  /** Where a script's toast and error lines go — the notice channel. */
  report?: (line: string) => void;
  /** Called whenever a player's dialog changes, so the world can show it. */
  onDialog?: (player: string, state: DialogState | null) => void;
}

/** The option a console prints for a dialog, numbered for `/script:choose`. */
const optionLines = (dialog: DialogState): string =>
  dialog.options.map((option, index) => `  ${index + 1}. ${option}`).join("\n");

/** One script, loaded on demand and driven by console commands. */
export class ScriptConsole {
  private readonly heightAt: (x: number, z: number) => number;
  private readonly report: (line: string) => void;
  private readonly onDialog: (
    player: string,
    state: DialogState | null,
  ) => void;
  private host: ScriptHost | null = null;

  constructor(params: ScriptConsoleParams) {
    this.heightAt = params.heightAt;
    this.report = params.report ?? (() => {});
    this.onDialog = params.onDialog ?? (() => {});
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
    if (this.host === null) {
      this.host = new ScriptHost({
        seed: 12_345,
        now: () => Date.now(),
        heightAt: this.heightAt,
        onToast: (player, text) => {
          if (player === "") {
            this.report(text);
          }
        },
        onDialog: (player, state) => this.onDialog(player, state),
        onNotice: this.report,
      });
    }
    await this.host.load(SAMPLE_PLACE_SCRIPT);
    const npcs = this.host.npcList;
    const where = npcs
      .map((npc) => `${npc.name} at (${npc.x}, ${npc.z})`)
      .join(", ");
    return `sample script loaded — ${where}. Talk with /script:talk <id> (${npcs
      .map((npc) => npc.id)
      .join(" or ")})`;
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
