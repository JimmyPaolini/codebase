import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logger";

import { SizeAnalysisService } from "./size-analysis.service";

/**
 * NestJS module that measures the compressed size of a target's files.
 */
@Module({
  controllers: [],
  exports: [SizeAnalysisService],
  imports: [LoggerModule],
  providers: [SizeAnalysisService],
})
export class SizeAnalysisModule {}
