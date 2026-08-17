import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logger";

import { SynchronizationMarkersService } from "../synchronization/synchronization-markers.service";
import { SynchronizationService } from "../synchronization/synchronization.service";

import { NestjsModuleGraphsGraphService } from "./nestjs-module-graphs-graph.service";
import { NestjsModuleGraphsCommand } from "./nestjs-module-graphs.command";
import { NestjsModuleGraphsService } from "./nestjs-module-graphs.service";

/**
 * Owns the NestJS module graph embedded in each project's markdown files.
 */
@Module({
  controllers: [],
  exports: [NestjsModuleGraphsCommand, NestjsModuleGraphsService],
  imports: [LoggerModule],
  providers: [
    NestjsModuleGraphsCommand,
    NestjsModuleGraphsGraphService,
    SynchronizationMarkersService,
    NestjsModuleGraphsService,
    SynchronizationService,
  ],
})
export class NestjsModuleGraphsModule {}
