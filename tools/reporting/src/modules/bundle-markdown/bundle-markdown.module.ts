import { Module } from "@nestjs/common";

import { BundleMarkdownService } from "./bundle-markdown.service";

/**
 * NestJS module that renders measured bundles as a markdown section.
 */
@Module({
  controllers: [],
  exports: [BundleMarkdownService],
  imports: [],
  providers: [BundleMarkdownService],
})
export class BundleMarkdownModule {}
