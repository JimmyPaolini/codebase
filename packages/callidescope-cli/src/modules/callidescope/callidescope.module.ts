import { ConfigurationModule } from "@callidescope/configuration";
import {
  CallablesModule,
  ClassHierarchyModule,
  CohesionModule,
  EdgesModule,
  EntryPointsModule,
  GraphModule,
  ProgramModule,
  WorkspaceModule,
} from "@callidescope/graph";
import {
  OutputJsonModule,
  OutputMarkdownModule,
  ProjectReportsModule,
  ReportModule,
} from "@callidescope/output";
import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logger";

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
