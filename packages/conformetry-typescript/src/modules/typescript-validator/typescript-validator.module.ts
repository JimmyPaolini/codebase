import { ScoringModule } from "@conformetry/core";
import { Module } from "@nestjs/common";

import { TypescriptCommentsService } from "./typescript-comments.service";
import { TypescriptNodesService } from "./typescript-nodes.service";
import { TypescriptTreeService } from "./typescript-tree.service";
import { TypescriptValidatorService } from "./typescript-validator.service";

/**
 * Provides the TypeScript language validator.
 *
 * Split into node keying, tree walking, and comment comparison so each concern
 * stays independently testable — the same decomposition the previous
 * conformance tool used.
 */
@Module({
  controllers: [],
  exports: [TypescriptValidatorService],
  imports: [ScoringModule],
  providers: [
    TypescriptCommentsService,
    TypescriptNodesService,
    TypescriptTreeService,
    TypescriptValidatorService,
  ],
})
export class TypescriptValidatorModule {}
