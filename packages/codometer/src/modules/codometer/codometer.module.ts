import { Module } from "@nestjs/common";

import { DiscoveryModule } from "../discovery/discovery.module";
import { JsonModule } from "../json/json.module";
import { LoggerModule } from "../logger/logger.module";
import { PythonModule } from "../python/python.module";
import { ReadmeModule } from "../readme/readme.module";
import { TypescriptModule } from "../typescript/typescript.module";

import { CodometerCommand } from "./codometer.command";
import { CodometerService } from "./codometer.service";

/**
 * NestJS module that wires the codometer command and measurement services.
 */
@Module({
  controllers: [],
  exports: [CodometerCommand, CodometerService],
  imports: [
    DiscoveryModule,
    LoggerModule,
    JsonModule,
    PythonModule,
    TypescriptModule,
    ReadmeModule,
  ],
  providers: [CodometerCommand, CodometerService],
})
export class CodometerModule {}
