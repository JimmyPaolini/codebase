import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logger";

import { MarkdownService } from "./markdown.service";

/**
 * Provides structural measurement of markdown documents.
 */
@Module({
  controllers: [],
  exports: [MarkdownService],
  imports: [LoggerModule],
  providers: [MarkdownService],
})
export class MarkdownModule {}
