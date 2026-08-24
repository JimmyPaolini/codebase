import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logger";

import { MarkdownService } from "./markdown.service";

/**
 * NestJS module that provides markdown badge block writing.
 */
@Module({
  controllers: [],
  exports: [MarkdownService],
  imports: [LoggerModule],
  providers: [MarkdownService],
})
export class MarkdownModule {}
