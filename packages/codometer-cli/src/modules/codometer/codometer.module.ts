import { ConfigurationModule } from "@codometer/configuration";
import { Module } from "@nestjs/common";

import { DiscoveryModule } from "../discovery/discovery.module";
import { JsonModule } from "../json/json.module";
import { LoggerModule } from "../logger/logger.module";
import { MarkdownModule } from "../markdown/markdown.module";
import { OutputJsonModule } from "../output-json/output-json.module";
import { OutputMarkdownModule } from "../output-markdown/output-markdown.module";
import { PythonModule } from "../python/python.module";
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
    ConfigurationModule,
    DiscoveryModule,
    LoggerModule,
    JsonModule,
    MarkdownModule,
    OutputJsonModule,
    OutputMarkdownModule,
    PythonModule,
    TypescriptModule,
  ],
  providers: [CodometerCommand, CodometerService],
})
export class CodometerModule {}
