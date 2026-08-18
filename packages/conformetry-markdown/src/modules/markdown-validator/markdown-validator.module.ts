import { ScoringModule } from "@conformetry/core";
import { Module } from "@nestjs/common";

import { MarkdownNodesService } from "./markdown-nodes.service";
import { MarkdownTreeService } from "./markdown-tree.service";
import { MarkdownValidatorService } from "./markdown-validator.service";

/**
 * Provides the markdown language validator.
 *
 * Exported to `conformetry-validation` and to `conformetry-jupyter`, which
 * reuses it for a notebook's markdown cells.
 */
@Module({
  controllers: [],
  exports: [MarkdownValidatorService],
  imports: [ScoringModule],
  providers: [
    MarkdownNodesService,
    MarkdownTreeService,
    MarkdownValidatorService,
  ],
})
export class MarkdownValidatorModule {}
