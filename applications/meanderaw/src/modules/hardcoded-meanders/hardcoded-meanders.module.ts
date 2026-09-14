import { Module } from "@nestjs/common";

import { MeanderCharacteristicsModule } from "../meander-characteristics/meander-characteristics.module";
import { MeanderDatabaseModule } from "../meander-database/meander-database.module";
import { MeanderDecodingModule } from "../meander-decoding/meander-decoding.module";
import { MeanderRenderingModule } from "../meander-rendering/meander-rendering.module";

import { HardcodedMeandersService } from "./hardcoded-meanders.service";

/**
 * Registers `HardcodedMeandersService`: the generic decoder, renderer, and
 * Characteristic computation every Code is drawn through, plus the committed
 * sqlite database it persists a row to — the same four modules
 * `DrawCodeService` reaches for a `--code` drawing, since ingesting the
 * historical corpus is the same "decode, render, measure, persist" pipeline
 * run over hardcoded constants instead of one command-line Code.
 */
@Module({
  controllers: [],
  exports: [HardcodedMeandersService],
  imports: [
    MeanderCharacteristicsModule,
    MeanderDatabaseModule,
    MeanderDecodingModule,
    MeanderRenderingModule,
  ],
  providers: [HardcodedMeandersService],
})
export class HardcodedMeandersModule {}
