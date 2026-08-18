import { Module } from "@nestjs/common";

import { MarkdownReportService } from "./markdown-report.service";
import { ReportService } from "./report.service";

/**
 * Provides the terminal rendering of one run's findings.
 */
@Module({
  controllers: [],
  exports: [MarkdownReportService, ReportService],
  imports: [],
  providers: [MarkdownReportService, ReportService],
})
export class ReportModule {}
