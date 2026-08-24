import { ConfigurationModule } from "@codependix/configuration";
import { ModuleGraphModule, NestjsProjectModule } from "@codependix/nestjs";
import { NeighborhoodModule, WorkspaceGraphModule } from "@codependix/nx";
import { Module } from "@nestjs/common";

import { DeliveryModule } from "../delivery/delivery.module";

import { CodependixCommand } from "./codependix.command";
import { CodependixService } from "./codependix.service";

/** Wires the codependix CLI command together with its collaborators. */
@Module({
  controllers: [],
  exports: [CodependixCommand, CodependixService],
  imports: [
    ConfigurationModule,
    DeliveryModule,
    ModuleGraphModule,
    NeighborhoodModule,
    NestjsProjectModule,
    WorkspaceGraphModule,
  ],
  providers: [CodependixCommand, CodependixService],
})
export class CodependixModule {}
