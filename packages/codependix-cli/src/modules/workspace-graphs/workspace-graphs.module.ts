import { ConfigurationModule } from "@codependix/configuration";
import {
  FileImportsWorkspaceGraphModule,
  PythonModule,
  TypescriptModule,
} from "@codependix/file-imports";
import {
  ModuleGraphModule,
  NestjsModulesWorkspaceGraphModule,
  NestjsProjectModule,
} from "@codependix/nestjs-modules";
import { Module } from "@nestjs/common";

import { DeliveryModule } from "../delivery/delivery.module";

import { WorkspaceGraphsService } from "./workspace-graphs.service";

/** Provides the whole-workspace file-imports and NestJS module graph passes. */
@Module({
  controllers: [],
  exports: [WorkspaceGraphsService],
  imports: [
    ConfigurationModule,
    DeliveryModule,
    FileImportsWorkspaceGraphModule,
    ModuleGraphModule,
    NestjsModulesWorkspaceGraphModule,
    NestjsProjectModule,
    PythonModule,
    TypescriptModule,
  ],
  providers: [WorkspaceGraphsService],
})
export class WorkspaceGraphsModule {}
