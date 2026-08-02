import { Module } from "@nestjs/common";

import { ValidationService } from "./validation.service.js";

/**
 * Provides the validation service.
 */
@Module({
  controllers: [],
  exports: [ValidationService],
  imports: [],
  providers: [ValidationService],
})
export class ValidationModule {}
