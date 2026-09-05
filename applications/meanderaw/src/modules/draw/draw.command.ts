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
import { SUPPORTED_SERPENTINE_FLIPS } from "../parallel-motif/parallel-motif.constants";
import { OutputPathService } from "../svg-rendering/output-path.service";

import { DrawCombinationsService } from "./draw-combinations.service";
import { DrawIndexService } from "./draw-index.service";
import { DrawNegativePermutationsService } from "./draw-negative-permutations.service";
import { DrawParametersService } from "./draw-parameters.service";
import { DrawPermutationsService } from "./draw-permutations.service";
import { CollidingPathsError, INDEX_FILE_NAME } from "./draw.constants";

import type {
  DotShape,
  GenerationParameters,
  MeanderType,
  Modifier,
  SerpentineFlip,
} from "../meander-generation/meander-generation.types";
import type { MosaicSubFamily } from "../mosaic-motif/mosaic-motif.types";
import type {
  DrawCommandOptions,
  OutputDocument,
  RenderedDocument,
} from "./draw.types";

/**
 * Draws meanders. It is the application's only command, and its default, so
 * running it with no arguments at all runs this.
 *
 * What it draws is decided by whether a drawing was named:
 *
 * - **`draw`** sweeps everything. A bounded, representative sample of the
 *   named families' parameter space, enumerated by
 *   {@link DrawCombinationsService} — which the meander charter's property
 *   test also sweeps, so the corpus this writes and the corpus that is gated
 *   are the same space by construction rather than by coincidence — beside
 *   two exhaustive enumerations, of the `mosaic` family's tiles and of the
 *   `negative` family's one-column sources. Those run to thousands of files
 *   and so are written one row count at a time. An index page listing every
 *   drawing is written at the root of the output directory.
 * - **`draw --type <family> --rows <n>`** draws that one, to the same path
 *   the sweep would have written it to.
 *
 * The two used to be separate `start` and `generate` commands. They are one
 * because the option set is one: every flag below either names a drawing or
 * says where drawings go, and a sub-command boundary between them only
 * decided which half of that set was legal.
 *
 * Six of those flags belong to one modifier each — `--period`, `--shape`,
 * `--strands`, `--branches`, `--leftward`, and `--upward` — and are
 * recombined with `--modifier` by {@link DrawParametersService.modifier},
 * since nest-commander parses each one through a method that cannot see the
 * others.
 *
 * Both halves are written through the same {@link writeDocuments}, so
 * "somewhere under the output directory" is the only thing this command knows
 * about either one's layout. Where each document actually lands is decided by
 * {@link OutputPathService} and by the permutation sweep.
 */
@Command({
  description:
    "Draw meanders: with no drawing named, sweep every one the application can draw (the named families at structural-minimum-through-8 rows with every compatible modifier, plus an exhaustive enumeration of the mosaic family) beneath an index page listing them all; with --type and --rows, draw that one",
  name: "draw",
  options: { isDefault: true },
})
@Injectable()
export class DrawCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly logger: LoggerService,
    @Inject(DrawCombinationsService)
    private readonly drawCombinationsService: DrawCombinationsService,
    @Inject(DrawIndexService)
    private readonly drawIndexService: DrawIndexService,
    @Inject(DrawParametersService)
    private readonly drawParametersService: DrawParametersService,
    @Inject(DrawNegativePermutationsService)
    private readonly drawNegativePermutationsService: DrawNegativePermutationsService,
    @Inject(DrawPermutationsService)
    private readonly drawPermutationsService: DrawPermutationsService,
    @Inject(MeanderGenerationService)
    private readonly meanderGenerationService: MeanderGenerationService,
    @Inject(OutputPathService)
    private readonly outputPathService: OutputPathService,
  ) {
    super();
    this.logger.setContext(DrawCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Throws when two combinations in the sweep would write the same path. */
  private assertNoPathCollisions(documents: readonly OutputDocument[]): void {
    const paths = documents.map(
      (document) => `${document.directory}/${document.fileName}`,
    );

    if (new Set(paths).size !== paths.length) {
      throw new CollidingPathsError();
    }
  }

  /** Renders the drawing `options` names, beside the path it is written to. */
  private render(options: DrawCommandOptions): RenderedDocument {
    return this.renderParameters(this.drawParametersService.single(options));
  }

  /** Renders the named-family half of the sweep. */
  private renderCombinations(): RenderedDocument[] {
    return this.drawCombinationsService
      .enumerate()
      .map((parameters) => this.renderParameters(parameters));
  }

  /** Renders one set of generation parameters, beside the path those parameters name. */
  private renderParameters(parameters: GenerationParameters): RenderedDocument {
    const filePath = this.outputPathService.build(parameters);

    return {
      directory: path.posix.dirname(filePath),
      fileName: path.posix.basename(filePath),
      svg: this.meanderGenerationService.generate(parameters),
    };
  }

  /** Draws every meander the application can draw, and indexes them all in one page. */
  private async sweep(outputDirectory: string): Promise<void> {
    const combinations = this.renderCombinations();

    this.assertNoPathCollisions(combinations);

    const documents = await this.writeDocuments(outputDirectory, combinations);

    for (const rows of this.drawPermutationsService.rowsSweep()) {
      documents.push(
        ...(await this.writeDocuments(
          outputDirectory,
          this.drawPermutationsService.render(rows),
        )),
      );
    }

    for (const rows of this.drawNegativePermutationsService.rowsSweep()) {
      documents.push(
        ...(await this.writeDocuments(
          outputDirectory,
          this.drawNegativePermutationsService.render(rows),
        )),
      );
    }

    const indexPath = path.join(outputDirectory, INDEX_FILE_NAME);

    await writeFile(indexPath, this.drawIndexService.render(documents));

    this.logger.log("✨ Generated every meander", undefined, {
      count: documents.length,
      indexPath,
      outputDirectory,
      permutations: documents.length - combinations.length,
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

  // 🌎 Public Methods

  /** Parses `--branches` as an integer, used only with `--modifier stagger`. */
  @Option({
    description:
      "Branches one crenel's rail joins before it changes side, for --modifier stagger",
    flags: "-b, --branches <branches>",
  })
  parseBranches(value: string): number {
    return Number.parseInt(value, 10);
  }

  /** Parses `--flip`, rejecting any value outside the supported set. Used only with `--modifier serpentine`. */
  @Option({
    description: `Which ribbons are turned upside down, for --modifier serpentine (${SUPPORTED_SERPENTINE_FLIPS.join(", ")})`,
    flags: "--flip <flip>",
  })
  parseFlip(value: string): SerpentineFlip {
    return this.drawParametersService.serpentineFlip(value);
  }

  /**
   * Parses `--leftward` as a boolean toggle, used only with
   * `--modifier rung`. Bare, or with any value but `false` or `0`, it points
   * the rungs left; absent, `rung` keeps the rightward direction it drew
   * before the flag existed.
   */
  @Option({
    description: "Point the rungs left instead of right, for --modifier rung",
    flags: "-l, --leftward [leftward]",
  })
  parseLeftward(value: string | undefined): boolean {
    return value !== "false" && value !== "0";
  }

  /** Parses `--modifier`, rejecting any name outside the supported set. Omitted entirely when no modifier is requested. */
  @Option({
    description: `Modifier applied to the motif (${SUPPORTED_MODIFIER_NAMES.join(", ")})`,
    flags: "-m, --modifier <modifier>",
  })
  parseModifier(value: string): Modifier["name"] {
    return this.drawParametersService.modifierName(value);
  }

  /** Parses `--offset` as an integer, used only with `--modifier serpentine`. */
  @Option({
    description:
      "How far the strip depths are rotated, for --modifier serpentine",
    flags: "--offset <offset>",
  })
  parseOffset(value: string): number {
    return Number.parseInt(value, 10);
  }

  /** Registers `--output-directory`; nest-commander requires a parser method per option even when no transformation is needed. */
  @Option({
    defaultValue: DEFAULT_OUTPUT_DIRECTORY,
    description: "Directory the drawings are written to",
    flags: "-o, --output-directory <outputDirectory>",
  })
  parseOutputDirectory(value: string): string {
    return value;
  }

  /** Parses `--period` as an integer, used only with `--modifier alternated`. */
  @Option({
    description:
      "Column span of one repeat tile, in 2 * period grid columns, for --modifier alternated",
    flags: "-p, --period <period>",
  })
  parsePeriod(value: string): number {
    return Number.parseInt(value, 10);
  }

  /** Parses `--repeat-count` as an integer, defaulting to a sensible repeat count. */
  @Option({
    defaultValue: DEFAULT_REPEAT_COUNT,
    description: "Number of times the motif repeats horizontally",
    flags: "-c, --repeat-count <repeatCount>",
  })
  parseRepeatCount(value: string): number {
    return Number.parseInt(value, 10);
  }

  /** Parses `--rows` as an integer. Optional, since a sweep names no row count; required alongside `--type`. */
  @Option({
    description: "Row count of one drawing, controlling grid density",
    flags: "-r, --rows <rows>",
  })
  parseRows(value: string): number {
    return Number.parseInt(value, 10);
  }

  /** Parses `--shape`, rejecting any value outside the supported set. Used only with `--modifier dot`. */
  @Option({
    description: `Dot level sequence shape, for --modifier dot (${SUPPORTED_DOT_SHAPES.join(", ")})`,
    flags: "-s, --shape <shape>",
  })
  parseShape(value: string): DotShape {
    return this.drawParametersService.dotShape(value);
  }

  /** Parses `--strands` as an integer, used only with `--modifier plied`. */
  @Option({
    description: "Number of strands in one bundle, for --modifier plied",
    flags: "-n, --strands <strands>",
  })
  parseStrands(value: string): number {
    return Number.parseInt(value, 10);
  }

  /** Parses `--sub-family`, rejecting any name outside the set of recognized sub-families. */
  @Option({
    description: `Named region of the family's unit space (${SUPPORTED_SUB_FAMILIES.join(", ")}), for --type mosaic`,
    flags: "-f, --sub-family <subFamily>",
  })
  parseSubFamily(value: string): MosaicSubFamily {
    return this.drawParametersService.subFamily(value);
  }

  /** Parses `--type`, rejecting any value outside the supported set. Optional, since a sweep names no family. */
  @Option({
    description: `Family of one drawing (${SUPPORTED_TYPES.join(", ")})`,
    flags: "-t, --type <type>",
  })
  parseType(value: string): MeanderType {
    return this.drawParametersService.type(value);
  }

  /**
   * Parses `--upward` as a boolean toggle, used only with
   * `--modifier comb`. Bare, or with any value but `false` or `0`, it
   * stands the teeth up from a rail along the band's bottom row; absent,
   * `comb` hangs them from the top the way every unmodified drawing does.
   */
  @Option({
    description:
      "Stand the teeth up from the bottom instead of hanging them from the top, for --modifier comb",
    flags: "-u, --upward [upward]",
  })
  parseUpward(value: string | undefined): boolean {
    return value !== "false" && value !== "0";
  }

  /** Sweeps every meander, or draws the one `--type` and `--rows` name. */
  async run(
    _passedParameters: string[],
    options: DrawCommandOptions,
  ): Promise<void> {
    if (options.rows === undefined && options.type === undefined) {
      await this.sweep(options.outputDirectory);

      return;
    }

    const document = this.render(options);
    const filePath = path.join(
      options.outputDirectory,
      document.directory,
      document.fileName,
    );

    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, document.svg);

    this.logger.log("✨ Generated a meander", undefined, { filePath });
  }
}
