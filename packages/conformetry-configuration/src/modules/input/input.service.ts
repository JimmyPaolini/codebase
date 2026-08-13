import { Injectable } from "@nestjs/common";
import prompts from "prompts";

import { collectGeneratorInputsFromCommandArguments } from "../configuration/configuration.utilities";

import type { JsonSchemaDefinition } from "../configuration/configuration.types";
import type {
  PromptRunner,
  ResolveGeneratorInputsArguments,
  ResolveInputsFromValuesArguments,
} from "./input.types";

/**
 * Handles generator input parsing and interactive resolution.
 */
@Injectable()
export class InputService {
  private readonly promptRunner: PromptRunner = prompts;

  /**
   * Builds a stable input label for error and prompt messages.
   */
  private buildInputLabel(inputName: string): string {
    return inputName;
  }

  /**
   * Builds a validation error for required values.
   */
  private buildRequiredError(inputName: string): string {
    return `${this.buildInputLabel(inputName)} is required`;
  }

  /**
   * Resolves enum values from a JSON schema property.
   */
  private getEnumValues(propertySchema: unknown): string[] {
    if (typeof propertySchema !== "object" || propertySchema === null) {
      return [];
    }

    if (!("enum" in propertySchema)) {
      return [];
    }

    const candidateEnumValues = (propertySchema as { enum?: unknown }).enum;
    if (!Array.isArray(candidateEnumValues)) {
      return [];
    }

    return candidateEnumValues.filter((value): value is string => {
      return typeof value === "string";
    });
  }

  /**
   * Resolves the prompt message from schema metadata.
   */
  private getPromptMessage(args: {
    inputName: string;
    propertySchema: unknown;
  }): string {
    const { inputName, propertySchema } = args;

    if (typeof propertySchema !== "object" || propertySchema === null) {
      return `Enter ${this.buildInputLabel(inputName)}`;
    }

    const description = (propertySchema as { description?: unknown })
      .description;
    if (typeof description === "string" && description.trim().length > 0) {
      return description;
    }

    return `Enter ${this.buildInputLabel(inputName)}`;
  }

  /**
   * Resolves a schema property by name.
   */
  private getSchemaProperty(args: {
    inputName: string;
    schema: JsonSchemaDefinition;
  }): unknown {
    return args.schema.properties?.[args.inputName];
  }

  /**
   * Resolves whether an input is required by schema.
   */
  private isRequiredInput(args: {
    inputName: string;
    schema: JsonSchemaDefinition;
  }): boolean {
    const requiredValues = args.schema["required"];

    if (!Array.isArray(requiredValues)) {
      return false;
    }

    return requiredValues.includes(args.inputName);
  }

  /** Parses comma-delimited filter text into normalized values. */
  private parseCommaDelimitedFilterValue(
    value: string | undefined,
  ): string[] | undefined {
    if (value === undefined) {
      return undefined;
    }
    const parsedValues = value
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
    return parsedValues.length > 0 ? parsedValues : undefined;
  }

  /**
   * Prompts for a missing input value.
   */
  private async promptForMissingInput(args: {
    inputName: string;
    isRequired: boolean;
    propertySchema: unknown;
  }): Promise<string | undefined> {
    const { inputName, isRequired, propertySchema } = args;
    const enumValues = this.getEnumValues(propertySchema);

    if (enumValues.length > 0) {
      return this.promptForSelectInput({
        enumValues,
        inputName,
        isRequired,
        propertySchema,
      });
    }

    return this.promptForTextInput({
      inputName,
      isRequired,
      propertySchema,
    });
  }

  /**
   * Prompts for a select-based value when enum choices are available.
   */
  private async promptForSelectInput(args: {
    enumValues: string[];
    inputName: string;
    isRequired: boolean;
    propertySchema: unknown;
  }): Promise<string | undefined> {
    const { enumValues, inputName, isRequired, propertySchema } = args;
    const promptMessage = this.getPromptMessage({
      inputName,
      propertySchema,
    });

    const response = (await this.promptRunner({
      choices: enumValues.map((value) => ({ title: value, value })),
      message: promptMessage,
      name: "value",
      type: "select",
      validate: (input: unknown): string | true => {
        return this.validateInputValue({
          inputName,
          isRequired,
          propertySchema,
          value: input,
        });
      },
    })) as { value?: string };

    return response.value;
  }

  /**
   * Prompts for a free-text value when no enum choices exist.
   */
  private async promptForTextInput(args: {
    inputName: string;
    isRequired: boolean;
    propertySchema: unknown;
  }): Promise<string | undefined> {
    const { inputName, isRequired, propertySchema } = args;
    const promptMessage = this.getPromptMessage({
      inputName,
      propertySchema,
    });

    const response = (await this.promptRunner({
      message: promptMessage,
      name: "value",
      type: "text",
      validate: (input: unknown): string | true => {
        return this.validateInputValue({
          inputName,
          isRequired,
          propertySchema,
          value: input,
        });
      },
    })) as { value?: string };

    return response.value;
  }

  /**
   * Resolves inputs from explicit values and prompts for any missing values.
   */
  private async resolveInputs(args: {
    promptWhenMissing?: boolean;
    schema: JsonSchemaDefinition;
    valueResolver: (inputName: string) => string | undefined;
  }): Promise<Record<string, string>> {
    const resolvedInputs: Record<string, string> = {};
    const schemaPropertyNames = this.resolveSchemaPropertyNames(args.schema);

    for (const inputName of schemaPropertyNames) {
      const propertySchema = this.getSchemaProperty({
        inputName,
        schema: args.schema,
      });
      const existingValue = args.valueResolver(inputName);
      const isRequired = this.isRequiredInput({
        inputName,
        schema: args.schema,
      });

      if (existingValue !== undefined) {
        resolvedInputs[inputName] = this.resolveProvidedValue({
          inputName,
          isRequired,
          propertySchema,
          value: existingValue,
        });
        continue;
      }

      const promptedValue = await this.resolvePromptedValue({
        inputName,
        isRequired,
        promptWhenMissing: args.promptWhenMissing !== false,
        propertySchema,
      });

      if (typeof promptedValue === "string" && promptedValue.trim() !== "") {
        resolvedInputs[inputName] = promptedValue;
      }
    }

    return resolvedInputs;
  }

  /**
   * Resolves one missing value through prompt fallback.
   */
  private async resolvePromptedValue(args: {
    inputName: string;
    isRequired: boolean;
    promptWhenMissing: boolean;
    propertySchema: unknown;
  }): Promise<string | undefined> {
    const { inputName, isRequired, promptWhenMissing, propertySchema } = args;
    if (!promptWhenMissing) {
      if (isRequired) {
        throw new Error(this.buildRequiredError(inputName));
      }

      return undefined;
    }

    const promptedValue = await this.promptForMissingInput({
      inputName,
      isRequired,
      propertySchema,
    });
    const validation = this.validateInputValue({
      inputName,
      isRequired,
      propertySchema,
      value: promptedValue,
    });

    if (validation !== true) {
      throw new Error(validation);
    }

    return promptedValue;
  }

  /**
   * Validates and returns an already-provided input value.
   */
  private resolveProvidedValue(args: {
    inputName: string;
    isRequired: boolean;
    propertySchema: unknown;
    value: string;
  }): string {
    const validation = this.validateInputValue(args);
    if (validation !== true) {
      throw new Error(validation);
    }

    return args.value;
  }

  /**
   * Resolves schema property names from a JSON schema definition.
   */
  private resolveSchemaPropertyNames(schema: JsonSchemaDefinition): string[] {
    return Object.keys(schema.properties ?? {});
  }

  /**
   * Runs enum-specific validation.
   */
  private validateEnumValue(args: {
    enumValues: string[];
    inputName: string;
    value: string;
  }): string | true {
    const { enumValues, inputName, value } = args;
    if (enumValues.length === 0 || enumValues.includes(value)) {
      return true;
    }

    return `${this.buildInputLabel(inputName)} must be one of: ${enumValues.join(", ")}`;
  }

  /**
   * Validates one schema-backed input value.
   */
  private validateInputValue(args: {
    inputName: string;
    isRequired: boolean;
    propertySchema: unknown;
    value: unknown;
  }): string | true {
    const { inputName, isRequired, propertySchema, value } = args;

    if (typeof value !== "string" || value.trim().length === 0) {
      return isRequired ? this.buildRequiredError(inputName) : true;
    }

    const enumValidation = this.validateEnumValue({
      enumValues: this.getEnumValues(propertySchema),
      inputName,
      value,
    });
    if (enumValidation !== true) {
      return enumValidation;
    }

    const lengthValidation = this.validateLength({
      inputName,
      propertySchema,
      value,
    });
    if (lengthValidation !== true) {
      return lengthValidation;
    }

    return this.validatePattern({ inputName, propertySchema, value });
  }

  /**
   * Runs length-specific validation.
   */
  private validateLength(args: {
    inputName: string;
    propertySchema: unknown;
    value: string;
  }): string | true {
    const { inputName, propertySchema, value } = args;
    if (typeof propertySchema !== "object" || propertySchema === null) {
      return true;
    }

    const minimumLength = (propertySchema as { minLength?: unknown }).minLength;
    if (typeof minimumLength === "number" && value.length < minimumLength) {
      return `${this.buildInputLabel(inputName)} must be at least ${String(minimumLength)} characters`;
    }

    const maximumLength = (propertySchema as { maxLength?: unknown }).maxLength;
    if (typeof maximumLength === "number" && value.length > maximumLength) {
      return `${this.buildInputLabel(inputName)} must be at most ${String(maximumLength)} characters`;
    }

    return true;
  }

  /**
   * Runs pattern-specific validation.
   */
  private validatePattern(args: {
    inputName: string;
    propertySchema: unknown;
    value: string;
  }): string | true {
    const { inputName, propertySchema, value } = args;
    if (typeof propertySchema !== "object" || propertySchema === null) {
      return true;
    }

    const pattern = (propertySchema as { pattern?: unknown }).pattern;
    if (typeof pattern !== "string") {
      return true;
    }

    const regularExpression = new RegExp(pattern, "u");
    if (regularExpression.test(value)) {
      return true;
    }

    return `${this.buildInputLabel(inputName)} does not match pattern ${pattern}`;
  }

  /**
   * Parses the configuration path option value.
   */
  public parseConfigurationPathOption(
    value: string | undefined,
  ): string | undefined {
    if (value === undefined) {
      return undefined;
    }
    return value.trim().length > 0 ? value.trim() : undefined;
  }

  /**
   * Parses the generator name option value.
   */
  public parseGeneratorNameOption(value: string): string {
    const trimmedValue = value.trim();
    if (trimmedValue.length === 0) {
      throw new Error("Generator name must not be empty");
    }

    return trimmedValue;
  }

  /** Parses the projects filter option. */
  public parseProjectFilterOption(
    value: string | undefined,
  ): string[] | undefined {
    return this.parseCommaDelimitedFilterValue(value);
  }

  /** Parses the rules filter option. */
  public parseRuleFilterOption(
    value: string | undefined,
  ): string[] | undefined {
    return this.parseCommaDelimitedFilterValue(value);
  }

  /**
   * Parses the target directory option value.
   */
  public parseTargetDirectoryPathOption(
    value: string | undefined,
  ): string | undefined {
    if (value === undefined) {
      return undefined;
    }
    return value.trim().length > 0 ? value.trim() : undefined;
  }

  /**
   * Resolves inputs from command arguments and prompts for any missing values.
   */
  public async resolveGeneratorInputs(
    args: ResolveGeneratorInputsArguments,
  ): Promise<Record<string, string>> {
    const collectedInputs = collectGeneratorInputsFromCommandArguments({
      rawArguments: args.rawArguments,
      schema: args.schema,
    });

    return this.resolveInputs({
      ...(args.promptWhenMissing === undefined
        ? {}
        : { promptWhenMissing: args.promptWhenMissing }),
      schema: args.schema,
      valueResolver: (inputName: string): string | undefined => {
        return collectedInputs[inputName];
      },
    });
  }

  /**
   * Resolves inputs from explicit values and prompts for any missing values.
   */
  public async resolveInputsFromValues(
    args: ResolveInputsFromValuesArguments,
  ): Promise<Record<string, string>> {
    return this.resolveInputs({
      ...(args.promptWhenMissing === undefined
        ? {}
        : { promptWhenMissing: args.promptWhenMissing }),
      schema: args.schema,
      valueResolver: (inputName: string): string | undefined => {
        return args.providedInputs[inputName];
      },
    });
  }
}
