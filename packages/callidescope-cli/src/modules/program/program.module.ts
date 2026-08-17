import { Module } from "@nestjs/common";

import { WorkspaceModule } from "../workspace/workspace.module";

import { CompilerHostService } from "./compiler-host.service";
import { ProgramService } from "./program.service";

/**
 * Provides TypeScript programs and type checkers, one per project.
 */
@Module({
  controllers: [],
  exports: [CompilerHostService, ProgramService],
  imports: [WorkspaceModule],
  providers: [CompilerHostService, ProgramService],
})
export class ProgramModule {}
