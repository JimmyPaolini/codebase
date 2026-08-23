import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logger";

import { EntryPointsService } from "./entry-points.service";

/**
 * Provides the rules deciding which callables root a call stack.
 */
@Module({
  controllers: [],
  exports: [EntryPointsService],
  imports: [LoggerModule],
  providers: [EntryPointsService],
})
export class EntryPointsModule {}
