import { Injectable } from "@nestjs/common";

/**
 * Parses the option values codometer's commands read off a command line.
 *
 * Shared by `codometer`, `changes`, and `configuration` so the rules for the
 * flags they hold in common — a directory that falls back to the working
 * directory, and a path that may be written blank — are stated once rather
 * than restated per command. They are subtle enough to be worth stating
 * once: commander hands a valueless flag through as `true` without ever
 * calling its parser, so a command that narrows text and one that does not
 * disagree about what `--flag "$UNSET"` meant. Only the rules more than one
 * command shares live here; a flag whose parser is its own business keeps it.
 *
 * Nothing here prompts. Every codometer flag is either optional or defaulted,
 * and no command takes a positional argument, so a run never reaches a value
 * it could only get by asking — unlike `callidescope`'s `depth` and `breadth`,
 * which prompt for the `<address>` they cannot proceed without.
 */
@Injectable()
export class InputService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Reads an option that carries a default when it was left off.
   *
   * The fallback belongs to the command rather than here: two commands that
   * share the parsing rule for `--format` need not share what they render
   * when nobody said.
   */
  public parseDefaultedOption(value: unknown, fallback: string): string {
    return this.parseOptionalOption(value) ?? fallback;
  }

  /**
   * Reads a directory option, falling back to the working directory.
   *
   * The fallback is the process's working directory as it stands when the
   * option is read, which is what every command means by "here" — no command
   * changes it mid-run, and one that did would want the new one.
   */
  public parseDirectoryOption(value: unknown): string {
    return this.parseDefaultedOption(value, process.cwd());
  }

  /**
   * Reads an option that carries text, or nothing at all.
   *
   * A flag written `--baseline-url "$EMPTY"` can reach commander with no
   * value at all, which it reports as `true` without calling the option's
   * parser. So anything but a non-empty string counts as absent — passing
   * that boolean through renders a link to the word `true`.
   *
   * Deliberately does not trim, unlike `callidescope`'s same-named method: a
   * codometer option is a path, and a path whose surrounding spaces were
   * silently dropped is a different path from the one that was asked for.
   */
  public parseOptionalOption(value: unknown): string | undefined {
    return typeof value === "string" && value !== "" ? value : undefined;
  }
}
