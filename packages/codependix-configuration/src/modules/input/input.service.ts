import { Injectable } from "@nestjs/common";
import prompts from "prompts";

import {
  CODEPENDIX_RUN_MODES,
  conflictingRunModeError,
  missingInputError,
  promptCancelledError,
} from "./input.constants";

import type {
  CodependixRunMode,
  CodependixRunModeOptions,
  PromptRunner,
} from "./input.types";

/**
 * Parses CLI option values and asks for the ones a command still needs.
 *
 * Lives here rather than in `codependix-cli` so the rules for the flags its
 * commands hold in common — `--config`, `--directory`, and the two run-mode
 * flags — are stated once, alongside the configuration those flags ultimately
 * select. Mirrors `@callidescope/configuration`'s `InputService` and the
 * original in `@conformetry/configuration`.
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

  /**
   * Refuses to draw a prompt nobody can answer.
   *
   * `prompts` does not fail on a stdin that is not a terminal — it renders
   * the menu, never resolves, and lets the process exit 0. That is the one
   * outcome worth ruling out, since a run that quietly did nothing reads as
   * a run that succeeded. `@types/node` declares `isTTY` a `boolean` while
   * Node leaves it `undefined` off a terminal, so the guard reads it as
   * falsy rather than coercing it, which lint rejects as unnecessary.
   */
  private assertCanPrompt(subject: string): void {
    if (!process.stdin.isTTY) {
      throw missingInputError(subject);
    }
  }

  // 🌎 Public Methods

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
    subject: string;
  }): Promise<Choice> {
    this.assertCanPrompt(args.subject);

    const response = await this.promptRunner({
      choices: args.choices.map((choice) => ({ title: choice, value: choice })),
      message: args.message,
      name: "value",
      type: "select",
    });
    const value: unknown = response.value;

    if (value === undefined) {
      throw promptCancelledError(args.subject);
    }

    const matched = args.choices.find((choice) => choice === value);

    if (matched === undefined) {
      throw new Error(
        `Prompt did not resolve to one of: ${args.choices.join(", ")}.`,
      );
    }

    return matched;
  }

  /**
   * Returns the given options with exactly one run mode set.
   *
   * Naming both flags is refused outright — there is no sensible reading of
   * "check and also write". Naming neither is asked about rather than
   * refused, since the answer is one of two words and the alternative is
   * making someone re-type the whole command line. Nothing is ever inferred:
   * a session that cannot be asked fails instead of defaulting to a write
   * nobody requested.
   *
   * Generic over the caller's own options type so a command may carry
   * whatever other flags it likes through unchanged.
   */
  public async resolveOptions<Options extends CodependixRunModeOptions>(
    options: Options,
  ): Promise<Options> {
    if (options.check === true && options.write === true) {
      throw conflictingRunModeError();
    }

    if (options.check === true || options.write === true) {
      return options;
    }

    const mode: CodependixRunMode = await this.promptForSelect({
      choices: CODEPENDIX_RUN_MODES,
      message: "Check every configured export, or write them?",
      subject: "A run mode (--check or --write)",
    });

    return mode === "check"
      ? { ...options, check: true }
      : { ...options, write: true };
  }
}
