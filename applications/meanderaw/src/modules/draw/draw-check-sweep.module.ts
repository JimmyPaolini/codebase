import { Module } from "@nestjs/common";
import { getRepositoryToken, TypeOrmModule } from "@nestjs/typeorm";

import { CharacteristicsModule } from "../characteristics/characteristics.module";
import { ClassificationModule } from "../classification/classification.module";
import { CodeModule } from "../code/code.module";
import { CorpusService } from "../corpus/corpus.service";
import { DatabaseService } from "../database/database.service";
import { Meander } from "../database/entities/Meander.entity";
import { DrawingModule } from "../drawing/drawing.module";
import { EnumerationModule } from "../enumeration/enumeration.module";

import { DRAW_CHECK_SWEEP_CONNECTION_NAME } from "./draw-check.constants";
import { DrawEnumerationService } from "./draw-enumeration.service";
import { DrawRecordService } from "./draw-record.service";

/**
 * The root module `DrawCheckRegenerationService` boots as its own, throwaway
 * application context: a fresh in-memory sqlite connection plus the exact
 * enumeration and hardcoded-ingestion pipeline `DrawCommand`'s real sweep
 * runs against the committed database, run here against a connection nothing
 * else ever reads.
 *
 * It does **not** import `CorpusModule` or `DatabaseModule`
 * — both pull in `DatabaseModule`'s `TypeOrmModule.forRoot()`, which
 * always opens the one committed `output/meanders.sqlite` file under
 * TypeORM's default connection name. This module registers its own
 * `TypeOrmModule.forRoot()` under `DRAW_CHECK_SWEEP_CONNECTION_NAME` instead
 * of that default name, so the two root connections this application keeps
 * alive at once — the committed one and this throwaway one — never collide,
 * the same reason `draw-sweep.command.integration.test.ts` lists
 * `CorpusService` and `DatabaseService` directly as
 * providers rather than importing the modules that wrap them for the
 * committed connection. This module mirrors that test's own provider
 * composition, adapted from test code to real runtime use.
 *
 * `DatabaseService` itself still injects its repository unnamed
 * (`@InjectRepository(Meander)`, the same as it does against the real
 * committed connection elsewhere), so this module also aliases the
 * default-named repository token to the one `forFeature` above actually
 * registered — the class needs no connection-awareness of its own, and the
 * alias is scoped to this module's own container rather than the process
 * wide default TypeORM otherwise reaches for.
 */
@Module({
  controllers: [],
  imports: [
    CharacteristicsModule,
    ClassificationModule,
    CodeModule,
    EnumerationModule,
    DrawingModule,
    TypeOrmModule.forRoot({
      database: ":memory:",
      entities: [Meander],
      logging: false,
      name: DRAW_CHECK_SWEEP_CONNECTION_NAME,
      synchronize: true,
      type: "better-sqlite3",
    }),
    TypeOrmModule.forFeature([Meander], DRAW_CHECK_SWEEP_CONNECTION_NAME),
  ],
  providers: [
    DrawEnumerationService,
    DrawRecordService,
    CorpusService,
    DatabaseService,
    {
      provide: getRepositoryToken(Meander),
      useExisting: getRepositoryToken(
        Meander,
        DRAW_CHECK_SWEEP_CONNECTION_NAME,
      ),
    },
  ],
})
export class DrawCheckSweepModule {}
