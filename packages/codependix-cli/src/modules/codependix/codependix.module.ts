import { ConfigurationModule } from "@codependix/configuration";
import { NeighborhoodModule, WorkspaceGraphModule } from "@codependix/nx";
import { Module } from "@nestjs/common";

import { AnchorsModule } from "../anchors/anchors.module";

import { CodependixCommand } from "./codependix.command";
import { CodependixService } from "./codependix.service";

/** Wires the codependix CLI command together with its collaborators. */
@Module({
  controllers: [],
  exports: [CodependixCommand, CodependixService],
  imports: [
    AnchorsModule,
    ConfigurationModule,
    NeighborhoodModule,
    WorkspaceGraphModule,
  ],
  providers: [CodependixCommand, CodependixService],
})
export class CodependixModule {}
