import { ConfigurationModule } from "@callidescope/configuration";
import {
  CallablesModule,
  ClassesModule,
  CohesionModule,
  EdgesModule,
  EntriesModule,
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

import { AddressLookupService } from "./address-lookup.service";
import { AddressReportService } from "./address-report.service";
import { BreadthCommand } from "./breadth.command";
import { CallidescopeCommand } from "./callidescope.command";
import { CallidescopeService } from "./callidescope.service";
import { DepthCommand } from "./depth.command";
import { GraphAssemblyService } from "./graph-assembly.service";
import { RunPlanService } from "./run-plan.service";
import { TraceOptionParsingService } from "./trace-option-parsing.service";

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
    EntriesModule,
    GraphModule,
    ClassesModule,
    LoggerModule,
    OutputJsonModule,
    OutputMarkdownModule,
    ProgramModule,
    ProjectReportsModule,
    ReportModule,
    WorkspaceModule,
  ],
  providers: [
    AddressLookupService,
    AddressReportService,
    BreadthCommand,
    CallidescopeCommand,
    CallidescopeService,
    DepthCommand,
    GraphAssemblyService,
    RunPlanService,
    TraceOptionParsingService,
  ],
})
export class CallidescopeModule {}
