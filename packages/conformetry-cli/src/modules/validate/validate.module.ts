import {
  ConfigurationModule,
  InputModule,
  TemplateDiscoveryModule,
} from "@conformetry/configuration";
import { ReportingModule } from "@conformetry/core";
import { ValidationModule } from "@conformetry/validation";
import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logger";

import { ValidateCommand } from "./validate.command";

/**
 * Provides the validate command.
 */
@Module({
  controllers: [],
  exports: [ValidateCommand],
  imports: [
    ConfigurationModule,
    TemplateDiscoveryModule,
    InputModule,
    LoggerModule,
    ReportingModule,
    ValidationModule,
  ],
  providers: [ValidateCommand],
})
export class ValidateModule {}
