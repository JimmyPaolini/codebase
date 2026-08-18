import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logger";

import { BundlesModule } from "../bundles/bundles.module";

import { ReportingMarkersService } from "./reporting-markers.service";
import { ReportingCommand } from "./reporting.command";
import { ReportingService } from "./reporting.service";

/**
 * NestJS module holding the shared reporting seams, and the aggregate command
 * that drives every report registered with it.
 */
@Module({
  controllers: [],
  exports: [ReportingCommand, ReportingMarkersService, ReportingService],
  imports: [BundlesModule, LoggerModule],
  providers: [ReportingCommand, ReportingMarkersService, ReportingService],
})
export class ReportingModule {}
