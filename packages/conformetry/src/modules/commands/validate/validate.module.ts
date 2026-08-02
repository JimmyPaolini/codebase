import { ConfigurationModule } from "@jimmypaolini/conformetry-configuration";
import { JsonValidatorModule } from "@jimmypaolini/conformetry-json";
import { MarkdownValidatorModule } from "@jimmypaolini/conformetry-markdown";
import { PythonValidatorModule } from "@jimmypaolini/conformetry-python";
import { TextValidatorModule } from "@jimmypaolini/conformetry-text";
import { TypeScriptValidatorModule } from "@jimmypaolini/conformetry-typescript";
import { ValidationModule } from "@jimmypaolini/conformetry-validation";
import { Module } from "@nestjs/common";

import { ValidateCommand } from "./validate.command.js";

/**
 * Provides the validate command implementation.
 */
@Module({
  controllers: [],
  exports: [ValidateCommand],
  imports: [
    ConfigurationModule,
    ValidationModule,
    TypeScriptValidatorModule,
    PythonValidatorModule,
    MarkdownValidatorModule,
    JsonValidatorModule,
    TextValidatorModule,
  ],
  providers: [ValidateCommand],
})
export class ValidateModule {}
