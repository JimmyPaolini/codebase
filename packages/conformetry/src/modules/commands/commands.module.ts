import { JsonValidatorModule } from "@jimmypaolini/conformetry-json";
import { MarkdownValidatorModule } from "@jimmypaolini/conformetry-markdown";
import { PythonValidatorModule } from "@jimmypaolini/conformetry-python";
import { TextValidatorModule } from "@jimmypaolini/conformetry-text";
import { TypeScriptValidatorModule } from "@jimmypaolini/conformetry-typescript";
import { Module } from "@nestjs/common";

import { LoggerModule } from "../logger/logger.module.js";

import { GenerateCommand } from "./generate.command.js";
import { ValidateCommand } from "./validate.command.js";

/**
 * Provides the conformetry CLI command classes.
 */
@Module({
  imports: [
    LoggerModule,
    TypeScriptValidatorModule,
    PythonValidatorModule,
    MarkdownValidatorModule,
    JsonValidatorModule,
    TextValidatorModule,
  ],
  providers: [GenerateCommand, ValidateCommand],
})
export class CommandsModule {}
