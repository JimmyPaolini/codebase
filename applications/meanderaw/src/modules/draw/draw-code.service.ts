import { Inject, Injectable } from "@nestjs/common";

import { MeanderCharacteristicsService } from "../meander-characteristics/meander-characteristics.service";
import { MeanderDatabaseService } from "../meander-database/meander-database.service";
import { MeanderDecodingService } from "../meander-decoding/meander-decoding.service";
import { MeanderRenderingService } from "../meander-rendering/meander-rendering.service";

import type { Meander } from "../meander-database/entities/Meander.entity";
import type { CodeDrawingOptions } from "./draw.types";

/**
 * Renders the meander a `--code` drawing names, through the generic decoder
 * and renderer rather than any per-family procedural motif service, and
 * persists it as one row in the committed sqlite database — its junction
 * counts and boolean Characteristics computed by
 * `MeanderCharacteristicsService` from the same decoded grid the renderer
 * draws from, with no extra decoding step of its own.
 *
 * `pitch` is recorded equal to `columns`: a Code named directly by
 * `--rows`/`--columns`/`--code` has no repeat structure of its own, so its
 * whole grid is one pitch wide. See `Meander`'s own doc comment for why the
 * two columns are still held separately.
 *
 * The row is recorded `provenance: "hardcoded"` — see `MEANDER_PROVENANCES`
 * — since a Code typed at the command line is authored the same way a
 * corpus constant is, named by a person rather than found by a search.
 */
@Injectable()
export class DrawCodeService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(MeanderCharacteristicsService)
    private readonly meanderCharacteristicsService: MeanderCharacteristicsService,
    @Inject(MeanderDatabaseService)
    private readonly meanderDatabaseService: MeanderDatabaseService,
    @Inject(MeanderDecodingService)
    private readonly meanderDecodingService: MeanderDecodingService,
    @Inject(MeanderRenderingService)
    private readonly meanderRenderingService: MeanderRenderingService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Decodes, renders, measures, and persists the one meander `options` names. */
  async draw(options: CodeDrawingOptions): Promise<Meander> {
    const { code, columns, rows } = options;
    const grid = this.meanderDecodingService.decode(code, rows, columns);
    const svg = this.meanderRenderingService.render(grid, rows, columns);
    const characteristics = this.meanderCharacteristicsService.compute(grid);

    return this.meanderDatabaseService.save({
      code,
      columns,
      hasBranching: characteristics.hasBranching,
      hasCrossing: characteristics.hasCrossing,
      inkTJunctions: characteristics.inkTJunctions,
      inkXJunctions: characteristics.inkXJunctions,
      negativeTJunctions: characteristics.negativeTJunctions,
      negativeXJunctions: characteristics.negativeXJunctions,
      pitch: columns,
      provenance: "hardcoded",
      rows,
      svg,
    });
  }
}
