import { ScoringModule } from "@conformetry/core";
import { Module } from "@nestjs/common";

import { JsonComparisonService } from "./json-comparison.service";
import { JsonValidatorService } from "./json-validator.service";

/**
 * Provides the JSON language validator.
 *
 * `JsonComparisonService` is exported as well, because notebooks are JSON
 * documents and `conformetry-jupyter` reuses the same structural walk.
 */
@Module({
  controllers: [],
  exports: [JsonComparisonService, JsonValidatorService],
  imports: [ScoringModule],
  providers: [JsonComparisonService, JsonValidatorService],
})
export class JsonValidatorModule {}
