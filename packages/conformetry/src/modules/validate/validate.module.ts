import { InputModule } from "@jimmypaolini/conformetry-configuration";
import { ReportingModule } from "@jimmypaolini/conformetry-core";
import { ValidationModule } from "@jimmypaolini/conformetry-validation";
import { Module } from "@nestjs/common";

import { LoggerModule } from "../logger/logger.module";

import { ValidateCommand } from "./validate.command";

/**
 * Provides the validate command.
 */
@Module({
  controllers: [],
  exports: [ValidateCommand],
  imports: [InputModule, LoggerModule, ReportingModule, ValidationModule],
  providers: [ValidateCommand],
})
export class ValidateModule {}
