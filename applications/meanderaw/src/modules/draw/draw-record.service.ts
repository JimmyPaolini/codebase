import * as crypto from "node:crypto";

import { Inject, Injectable } from "@nestjs/common";

import { BOOLEAN_CHARACTERISTIC_KEYS } from "../characteristics/characteristics.constants";
import { CharacteristicsService } from "../characteristics/characteristics.service";
import { ClassificationService } from "../classification/classification.service";
import { CodeService } from "../code/code.service";
import { DrawingService } from "../drawing/drawing.service";

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
 * Every numeric Characteristic of `CharacteristicsService.compute` is
 * stored under its own column, and every boolean one that holds is listed in
 * `characteristics`, followed by `"isReducible"` when the filed Code is
 * wider than its unit. The family is `ClassificationService`'s verdict on
 * that same record.
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
    shape: {
      columns?: number | undefined;
      repeats?: number | undefined;
      rows?: number | undefined;
    } = {},
    provenance: MeanderProvenance = "hardcoded",
  ): MeanderRecord {
    const parsed = this.codeService.parse(code, shape.rows, shape.columns);
    const repeats = shape.repeats ?? parsed.repeats;
    const withRepeats = { ...parsed, repeats };
    const canonical = this.codeService.canonicalPhase(withRepeats, (phase) =>
      this.characteristicsService.tileCrossingComponentDeltaCount(phase),
    );
    const characteristics = this.characteristicsService.compute(canonical);
    const isReducible = this.characteristicsService.isReducible(canonical);
    const family = this.classificationService.classify(characteristics, {
      columns: canonical.columns,
      isReducible,
      rows: canonical.rows,
    });
    const booleanKeys = [
      ...BOOLEAN_CHARACTERISTIC_KEYS.filter((key) => characteristics[key]),
      ...(isReducible ? ["isReducible"] : []),
    ];

    const svg = this.drawingService.render(canonical);
    // Node crypto API requires "hex" string
    // cspell:ignore hex
    const drawingHash = crypto.createHash("sha256").update(svg).digest("hex");

    return {
      ...characteristics,
      characteristics: booleanKeys,
      code: this.codeService.format(canonical),
      columns: canonical.columns,
      drawingHash,
      family,
      lattice: canonical.digits,
      provenance,
      repeats: canonical.repeats,
      rows: canonical.rows,
    };
  }
}
