import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
// Aliased because this package now has a DiscoveryModule of its own, which
// discovers files rather than providers.
import { DiscoveryModule as NestDiscoveryModule } from "@nestjs/core";

import { environmentSchema } from "./constants";
import { CodometerModule } from "./modules/codometer/codometer.module";
import { DiscoveryModule } from "./modules/discovery/discovery.module";
import { JsonModule } from "./modules/json/json.module";
import { LoggerModule } from "./modules/logger/logger.module";
import { MarkdownModule } from "./modules/markdown/markdown.module";
import { PythonModule } from "./modules/python/python.module";
import { TypescriptModule } from "./modules/typescript/typescript.module";
import { WritingModule } from "./modules/writing/writing.module";

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
    DiscoveryModule,
    JsonModule,
    MarkdownModule,
    PythonModule,
    TypescriptModule,
    WritingModule,
  ],
})
export class MainModule {}
