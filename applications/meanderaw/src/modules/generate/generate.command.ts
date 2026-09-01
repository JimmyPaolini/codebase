import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { Inject, Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import { LoggerService } from "@codebase/logger";

import {
  DEFAULT_OUTPUT_DIRECTORY,
  DEFAULT_REPEAT_COUNT,
  SUPPORTED_DOT_SHAPES,
  SUPPORTED_MODIFIER_NAMES,
  SUPPORTED_TYPES,
} from "../meander-generation/meander-generation.constants";
import { MeanderGenerationService } from "../meander-generation/meander-generation.service";
import { SUPPORTED_SUB_FAMILIES } from "../mosaic-motif/mosaic-motif.constants";
import { OutputFilenameService } from "../svg-rendering/output-filename.service";

import type {
  DotShape,
  MeanderType,
  Modifier,
} from "../meander-generation/meander-generation.types";
import type { MosaicSubFamily } from "../mosaic-motif/mosaic-motif.types";
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
    @Inject(OutputFilenameService)
    private readonly outputFilenameService: OutputFilenameService,
  ) {
    super();
    this.logger.setContext(GenerateCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Builds the final {@link Modifier}, combining `--modifier`'s name with whichever parameter option that modifier requires. */
  private buildModifier(options: GenerateCommandOptions): Modifier | undefined {
    const { modifier, period, shape } = options;

    if (!modifier) {
      return undefined;
    }

    if (modifier === "alternated") {
      if (period === undefined) {
        throw new Error('Modifier "alternated" requires --period');
      }

      return { name: "alternated", period };
    }

    if (modifier === "dot") {
      if (shape === undefined) {
        throw new Error('Modifier "dot" requires --shape');
      }

      return { name: "dot", shape };
    }

    return { name: modifier };
  }

  /** Narrows a raw string to a supported {@link DotShape} without an unchecked assertion. */
  private isSupportedDotShape(value: string): value is DotShape {
    return SUPPORTED_DOT_SHAPES.includes(value);
  }

  /** Narrows a raw string to a supported {@link Modifier} name without an unchecked assertion. */
  private isSupportedModifierName(value: string): value is Modifier["name"] {
    return SUPPORTED_MODIFIER_NAMES.includes(value);
  }

  /** Narrows a raw string to a {@link MosaicSubFamily} without an unchecked assertion. */
  private isSupportedSubFamily(value: string): value is MosaicSubFamily {
    return SUPPORTED_SUB_FAMILIES.includes(value);
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
  parseModifier(value: string): Modifier["name"] {
    if (!this.isSupportedModifierName(value)) {
      throw new Error(
        `Unsupported modifier "${value}". Supported modifiers: ${SUPPORTED_MODIFIER_NAMES.join(", ")}`,
      );
    }

    return value;
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

  /** Parses the `--period` flag as an integer, used only when `--modifier alternated` is given. */
  @Option({
    description:
      "Column span of one repeat tile, in 2 * period grid columns, for --modifier alternated",
    flags: "-p, --period <period>",
  })
  parsePeriod(value: string): number {
    return Number.parseInt(value, 10);
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

  /** Parses the `--shape` flag, rejecting any value outside the supported set. Used only for `--modifier dot`. */
  @Option({
    description: `Dot level sequence shape, for --modifier dot (${SUPPORTED_DOT_SHAPES.join(", ")})`,
    flags: "-s, --shape <shape>",
  })
  parseShape(value: string): DotShape {
    if (!this.isSupportedDotShape(value)) {
      throw new Error(
        `Unsupported shape "${value}". Supported shapes: ${SUPPORTED_DOT_SHAPES.join(", ")}`,
      );
    }

    return value;
  }

  /**
   * Parses the `--sub-family` flag, rejecting any name outside the set of
   * recognized sub-families. Note that `dots` is a sub-family and `dot` is
   * a modifier: different things, one letter apart, and only the plural is
   * accepted here.
   */
  @Option({
    description: `Named region of the family's unit space (${SUPPORTED_SUB_FAMILIES.join(", ")}), for --type mosaic`,
    flags: "-f, --sub-family <subFamily>",
  })
  parseSubFamily(value: string): MosaicSubFamily {
    if (!this.isSupportedSubFamily(value)) {
      throw new Error(
        `Unsupported sub-family "${value}". Supported sub-families: ${SUPPORTED_SUB_FAMILIES.join(", ")}`,
      );
    }

    return value;
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
    const modifier = this.buildModifier(options);
    const generationParameters = {
      repeatCount: options.repeatCount,
      rows: options.rows,
      type: options.type,
      ...(modifier ? { modifier } : {}),
      ...(options.subFamily ? { subFamily: options.subFamily } : {}),
    };
    const svg = this.meanderGenerationService.generate(generationParameters);

    await mkdir(options.outputDirectory, { recursive: true });

    const filePath = path.join(
      options.outputDirectory,
      this.outputFilenameService.build(generationParameters),
    );
    await writeFile(filePath, svg);

    this.logger.log("✨ Generated a meander", undefined, { filePath });
  }
}
