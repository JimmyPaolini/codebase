import { Module } from "@nestjs/common";

import { CustomStatisticsService } from "./custom-statistics.service";

/**
 * NestJS module that provides the configured file-name counters.
 */
@Module({
  controllers: [],
  exports: [CustomStatisticsService],
  imports: [],
  providers: [CustomStatisticsService],
})
export class CustomStatisticsModule {}
