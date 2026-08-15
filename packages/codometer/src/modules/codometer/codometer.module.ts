import { Module } from "@nestjs/common";

import { DiscoverFilesModule } from "../discover-files/discover-files.module";
import { LoggerModule } from "../logger/logger.module";
import { MeasureJsonModule } from "../measure-json/measure-json.module";
import { MeasurePythonModule } from "../measure-python/measure-python.module";
import { MeasureTypescriptModule } from "../measure-typescript/measure-typescript.module";
import { WriteReadmeModule } from "../write-readme/write-readme.module";

import { CodometerCommand } from "./codometer.command";
import { CodometerService } from "./codometer.service";

/**
 * NestJS module that wires the codometer command and measurement services.
 */
@Module({
  controllers: [],
  exports: [CodometerCommand, CodometerService],
  imports: [
    DiscoverFilesModule,
    LoggerModule,
    MeasureJsonModule,
    MeasurePythonModule,
    MeasureTypescriptModule,
    WriteReadmeModule,
  ],
  providers: [CodometerCommand, CodometerService],
})
export class CodometerModule {}
