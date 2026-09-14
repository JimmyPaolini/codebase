import { Module } from "@nestjs/common";

import { HardcodedMeandersModule } from "../hardcoded-meanders/hardcoded-meanders.module";
import { MeanderCharacteristicsModule } from "../meander-characteristics/meander-characteristics.module";
import { MeanderClassificationModule } from "../meander-classification/meander-classification.module";
import { MeanderDatabaseModule } from "../meander-database/meander-database.module";
import { MeanderDecodingModule } from "../meander-decoding/meander-decoding.module";
import { MeanderEnumerationModule } from "../meander-enumeration/meander-enumeration.module";
import { MeanderRenderingModule } from "../meander-rendering/meander-rendering.module";

import { DrawCodeService } from "./draw-code.service";
import { DrawEnumerationService } from "./draw-enumeration.service";
import { DrawRecordService } from "./draw-record.service";
import { DrawCommand } from "./draw.command";

/**
 * Registers the `draw` CLI command — the application's only command — the
 * service that enumerates the whole unit space its sweep covers, the service
 * that persists the one meander a `--code` drawing names, and the one place
 * either of them builds a database row.
 *
 * Every import here serves the one lattice-first pipeline both paths share:
 * `MeanderDecodingModule` and `MeanderRenderingModule` are the generic
 * decoder and renderer every family's Code is drawn through,
 * `MeanderCharacteristicsModule` measures that same decoded grid,
 * `MeanderClassificationModule` reads a family off those Characteristics,
 * `MeanderEnumerationModule` walks the space the sweep covers, and
 * `MeanderDatabaseModule` is the committed sqlite database all of it
 * persists to. `HardcodedMeandersModule` wraps the same decoder, renderer,
 * and Characteristic computation beneath one service `DrawCommand` calls
 * once per sweep with the historical corpus, trusting its family/subFamily
 * rather than classifying them.
 *
 * `MeanderDatabaseModule` always opens the one committed database file — a
 * test exercising `DrawCommand`, `DrawCodeService`, `DrawEnumerationService`,
 * or `HardcodedMeandersService` builds its own `TestingModule` against a
 * temporary or in-memory connection instead of importing this module.
 */
@Module({
  controllers: [],
  exports: [DrawCommand],
  imports: [
    HardcodedMeandersModule,
    MeanderCharacteristicsModule,
    MeanderClassificationModule,
    MeanderDatabaseModule,
    MeanderDecodingModule,
    MeanderEnumerationModule,
    MeanderRenderingModule,
  ],
  providers: [
    DrawCodeService,
    DrawCommand,
    DrawEnumerationService,
    DrawRecordService,
  ],
})
export class DrawModule {}
