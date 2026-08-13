import { Module } from "@nestjs/common";

import { ValidationService } from "./validation.service";

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
