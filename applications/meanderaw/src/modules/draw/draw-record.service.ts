import { Inject, Injectable } from "@nestjs/common";

import { CharacteristicsService } from "../characteristics/characteristics.service";
import { ClassificationService } from "../classification/classification.service";
import { CodeService } from "../code/code.service";
import { DrawingService } from "../drawing/drawing.service";

import type { MeanderShape } from "../classification/classification.types";
import type {
  MeanderProvenance,
  MeanderRecord,
} from "../database/database.types";

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
    @Inject(CharacteristicsService)
    private readonly characteristicsService: CharacteristicsService,
    @Inject(ClassificationService)
    private readonly classificationService: ClassificationService,
    @Inject(CodeService)
    private readonly codeService: CodeService,
    @Inject(DrawingService)
    private readonly drawingService: DrawingService,
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
    const characteristics = this.characteristicsService.compute(parsed);
    const classification = this.classificationService.classify(
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
      svg: this.drawingService.render(parsed),
    };
  }
}
