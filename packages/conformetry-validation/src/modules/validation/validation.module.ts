import { TemplateDiscoveryModule } from "@conformetry/configuration";
import {
  LanguageModule,
  ReportingModule,
  ScoringModule,
} from "@conformetry/core";
import { FilesModule } from "@conformetry/files";
import { Module } from "@nestjs/common";

import { ValidationDeduplicationService } from "./validation-deduplication.service";
import { ValidationFindingsService } from "./validation-findings.service";
import { ValidationLanguagesService } from "./validation-languages.service";
import { ValidationScoringService } from "./validation-scoring.service";
import { ValidationService } from "./validation.service";

/**
 * Orchestrates a validation run across the language validators it is given.
 *
 * No language package is imported here. The caller decides which languages it
 * has installed and passes their validators to `validate`, so a consumer that
 * only checks TypeScript never pulls in the rest.
 */
@Module({
  controllers: [],
  exports: [
    TemplateDiscoveryModule,
    FilesModule,
    LanguageModule,
    ReportingModule,
    ScoringModule,
    ValidationDeduplicationService,
    ValidationFindingsService,
    ValidationLanguagesService,
    ValidationScoringService,
    ValidationService,
  ],
  imports: [
    TemplateDiscoveryModule,
    FilesModule,
    LanguageModule,
    ReportingModule,
    ScoringModule,
  ],
  providers: [
    ValidationDeduplicationService,
    ValidationFindingsService,
    ValidationLanguagesService,
    ValidationScoringService,
    ValidationService,
  ],
})
export class ValidationModule {}
