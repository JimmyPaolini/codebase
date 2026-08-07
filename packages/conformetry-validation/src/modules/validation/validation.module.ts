import { ConfigurationModule } from "@jimmypaolini/conformetry-configuration";
import { JsonValidatorModule } from "@jimmypaolini/conformetry-json";
import { MarkdownValidatorModule } from "@jimmypaolini/conformetry-markdown";
import { PythonValidatorModule } from "@jimmypaolini/conformetry-python";
import { TextValidatorModule } from "@jimmypaolini/conformetry-text";
import { TypeScriptValidatorModule } from "@jimmypaolini/conformetry-typescript";
import { Module } from "@nestjs/common";

import { ValidationLanguageService } from "./validation-language.service.js";
import { ValidationService } from "./validation.service.js";

/**
 * Provides the validation service.
 */
@Module({
  controllers: [],
  exports: [ValidationLanguageService, ValidationService],
  imports: [
    ConfigurationModule,
    TypeScriptValidatorModule,
    PythonValidatorModule,
    MarkdownValidatorModule,
    JsonValidatorModule,
    TextValidatorModule,
  ],
  providers: [ValidationLanguageService, ValidationService],
})
export class ValidationModule {}
