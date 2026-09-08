import { InstanceDiscoveryModule } from "@conformetry/configuration";
import {
  ReportingModule,
  RunnerModule,
  ScoringModule,
} from "@conformetry/core";
import { FilesModule } from "@conformetry/files";
import { LanguagesModule } from "@conformetry/languages";
import { Module } from "@nestjs/common";

import { ValidationDeduplicationService } from "./validation-deduplication.service";
import { ValidationFindingsService } from "./validation-findings.service";
import { ValidationScoringService } from "./validation-scoring.service";
import { ValidationService } from "./validation.service";

/**
 * Orchestrates a validation run across the languages it resolves.
 *
 * `LanguagesModule` is imported rather than the languages being handed in:
 * every run needs the Fallback, so there was never a run that carried fewer
 * than all of them.
 */
@Module({
  controllers: [],
  exports: [
    InstanceDiscoveryModule,
    FilesModule,
    LanguagesModule,
    RunnerModule,
    ReportingModule,
    ScoringModule,
    ValidationDeduplicationService,
    ValidationFindingsService,
    ValidationScoringService,
    ValidationService,
  ],
  imports: [
    InstanceDiscoveryModule,
    FilesModule,
    LanguagesModule,
    RunnerModule,
    ReportingModule,
    ScoringModule,
  ],
  providers: [
    ValidationDeduplicationService,
    ValidationFindingsService,
    ValidationScoringService,
    ValidationService,
  ],
})
export class ValidationModule {}
