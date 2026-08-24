import { ConfigurationModule } from "@codometer/configuration";
import { CustomStatisticsModule } from "@codometer/custom-statistics";
import { FileDiscoveryModule } from "@codometer/file-discovery";
import { LanguagesModule } from "@codometer/languages";
import { OutputJsonModule, OutputMarkdownModule } from "@codometer/output";
import { SizeAnalysisModule } from "@codometer/size-analysis";
import { TargetsModule } from "@codometer/targets";
import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logger";

import { LimitsModule } from "../limits/limits.module";
import { ReportModule } from "../report/report.module";

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
