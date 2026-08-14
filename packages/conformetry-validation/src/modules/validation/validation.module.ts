import { DiscoveryModule } from "@jimmypaolini/conformetry-configuration";
import {
  LanguageModule,
  ReportingModule,
} from "@jimmypaolini/conformetry-core";
import { FilesModule } from "@jimmypaolini/conformetry-files";
import { Module } from "@nestjs/common";

import { ValidationDeduplicationService } from "./validation-deduplication.service";
import { ValidationFindingsService } from "./validation-findings.service";
import { ValidationLanguagesService } from "./validation-languages.service";
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
    DiscoveryModule,
    FilesModule,
    LanguageModule,
    ReportingModule,
    ValidationDeduplicationService,
    ValidationFindingsService,
    ValidationLanguagesService,
    ValidationService,
  ],
  imports: [DiscoveryModule, FilesModule, LanguageModule, ReportingModule],
  providers: [
    ValidationDeduplicationService,
    ValidationFindingsService,
    ValidationLanguagesService,
    ValidationService,
  ],
})
export class ValidationModule {}
