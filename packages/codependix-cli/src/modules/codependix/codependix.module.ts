import { ConfigurationModule } from "@codependix/configuration";
import { TypescriptModule } from "@codependix/imports";
import { ModuleGraphModule, NestjsProjectModule } from "@codependix/nestjs";
import { NeighborhoodModule, WorkspaceGraphModule } from "@codependix/nx";
import { Module } from "@nestjs/common";

import { DeliveryModule } from "../delivery/delivery.module";
import { PythonImportsModule } from "../python-imports/python-imports.module";

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
    PythonImportsModule,
    TypescriptModule,
    WorkspaceGraphModule,
  ],
  providers: [CodependixCommand, CodependixService],
})
export class CodependixModule {}
