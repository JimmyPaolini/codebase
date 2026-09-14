import { writeFile } from "node:fs/promises";

import { Inject, Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import { LoggerService } from "@codebase/logger";

import { HARDCODED_MEANDERS_BY_FAMILY } from "../hardcoded-meanders/hardcoded-meanders.constants";
import { HardcodedMeandersService } from "../hardcoded-meanders/hardcoded-meanders.service";

import { DrawCodeService } from "./draw-code.service";
import { DrawEnumerationService } from "./draw-enumeration.service";
import { DrawIndexService } from "./draw-index.service";
import {
  DEFAULT_INDEX_PATH,
  IncompleteCodeDrawingError,
} from "./draw.constants";

import type { DrawCommandOptions } from "./draw.types";

/**
 * Draws meanders into the committed sqlite database. It is the
 * application's only command, and its default, so running it with no
 * arguments at all runs this.
 *
 * What it draws is decided by whether a Code was named:
 *
 * - **`draw`** sweeps everything, in two halves that between them are the
 *   whole corpus. {@link DrawEnumerationService} walks the lattice's unit
 *   space — every shape the edge budget admits, every structurally distinct
 *   repeat within each — and writes a row per meander found, its family read
 *   off its own structure rather than off whichever generator drew it. Then
 *   {@link HardcodedMeandersService} ingests the historical corpus's
 *   hardcoded Code constants, which are exactly the meanders that lie
 *   *beyond* that budget — see `hardcoded-meanders.constants.ts` for how that
 *   boundary is drawn and why it has to be.
 * - **`draw --rows <n> --columns <n> --code <code>`** decodes, renders, and
 *   persists that one meander, through the same generic pipeline both halves
 *   of the sweep use.
 *
 * **The per-family SVG tree is gone for good.** The nine per-family
 * procedural motif services, the `output/<family>/*.svg` tree they wrote,
 * and the `--type`/`--modifier` flags that named one are all retired: a
 * meander is a database row, and a row has no path-length limit for a Code
 * to outgrow. One file write survives the retirement rather than zero:
 * `output/index.html`, rebuilt at the end of every sweep from the
 * database's own rows rather than from a tree of files — see
 * {@link DrawIndexService}.
 *
 * The enumerated half runs first, so a sweep that cannot decode or render
 * something it found fails before the corpus is ingested behind it — and so
 * that a hardcoded entry claiming an address the enumeration already holds
 * fails loudly rather than silently replacing it.
 */
@Command({
  description:
    "Draw meanders into the committed sqlite database: with no Code named, sweep every one the application can draw (the whole lattice's unit space, enumerated and classified into a family by each meander's own structure, plus the historical corpus's hardcoded constants beyond the enumeration's budget); with --rows, --columns, and --code, draw that one",
  name: "draw",
  options: { isDefault: true },
})
@Injectable()
export class DrawCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly logger: LoggerService,
    @Inject(DrawCodeService)
    private readonly drawCodeService: DrawCodeService,
    @Inject(DrawEnumerationService)
    private readonly drawEnumerationService: DrawEnumerationService,
    @Inject(DrawIndexService)
    private readonly drawIndexService: DrawIndexService,
    @Inject(HardcodedMeandersService)
    private readonly hardcodedMeandersService: HardcodedMeandersService,
  ) {
    super();
    this.logger.setContext(DrawCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Decodes, renders, and persists the one meander `--rows`, `--columns`,
   * and `--code` name, refusing the request when `--rows` or `--columns` is
   * missing.
   *
   * Takes the three already-narrowed values rather than the whole options
   * object, so the `rows` and `columns` presence check below is what
   * TypeScript itself trusts, rather than a check the compiler cannot see
   * through a wider type.
   */
  private async runCodeDrawing(
    code: string,
    rows: number | undefined,
    columns: number | undefined,
  ): Promise<void> {
    if (rows === undefined || columns === undefined) {
      throw new IncompleteCodeDrawingError();
    }

    const meander = await this.drawCodeService.draw({ code, columns, rows });

    this.logger.log("✨ Generated a meander by code", undefined, {
      id: meander.id,
    });
  }

  /**
   * Draws every meander the application can draw, as rows in the committed
   * database, then rebuilds `output/index.html` from those same rows.
   *
   * Two provenances, one corpus and one unique index over a meander's
   * lattice address. The enumerated half is written first and the hardcoded
   * half second, so the two are ordered rather than racing: an entry that
   * claimed an address the enumeration already holds is refused by the index
   * rather than overwriting it, which is spec #813's thirty-second story
   * enforced by the schema rather than by a convention nobody checks.
   *
   * The index page is built and written last, once both halves have
   * committed — a page built from a partial sweep would tell a reader the
   * corpus stopped short of where it actually did.
   */
  private async sweep(): Promise<void> {
    const enumerated = await this.drawEnumerationService.sweep();

    this.logger.log("✨ Enumerated every family's unit space", undefined, {
      enumerated,
    });

    const hardcoded = await this.hardcodedMeandersService.ingest(
      HARDCODED_MEANDERS_BY_FAMILY,
    );

    this.logger.log("✨ Generated every meander", undefined, {
      enumerated,
      hardcoded: hardcoded.length,
      total: enumerated + hardcoded.length,
    });

    const page = await this.drawIndexService.build();

    await writeFile(DEFAULT_INDEX_PATH, page);

    this.logger.log("✨ Rebuilt the index page", undefined, {
      indexPath: DEFAULT_INDEX_PATH,
    });
  }

  // 🌎 Public Methods

  /**
   * Parses `--code`, passed through unchanged: the hexadecimal digits a
   * decoded grid's own points are read from, one character per interior
   * lattice point. `MeanderDecodingService.decode` is what refuses a
   * non-hexadecimal character or a length `--rows`/`--columns` disagree
   * with, so nothing is validated here.
   */
  @Option({
    description:
      "Hexadecimal Code a meander's per-point direction bits are decoded from, one character per interior lattice point — draws that one meander and writes it to the database",
    flags: "--code <code>",
  })
  parseCode(value: string): string {
    return value;
  }

  /** Parses `--columns` as an integer, used only with `--code`. */
  @Option({
    description: "Column count of one --code drawing",
    flags: "--columns <columns>",
  })
  parseColumns(value: string): number {
    return Number.parseInt(value, 10);
  }

  /** Parses `--rows` as an integer, used only with `--code`. Optional, since a sweep names no row count. */
  @Option({
    description: "Row count of one --code drawing, controlling grid density",
    flags: "-r, --rows <rows>",
  })
  parseRows(value: string): number {
    return Number.parseInt(value, 10);
  }

  /** Sweeps every meander into the database, or draws the one `--code` names. */
  async run(
    _passedParameters: string[],
    options: DrawCommandOptions,
  ): Promise<void> {
    if (options.code === undefined) {
      await this.sweep();

      return;
    }

    await this.runCodeDrawing(options.code, options.rows, options.columns);
  }
}
