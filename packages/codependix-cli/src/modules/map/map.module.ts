import { BoundaryCheckModule } from "@codependix/boundary-check";
import { ConfigurationModule, InputModule } from "@codependix/configuration";
import { TypescriptModule } from "@codependix/imports";
import { ModuleGraphModule, NestjsProjectModule } from "@codependix/nestjs";
import { NeighborhoodModule, WorkspaceGraphModule } from "@codependix/nx";
import { Module } from "@nestjs/common";

import { DeliveryModule } from "../delivery/delivery.module";
import { PythonImportsModule } from "../python-imports/python-imports.module";
import { RunPlanModule } from "../run-plan/run-plan.module";

import { MapCommand } from "./map.command";
import { MapService } from "./map.service";

/** Wires the codependix CLI command together with its collaborators. */
@Module({
  controllers: [],
  exports: [MapCommand, MapService],
  imports: [
    BoundaryCheckModule,
    ConfigurationModule,
    DeliveryModule,
    InputModule,
    ModuleGraphModule,
    NeighborhoodModule,
    NestjsProjectModule,
    PythonImportsModule,
    RunPlanModule,
    TypescriptModule,
    WorkspaceGraphModule,
  ],
  providers: [MapCommand, MapService],
})
export class MapModule {}
