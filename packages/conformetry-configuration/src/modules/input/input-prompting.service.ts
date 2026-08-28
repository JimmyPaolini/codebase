import { Injectable } from "@nestjs/common";
import prompts from "prompts";

import { InputSchemaService } from "./input-schema.service";
import { missingInputError } from "./input.constants";

import type { PromptRunner, SchemaInput } from "./input.types";

/**
 * Asks the user for input values interactively.
 *
 * Whether anybody *can* be asked is decided here rather than by the caller,
 * and `promptForInput` refuses rather than draws itself when nobody can. That
 * used to be the caller's job, behind a `--no-interactive` flag; a flag is a
 * poor place for it, because forgetting to consult it is what hung this CLI
 * in non-interactive environments.
 *
 * `isAtTerminal` stays public because one caller genuinely needs the question
 * rather than the refusal: an **optional** input nobody can be asked about is
 * left out, where a required one is refused.
 */
@Injectable()
export class InputPromptingService {
  // 🏗 Dependency Injection

  constructor(private readonly inputSchemaService: InputSchemaService) {}

  // 🔐 Private Fields

  /** Overridable so tests never touch a real terminal. */
  private readonly promptRunner: PromptRunner = prompts;

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Refuses to draw a prompt nobody can answer.
   *
   * `prompts` does not fail on a non-terminal stdin — it renders the menu,
   * never resolves, and lets the process exit 0, so a run that generated
   * nothing reads as one that succeeded.
   */
  private assertCanPrompt(inputName: string): void {
    if (!this.isAtTerminal()) {
      throw missingInputError(inputName);
    }
  }

  // 🌎 Public Methods

  /**
   * Whether anybody is there to answer a question.
   *
   * The one place the terminal is read, so the refusal in front of a prompt
   * and the caller's decision to skip an optional input cannot disagree about
   * what counts as interactive. `isTTY` is read as falsy rather than coerced:
   * `@types/node` calls it a `boolean` while it is `undefined` off a terminal,
   * so lint rejects the coercion that would say so.
   */
  public isAtTerminal(): boolean {
    return process.stdin.isTTY;
  }

  /**
   * Prompts for one value, offering a choice list when the schema declares an
   * `enum` and free text otherwise.
   */
  public async promptForInput(input: SchemaInput): Promise<string | undefined> {
    this.assertCanPrompt(input.inputName);

    const enumValues = this.inputSchemaService.readEnumValues(
      input.propertySchema,
    );
    const response = await this.promptRunner({
      ...(enumValues.length > 0
        ? {
            choices: enumValues.map((value) => ({ title: value, value })),
            type: "select",
          }
        : { type: "text" }),
      message: this.inputSchemaService.readPromptMessage(input),
      name: "value",
      validate: (value: unknown): string | true => {
        return this.inputSchemaService.validateValue({ input, value });
      },
    });
    const value: unknown = response.value;

    return typeof value === "string" ? value : undefined;
  }
}
