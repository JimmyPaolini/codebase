import * as crypto from "node:crypto";

import { Inject, Injectable } from "@nestjs/common";

import { CharacteristicsService } from "../characteristics/characteristics.service";
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
      this.characteristicsService.seamComponents(phase),
    );
    const characteristics = this.characteristicsService.compute(canonical);
    const booleanKeys = (
      Object.entries(characteristics) as [string, boolean | number][]
    )
      .filter(([_, value]) => typeof value === "boolean" && value)
      .map(([key]) => key);

    // We only keep numbers in the returned object (the booleans are moved to the array)
    const numericCharacteristics = Object.fromEntries(
      (Object.entries(characteristics) as [string, boolean | number][]).filter(
        ([_, value]) => typeof value === "number",
      ),
    );

    const svg = this.drawingService.render(canonical);
    // Node crypto API requires "hex" string
    // cspell:ignore hex
    const drawingHash = crypto.createHash("sha256").update(svg).digest("hex");

    return {
      // type-coverage:ignore-next-line
      ...(numericCharacteristics as unknown as MeanderRecord),
      characteristics: booleanKeys,
      code: this.codeService.format(canonical),
      columns: canonical.columns,
      drawingHash,
      families: this.characteristicsService.classifyFamilies(canonical),
      lattice: canonical.digits,
      pitch: canonical.columns,
      provenance,
      repeats: canonical.repeats,
      rows: canonical.rows,
    };
  }
}
