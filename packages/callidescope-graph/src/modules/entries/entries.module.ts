import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logger";

import { EntriesService } from "./entries.service";

/**
 * Provides the rules deciding which callables root a call stack.
 */
@Module({
  controllers: [],
  exports: [EntriesService],
  imports: [LoggerModule],
  providers: [EntriesService],
})
export class EntriesModule {}
