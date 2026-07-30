import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DiscoveryModule } from "@nestjs/core";

import { environmentSchema } from "./constants";
import { ArchiveLogsModule } from "./modules/archive-logs/archive-logs.module";
import { DeleteLogsModule } from "./modules/delete-logs/delete-logs.module";
import { LoggerModule } from "./modules/logger/logger.module";

/**
 * Root NestJS application module.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ".env",
      isGlobal: true,
      validate: (config: Record<string, unknown>) =>
        environmentSchema.parse(config),
    }),
    DiscoveryModule,
    LoggerModule,
    ArchiveLogsModule,
    DeleteLogsModule,
  ],
})
export class MainModule {}
