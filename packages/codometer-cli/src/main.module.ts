import { ConfigurationModule, InputModule } from "@codometer/configuration";
import { CustomizationModule } from "@codometer/customization";
import { DiscoveryModule as CodometerDiscoveryModule } from "@codometer/discovery";
import { LanguagesModule } from "@codometer/languages";
import { JsonModule, MarkdownModule } from "@codometer/output";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DiscoveryModule } from "@nestjs/core";

import { LoggerModule } from "@codebase/logger";

import { environmentSchema } from "./constants";
import { ChangesModule } from "./modules/changes/changes.module";
import { ConfigurationModule as CodometerCliConfigurationModule } from "./modules/configuration/configuration.module";
import { MeasureModule } from "./modules/measure/measure.module";

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
    CodometerCliConfigurationModule,
    MeasureModule,
    CodometerDiscoveryModule,
    ConfigurationModule,
    CustomizationModule,
    InputModule,
    LanguagesModule,
    JsonModule,
    MarkdownModule,
  ],
})
export class MainModule {}
