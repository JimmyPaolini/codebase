import { ConfigurationModule } from "@codometer/configuration";
import { CustomStatisticsModule } from "@codometer/custom-statistics";
import { FileDiscoveryModule } from "@codometer/file-discovery";
import { LanguagesModule } from "@codometer/languages";
import { OutputJsonModule, OutputMarkdownModule } from "@codometer/output";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DiscoveryModule } from "@nestjs/core";

import { LoggerModule } from "@codebase/logger";

import { environmentSchema } from "./constants";
import { ChangesModule } from "./modules/changes/changes.module";
import { CodometerModule } from "./modules/codometer/codometer.module";

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
    ChangesModule,
    CodometerModule,
    ConfigurationModule,
    CustomStatisticsModule,
    FileDiscoveryModule,
    LanguagesModule,
    OutputJsonModule,
    OutputMarkdownModule,
  ],
})
export class MainModule {}
