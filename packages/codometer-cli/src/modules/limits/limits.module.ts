import { Module } from "@nestjs/common";

import { LimitsService } from "./limits.service";

/**
 * NestJS module that holds measured metrics to their declared limits.
 */
@Module({
  controllers: [],
  exports: [LimitsService],
  imports: [],
  providers: [LimitsService],
})
export class LimitsModule {}
