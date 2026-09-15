import { Module } from "@nestjs/common";

import { CodeModule } from "../code/code.module";
import { GridGeometryModule } from "../grid-geometry/grid-geometry.module";
import { HardcodedMeandersModule } from "../hardcoded-meanders/hardcoded-meanders.module";
import { MeanderCharacteristicsModule } from "../meander-characteristics/meander-characteristics.module";
import { MeanderClassificationModule } from "../meander-classification/meander-classification.module";
import { MeanderDatabaseModule } from "../meander-database/meander-database.module";
import { MeanderEnumerationModule } from "../meander-enumeration/meander-enumeration.module";
import { MeanderRenderingModule } from "../meander-rendering/meander-rendering.module";

import { DrawCheckService } from "./draw-check.service";
import { DrawCodeService } from "./draw-code.service";
import { DrawEnumerationService } from "./draw-enumeration.service";
import { DrawIndexService } from "./draw-index.service";
import { DrawRecordService } from "./draw-record.service";
import { DrawCommand } from "./draw.command";

/**
 * Registers the `draw` CLI command — the application's only command — the
 * service that enumerates the whole unit space its sweep covers, the service
 * that persists the one meander a `--code` drawing names, the service that
 * rebuilds the static index page from the committed rows, and the one place
 * any of them builds a database row.
 *
 * Every import here serves the one lattice-first pipeline both paths share:
 * `CodeModule` and `MeanderRenderingModule` are the generic
 * decoder and renderer every family's Code is drawn through,
 * `MeanderCharacteristicsModule` measures that same decoded grid,
 * `MeanderClassificationModule` reads a family off those Characteristics,
 * `MeanderEnumerationModule` walks the space the sweep covers, and
 * `MeanderDatabaseModule` is the committed sqlite database all of it
 * persists to and `DrawIndexService` reads back from, and `GridGeometryModule`
 * is the same scaling rule the renderer drew against, which the index page
 * reads back to step each repeat of a tile one pitch along its band. `HardcodedMeandersModule`
 * wraps the same decoder, renderer, and Characteristic computation beneath
 * one service `DrawCommand` calls once per sweep with the historical corpus,
 * trusting its family/subFamily rather than classifying them.
 *
 * `MeanderDatabaseModule` always opens the one committed database file — a
 * test exercising `DrawCommand`, `DrawCodeService`, `DrawEnumerationService`,
 * `DrawIndexService`, or `HardcodedMeandersService` builds its own
 * `TestingModule` against a temporary or in-memory connection instead of
 * importing this module.
 *
 * `DrawCheckService` reads the committed connection through
 * `MeanderDatabaseModule`'s own exported `TypeOrmModule`, exactly as
 * `MeanderDatabaseService` does — no wiring of its own is needed for that
 * half. Its other half, regenerating a throwaway sweep, needs none of this
 * module's imports at all: `--check` mode's whole point is regenerating into
 * a connection this module never opens, so it boots its own throwaway
 * application context instead — see `DrawCheckService`'s own doc comment.
 */
@Module({
  controllers: [],
  exports: [DrawCommand],
  imports: [
    GridGeometryModule,
    HardcodedMeandersModule,
    MeanderCharacteristicsModule,
    MeanderClassificationModule,
    MeanderDatabaseModule,
    CodeModule,
    MeanderEnumerationModule,
    MeanderRenderingModule,
  ],
  providers: [
    DrawCheckService,
    DrawCodeService,
    DrawCommand,
    DrawEnumerationService,
    DrawIndexService,
    DrawRecordService,
  ],
})
export class DrawModule {}
