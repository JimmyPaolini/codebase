import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { Inject, Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import { LoggerService } from "@codebase/logger";

import { MeanderGenerationService } from "../meander-generation/meander-generation.service";

import {
  DEFAULT_OUTPUT_DIRECTORY,
  DEFAULT_REPEAT_COUNT,
  SUPPORTED_TYPES,
} from "./generate.constants";

import type { MeanderType } from "../meander-generation/meander-generation.types";
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
  private fileName(options: GenerateCommandOptions): string {
    return `${options.type}-${options.rows}-rows-${options.repeatCount}-repeats.svg`;
  }

  /** Narrows a raw string to a supported {@link MeanderType} without an unchecked assertion. */
  private isSupportedType(value: string): value is MeanderType {
    return SUPPORTED_TYPES.includes(value);
  }

  // 🌎 Public Methods

  /** Parses the `--output-directory` flag, passing it through unchanged. */
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
    });

    await mkdir(options.outputDirectory, { recursive: true });

    const filePath = path.join(options.outputDirectory, this.fileName(options));
    await writeFile(filePath, svg);

    this.logger.log("✨ Generated a meander", undefined, { filePath });
  }
}
