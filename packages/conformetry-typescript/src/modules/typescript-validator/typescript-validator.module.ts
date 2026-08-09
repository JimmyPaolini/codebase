import { Module } from "@nestjs/common";

import { TypeScriptValidatorService } from "./typescript-validator.service";

/**
 * Provides the TypeScript validator service.
 */
@Module({
  controllers: [],
  exports: [TypeScriptValidatorService],
  imports: [],
  providers: [TypeScriptValidatorService],
})
export class TypeScriptValidatorModule {}
