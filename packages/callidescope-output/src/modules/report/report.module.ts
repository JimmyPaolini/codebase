import { Module } from "@nestjs/common";

import { MarkdownReportService } from "./markdown-report.service";
import { MermaidReportService } from "./mermaid-report.service";
import { ReportService } from "./report.service";

/**
 * Provides the terminal rendering of one run's findings.
 */
@Module({
  controllers: [],
  exports: [MarkdownReportService, MermaidReportService, ReportService],
  imports: [],
  providers: [MarkdownReportService, MermaidReportService, ReportService],
})
export class ReportModule {}
