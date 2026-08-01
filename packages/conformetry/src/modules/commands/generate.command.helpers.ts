import type { JsonSchemaDefinition } from "./command.types.js";

const reservedOptionNames = new Set(["config", "name", "targetDirectoryPath"]);

/**
 * Collects generator input values from CLI arguments using the generator schema.
 */
export function collectGeneratorInputsFromArguments(
  rawArguments: string[],
  schema: JsonSchemaDefinition,
): Record<string, string> {
  const commandArguments =
    rawArguments[0] === "generate" ? rawArguments.slice(1) : rawArguments;
  const schemaPropertyNames = Object.keys(schema.properties ?? {});

  return collectGeneratorInputs(commandArguments, schemaPropertyNames);
}

/**
 * Parses CLI arguments into generator inputs that match schema properties.
 */
function collectGeneratorInputs(
  commandArguments: string[],
  schemaPropertyNames: string[],
): Record<string, string> {
  const generatorInputs: Record<string, string> = {};

  for (let index = 0; index < commandArguments.length; index += 1) {
    const argument = commandArguments[index];
    if (!argument?.startsWith("--")) {
      continue;
    }

    const optionName = getOptionName(argument);
    const propertyName = resolveSchemaPropertyName(
      optionName,
      schemaPropertyNames,
    );
    if (
      propertyName === undefined ||
      shouldIgnoreOptionName(optionName, propertyName)
    ) {
      continue;
    }

    const optionValue = getOptionValue(commandArguments, index, argument);
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
function getOptionName(argument: string): string {
  return argument.includes("=")
    ? (argument.slice(2).split("=", 1)[0] ?? "")
    : argument.slice(2);
}

/**
 * Returns the value for an option when it is passed separately from the flag.
 */
function getOptionValue(
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
function resolveSchemaPropertyName(
  optionName: string,
  schemaPropertyNames: string[],
): string | undefined {
  return schemaPropertyNames.find((candidate) => {
    return optionName === candidate || optionName === toKebabCase(candidate);
  });
}

/**
 * Determines whether the option should be ignored as a reserved generator argument.
 */
function shouldIgnoreOptionName(
  optionName: string,
  propertyName: string,
): boolean {
  return (
    reservedOptionNames.has(propertyName) || reservedOptionNames.has(optionName)
  );
}

/**
 * Converts a camelCase or PascalCase identifier to kebab-case.
 */
function toKebabCase(value: string): string {
  return value.replaceAll(/([a-z0-9])([A-Z])/gu, "$1-$2").toLowerCase();
}
