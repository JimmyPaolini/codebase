import { ScoringModule } from "@conformetry/core";
import { Module } from "@nestjs/common";

import { MarkdownNodesService } from "./markdown-nodes.service";
import { MarkdownTreeService } from "./markdown-tree.service";
import { MarkdownService } from "./markdown.service";

/**
 * Provides the markdown language validator.
 *
 * Exported to `conformetry-validation` and to `conformetry-jupyter`, which
 * reuses it for a notebook's markdown cells.
 */
@Module({
  controllers: [],
  exports: [MarkdownService],
  imports: [ScoringModule],
  providers: [MarkdownNodesService, MarkdownService, MarkdownTreeService],
})
export class MarkdownModule {}
