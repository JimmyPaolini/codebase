import { CallablesModule } from "@callidescope/graph";
import { Module } from "@nestjs/common";

import { CallidescopeModule } from "../callidescope/callidescope.module";
import { RunPlanModule } from "../run-plan/run-plan.module";

import { AddressLookupService } from "./address-lookup.service";

/**
 * NestJS module that wires `depth` and `breadth`'s shared address resolution.
 */
@Module({
  controllers: [],
  exports: [AddressLookupService],
  imports: [CallablesModule, CallidescopeModule, RunPlanModule],
  providers: [AddressLookupService],
})
export class AddressLookupModule {}
