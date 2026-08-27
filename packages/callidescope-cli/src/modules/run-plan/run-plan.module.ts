import { ConfigurationModule } from "@callidescope/configuration";
import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logger";

import { RunPlanService } from "./run-plan.service";

/**
 * NestJS module that wires how the command line and configuration resolve
 * into what a run does.
 */
@Module({
  controllers: [],
  exports: [RunPlanService],
  imports: [ConfigurationModule, LoggerModule],
  providers: [RunPlanService],
})
export class RunPlanModule {}
