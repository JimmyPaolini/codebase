import { Module } from "@nestjs/common";

import { TypescriptAnalysisService } from "./typescript-analysis.service";

/**
 * TODO: Document the typescriptAnalysis module.
 */
@Module({
  controllers: [],
  exports: [TypescriptAnalysisService],
  imports: [],
  providers: [TypescriptAnalysisService],
})
export class TypescriptAnalysisModule {}
