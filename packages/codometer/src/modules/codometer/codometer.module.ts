import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logger";

import { DiscoveryModule } from "../discovery/discovery.module";
import { JsonModule } from "../json/json.module";
import { MarkdownModule } from "../markdown/markdown.module";
import { PythonModule } from "../python/python.module";
import { TypescriptModule } from "../typescript/typescript.module";
import { WritingModule } from "../writing/writing.module";

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
    MarkdownModule,
    PythonModule,
    TypescriptModule,
    WritingModule,
  ],
  providers: [CodometerCommand, CodometerService],
})
export class CodometerModule {}
