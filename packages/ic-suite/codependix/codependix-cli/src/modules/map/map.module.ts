import { BoundaryCheckModule } from "@codependix/boundaries";
import { ConfigurationModule, InputModule } from "@codependix/configuration";
import { NeighborhoodModule } from "@codependix/nx-projects";
import { Module } from "@nestjs/common";

import { CombinedOutputModule } from "../combined-output/combined-output.module";
import { ProjectGraphsModule } from "../project-graphs/project-graphs.module";
import { PythonImportsModule } from "../python-imports/python-imports.module";
import { ReportingModule } from "../reporting/reporting.module";
import { RunContextModule } from "../run-context/run-context.module";
import { RunPlanModule } from "../run-plan/run-plan.module";
import { WorkspaceGraphsModule } from "../workspace-graphs/workspace-graphs.module";

import { MapCommand } from "./map.command";
import { MapService } from "./map.service";

/** Wires the codependix CLI command together with its collaborators. */
@Module({
  controllers: [],
  exports: [MapCommand, MapService],
  imports: [
    BoundaryCheckModule,
    CombinedOutputModule,
    ConfigurationModule,
    InputModule,
    NeighborhoodModule,
    ProjectGraphsModule,
    PythonImportsModule,
    ReportingModule,
    RunContextModule,
    RunPlanModule,
    WorkspaceGraphsModule,
  ],
  providers: [MapCommand, MapService],
})
export class MapModule {}
