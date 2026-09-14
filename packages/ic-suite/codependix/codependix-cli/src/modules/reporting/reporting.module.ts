import { BoundaryCheckModule } from "@codependix/boundaries";
import { Module } from "@nestjs/common";

import { ReportingService } from "./reporting.service";

/** Provides `MapCommand`'s findings-logging and pass/fail-weighing pass. */
@Module({
  controllers: [],
  exports: [ReportingService],
  imports: [BoundaryCheckModule],
  providers: [ReportingService],
})
export class ReportingModule {}
