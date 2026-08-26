import { Module } from "@nestjs/common";

import { RunPlanService } from "./run-plan.service";

/**
 * NestJS module that reads a command line into what a run does and where its
 * output goes.
 */
@Module({
  controllers: [],
  exports: [RunPlanService],
  imports: [],
  providers: [RunPlanService],
})
export class RunPlanModule {}
