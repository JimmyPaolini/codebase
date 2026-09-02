import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { Inject, Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import { LoggerService } from "@codebase/logger";

import { DEFAULT_OUTPUT_DIRECTORY } from "../meander-generation/meander-generation.constants";
import { MeanderGenerationService } from "../meander-generation/meander-generation.service";
import { OutputFilenameService } from "../svg-rendering/output-filename.service";

import { StartCombinationsService } from "./start-combinations.service";
import { StartPermutationsService } from "./start-permutations.service";

import type { StartCommandOptions } from "./start.types";

/**
 * Generates every meander the application can draw and writes them all to
 * disk. It is the application's default command, so running it with no
 * arguments at all runs this.
 *
 * The sweep has two halves. The first is a bounded, representative sample
 * of the named types' parameter space, enumerated by
 * {@link StartCombinationsService} — which the meander charter's property
 * test also sweeps, so the corpus this writes and the corpus that is gated
 * are the same space by construction rather than by coincidence. It produces
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
    @Inject(StartCombinationsService)
    private readonly startCombinationsService: StartCombinationsService,
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
    const combinations = this.startCombinationsService.enumerate();
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
