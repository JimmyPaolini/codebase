import { Module } from "@nestjs/common";

import { OutputMarkdownService } from "./output-markdown.service";

/**
 * NestJS module that provides markdown badge block writing.
 */
@Module({
  controllers: [],
  exports: [OutputMarkdownService],
  imports: [],
  providers: [OutputMarkdownService],
})
export class OutputMarkdownModule {}
