import { ConfigurationModule } from "@codometer/configuration";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
// Aliased because this package now has a DiscoveryModule of its own, which
// discovers files rather than providers.
import { DiscoveryModule as NestDiscoveryModule } from "@nestjs/core";

import { LoggerModule } from "@codebase/logger";

import { environmentSchema } from "./constants";
import { CodometerModule } from "./modules/codometer/codometer.module";
import { CustomStatisticsModule } from "./modules/custom-statistics/custom-statistics.module";
import { DiscoveryModule } from "./modules/discovery/discovery.module";
import { LanguagesModule } from "./modules/languages/languages.module";
import { OutputJsonModule } from "./modules/output-json/output-json.module";
import { OutputMarkdownModule } from "./modules/output-markdown/output-markdown.module";

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
    NestDiscoveryModule,
    LoggerModule,
    CodometerModule,
    ConfigurationModule,
    CustomStatisticsModule,
    DiscoveryModule,
    LanguagesModule,
    OutputJsonModule,
    OutputMarkdownModule,
  ],
})
export class MainModule {}
