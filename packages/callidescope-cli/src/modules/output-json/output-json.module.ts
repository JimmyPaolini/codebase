import { Module } from "@nestjs/common";

import { OutputJsonService } from "./output-json.service";

/**
 * Provides the machine-readable JSON report destination.
 */
@Module({
  controllers: [],
  exports: [OutputJsonService],
  imports: [],
  providers: [OutputJsonService],
})
export class OutputJsonModule {}
