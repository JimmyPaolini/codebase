import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logger";

import { OutputMarkdownService } from "./output-markdown.service";

/**
 * NestJS module that provides markdown badge block writing.
 */
@Module({
  controllers: [],
  exports: [OutputMarkdownService],
  imports: [LoggerModule],
  providers: [OutputMarkdownService],
})
export class OutputMarkdownModule {}
