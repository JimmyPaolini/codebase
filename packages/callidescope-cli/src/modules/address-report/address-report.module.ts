import { ReportModule } from "@callidescope/output";
import { Module } from "@nestjs/common";

import { AddressReportService } from "./address-report.service";

/**
 * NestJS module that wires `depth` and `breadth`'s terminal rendering.
 */
@Module({
  controllers: [],
  exports: [AddressReportService],
  imports: [ReportModule],
  providers: [AddressReportService],
})
export class AddressReportModule {}
