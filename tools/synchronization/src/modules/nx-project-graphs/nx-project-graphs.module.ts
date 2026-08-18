import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logger";

import { SynchronizationMarkersService } from "../synchronization/synchronization-markers.service";
import { SynchronizationService } from "../synchronization/synchronization.service";

import { NxProjectGraphsCommand } from "./nx-project-graphs.command";
import { NxProjectGraphsService } from "./nx-project-graphs.service";

/**
 * Owns the Nx project graph embedded in each project's README.
 */
@Module({
  controllers: [],
  exports: [NxProjectGraphsCommand, NxProjectGraphsService],
  imports: [LoggerModule],
  providers: [
    NxProjectGraphsCommand,
    NxProjectGraphsService,
    SynchronizationMarkersService,
    SynchronizationService,
  ],
})
export class NxProjectGraphsModule {}
