import { DiscoveryModule } from "@jimmypaolini/conformetry-configuration";
import {
  LanguageModule,
  ReportingModule,
} from "@jimmypaolini/conformetry-core";
import { FilesModule } from "@jimmypaolini/conformetry-files";
import { JsonValidatorModule } from "@jimmypaolini/conformetry-json";
import { JupyterValidatorModule } from "@jimmypaolini/conformetry-jupyter";
import { MarkdownValidatorModule } from "@jimmypaolini/conformetry-markdown";
import { PythonValidatorModule } from "@jimmypaolini/conformetry-python";
import { TextValidatorModule } from "@jimmypaolini/conformetry-text";
import { TypescriptValidatorModule } from "@jimmypaolini/conformetry-typescript";
import { Module } from "@nestjs/common";

import { ValidationDeduplicationService } from "./validation-deduplication.service";
import { ValidationFindingsService } from "./validation-findings.service";
import { ValidationLanguagesService } from "./validation-languages.service";
import { ValidationService } from "./validation.service";

/**
 * Orchestrates a validation run across every registered language validator.
 *
 * This is the only module that knows the full set of languages; each language
 * package knows nothing about the others, and `conformetry-jupyter` composes
 * three of them without going through here.
 */
@Module({
  controllers: [],
  exports: [
    DiscoveryModule,
    FilesModule,
    JsonValidatorModule,
    JupyterValidatorModule,
    LanguageModule,
    MarkdownValidatorModule,
    PythonValidatorModule,
    ReportingModule,
    TextValidatorModule,
    TypescriptValidatorModule,
    ValidationDeduplicationService,
    ValidationFindingsService,
    ValidationLanguagesService,
    ValidationService,
  ],
  imports: [
    DiscoveryModule,
    FilesModule,
    JsonValidatorModule,
    JupyterValidatorModule,
    LanguageModule,
    MarkdownValidatorModule,
    PythonValidatorModule,
    ReportingModule,
    TextValidatorModule,
    TypescriptValidatorModule,
  ],
  providers: [
    ValidationDeduplicationService,
    ValidationFindingsService,
    ValidationLanguagesService,
    ValidationService,
  ],
})
export class ValidationModule {}
