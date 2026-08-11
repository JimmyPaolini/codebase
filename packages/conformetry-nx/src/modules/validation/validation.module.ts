import { Module } from "@nestjs/common";

import { ValidationService } from "./validation.service.js";

/**
 * Provides validation helpers for the conformetry Nx plugin.
 */
@Module({
  controllers: [],
  exports: [ValidationService],
  imports: [],
  providers: [ValidationService],
})
export class ValidationModule {}
