import { Inject, Injectable } from "@nestjs/common";

import { CodeService } from "../code/code.service";
import { MeanderCharacteristicsService } from "../meander-characteristics/meander-characteristics.service";
import { MeanderDatabaseService } from "../meander-database/meander-database.service";
import { MeanderRenderingService } from "../meander-rendering/meander-rendering.service";

import {
  DuplicateHardcodedCodeError,
  HARDCODED_MEANDER_FAMILIES,
} from "./hardcoded-meanders.constants";

import type { Meander } from "../meander-database/entities/Meander.entity";
import type {
  HardcodedMeanderEntry,
  HardcodedMeanderFamily,
} from "./hardcoded-meanders.types";

/**
 * Ingests the historical corpus's hardcoded Code constants into the
 * committed sqlite database, through the same generic reader, renderer, and
 * Characteristic computation `DrawCodeService` draws a `--code` meander
 * through — so an Enumerated row and a Hardcoded row are produced by the
 * exact same pipeline, and only ever differ in where their Code came from.
 *
 * A Hardcoded entry's `family` and `subFamily` are trusted rather than
 * classified: spec #813 keeps the historical corpus's own family and
 * sub-family metadata rather than re-deriving them through the new
 * Characteristic-combination classifiers ticket #817 builds for Enumerated
 * rows, since reclassifying years of curated corpus is explicitly out of
 * scope for this migration.
 *
 * `pitch` is recorded equal to `columns`, the same convention
 * `DrawCodeService` follows: a hardcoded entry is extracted as one true
 * repeat span, with no wider drawing behind it for a database row to record
 * a separate pitch for.
 *
 * A Code that collides with one already committed — an Enumerated row, or
 * another hardcoded entry ingested earlier in the same sweep — fails loudly
 * through {@link DuplicateHardcodedCodeError} rather than silently
 * overwriting, since `MeanderDatabaseService.save` relies on the `code`
 * column's own unique constraint rather than checking beforehand.
 */
@Injectable()
export class HardcodedMeandersService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(MeanderCharacteristicsService)
    private readonly meanderCharacteristicsService: MeanderCharacteristicsService,
    @Inject(MeanderDatabaseService)
    private readonly meanderDatabaseService: MeanderDatabaseService,
    @Inject(CodeService)
    private readonly codeService: CodeService,
    @Inject(MeanderRenderingService)
    private readonly meanderRenderingService: MeanderRenderingService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Reads, renders, measures, and persists one hardcoded entry, trusting `family` and `entry.subFamily`. */
  private async ingestOne(
    family: HardcodedMeanderFamily,
    entry: HardcodedMeanderEntry,
  ): Promise<Meander> {
    const { code, columns, rows, subFamily } = entry;
    const parsed = this.codeService.parse(code, rows, columns);
    const svg = this.meanderRenderingService.render(parsed);
    const characteristics = this.meanderCharacteristicsService.compute(parsed);

    try {
      return await this.meanderDatabaseService.save({
        code,
        columns,
        components: characteristics.components,
        cycles: characteristics.cycles,
        family,
        freeEnds: characteristics.freeEnds,
        hasBranching: characteristics.hasBranching,
        hasCrossing: characteristics.hasCrossing,
        inkTJunctions: characteristics.inkTJunctions,
        inkXJunctions: characteristics.inkXJunctions,
        negativeTJunctions: characteristics.negativeTJunctions,
        negativeXJunctions: characteristics.negativeXJunctions,
        pitch: columns,
        provenance: "hardcoded",
        rows,
        subFamily: subFamily ?? null,
        svg,
      });
    } catch (error) {
      throw new DuplicateHardcodedCodeError(code, family, error);
    }
  }

  // 🌎 Public Methods

  /**
   * Ingests every hardcoded entry named by `entriesByFamily`, family by
   * family and in each family's own order, resolving with every row saved.
   *
   * Ingestion is sequential rather than run in parallel across entries: a
   * failure has to name the one entry that caused it, which a `Promise.all`
   * racing every `save` at once cannot promise given `better-sqlite3`'s own
   * synchronous, single-connection writes.
   */
  async ingest(
    entriesByFamily: Readonly<
      Partial<Record<HardcodedMeanderFamily, readonly HardcodedMeanderEntry[]>>
    >,
  ): Promise<Meander[]> {
    const saved: Meander[] = [];

    for (const family of HARDCODED_MEANDER_FAMILIES) {
      for (const entry of entriesByFamily[family] ?? []) {
        saved.push(await this.ingestOne(family, entry));
      }
    }

    return saved;
  }
}
