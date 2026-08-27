import { Injectable } from "@nestjs/common";
import prompts from "prompts";

import type { PromptRunner } from "./input.types";

/**
 * Parses CLI option values and prompts for the ones a command still needs.
 *
 * Lives here rather than in `codependix-cli` so the rules for the flags its
 * commands hold in common — `--config`, `--directory`, and the two boolean
 * mode flags — are stated once, alongside the configuration those flags
 * ultimately select. Mirrors `@callidescope/configuration`'s `InputService`
 * and the original in `@conformetry/configuration`.
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
   * `@types/node` declares `process.stdin.isTTY` a `boolean`, but Node leaves
   * it `undefined` when stdin is not a terminal. It is read as falsy rather
   * than coerced — lint rejects a coercion the declared type says is
   * unnecessary — and that falsy reading is the whole point: treating an
   * absent `isTTY` as "unset, so prompt" is what hangs a command run in CI.
   */
  public canPrompt(interactive: boolean | undefined): boolean {
    return (
      interactive !== false &&
      process.stdin.isTTY &&
      process.env["CI"] !== "true"
    );
  }

  /**
   * Parses a valueless boolean flag, which is present or it is not.
   *
   * Commander hands a flag carrying no value to its parser as `undefined`,
   * so the flag appearing at all is what makes it true — reading that
   * `undefined` as false would turn every such flag permanently off.
   */
  public parseFlagOption(value: boolean | undefined): boolean {
    return value ?? true;
  }

  /** Trims an optional string option, treating blank as absent. */
  public parseOptionalOption(value: string | undefined): string | undefined {
    const trimmed = value?.trim();

    return trimmed === undefined || trimmed.length === 0 ? undefined : trimmed;
  }

  /**
   * Parses a path option that falls back to the working directory.
   *
   * Left unresolved here: the caller resolves it against its own working
   * directory, and resolving twice only makes a relative path ambiguous
   * about which root it was ever relative to.
   */
  public parsePathOption(value: string | undefined): string {
    return this.parseOptionalOption(value) ?? process.cwd();
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
}
