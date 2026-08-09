import { ConfigurationModule } from "@jimmypaolini/conformetry-configuration";
import { ValidationModule } from "@jimmypaolini/conformetry-validation";
import { Module } from "@nestjs/common";

import { ValidateCommand } from "./validate.command";

/**
 * Provides the validate command implementation.
 */
@Module({
  controllers: [],
  exports: [ValidateCommand],
  imports: [ConfigurationModule, ValidationModule],
  providers: [ValidateCommand],
})
export class ValidateModule {}
