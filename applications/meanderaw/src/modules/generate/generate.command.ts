import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { Inject, Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import { LoggerService } from "@codebase/logger";

import {
  SUPPORTED_MODIFIER_NAMES,
  SUPPORTED_TYPES,
} from "../meander-generation/meander-generation.constants";
import { MeanderGenerationService } from "../meander-generation/meander-generation.service";

import {
  DEFAULT_OUTPUT_DIRECTORY,
  DEFAULT_REPEAT_COUNT,
} from "./generate.constants";

import type {
  MeanderType,
  Modifier,
} from "../meander-generation/meander-generation.types";
import type { GenerateCommandOptions } from "./generate.types";

/**
 * Generates one meander SVG from a type, row count, and repeat count, and
 * writes it to disk under a kebab-case filename that encodes all three.
 */
@Command({
  description: "Generate a single meander SVG and write it to disk",
  name: "generate",
})
@Injectable()
export class GenerateCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly logger: LoggerService,
    @Inject(MeanderGenerationService)
    private readonly meanderGenerationService: MeanderGenerationService,
  ) {
    super();
    this.logger.setContext(GenerateCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Builds the kebab-case output filename, encoding every generation parameter so no two outputs can share a name. */
  private buildFileName(options: GenerateCommandOptions): string {
    const baseName = `${options.type}-${options.rows}-rows-${options.repeatCount}-repeats`;

    if (!options.modifier) {
      return `${baseName}.svg`;
    }

    return `${baseName}-${options.modifier.name}.svg`;
  }

  /** Narrows a raw string to a supported {@link Modifier} name without an unchecked assertion. */
  private isSupportedModifierName(value: string): value is Modifier["name"] {
    return SUPPORTED_MODIFIER_NAMES.includes(value);
  }

  /** Narrows a raw string to a supported {@link MeanderType} without an unchecked assertion. */
  private isSupportedType(value: string): value is MeanderType {
    return SUPPORTED_TYPES.includes(value);
  }

  // 🌎 Public Methods

  /** Parses the `--modifier` flag, rejecting any name outside the supported set. Omitted entirely when no modifier is requested. */
  @Option({
    description: `Modifier applied to the motif (${SUPPORTED_MODIFIER_NAMES.join(", ")})`,
    flags: "-m, --modifier <modifier>",
  })
  parseModifier(value: string): Modifier {
    if (!this.isSupportedModifierName(value)) {
      throw new Error(
        `Unsupported modifier "${value}". Supported modifiers: ${SUPPORTED_MODIFIER_NAMES.join(", ")}`,
      );
    }

    return { name: value };
  }

  /** Registers the `--output-directory` flag; nest-commander requires a parser method per option even when no transformation is needed. */
  @Option({
    defaultValue: DEFAULT_OUTPUT_DIRECTORY,
    description: "Directory the generated SVG is written to",
    flags: "-o, --output-directory <outputDirectory>",
  })
  parseOutputDirectory(value: string): string {
    return value;
  }

  /** Parses the `--repeat-count` flag as an integer, defaulting to a sensible repeat count. */
  @Option({
    defaultValue: DEFAULT_REPEAT_COUNT,
    description: "Number of times the motif repeats horizontally",
    flags: "-c, --repeat-count <repeatCount>",
  })
  parseRepeatCount(value: string): number {
    return Number.parseInt(value, 10);
  }

  /** Parses the `--rows` flag as an integer. */
  @Option({
    description: "Row count, controlling grid density",
    flags: "-r, --rows <rows>",
    required: true,
  })
  parseRows(value: string): number {
    return Number.parseInt(value, 10);
  }

  /** Parses the `--type` flag, rejecting any value outside the supported set. */
  @Option({
    description: `Meander type (${SUPPORTED_TYPES.join(", ")})`,
    flags: "-t, --type <type>",
    required: true,
  })
  parseType(value: string): MeanderType {
    if (!this.isSupportedType(value)) {
      throw new Error(
        `Unsupported meander type "${value}". Supported types: ${SUPPORTED_TYPES.join(", ")}`,
      );
    }

    return value;
  }

  /** Generates the SVG for the parsed options and writes it to disk. */
  async run(
    _passedParameters: string[],
    options: GenerateCommandOptions,
  ): Promise<void> {
    const svg = this.meanderGenerationService.generate({
      repeatCount: options.repeatCount,
      rows: options.rows,
      type: options.type,
      ...(options.modifier ? { modifier: options.modifier } : {}),
    });

    await mkdir(options.outputDirectory, { recursive: true });

    const filePath = path.join(
      options.outputDirectory,
      this.buildFileName(options),
    );
    await writeFile(filePath, svg);

    this.logger.log("✨ Generated a meander", undefined, { filePath });
  }
}
