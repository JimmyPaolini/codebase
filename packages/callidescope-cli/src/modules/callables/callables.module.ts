import { Module } from "@nestjs/common";

import { ProgramModule } from "../program/program.module";
import { WorkspaceModule } from "../workspace/workspace.module";

import { CallableIdentityService } from "./callable-identity.service";
import { CallablesService } from "./callables.service";

/**
 * Provides discovery and naming of every callable in the workspace.
 */
@Module({
  controllers: [],
  exports: [CallableIdentityService, CallablesService],
  imports: [ProgramModule, WorkspaceModule],
  providers: [CallableIdentityService, CallablesService],
})
export class CallablesModule {}
