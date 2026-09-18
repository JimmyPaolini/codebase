import { Module } from "@nestjs/common";

import { CharacteristicsModule } from "../characteristics/characteristics.module";
import { CodeModule } from "../code/code.module";
import { DatabaseModule } from "../database/database.module";
import { DrawingModule } from "../drawing/drawing.module";

import { CorpusService } from "./corpus.service";

/**
 * Registers `CorpusService`: the generic decoder, renderer, and
 * Characteristic computation every Code is drawn through, plus the committed
 * sqlite database it persists a row to — the same four modules
 * `DrawCodeService` reaches for a `--code` drawing, since ingesting the
 * historical corpus is the same "decode, render, measure, persist" pipeline
 * run over hardcoded constants instead of one command-line Code.
 */
@Module({
  controllers: [],
  exports: [CorpusService],
  imports: [CharacteristicsModule, DatabaseModule, CodeModule, DrawingModule],
  providers: [CorpusService],
})
export class CorpusModule {}
