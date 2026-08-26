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

import { StartPermutationsService } from "./start-permutations.service";
import {
  ALTERNATED_SWEEP_PERIODS,
  DOT_SWEEP_SHAPES,
  ROWS_SWEEP_MAXIMUM,
} from "./start.constants";

import type {
  GenerationParameters,
  MeanderType,
  Modifier,
} from "../meander-generation/meander-generation.types";
import type { StartCommandOptions } from "./start.types";

/**
 * Generates every meander the application can draw and writes them all to
 * disk. It is the application's default command, so running it with no
 * arguments at all runs this.
 *
 * The sweep has two halves. The first is a bounded, representative sample
 * of the named types' parameter space. For every implemented type,
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
 *
 * The second half is the `mosaic` family, which is enumerated exhaustively
 * rather than sampled — see {@link StartPermutationsService}. It lands in a
 * subdirectory of its own because it runs to thousands of files.
 */
@Command({
  description:
    "Generate every meander: a bounded sweep of the named types (structural-minimum-through-8 rows, every compatible modifier plus none) plus an exhaustive enumeration of the mosaic family, written to disk",
  name: "start",
  options: { isDefault: true },
})
@Injectable()
export class StartCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly logger: LoggerService,
    @Inject(MeanderGenerationService)
    private readonly meanderGenerationService: MeanderGenerationService,
    @Inject(OutputFilenameService)
    private readonly outputFilenameService: OutputFilenameService,
    @Inject(StartPermutationsService)
    private readonly startPermutationsService: StartPermutationsService,
  ) {
    super();
    this.logger.setContext(StartCommand.name);
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

  /** Generates both halves of the sweep and writes every file to disk. */
  async run(
    _passedParameters: string[],
    options: StartCommandOptions,
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

    const permutations = await this.startPermutationsService.write(
      options.outputDirectory,
    );

    this.logger.log("✨ Generated every meander", undefined, {
      count: files.length,
      outputDirectory: options.outputDirectory,
      permutations,
    });
  }
}
