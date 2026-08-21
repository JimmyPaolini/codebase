import { Module } from "@nestjs/common";

import { TargetsService } from "./targets.service";

/**
 * NestJS module that lists the files each declared target holds.
 */
@Module({
  controllers: [],
  exports: [TargetsService],
  imports: [],
  providers: [TargetsService],
})
export class TargetsModule {}
