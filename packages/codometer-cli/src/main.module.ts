import { ConfigurationModule } from "@codometer/configuration";
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
import { CodometerModule } from "./modules/codometer/codometer.module";
import { ConfigurationModule as CodometerCliConfigurationModule } from "./modules/configuration/configuration.module";

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
    CodometerModule,
    CodometerDiscoveryModule,
    ConfigurationModule,
    CustomizationModule,
    LanguagesModule,
    JsonModule,
    MarkdownModule,
  ],
})
export class MainModule {}
