import { Module } from "@nestjs/common";

import { ReportService } from "./report.service";

/**
 * Provides the terminal rendering of one run's findings.
 */
@Module({
  controllers: [],
  exports: [ReportService],
  imports: [],
  providers: [ReportService],
})
export class ReportModule {}
