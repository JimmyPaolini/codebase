import {
  ConfigurationModule,
  DiscoveryModule,
  InputModule,
} from "@conformetry/configuration";
import { ReportingModule } from "@conformetry/core";
import { ValidationModule } from "@conformetry/validation";
import { Module } from "@nestjs/common";

import { LoggerModule } from "../logger/logger.module";

import { ValidateCommand } from "./validate.command";

/**
 * Provides the validate command.
 */
@Module({
  controllers: [],
  exports: [ValidateCommand],
  imports: [
    ConfigurationModule,
    DiscoveryModule,
    InputModule,
    LoggerModule,
    ReportingModule,
    ValidationModule,
  ],
  providers: [ValidateCommand],
})
export class ValidateModule {}
