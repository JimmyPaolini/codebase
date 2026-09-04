import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { Inject, Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import { LoggerService } from "@codebase/logger";

import { DEFAULT_OUTPUT_DIRECTORY } from "../meander-generation/meander-generation.constants";
import { MeanderGenerationService } from "../meander-generation/meander-generation.service";
import { OutputPathService } from "../svg-rendering/output-path.service";

import { StartCombinationsService } from "./start-combinations.service";
import { StartIndexService } from "./start-index.service";
import { StartPermutationsService } from "./start-permutations.service";
import { INDEX_FILE_NAME } from "./start.constants";

import type {
  OutputDocument,
  RenderedDocument,
  StartCommandOptions,
} from "./start.types";

/**
 * Generates every meander the application can draw, writes them all to disk
 * under the directory their parameters name, and writes the one page they
 * are looked through. It is the application's default command, so running it
 * with no arguments at all runs this.
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
 * rather than sampled — see {@link StartPermutationsService}. It runs to
 * thousands of files, so it is written one row count at a time rather than
 * held in memory all at once.
 *
 * Both halves are written through the same {@link writeDocuments}, so
 * "somewhere under the output directory" is the only thing this command
 * knows about either one's layout. Where each document actually lands is
 * decided by {@link OutputPathService} and by the permutation sweep.
 */
@Command({
  description:
    "Generate every meander: a bounded sweep of the named types (structural-minimum-through-8 rows, every compatible modifier plus none) plus an exhaustive enumeration of the mosaic family, written to disk beneath an index page listing them all",
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
    @Inject(OutputPathService)
    private readonly outputPathService: OutputPathService,
    @Inject(StartCombinationsService)
    private readonly startCombinationsService: StartCombinationsService,
    @Inject(StartIndexService)
    private readonly startIndexService: StartIndexService,
    @Inject(StartPermutationsService)
    private readonly startPermutationsService: StartPermutationsService,
  ) {
    super();
    this.logger.setContext(StartCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Throws when two combinations in the sweep would write the same path. */
  private assertNoPathCollisions(paths: readonly string[]): void {
    const uniquePaths = new Set(paths);

    if (uniquePaths.size !== paths.length) {
      throw new Error("Batch generation produced colliding output paths");
    }
  }

  /** Renders the named-type half of the sweep, each drawing beside the path its own parameters name. */
  private renderCombinations(): RenderedDocument[] {
    return this.startCombinationsService.enumerate().map((parameters) => {
      const filePath = this.outputPathService.build(parameters);

      return {
        directory: path.posix.dirname(filePath),
        fileName: path.posix.basename(filePath),
        svg: this.meanderGenerationService.generate(parameters),
      };
    });
  }

  /** Creates every directory one batch of drawings needs, then writes the batch into them. */
  private async writeDocuments(
    outputDirectory: string,
    documents: readonly RenderedDocument[],
  ): Promise<OutputDocument[]> {
    const directories = new Set(
      documents.map((document) => document.directory),
    );

    await Promise.all(
      [...directories].map(async (directory) =>
        mkdir(path.join(outputDirectory, directory), { recursive: true }),
      ),
    );
    await Promise.all(
      documents.map(async (document) =>
        writeFile(
          path.join(outputDirectory, document.directory, document.fileName),
          document.svg,
        ),
      ),
    );

    return documents.map(({ directory, fileName }) => ({
      directory,
      fileName,
    }));
  }

  /**
   * Writes the index page beside the output directory, so its hyperlinks are
   * relative to the page itself rather than to whichever working directory
   * the sweep was run from.
   */
  private async writeIndex(
    outputDirectory: string,
    documents: readonly OutputDocument[],
  ): Promise<string> {
    const indexPath = path.join(path.dirname(outputDirectory), INDEX_FILE_NAME);

    await writeFile(
      indexPath,
      this.startIndexService.render(path.basename(outputDirectory), documents),
    );

    return indexPath;
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

  /** Generates both halves of the sweep, writes every file to disk, and indexes them all in one page. */
  async run(
    _passedParameters: string[],
    options: StartCommandOptions,
  ): Promise<void> {
    const combinations = this.renderCombinations();

    this.assertNoPathCollisions(
      combinations.map(
        (document) => `${document.directory}/${document.fileName}`,
      ),
    );

    const documents = await this.writeDocuments(
      options.outputDirectory,
      combinations,
    );

    for (const rows of this.startPermutationsService.rowsSweep()) {
      documents.push(
        ...(await this.writeDocuments(
          options.outputDirectory,
          this.startPermutationsService.render(rows),
        )),
      );
    }

    const indexPath = await this.writeIndex(options.outputDirectory, documents);

    this.logger.log("✨ Generated every meander", undefined, {
      count: documents.length,
      indexPath,
      outputDirectory: options.outputDirectory,
      permutations: documents.length - combinations.length,
    });
  }
}
