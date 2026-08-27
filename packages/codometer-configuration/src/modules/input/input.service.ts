import { Injectable } from "@nestjs/common";

/**
 * Parses the option values codometer's commands read off a command line.
 *
 * Shared by `codometer`, `changes`, and `configuration` so the rules for the
 * flags they hold in common — a directory that falls back to the working
 * directory, a path that may be written blank, a boolean flag whose presence
 * is its whole value — are stated once rather than restated per command. The
 * rules are subtle enough to be worth stating once: commander hands a
 * valueless flag through as `true` without ever calling its parser, so a
 * command that narrows text and one that does not disagree about what
 * `--flag "$UNSET"` meant.
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
   * Read once here rather than at each use, so that every one of a run's
   * outputs is resolved against the same directory even if something changes
   * the process's own mid-run.
   */
  public parseDirectoryOption(value: unknown): string {
    return this.parseDefaultedOption(value, process.cwd());
  }

  /**
   * Reads a boolean flag, whose presence is its whole value.
   *
   * The parser runs only when the flag is on the command line, and such a
   * flag carries no value, so `undefined` here means "present" rather than
   * "unset".
   */
  public parseFlagOption(value: boolean | undefined): boolean {
    return value ?? true;
  }

  /**
   * Reads an option that carries text, or nothing at all.
   *
   * A flag written `--baseline-url "$EMPTY"` can reach commander with no
   * value at all, which it reports as `true` without calling the option's
   * parser. So anything but a non-empty string counts as absent — passing
   * that boolean through renders a link to the word `true`.
   */
  public parseOptionalOption(value: unknown): string | undefined {
    return typeof value === "string" && value !== "" ? value : undefined;
  }

  /**
   * Reads an option whose value the command line must supply.
   *
   * Taken as written, since commander refuses the flag outright when its
   * required value is missing. Stated here so a required flag reads as a
   * decision rather than as a parser somebody forgot to write.
   */
  public parseRequiredOption(value: string): string {
    return value;
  }

  /**
   * Reads an option whose value is taken exactly as written.
   *
   * Deliberately not narrowed. An optional-value path flag distinguishes
   * three things downstream — omitted, present with no path, and present with
   * a path — and only the first two ever reach a parser, so narrowing a blank
   * path to `undefined` here would quietly turn a run that named a file into
   * one that named none.
   */
  public parseVerbatimOption(value: string | undefined): string | undefined {
    return value;
  }
}
