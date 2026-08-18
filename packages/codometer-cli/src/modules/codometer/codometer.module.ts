import { ConfigurationModule } from "@codometer/configuration";
import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logger";

import { CustomStatisticsModule } from "../custom-statistics/custom-statistics.module";
import { FileDiscoveryModule } from "../file-discovery/file-discovery.module";
import { LanguagesModule } from "../languages/languages.module";
import { OutputJsonModule } from "../output-json/output-json.module";
import { OutputMarkdownModule } from "../output-markdown/output-markdown.module";

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
    CustomStatisticsModule,
    FileDiscoveryModule,
    LanguagesModule,
    LoggerModule,
    OutputJsonModule,
    OutputMarkdownModule,
  ],
  providers: [CodometerCommand, CodometerService],
})
export class CodometerModule {}
