/**
 * Declares every debug console command as a single object literal, keyed by
 * command name, built once after every command-owning object already
 * exists. Each entry's `run` closure does its own raw-argument parsing,
 * validation, and aliasing, then calls a plain typed method on the owning
 * object — the owning objects themselves expose no command-shaped API and
 * have no idea a console exists. Using a plain object literal, rather than
 * a `register()`-call registry or a runtime-checked array, means a
 * duplicate command name is a TypeScript compile error instead of a
 * runtime one.
 */
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
