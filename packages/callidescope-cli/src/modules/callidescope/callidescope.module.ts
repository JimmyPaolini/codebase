import { ConfigurationModule } from "@callidescope/configuration";
import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logger";

import { CallablesModule } from "../callables/callables.module";
import { ClassHierarchyModule } from "../class-hierarchy/class-hierarchy.module";
import { CohesionModule } from "../cohesion/cohesion.module";
import { EdgesModule } from "../edges/edges.module";
import { EntryPointsModule } from "../entry-points/entry-points.module";
import { GraphModule } from "../graph/graph.module";
import { OutputJsonModule } from "../output-json/output-json.module";
import { OutputMarkdownModule } from "../output-markdown/output-markdown.module";
import { ProgramModule } from "../program/program.module";
import { ProjectReportsModule } from "../project-reports/project-reports.module";
import { ReportModule } from "../report/report.module";
import { WorkspaceModule } from "../workspace/workspace.module";

import { CallidescopeCommand } from "./callidescope.command";
import { CallidescopeService } from "./callidescope.service";
import { GraphAssemblyService } from "./graph-assembly.service";
import { RunPlanService } from "./run-plan.service";

/**
 * NestJS module that wires the callidescope command and its analysis services.
 */
@Module({
  controllers: [],
  exports: [CallidescopeCommand, CallidescopeService],
  imports: [
    CallablesModule,
    CohesionModule,
    ConfigurationModule,
    EdgesModule,
    EntryPointsModule,
    GraphModule,
    ClassHierarchyModule,
    LoggerModule,
    OutputJsonModule,
    OutputMarkdownModule,
    ProgramModule,
    ProjectReportsModule,
    ReportModule,
    WorkspaceModule,
  ],
  providers: [
    CallidescopeCommand,
    CallidescopeService,
    GraphAssemblyService,
    RunPlanService,
  ],
})
export class CallidescopeModule {}
