import { NeighborhoodModule, WorkspaceGraphModule } from "@codependix/nx";
import { Module } from "@nestjs/common";

import { NxGraphsService } from "./nx-graphs.service";

/** Provides the Nx Neighborhood and Workspace Graph examples. */
@Module({
  controllers: [],
  exports: [NxGraphsService],
  imports: [NeighborhoodModule, WorkspaceGraphModule],
  providers: [NxGraphsService],
})
export class NxGraphsModule {}
