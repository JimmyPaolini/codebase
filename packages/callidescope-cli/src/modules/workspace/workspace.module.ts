import { Module } from "@nestjs/common";

import { WorkspaceService } from "./workspace.service";

/**
 * Provides project discovery, module identity, and file exclusion.
 */
@Module({
  controllers: [],
  exports: [WorkspaceService],
  imports: [],
  providers: [WorkspaceService],
})
export class WorkspaceModule {}
