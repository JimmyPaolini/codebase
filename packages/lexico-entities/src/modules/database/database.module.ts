import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";

import { LEXICO_DATABASE_ENTITIES } from "./data-source.constants";
import { LexicoNamingStrategy } from "./database.constants";
import { DatabaseService } from "./database.service";

/**
 * Database module handling the TypeORM setup for Lexico.
 */
@Module({
  controllers: [],
  exports: [DatabaseService, TypeOrmModule],
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configurationService: ConfigService) => ({
        database: configurationService.get<string>("POSTGRES_DB", "postgres"),
        entities: [...LEXICO_DATABASE_ENTITIES],
        host: configurationService.get<string>("POSTGRES_HOST", "localhost"),
        logging: false,
        namingStrategy: new LexicoNamingStrategy(),
        password: configurationService.get<string>(
          "POSTGRES_PASSWORD",
          "postgres",
        ),
        port: configurationService.get<number>("POSTGRES_PORT", 5432),
        synchronize: true,
        type: "postgres",
        username: configurationService.get<string>("POSTGRES_USER", "postgres"),
      }),
    }),
  ],
  providers: [DatabaseService],
})
export class DatabaseModule {}
