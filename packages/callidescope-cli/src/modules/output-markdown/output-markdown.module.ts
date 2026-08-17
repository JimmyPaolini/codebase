import { Module } from "@nestjs/common";

import { OutputMarkdownService } from "./output-markdown.service";

/**
 * Provides the anchored markdown block destination.
 */
@Module({
  controllers: [],
  exports: [OutputMarkdownService],
  imports: [],
  providers: [OutputMarkdownService],
})
export class OutputMarkdownModule {}
