import { Module } from "@nestjs/common";

import { CharacteristicsModule } from "../characteristics/characteristics.module";
import { ClassificationModule } from "../classification/classification.module";
import { CodeModule } from "../code/code.module";
import { DatabaseModule } from "../database/database.module";
import { DrawingModule } from "../drawing/drawing.module";
import { EnumerationModule } from "../enumeration/enumeration.module";

import { CorpusService } from "./corpus.service";

/**
 * Registers `CorpusService`: the generic decoder, renderer, and
 * Characteristic computation every Code is drawn through, plus the committed
 * sqlite database it persists a row to — the same four modules
 * `DrawCodeService` reaches for a `--code` drawing, since ingesting the
 * historical corpus is the same "decode, render, measure, persist" pipeline
 * run over extracted constants instead of one command-line Code — plus the
 * enumeration, which decides which entries are beyond the sweep's reach and
 * so have to be preserved at all, and the classification, whose
 * `DrawIndexService` names an ingested tile exactly as it names an
 * enumerated one.
 */
@Module({
  controllers: [],
  exports: [CorpusService],
  imports: [
    CharacteristicsModule,
    ClassificationModule,
    CodeModule,
    DatabaseModule,
    DrawingModule,
    EnumerationModule,
  ],
  providers: [CorpusService],
})
export class CorpusModule {}
