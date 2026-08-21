import { ConfigurationModule } from "@codometer/configuration";
import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logger";

import { CustomStatisticsModule } from "../custom-statistics/custom-statistics.module";
import { FileDiscoveryModule } from "../file-discovery/file-discovery.module";
import { LanguagesModule } from "../languages/languages.module";
import { LimitsModule } from "../limits/limits.module";
import { OutputJsonModule } from "../output-json/output-json.module";
import { OutputMarkdownModule } from "../output-markdown/output-markdown.module";
import { ReportModule } from "../report/report.module";
import { SizeAnalysisModule } from "../size-analysis/size-analysis.module";
import { TargetsModule } from "../targets/targets.module";

import { CodometerCommand } from "./codometer.command";
import { CodometerService } from "./codometer.service";
import { RunPlanService } from "./run-plan.service";

/**
 * NestJS module that wires the codometer command and measurement services.
 */
@Module({
  controllers: [],
  exports: [CodometerCommand, CodometerService, RunPlanService],
  imports: [
    ConfigurationModule,
    CustomStatisticsModule,
    FileDiscoveryModule,
    LanguagesModule,
    LimitsModule,
    LoggerModule,
    OutputJsonModule,
    OutputMarkdownModule,
    ReportModule,
    SizeAnalysisModule,
    TargetsModule,
  ],
  providers: [CodometerCommand, CodometerService, RunPlanService],
})
export class CodometerModule {}
