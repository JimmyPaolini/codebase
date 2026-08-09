import { ConfigurationModule } from "@jimmypaolini/conformetry-configuration";
import { JsonValidatorModule } from "@jimmypaolini/conformetry-json";
import { MarkdownValidatorModule } from "@jimmypaolini/conformetry-markdown";
import { PythonValidatorModule } from "@jimmypaolini/conformetry-python";
import { TextValidatorModule } from "@jimmypaolini/conformetry-text";
import { TypeScriptValidatorModule } from "@jimmypaolini/conformetry-typescript";
import { Module } from "@nestjs/common";

import { ValidationService } from "./validation.service";

/**
 * Provides the validation service.
 */
@Module({
  controllers: [],
  exports: [ValidationService],
  imports: [
    ConfigurationModule,
    TypeScriptValidatorModule,
    PythonValidatorModule,
    MarkdownValidatorModule,
    JsonValidatorModule,
    TextValidatorModule,
  ],
  providers: [ValidationService],
})
export class ValidationModule {}
