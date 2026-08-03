import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DiscoveryModule } from "@nestjs/core";

import { environmentSchema } from "./constants";
import { CodometerModule } from "./modules/codometer/codometer.module";
import { DiscoverFilesModule } from "./modules/discover-files/discover-files.module";
import { LoggerModule } from "./modules/logger/logger.module";
import { MeasureMarkdownModule } from "./modules/measure-markdown/measure-markdown.module";
import { MeasurePythonModule } from "./modules/measure-python/measure-python.module";
import { MeasureTypescriptModule } from "./modules/measure-typescript/measure-typescript.module";
import { WriteReadmeModule } from "./modules/write-readme/write-readme.module";

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
    CodometerModule,
    DiscoverFilesModule,
    MeasureMarkdownModule,
    MeasurePythonModule,
    MeasureTypescriptModule,
    WriteReadmeModule,
  ],
})
export class MainModule {}
