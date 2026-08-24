import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logger";

import { TargetsService } from "./targets.service";

/**
 * NestJS module that lists the files each declared target holds.
 */
@Module({
  controllers: [],
  exports: [TargetsService],
  imports: [LoggerModule],
  providers: [TargetsService],
})
export class TargetsModule {}
