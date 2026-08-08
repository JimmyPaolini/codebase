import { Module } from "@nestjs/common";

import { MarkdownValidatorService } from "./markdown-validator.service.js";

/**
 * Provides the Markdown validator service.
 */
@Module({
  controllers: [],
  exports: [MarkdownValidatorService],
  imports: [],
  providers: [MarkdownValidatorService],
})
export class MarkdownValidatorModule {}
