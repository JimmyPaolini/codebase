import { Module } from "@nestjs/common";

import { TextValidatorService } from "./text-validator.service.js";

/**
 * Provides the text validator service.
 */
@Module({
  controllers: [],
  exports: [TextValidatorService],
  imports: [],
  providers: [TextValidatorService],
})
export class TextValidatorModule {}
