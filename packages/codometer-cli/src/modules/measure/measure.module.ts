import { ConfigurationModule, InputModule } from "@codometer/configuration";
import { CustomizationModule } from "@codometer/customization";
import { DiscoveryModule, TargetsModule } from "@codometer/discovery";
import { LanguagesModule } from "@codometer/languages";
import { SizeModule } from "@codometer/size";
import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logger";

import { DeliveryModule } from "../delivery/delivery.module";
import { LimitsModule } from "../limits/limits.module";
import { ReportModule } from "../report/report.module";
import { RunPlanModule } from "../run-plan/run-plan.module";

import { MeasureCommand } from "./measure.command";
import { MeasureService } from "./measure.service";

/**
 * NestJS module that wires the measure command and its measurement services.
 */
@Module({
  controllers: [],
  exports: [MeasureCommand, MeasureService],
  imports: [
    ConfigurationModule,
    CustomizationModule,
    DeliveryModule,
    DiscoveryModule,
    InputModule,
    LanguagesModule,
    LimitsModule,
    LoggerModule,
    ReportModule,
    RunPlanModule,
    SizeModule,
    TargetsModule,
  ],
  providers: [MeasureCommand, MeasureService],
})
export class MeasureModule {}
