import { Injectable } from "@nestjs/common";
import prompts from "prompts";

import { InputSchemaService } from "./input-schema.service";

import type { PromptRunner, SchemaInput } from "./input.types";

/* v8 ignore start -- the decorator helper emits a branch no test can reach */
/**
 * Asks the user for input values interactively.
 *
 * Callers decide *whether* to prompt; this service only knows how. That split
 * matters: prompting in a non-interactive environment hangs the process, so
 * the decision belongs with the caller that knows about TTYs and CI.
 */
@Injectable()
/* v8 ignore stop */
export class InputPromptingService {
  // 🏗 Dependency Injection

  constructor(private readonly inputSchemaService: InputSchemaService) {}

  // 🔐 Private Fields

  /** Overridable so tests never touch a real terminal. */
  private readonly promptRunner: PromptRunner = prompts;

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Prompts for one value, offering a choice list when the schema declares an
   * `enum` and free text otherwise.
   */
  public async promptForInput(input: SchemaInput): Promise<string | undefined> {
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
