import { InputModule } from "@codependix/configuration";
import { Module } from "@nestjs/common";

import { RunPlanService } from "./run-plan.service";

/** Wires command-line reading together with the input service it prompts through. */
@Module({
  controllers: [],
  exports: [RunPlanService],
  imports: [InputModule],
  providers: [RunPlanService],
})
export class RunPlanModule {}
