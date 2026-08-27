import { Injectable } from "@nestjs/common";
import prompts from "prompts";

import type { CallidescopeOutputFormat } from "../configuration/configuration.types";
import type { PromptRunner } from "./input.types";

/**
 * Parses CLI option values and prompts for the ones a command still needs.
 *
 * Shared by `callidescope`, `depth`, and `breadth` so the parsing rules for
 * flags they hold in common — `--config`, `--directories`, `--format` — and
 * the rule for whether a missing value may be asked for interactively are
 * stated once rather than duplicated per command.
 */
@Injectable()
export class InputService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  /** Overridable so tests never touch a real terminal. */
  private readonly promptRunner: PromptRunner = prompts;

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Whether a missing value may be asked for interactively.
   *
   * `process.stdin.isTTY` is `undefined` rather than `false` when stdin is
   * not a terminal, so it is coerced explicitly — treating that `undefined`
   * as "unset, so prompt" is what hangs a command run in CI.
   */
  public canPrompt(interactive: boolean | undefined): boolean {
    return (
      interactive !== false &&
      process.stdin.isTTY &&
      process.env["CI"] !== "true"
    );
  }

  /**
   * Narrows a suggestion list to what has been typed so far.
   *
   * A method of its own rather than a closure inside the prompt, because this
   * is the whole of the completion rule and it is worth stating — and testing
   * — without a terminal anywhere near it.
   *
   * Matches on a substring rather than a prefix: a callable is addressed
   * `<file>#<name>`, and the name is far more often what someone remembers
   * than the path in front of it.
   */
  public completeSuggestions(args: {
    input: string;
    suggestions: readonly string[];
  }): string[] {
    const written = args.input.trim();
    const matches = args.suggestions.filter((suggestion) =>
      suggestion.toLowerCase().includes(written.toLowerCase()),
    );

    // The typed text stands in only when the list has nothing to offer.
    // Alongside real matches it would put a half-typed query at the top of
    // every list, ahead of the completions that were the point of asking.
    return matches.length === 0 && written.length > 0 ? [written] : matches;
  }

  /**
   * Splits `--directories`, a comma-separated list of project directories.
   *
   * Kept relative rather than resolved here: each entry is later resolved
   * against the workspace root, which is always the working directory, so
   * resolving here as well would only make a relative entry ambiguous about
   * which root it was ever relative to.
   */
  public parseCommaDelimitedOption(value: string | undefined): string[] {
    return value === undefined
      ? []
      : value
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean);
  }

  /**
   * Parses `--format`, which decides what a run prints.
   *
   * Anything unrecognized reads as markdown rather than failing: this decides
   * how a result is shown, and refusing to show it over a misspelled flag
   * helps nobody.
   */
  public parseFormat(value: string | undefined): CallidescopeOutputFormat {
    if (value === "json" || value === "mermaid") {
      return value;
    }

    return "markdown";
  }

  /** Trims an optional string option, treating blank as absent. */
  public parseOptionalOption(value: string | undefined): string | undefined {
    const trimmed = value?.trim();

    return trimmed === undefined || trimmed.length === 0 ? undefined : trimmed;
  }

  /**
   * Prompts for one value, completing it against a list as it is typed.
   *
   * The list is filtered on every keystroke rather than shown whole, so a
   * workspace with thousands of callables is as usable as one with ten.
   *
   * `prompts` submits whatever its suggestion list had selected and never the
   * raw text, so a value absent from the list could not otherwise be typed at
   * all. The input is therefore offered back as its own choice whenever it
   * matches nothing — the list is a shortcut, not a fence, and a caller whose
   * list is merely incomplete must still be able to say what it meant.
   */
  public async promptForAutocomplete(args: {
    message: string;
    suggestions: readonly string[];
  }): Promise<string> {
    const response = await this.promptRunner({
      choices: [],
      message: args.message,
      name: "value",
      // `await Promise.resolve` rather than a bare return: the completion rule
      // is synchronous, and `prompts` awaits whatever this hands back.
      suggest: async (input: string) =>
        await Promise.resolve(
          this.completeSuggestions({
            input,
            suggestions: args.suggestions,
          }).map((value) => ({ title: value, value })),
        ),
      type: "autocomplete",
    });
    const value: unknown = response.value;

    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error("A value is required.");
    }

    return value.trim();
  }

  /** Prompts for one value out of a fixed set of choices. */
  public async promptForSelect<Choice extends string>(args: {
    choices: readonly Choice[];
    message: string;
  }): Promise<Choice> {
    const response = await this.promptRunner({
      choices: args.choices.map((choice) => ({ title: choice, value: choice })),
      message: args.message,
      name: "value",
      type: "select",
    });
    const value: unknown = response.value;
    const matched = args.choices.find((choice) => choice === value);

    if (matched === undefined) {
      throw new Error(
        `Prompt did not resolve to one of: ${args.choices.join(", ")}.`,
      );
    }

    return matched;
  }

  /** Prompts for one free-text value. */
  public async promptForText(args: { message: string }): Promise<string> {
    const response = await this.promptRunner({
      message: args.message,
      name: "value",
      type: "text",
    });
    const value: unknown = response.value;

    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error("A value is required.");
    }

    return value.trim();
  }
}
