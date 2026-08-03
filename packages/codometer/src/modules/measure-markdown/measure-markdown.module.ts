import { Module } from "@nestjs/common";

import { MeasureMarkdownService } from "./measure-markdown.service";

/**
 * Provides markdown analysis services for codometer metrics.
 */
@Module({
  controllers: [],
  exports: [MeasureMarkdownService],
  imports: [],
  providers: [MeasureMarkdownService],
})
export class MeasureMarkdownModule {}
