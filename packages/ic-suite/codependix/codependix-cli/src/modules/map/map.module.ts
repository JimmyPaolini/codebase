import { BoundaryCheckModule, RunContextModule } from "@codependix/boundaries";
import {
  ConfigurationModule,
  InputModule,
  RunPlanModule,
} from "@codependix/configuration";
import {
  CombinedOutputModule,
  GraphRunModule,
  ReportingModule,
} from "@codependix/output";
import { Module } from "@nestjs/common";

import { MapCommand } from "./map.command";

/** Wires the codependix CLI command together with its collaborators. */
@Module({
  controllers: [],
  exports: [MapCommand],
  imports: [
    BoundaryCheckModule,
    CombinedOutputModule,
    ConfigurationModule,
    GraphRunModule,
    InputModule,
    ReportingModule,
    RunContextModule,
    RunPlanModule,
  ],
  providers: [MapCommand],
})
export class MapModule {}
