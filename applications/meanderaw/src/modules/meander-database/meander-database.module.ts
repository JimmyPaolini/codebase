import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Meander } from "./entities/Meander.entity";
import { DEFAULT_DATABASE_PATH } from "./meander-database.constants";
import { MeanderDatabaseService } from "./meander-database.service";

/**
 * Wires up the committed sqlite database every meander is now persisted to,
 * opened at {@link DEFAULT_DATABASE_PATH}.
 *
 * A test exercising `MeanderDatabaseService` builds its own `TestingModule`
 * against a temporary or in-memory `better-sqlite3` connection instead of
 * importing this module, the same way `DrawCommand`'s own "real generation
 * integration" tests assemble their providers directly rather than
 * importing `DrawModule` — so this module's own path stays fixed to the one
 * real file the committed database lives at.
 *
 * `synchronize: true` rather than a migrations directory: this database has
 * exactly one writer, the CLI itself, and no concurrent consumer ever runs a
 * stale schema against a newer file the way a shared service's migration
 * discipline guards against. Spec #813 also asks for a schema "extensible
 * with new Characteristic columns over time... without a large migration",
 * which is what letting TypeORM synchronize the schema on every run already
 * buys for free — the same choice `packages/lexico-entities` makes for its
 * own, actively-migrated Postgres database.
 */
@Module({
  controllers: [],
  exports: [MeanderDatabaseService, TypeOrmModule],
  imports: [
    TypeOrmModule.forRoot({
      database: DEFAULT_DATABASE_PATH,
      entities: [Meander],
      logging: false,
      synchronize: true,
      type: "better-sqlite3",
    }),
    TypeOrmModule.forFeature([Meander]),
  ],
  providers: [MeanderDatabaseService],
})
export class MeanderDatabaseModule {}
