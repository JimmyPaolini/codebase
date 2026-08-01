import "reflect-metadata";
import { ConsoleLogger } from "@nestjs/common";
import { CommandFactory } from "nest-commander";

import { MainModule } from "./main.module.js";

const knownGenerateOptionNames = new Set([
  "config",
  "help",
  "name",
  "targetDirectoryPath",
]);

/**
 * Collects CLI arguments that should be forwarded to the active generator.
 */
export function collectGeneratorPassthroughArguments(rawArguments: string[]): {
  passthroughArguments: string[];
  sanitizedArguments: string[];
} {
  const subcommandIndex = rawArguments.indexOf("generate");
  if (subcommandIndex === -1) {
    return {
      passthroughArguments: [],
      sanitizedArguments: rawArguments,
    };
  }

  const passthroughArguments: string[] = [];
  const sanitizedArguments = rawArguments.slice(0, subcommandIndex + 1);
  const reservedOptionNamesSeen = new Set<string>();

  for (
    let index = subcommandIndex + 1;
    index < rawArguments.length;
    index += 1
  ) {
    const shouldSkipNextArgument = processGeneratorArgument({
      argument: rawArguments[index],
      index,
      passthroughArguments,
      rawArguments,
      reservedOptionNamesSeen,
      sanitizedArguments,
    });
    if (shouldSkipNextArgument) {
      index += 1;
    }
  }

  return {
    passthroughArguments,
    sanitizedArguments,
  };
}

/**
 * Collects a generator option and its value into the passthrough argument list.
 */
function collectPassthroughArguments({
  argument,
  index,
  passthroughArguments,
  rawArguments,
}: {
  argument: string;
  index: number;
  passthroughArguments: string[];
  rawArguments: string[];
}): boolean {
  passthroughArguments.push(argument);
  const nextArgument = getOptionValue(rawArguments, index, argument);
  if (nextArgument !== undefined) {
    passthroughArguments.push(nextArgument);
    return true;
  }

  return false;
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
  rawArguments: string[],
  index: number,
  argument: string,
): string | undefined {
  if (argument.includes("=")) {
    return undefined;
  }

  const nextArgument = rawArguments[index + 1];
  if (nextArgument === undefined || nextArgument.startsWith("--")) {
    return undefined;
  }

  return nextArgument;
}

/** Bootstraps the NestJS CommandFactory with buffered logs routed through pino `LoggerService`. */
async function main(): Promise<void> {
  const logger = new ConsoleLogger();
  logger.setContext("CommandFactory");

  const { passthroughArguments, sanitizedArguments } =
    collectGeneratorPassthroughArguments(process.argv.slice(2));

  process.argv = [
    process.argv[0] ?? "node",
    process.argv[1] ?? "conformetry",
    ...sanitizedArguments,
  ];

  if (passthroughArguments.length > 0) {
    process.env["CONFORMETRY_GENERATOR_OPTIONS"] =
      JSON.stringify(passthroughArguments);
  }

  await CommandFactory.run(MainModule, { bufferLogs: true, logger });
}

/**
 * Processes a raw CLI argument for the generate subcommand.
 */
function processGeneratorArgument({
  argument,
  index,
  passthroughArguments,
  rawArguments,
  reservedOptionNamesSeen,
  sanitizedArguments,
}: {
  argument: string | undefined;
  index: number;
  passthroughArguments: string[];
  rawArguments: string[];
  reservedOptionNamesSeen: Set<string>;
  sanitizedArguments: string[];
}): boolean {
  if (argument === undefined) {
    return false;
  }

  if (!argument.startsWith("--")) {
    sanitizedArguments.push(argument);
    return false;
  }

  const optionName = getOptionName(argument);
  if (knownGenerateOptionNames.has(optionName)) {
    if (!reservedOptionNamesSeen.has(optionName)) {
      reservedOptionNamesSeen.add(optionName);
      sanitizedArguments.push(argument);
      return false;
    }

    return collectPassthroughArguments({
      argument,
      index,
      passthroughArguments,
      rawArguments,
    });
  }

  return collectPassthroughArguments({
    argument,
    index,
    passthroughArguments,
    rawArguments,
  });
}

void main();
