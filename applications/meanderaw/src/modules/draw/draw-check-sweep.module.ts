import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { HardcodedMeandersService } from "../hardcoded-meanders/hardcoded-meanders.service";
import { MeanderCharacteristicsModule } from "../meander-characteristics/meander-characteristics.module";
import { MeanderClassificationModule } from "../meander-classification/meander-classification.module";
import { Meander } from "../meander-database/entities/Meander.entity";
import { MeanderDatabaseService } from "../meander-database/meander-database.service";
import { MeanderDecodingModule } from "../meander-decoding/meander-decoding.module";
import { MeanderEnumerationModule } from "../meander-enumeration/meander-enumeration.module";
import { MeanderRenderingModule } from "../meander-rendering/meander-rendering.module";

import { DrawEnumerationService } from "./draw-enumeration.service";
import { DrawRecordService } from "./draw-record.service";

/**
 * The root module `DrawCheckRegenerationService` boots as its own, throwaway
 * application context: a fresh in-memory sqlite connection plus the exact
 * enumeration and hardcoded-ingestion pipeline `DrawCommand`'s real sweep
 * runs against the committed database, run here against a connection nothing
 * else ever reads.
 *
 * It does **not** import `HardcodedMeandersModule` or `MeanderDatabaseModule`
 * — both pull in `MeanderDatabaseModule`'s `TypeOrmModule.forRoot()`, which
 * always opens the one committed `output/meanders.sqlite` file under
 * TypeORM's default connection name. This module registers its own
 * `TypeOrmModule.forRoot()` under that same default name instead, so
 * importing either would collide two root connections in one application
 * rather than isolate this one — the same reason
 * `draw-sweep.command.integration.test.ts` lists `HardcodedMeandersService`
 * and `MeanderDatabaseService` directly as providers rather than importing
 * the modules that wrap them for the committed connection. This module
 * mirrors that test's own provider composition, adapted from test code to
 * real runtime use.
 */
@Module({
  controllers: [],
  imports: [
    MeanderCharacteristicsModule,
    MeanderClassificationModule,
    MeanderDecodingModule,
    MeanderEnumerationModule,
    MeanderRenderingModule,
    TypeOrmModule.forRoot({
      database: ":memory:",
      entities: [Meander],
      logging: false,
      synchronize: true,
      type: "better-sqlite3",
    }),
    TypeOrmModule.forFeature([Meander]),
  ],
  providers: [
    DrawEnumerationService,
    DrawRecordService,
    HardcodedMeandersService,
    MeanderDatabaseService,
  ],
})
export class DrawCheckSweepModule {}
