import { Injectable } from "@nestjs/common";

import { RESERVED_GENERATOR_OPTION_NAMES } from "./generate.constants.js";

import type { JsonSchemaDefinition } from "./generate.types.js";

/**
 * Collects generator option arguments from CLI input using generator schemas.
 */
@Injectable()
export class GenerateCommandArgumentsService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Parses CLI arguments into generator inputs that match schema properties.
   */
  private collectGeneratorInputs(
    commandArguments: string[],
    schemaPropertyNames: string[],
  ): Record<string, string> {
    const generatorInputs: Record<string, string> = {};

    for (let index = 0; index < commandArguments.length; index += 1) {
      const argument = commandArguments[index];
      if (!argument?.startsWith("--")) {
        continue;
      }

      const optionName = this.getOptionName(argument);
      const propertyName = this.resolveSchemaPropertyName(
        optionName,
        schemaPropertyNames,
      );
      if (
        propertyName === undefined ||
        this.shouldIgnoreOptionName(optionName, propertyName)
      ) {
        continue;
      }

      const optionValue = this.getOptionValue(
        commandArguments,
        index,
        argument,
      );
      if (optionValue === undefined) {
        continue;
      }

      generatorInputs[propertyName] = optionValue;
      if (!argument.includes("=")) {
        index += 1;
      }
    }

    return generatorInputs;
  }

  /**
   * Returns the option name associated with a raw CLI argument.
   */
  private getOptionName(argument: string): string {
    return argument.includes("=")
      ? (argument.slice(2).split("=", 1)[0] ?? "")
      : argument.slice(2);
  }

  /**
   * Returns the value for an option when it is passed separately from the flag.
   */
  private getOptionValue(
    commandArguments: string[],
    index: number,
    argument: string,
  ): string | undefined {
    if (argument.includes("=")) {
      return argument.slice(argument.indexOf("=") + 1);
    }

    const nextArgument = commandArguments[index + 1];
    if (nextArgument === undefined || nextArgument.startsWith("--")) {
      return undefined;
    }

    return nextArgument;
  }

  /**
   * Resolves the matching schema property name for a CLI option name.
   */
  private resolveSchemaPropertyName(
    optionName: string,
    schemaPropertyNames: string[],
  ): string | undefined {
    return schemaPropertyNames.find((candidate) => {
      return (
        optionName === candidate || optionName === this.toKebabCase(candidate)
      );
    });
  }

  /**
   * Determines whether the option should be ignored as a reserved generator argument.
   */
  private shouldIgnoreOptionName(
    optionName: string,
    propertyName: string,
  ): boolean {
    return (
      RESERVED_GENERATOR_OPTION_NAMES.has(propertyName) ||
      RESERVED_GENERATOR_OPTION_NAMES.has(optionName)
    );
  }

  /**
   * Converts a camelCase or PascalCase identifier to kebab-case.
   */
  private toKebabCase(value: string): string {
    return value.replaceAll(/([a-z0-9])([A-Z])/gu, "$1-$2").toLowerCase();
  }

  // 🌎 Public Methods

  /**
   * Collects generator input values from CLI arguments using the generator schema.
   */
  public collectGeneratorInputsFromArguments(
    rawArguments: string[],
    schema: JsonSchemaDefinition,
  ): Record<string, string> {
    const commandArguments =
      rawArguments[0] === "generate" ? rawArguments.slice(1) : rawArguments;
    const schemaPropertyNames = Object.keys(schema.properties ?? {});

    return this.collectGeneratorInputs(commandArguments, schemaPropertyNames);
  }
}
