import { Module } from "@nestjs/common";

import { EntryPointsService } from "./entry-points.service";

/**
 * Provides the rules deciding which callables root a call stack.
 */
@Module({
  controllers: [],
  exports: [EntryPointsService],
  imports: [],
  providers: [EntryPointsService],
})
export class EntryPointsModule {}
