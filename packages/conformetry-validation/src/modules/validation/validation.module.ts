import {
  ConfigurationModule,
  ConfigurationService,
} from "@jimmypaolini/conformetry-configuration";
import {
  JsonValidatorModule,
  JsonValidatorService,
} from "@jimmypaolini/conformetry-json";
import {
  MarkdownValidatorModule,
  MarkdownValidatorService,
} from "@jimmypaolini/conformetry-markdown";
import {
  PythonValidatorModule,
  PythonValidatorService,
} from "@jimmypaolini/conformetry-python";
import {
  TextValidatorModule,
  TextValidatorService,
} from "@jimmypaolini/conformetry-text";
import {
  TypeScriptValidatorModule,
  TypeScriptValidatorService,
} from "@jimmypaolini/conformetry-typescript";
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
  providers: [
    {
      inject: [
        ConfigurationService,
        TypeScriptValidatorService,
        PythonValidatorService,
        MarkdownValidatorService,
        JsonValidatorService,
        TextValidatorService,
      ],
      provide: ValidationService,
      useFactory: (
        configurationService: ConfigurationService,
        typeScriptValidatorService: TypeScriptValidatorService,
        pythonValidatorService: PythonValidatorService,
        markdownValidatorService: MarkdownValidatorService,
        jsonValidatorService: JsonValidatorService,
        textValidatorService: TextValidatorService,
      ): ValidationService => {
        return new ValidationService(
          configurationService,
          typeScriptValidatorService,
          pythonValidatorService,
          markdownValidatorService,
          jsonValidatorService,
          textValidatorService,
        );
      },
    },
  ],
})
export class ValidationModule {}
