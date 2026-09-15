import {
  ConfigurationModule,
  InputModule,
  RunPlanModule,
} from "@callidescope/configuration";
import {
  CallablesModule,
  ClassesModule,
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
  ReportFindingsModule,
  ReportModule,
  WriteDestinationsModule,
} from "@callidescope/output";
import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logger";

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
    ReportFindingsModule,
    ReportModule,
    RunPlanModule,
    WorkspaceModule,
    WriteDestinationsModule,
  ],
  providers: [CallidescopeCommand, CallidescopeService],
})
export class CallidescopeModule {}
