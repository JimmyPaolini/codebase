// 🛠️ Utilities

/**
 * Inserts the default `codometer` subcommand when the command line names no
 * registered command.
 *
 * `codometer`'s published usage predates `changes`: `codometer --directory .`
 * is documented and scripted as the bare invocation. Commander only infers a
 * default among several registered commands when told to, so without this a
 * flag-only command line would print the top-level help instead of measuring.
 * A bare `-h`/`--help` is left alone so it still lists every command.
 */
export function withDefaultCommand(argv: readonly string[]): string[] {
  const commandNames = new Set([
    "changes",
    "codometer",
    "configuration",
    "help",
  ]);
  const helpFlags = new Set(["--help", "-h"]);
  const [firstArgument] = argv;

  if (
    firstArgument !== undefined &&
    (commandNames.has(firstArgument) || helpFlags.has(firstArgument))
  ) {
    return [...argv];
  }

  return ["codometer", ...argv];
}
