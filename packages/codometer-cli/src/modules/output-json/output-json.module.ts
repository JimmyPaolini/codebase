import { Module } from "@nestjs/common";

import { OutputJsonService } from "./output-json.service";

/**
 * NestJS module that provides JSON statistics report writing.
 */
@Module({
  controllers: [],
  exports: [OutputJsonService],
  imports: [],
  providers: [OutputJsonService],
})
export class OutputJsonModule {}
