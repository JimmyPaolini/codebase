import { Module } from "@nestjs/common";

import { SizeAnalysisService } from "./size-analysis.service";

/**
 * NestJS module that measures the compressed size of a target's files.
 */
@Module({
  controllers: [],
  exports: [SizeAnalysisService],
  imports: [],
  providers: [SizeAnalysisService],
})
export class SizeAnalysisModule {}
