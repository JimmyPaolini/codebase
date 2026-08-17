import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logger";

import { SynchronizationService } from "../synchronization/synchronization.service";

import { NestjsModuleGraphsMarkersService } from "./nestjs-module-graphs-markers.service";
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
    NestjsModuleGraphsMarkersService,
    NestjsModuleGraphsService,
    SynchronizationService,
  ],
})
export class NestjsModuleGraphsModule {}
