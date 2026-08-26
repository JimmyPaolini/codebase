import { ConfigurationModule } from "@codometer/configuration";
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
    CustomizationModule,
    DeliveryModule,
    DiscoveryModule,
    LanguagesModule,
    LimitsModule,
    LoggerModule,
    ReportModule,
    RunPlanModule,
    SizeModule,
    TargetsModule,
  ],
  providers: [CodometerCommand, CodometerService],
})
export class CodometerModule {}
