import { Module } from "@nestjs/common";

import { MarkdownService } from "./markdown.service";

/**
 * Provides structural measurement of markdown documents.
 */
@Module({
  controllers: [],
  exports: [MarkdownService],
  imports: [],
  providers: [MarkdownService],
})
export class MarkdownModule {}
