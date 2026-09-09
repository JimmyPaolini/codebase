import {
  OutputJsonModule,
  OutputMarkdownModule,
  ReportModule,
} from "@callidescope/output";
import { Module } from "@nestjs/common";

import { WriteDestinationsService } from "./write-destinations.service";

/**
 * NestJS module that wires the service writing a run to its destinations.
 */
@Module({
  controllers: [],
  exports: [WriteDestinationsService],
  imports: [OutputJsonModule, OutputMarkdownModule, ReportModule],
  providers: [WriteDestinationsService],
})
export class WriteDestinationsModule {}
