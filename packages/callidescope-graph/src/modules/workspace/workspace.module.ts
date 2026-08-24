import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logger";

import { WorkspaceService } from "./workspace.service";

/**
 * Provides project discovery, module identity, and file exclusion.
 */
@Module({
  controllers: [],
  exports: [WorkspaceService],
  imports: [LoggerModule],
  providers: [WorkspaceService],
})
export class WorkspaceModule {}
