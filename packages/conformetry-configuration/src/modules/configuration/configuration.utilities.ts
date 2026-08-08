import path from "node:path";

import lodash from "lodash";

import {
  DEFAULT_CONFIGURATION_PATH,
  DEFAULT_GENERATED_OUTPUT_DIRECTORY,
  RESERVED_GENERATOR_OPTION_NAMES,
  TARGET_DIRECTORY_OPTION_KEYS,
} from "./configuration.constants.js";

import type {
  CollectGeneratorInputsFromCommandArgumentsArguments,
  ResolveConfigurationPathArguments,
  ResolveTargetDirectoryPathArguments,
} from "./configuration.types.js";

/**
 * Builds common name substitutions from the provided generator name.
 */
export function buildNameSubstitutions(name: string): Record<string, string> {
  const normalizedCamelCaseName = camelCase(name);

  return {
    nameCamelCase: normalizedCamelCaseName,
    nameKebabCase: kebabCase(name),
    namePascalCase: upperFirst(normalizedCamelCaseName),
    nameSnakeCase: snakeCase(name),
  };
}

/**
 * Extracts schema-backed generator input flags from raw command arguments.
 */
export function collectGeneratorInputsFromCommandArguments(
  args: CollectGeneratorInputsFromCommandArgumentsArguments,
): Record<string, string> {
  const commandArguments = resolveCommandArguments(args.rawArguments);
  const schemaPropertyNames = Object.keys(args.schema.properties ?? {});

  return collectGeneratorInputs({
    commandArguments,
    schemaPropertyNames,
  });
}

/**
 * Normalizes mixed-value option records into generator string inputs.
 */
export function normalizeRuntimeOptions(
  options: Record<string, unknown>,
): Record<string, string | undefined> {
  const normalizedInputs: Record<string, string | undefined> = {};

  for (const [key, value] of Object.entries(options)) {
    if (typeof value === "string") {
      normalizedInputs[key] = value;
      continue;
    }

    if (typeof value === "number" || typeof value === "boolean") {
      normalizedInputs[key] = `${value}`;
      continue;
    }

    if (value === undefined) {
      normalizedInputs[key] = undefined;
      continue;
    }

    normalizedInputs[key] = JSON.stringify(value);
  }

  return normalizedInputs;
}

/**
 * Parses comma-delimited CLI options into a trimmed string array.
 */
export function parseCommaDelimitedOption(
  value: string | undefined,
): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

/**
 * Resolves configuration path precedence between runtime options, plugin options, and defaults.
 */
export function resolveConfigurationPath(
  args: ResolveConfigurationPathArguments,
): string {
  const explicitConfigurationPath = args.options["config"];
  if (typeof explicitConfigurationPath === "string") {
    return explicitConfigurationPath;
  }

  const pluginConfigurationPath = args.pluginOptions?.configFilePath;
  if (typeof pluginConfigurationPath === "string") {
    return pluginConfigurationPath;
  }

  return args.defaultConfigurationPath ?? DEFAULT_CONFIGURATION_PATH;
}

/**
 * Resolves the effective output directory for a generator execution.
 */
export async function resolveTargetDirectoryPath(
  args: ResolveTargetDirectoryPathArguments,
): Promise<string> {
  const explicitTargetDirectoryPath = resolveTargetDirectoryPathOption(
    args.options,
  );

  if (typeof explicitTargetDirectoryPath === "string") {
    return await Promise.resolve(explicitTargetDirectoryPath);
  }

  const projectNameCandidate =
    args.options["projectName"] ?? args.options["project"];
  if (
    typeof projectNameCandidate === "string" &&
    args.resolveProjectRootPath !== undefined
  ) {
    const projectRootPath = args.resolveProjectRootPath({
      options: args.options,
      projectName: projectNameCandidate,
    });

    if (typeof projectRootPath === "string") {
      return await Promise.resolve(projectRootPath);
    }
  }

  const generatedOutputDirectory =
    args.defaultGeneratedOutputDirectory ?? DEFAULT_GENERATED_OUTPUT_DIRECTORY;

  return await Promise.resolve(
    path.join(generatedOutputDirectory, args.generatorName),
  );
}

/**
 * Collects one generator input from the current argument position.
 */
function collectGeneratorInputFromArgument(args: {
  commandArgument: string | undefined;
  commandArgumentIndex: number;
  commandArguments: string[];
  generatorInputs: Record<string, string>;
  schemaPropertyNames: string[];
}): number {
  if (!args.commandArgument?.startsWith("--")) {
    return 1;
  }

  const optionName = getOptionName(args.commandArgument);
  const propertyName = resolveSchemaPropertyName(
    optionName,
    args.schemaPropertyNames,
  );
  if (
    propertyName === undefined ||
    shouldIgnoreOptionName({ optionName, propertyName })
  ) {
    return 1;
  }

  const optionValue = getOptionValue({
    commandArgument: args.commandArgument,
    commandArgumentIndex: args.commandArgumentIndex,
    commandArguments: args.commandArguments,
  });
  if (optionValue === undefined) {
    return 1;
  }

  args.generatorInputs[propertyName] = optionValue;
  return args.commandArgument.includes("=") ? 1 : 2;
}

/**
 * Collects generator inputs by scanning command arguments and matching schema keys.
 */
function collectGeneratorInputs(args: {
  commandArguments: string[];
  schemaPropertyNames: string[];
}): Record<string, string> {
  const generatorInputs: Record<string, string> = {};

  for (
    let commandArgumentIndex = 0;
    commandArgumentIndex < args.commandArguments.length;
  ) {
    const commandArgument = args.commandArguments[commandArgumentIndex];
    const consumeCount = collectGeneratorInputFromArgument({
      commandArgument,
      commandArgumentIndex,
      commandArguments: args.commandArguments,
      generatorInputs,
      schemaPropertyNames: args.schemaPropertyNames,
    });

    commandArgumentIndex += consumeCount;
  }

  return generatorInputs;
}

/**
 * Parses the option name from a --flag or --flag=value argument.
 */
function getOptionName(argument: string): string {
  return argument.includes("=")
    ? (argument.slice(2).split("=", 1)[0] ?? "")
    : argument.slice(2);
}

/**
 * Extracts the option value from inline or adjacent CLI argument forms.
 */
function getOptionValue(args: {
  commandArgument: string;
  commandArgumentIndex: number;
  commandArguments: string[];
}): string | undefined {
  if (args.commandArgument.includes("=")) {
    return args.commandArgument.slice(args.commandArgument.indexOf("=") + 1);
  }

  const nextArgument = args.commandArguments[args.commandArgumentIndex + 1];
  if (nextArgument === undefined || nextArgument.startsWith("--")) {
    return undefined;
  }

  return nextArgument;
}

/**
 * Removes the command token when the first argument is "generate".
 */
function resolveCommandArguments(rawArguments: string[]): string[] {
  return rawArguments[0] === "generate" ? rawArguments.slice(1) : rawArguments;
}

/**
 * Matches option names to schema property names using camel and kebab variants.
 */
function resolveSchemaPropertyName(
  optionName: string,
  schemaPropertyNames: string[],
): string | undefined {
  return schemaPropertyNames.find((candidatePropertyName) => {
    return (
      optionName === candidatePropertyName ||
      optionName === kebabCase(candidatePropertyName)
    );
  });
}

/**
 * Resolves target directory from known output option keys.
 */
function resolveTargetDirectoryPathOption(
  options: Record<string, unknown>,
): string | undefined {
  for (const targetDirectoryOptionKey of TARGET_DIRECTORY_OPTION_KEYS) {
    const optionValue = options[targetDirectoryOptionKey];
    if (typeof optionValue === "string") {
      return optionValue;
    }
  }

  return undefined;
}

/**
 * Checks whether an option should be ignored as a reserved generator flag.
 */
function shouldIgnoreOptionName(args: {
  optionName: string;
  propertyName: string;
}): boolean {
  return (
    RESERVED_GENERATOR_OPTION_NAMES.has(args.optionName) ||
    RESERVED_GENERATOR_OPTION_NAMES.has(args.propertyName)
  );
}
const { camelCase, kebabCase, snakeCase, upperFirst } = lodash;
