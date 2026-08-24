import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logger";

import { OutputJsonService } from "./output-json.service";

/**
 * NestJS module that provides JSON statistics report writing.
 */
@Module({
  controllers: [],
  exports: [OutputJsonService],
  imports: [LoggerModule],
  providers: [OutputJsonService],
})
export class OutputJsonModule {}
