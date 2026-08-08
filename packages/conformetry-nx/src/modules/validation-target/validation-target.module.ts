import { Module } from "@nestjs/common";

import { ValidationTargetService } from "./validation-target.service.js";

/**
 * Provides validation-target helpers for conformetry validation workflows.
 */
@Module({
  controllers: [],
  exports: [ValidationTargetService],
  imports: [],
  providers: [ValidationTargetService],
})
export class ValidationTargetModule {}
