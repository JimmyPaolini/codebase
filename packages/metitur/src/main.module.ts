import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DiscoveryModule } from "@nestjs/core";

import { environmentSchema } from "./constants";
import { FileDiscoveryModule } from "./modules/file-discovery/file-discovery.module";
import { LoggerModule } from "./modules/logger/logger.module";
import { TypescriptAnalysisModule } from "./modules/typescript-analysis/typescript-analysis.module";

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
    FileDiscoveryModule,
    LoggerModule,
    TypescriptAnalysisModule,
  ],
})
export class MainModule {}
