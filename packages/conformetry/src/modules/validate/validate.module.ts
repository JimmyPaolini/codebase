import {
  ConfigurationModule,
  ConfigurationService,
  InputModule,
  InputService,
} from "@jimmypaolini/conformetry-configuration";
import {
  ValidationModule,
  ValidationService,
} from "@jimmypaolini/conformetry-validation";
import { Module } from "@nestjs/common";

import { LoggerService } from "../logger/logger.service";

import { ValidateCommand } from "./validate.command";

/**
 * Provides the validate command implementation.
 */
@Module({
  controllers: [],
  exports: [ValidateCommand],
  imports: [ConfigurationModule, InputModule, ValidationModule],
  providers: [
    {
      inject: [
        InputService,
        ConfigurationService,
        ValidationService,
        LoggerService,
      ],
      provide: ValidateCommand,
      useFactory: (
        inputService: InputService,
        configurationService: ConfigurationService,
        validationService: ValidationService,
        loggerService: LoggerService,
      ): ValidateCommand => {
        return new ValidateCommand(
          inputService,
          configurationService,
          validationService,
          loggerService,
        );
      },
    },
  ],
})
export class ValidateModule {}
