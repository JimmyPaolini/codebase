import { Module } from "@nestjs/common";

import { JsonValidatorModule } from "@jimmypaolini/conformetry-json";
import { MarkdownValidatorModule } from "@jimmypaolini/conformetry-markdown";
import { PythonValidatorModule } from "@jimmypaolini/conformetry-python";
import { TextValidatorModule } from "@jimmypaolini/conformetry-text";
import { TypeScriptValidatorModule } from "@jimmypaolini/conformetry-typescript";

import { ValidationPluginsService } from "./validation-plugins.service.js";
import { ValidationService } from "./validation.service.js";

/**
 * Provides the validation service.
 */
@Module({
  controllers: [],
  exports: [ValidationPluginsService, ValidationService],
  imports: [
    TypeScriptValidatorModule,
    PythonValidatorModule,
    MarkdownValidatorModule,
    JsonValidatorModule,
    TextValidatorModule,
  ],
  providers: [ValidationPluginsService, ValidationService],
})
export class ValidationModule {}
