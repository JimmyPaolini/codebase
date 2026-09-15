import { Inject, Injectable } from "@nestjs/common";

import { CodeService } from "../code/code.service";
import { MeanderCharacteristicsService } from "../meander-characteristics/meander-characteristics.service";
import { MeanderClassificationService } from "../meander-classification/meander-classification.service";
import { MeanderRenderingService } from "../meander-rendering/meander-rendering.service";

import type { MeanderShape } from "../meander-classification/meander-classification.types";
import type {
  MeanderProvenance,
  MeanderRecord,
} from "../meander-database/meander-database.types";

/**
 * Turns one Code into the row the database holds for it: read once, then
 * rendered, measured, and classified from that same reading, with nothing
 * rendered or re-read in between.
 *
 * It is the one place a meander row is built, and both ways a row comes to
 * exist go through it — the Code a person names at the command line and the
 * Code the sweep finds — so a Characteristic added to the pipeline reaches
 * both at once rather than reaching whichever caller was remembered. The
 * only thing that differs between the two is the `provenance` the caller
 * passes, which is a fact about where the Code came from rather than
 * anything this can read off it.
 *
 * `pitch` is recorded equal to `columns`: both an enumerated repeat and a
 * Code named directly by `--rows`/`--columns`/`--code` are one repeat wide
 * by construction, so their whole grid is one pitch. See `Meander`'s own doc
 * comment for why the two columns are still held separately.
 */
@Injectable()
export class DrawRecordService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(MeanderCharacteristicsService)
    private readonly meanderCharacteristicsService: MeanderCharacteristicsService,
    @Inject(MeanderClassificationService)
    private readonly meanderClassificationService: MeanderClassificationService,
    @Inject(CodeService)
    private readonly codeService: CodeService,
    @Inject(MeanderRenderingService)
    private readonly meanderRenderingService: MeanderRenderingService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** The row one Code describes at one shape, every field of it derived from that Code alone. */
  record(
    code: string,
    shape: MeanderShape,
    provenance: MeanderProvenance,
  ): MeanderRecord {
    const { columns, rows } = shape;
    const parsed = this.codeService.parse(code, rows, columns);
    const characteristics = this.meanderCharacteristicsService.compute(parsed);
    const classification = this.meanderClassificationService.classify(
      parsed,
      characteristics,
      shape,
    );

    return {
      ...characteristics,
      code,
      columns,
      family: classification.family ?? null,
      pitch: columns,
      provenance,
      rows,
      subFamily: classification.subFamily ?? null,
      svg: this.meanderRenderingService.render(parsed),
    };
  }
}
