import { Module } from "@nestjs/common";

import { WritingService } from "./writing.service";

/**
 * NestJS module that provides README badge writing tooling.
 */
@Module({
  controllers: [],
  exports: [WritingService],
  imports: [],
  providers: [WritingService],
})
export class WritingModule {}
