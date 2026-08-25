import { ConfigurationModule } from "@codometer/configuration";
import { CustomizationModule } from "@codometer/customization";
import { DiscoveryModule, TargetsModule } from "@codometer/discovery";
import { LanguagesModule } from "@codometer/languages";
import { JsonModule, MarkdownModule } from "@codometer/output";
import { SizeModule } from "@codometer/size";
import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logger";

import { LimitsModule } from "../limits/limits.module";
import { ReportModule } from "../report/report.module";

import { CodometerCommand } from "./codometer.command";
import { CodometerService } from "./codometer.service";
import { DeliveryService } from "./delivery.service";
import { DocumentationReportService } from "./documentation-report.service";
import { RunPlanService } from "./run-plan.service";

/**
 * NestJS module that wires the codometer command and measurement services.
 */
@Module({
  controllers: [],
  exports: [
    CodometerCommand,
    CodometerService,
    DeliveryService,
    DocumentationReportService,
    RunPlanService,
  ],
  imports: [
    ConfigurationModule,
    CustomizationModule,
    DiscoveryModule,
    LanguagesModule,
    LimitsModule,
    LoggerModule,
    JsonModule,
    MarkdownModule,
    ReportModule,
    SizeModule,
    TargetsModule,
  ],
  providers: [
    CodometerCommand,
    CodometerService,
    DeliveryService,
    DocumentationReportService,
    RunPlanService,
  ],
})
export class CodometerModule {}
