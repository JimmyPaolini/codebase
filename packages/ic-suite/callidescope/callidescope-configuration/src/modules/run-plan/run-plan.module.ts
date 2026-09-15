import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logger";

import { ConfigurationModule } from "../configuration/configuration.module";
import { FlagResolutionModule } from "../flag-resolution/flag-resolution.module";

import { RunPlanService } from "./run-plan.service";

/**
 * NestJS module that wires how the command line and configuration resolve
 * into what a run does.
 */
@Module({
  controllers: [],
  exports: [RunPlanService],
  imports: [ConfigurationModule, FlagResolutionModule, LoggerModule],
  providers: [RunPlanService],
})
export class RunPlanModule {}
