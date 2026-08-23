import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logger";

import { OutputJsonService } from "./output-json.service";

/**
 * Provides the machine-readable JSON report destination.
 */
@Module({
  controllers: [],
  exports: [OutputJsonService],
  imports: [LoggerModule],
  providers: [OutputJsonService],
})
export class OutputJsonModule {}
