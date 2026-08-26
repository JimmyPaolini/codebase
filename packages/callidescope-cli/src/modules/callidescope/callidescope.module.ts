import { ConfigurationModule, InputModule } from "@callidescope/configuration";
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

import { RunPlanModule } from "../run-plan/run-plan.module";

import { CallidescopeCommand } from "./callidescope.command";
import { CallidescopeService } from "./callidescope.service";

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
    InputModule,
    LoggerModule,
    OutputJsonModule,
    OutputMarkdownModule,
    ProgramModule,
    ProjectReportsModule,
    ReportModule,
    RunPlanModule,
    WorkspaceModule,
  ],
  providers: [CallidescopeCommand, CallidescopeService],
})
export class CallidescopeModule {}
