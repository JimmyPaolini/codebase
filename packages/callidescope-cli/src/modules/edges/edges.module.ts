import { Module } from "@nestjs/common";

import { CallablesModule } from "../callables/callables.module";
import { ClassHierarchyModule } from "../class-hierarchy/class-hierarchy.module";
import { ProgramModule } from "../program/program.module";
import { WorkspaceModule } from "../workspace/workspace.module";

import { CallSitesService } from "./call-sites.service";
import { EdgesService } from "./edges.service";
import { SymbolResolutionService } from "./symbol-resolution.service";

/**
 * Provides call-site discovery and resolution into call-graph edges.
 */
@Module({
  controllers: [],
  exports: [CallSitesService, EdgesService, SymbolResolutionService],
  imports: [
    CallablesModule,
    ClassHierarchyModule,
    ProgramModule,
    WorkspaceModule,
  ],
  providers: [CallSitesService, EdgesService, SymbolResolutionService],
})
export class EdgesModule {}
