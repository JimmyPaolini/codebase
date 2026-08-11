import {
  ConfigurationModule,
  ConfigurationService,
} from "@jimmypaolini/conformetry-configuration";
import {
  ValidationModule,
  ValidationService,
} from "@jimmypaolini/conformetry-validation";
import { Module } from "@nestjs/common";

import { ValidateCommand } from "./validate.command";

/**
 * Provides the validate command implementation.
 */
@Module({
  controllers: [],
  exports: [ValidateCommand],
  imports: [ConfigurationModule, ValidationModule],
  providers: [
    {
      inject: [ConfigurationService, ValidationService],
      provide: ValidateCommand,
      useFactory: (
        configurationService: ConfigurationService,
        validationService: ValidationService,
      ): ValidateCommand => {
        return new ValidateCommand(configurationService, validationService);
      },
    },
  ],
})
export class ValidateModule {}
