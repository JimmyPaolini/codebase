import { ConfigurationModule } from "@codependix/configuration";
import {
  ImportGraphModule,
  TypescriptProjectModule,
} from "@codependix/imports";
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
    ImportGraphModule,
    ModuleGraphModule,
    NeighborhoodModule,
    NestjsProjectModule,
    PythonImportsModule,
    TypescriptProjectModule,
    WorkspaceGraphModule,
  ],
  providers: [CodependixCommand, CodependixService],
})
export class CodependixModule {}
