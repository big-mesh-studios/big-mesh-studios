// The single place every debug console command is declared: one object
// literal, keyed by command name, built once after every command-owning
// object already exists (see App.tsx). Each entry's `run` closure does its
// own raw-argument parsing/validation/aliasing and calls a plain typed
// method on the owning object — the owning objects themselves expose no
// command-shaped API and have no idea a console exists. See
// docs/adr/0004-commander.md for why this is an object literal (TypeScript
// rejects a duplicate key at compile time) rather than a `register()`-call
// registry or a runtime-checked array.
export interface CommandEntry {
  help: string;
  run: (rest: string[]) => string;
}

export class Commander {
  private readonly commands: Record<string, CommandEntry>;

  constructor(commands: Record<string, CommandEntry>) {
    this.commands = commands;
  }

  run(line: string): string {
    const [name, ...rest] = line.trim().toLowerCase().split(/\s+/);
    if (name === "/help") {
      return this.helpText();
    }
    const command = this.commands[name];
    if (command === undefined) {
      return `unknown command "${line}" — try /help`;
    }
    return command.run(rest);
  }

  helpText(): string {
    return Object.values(this.commands)
      .map((command) => command.help)
      .join("\n");
  }
}
