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
