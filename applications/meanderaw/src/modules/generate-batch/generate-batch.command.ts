import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { Inject, Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import { LoggerService } from "@codebase/logger";

import {
  COMPATIBLE_MODIFIERS,
  DEFAULT_OUTPUT_DIRECTORY,
  DEFAULT_REPEAT_COUNT,
  SPIN_CYCLE_LENGTH,
  SPIN_FAMILY_MODIFIER_NAMES,
  STRUCTURAL_MINIMUM_ROWS,
  SUPPORTED_MODIFIER_NAMES,
  SUPPORTED_TYPES,
} from "../meander-generation/meander-generation.constants";
import { MeanderGenerationService } from "../meander-generation/meander-generation.service";
import { OutputFilenameService } from "../meander-generation/output-filename.service";

import {
  ALTERNATED_SWEEP_PERIODS,
  DOT_SWEEP_SHAPES,
  ROWS_SWEEP_MAXIMUM,
} from "./generate-batch.constants";

import type {
  GenerationParameters,
  MeanderType,
  Modifier,
} from "../meander-generation/meander-generation.types";
import type { GenerateBatchCommandOptions } from "./generate-batch.types";

/**
 * Generates every meander in a bounded, representative sweep of the whole
 * parameter space and writes each one to disk. For every implemented type,
 * sweeps rows from that type's `STRUCTURAL_MINIMUM_ROWS` through
 * `ROWS_SWEEP_MAXIMUM` (8), and every modifier `COMPATIBLE_MODIFIERS` lists
 * for that type plus "no modifier" — `alternated` and `dot` each expand
 * into a couple of representative parameter values
 * (`ALTERNATED_SWEEP_PERIODS`, `DOT_SWEEP_SHAPES`) rather than their full
 * range. `repeatCount` is fixed at `DEFAULT_REPEAT_COUNT` (6) for every
 * combination, except the `spin`/`spin-flip` family, which is rounded up to
 * the nearest multiple of their required `SPIN_CYCLE_LENGTH` (4) — giving 8
 * — so the generation service doesn't reject a cut-off rotation. This produces
 * roughly a hundred files rather than the many hundreds a full
 * rows-by-repeat-count-by-modifier-parameter cross product would.
 */
@Command({
  description:
    "Generate every meander in a bounded sweep (structural-minimum-through-8 rows, every compatible modifier plus none, representative modifier-parameter values) and write them all to disk",
  name: "generate-batch",
})
@Injectable()
export class GenerateBatchCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly logger: LoggerService,
    @Inject(MeanderGenerationService)
    private readonly meanderGenerationService: MeanderGenerationService,
    @Inject(OutputFilenameService)
    private readonly outputFilenameService: OutputFilenameService,
  ) {
    super();
    this.logger.setContext(GenerateBatchCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Throws when two combinations in the sweep would write the same filename. */
  private assertNoFileNameCollisions(fileNames: readonly string[]): void {
    const uniqueFileNames = new Set(fileNames);

    if (uniqueFileNames.size !== fileNames.length) {
      throw new Error("Batch generation produced colliding output filenames");
    }
  }

  /** Enumerates every `(type, modifier-or-none, rows, repeatCount)` combination the sweep covers. */
  private buildCombinations(): GenerationParameters[] {
    const types = SUPPORTED_TYPES.filter((value): value is MeanderType =>
      this.isMeanderType(value),
    );

    return types.flatMap((type) => this.combinationsForType(type));
  }

  /** Enumerates every combination for a single type: every swept row count crossed with every swept modifier. */
  private combinationsForType(type: MeanderType): GenerationParameters[] {
    const rows = this.rowsSweep(type);
    const modifiers = this.modifiersForType(type);

    return rows.flatMap((rowCount) =>
      modifiers.map((modifier) => ({
        repeatCount: this.repeatCountFor(modifier),
        rows: rowCount,
        type,
        ...(modifier ? { modifier } : {}),
      })),
    );
  }

  /** Expands one modifier name into every representative {@link Modifier} value the sweep covers. */
  private expandModifierName(name: Modifier["name"]): Modifier[] {
    if (name === "alternated") {
      return ALTERNATED_SWEEP_PERIODS.map((period) => ({ name, period }));
    }

    if (name === "dot") {
      return DOT_SWEEP_SHAPES.map((shape) => ({ name, shape }));
    }

    return [{ name }];
  }

  /** Narrows a raw string to a supported {@link MeanderType} without an unchecked assertion. */
  private isMeanderType(value: string): value is MeanderType {
    return SUPPORTED_TYPES.includes(value);
  }

  /** Narrows a raw string to a supported {@link Modifier} name without an unchecked assertion. */
  private isModifierName(value: string): value is Modifier["name"] {
    return SUPPORTED_MODIFIER_NAMES.includes(value);
  }

  /** Every modifier the sweep covers for `type`: `undefined` (no modifier) plus every representative value of each compatible modifier. */
  private modifiersForType(type: MeanderType): (Modifier | undefined)[] {
    const modifierNames = COMPATIBLE_MODIFIERS[type].filter(
      (value): value is Modifier["name"] => this.isModifierName(value),
    );

    return [
      undefined,
      ...modifierNames.flatMap((name) => this.expandModifierName(name)),
    ];
  }

  /** The `repeatCount` a combination uses: `DEFAULT_REPEAT_COUNT`, rounded up to the spin family's required cycle length when needed. */
  private repeatCountFor(modifier: Modifier | undefined): number {
    if (modifier && SPIN_FAMILY_MODIFIER_NAMES.includes(modifier.name)) {
      return (
        Math.ceil(DEFAULT_REPEAT_COUNT / SPIN_CYCLE_LENGTH) * SPIN_CYCLE_LENGTH
      );
    }

    return DEFAULT_REPEAT_COUNT;
  }

  /** Every `rows` value the sweep covers for `type`: its own structural minimum through `ROWS_SWEEP_MAXIMUM`. */
  private rowsSweep(type: MeanderType): number[] {
    const minimum = STRUCTURAL_MINIMUM_ROWS[type];
    const length = ROWS_SWEEP_MAXIMUM - minimum + 1;

    return Array.from({ length }, (_value, index) => minimum + index);
  }

  // 🌎 Public Methods

  /** Registers the `--output-directory` flag; nest-commander requires a parser method per option even when no transformation is needed. */
  @Option({
    defaultValue: DEFAULT_OUTPUT_DIRECTORY,
    description: "Directory the generated SVGs are written to",
    flags: "-o, --output-directory <outputDirectory>",
  })
  parseOutputDirectory(value: string): string {
    return value;
  }

  /** Generates every combination in the sweep and writes each one to disk. */
  async run(
    _passedParameters: string[],
    options: GenerateBatchCommandOptions,
  ): Promise<void> {
    const combinations = this.buildCombinations();
    const files = combinations.map((parameters) => ({
      fileName: this.outputFilenameService.build(parameters),
      svg: this.meanderGenerationService.generate(parameters),
    }));

    this.assertNoFileNameCollisions(files.map((file) => file.fileName));

    await mkdir(options.outputDirectory, { recursive: true });
    await Promise.all(
      files.map(async (file) =>
        writeFile(path.join(options.outputDirectory, file.fileName), file.svg),
      ),
    );

    this.logger.log("✨ Generated a batch of meanders", undefined, {
      count: files.length,
      outputDirectory: options.outputDirectory,
    });
  }
}
