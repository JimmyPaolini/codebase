import { Module } from "@nestjs/common";

import { CandidatesModule } from "../candidates/candidates.module";

import { PathsService } from "./paths.service";

/**
 * Provides discovery of where a generator writes.
 *
 * Depends on the candidates module rather than globbing again, so the module
 * folders generation places code beside are exactly the ones validation
 * checks — the two cannot disagree about what a module is.
 */
@Module({
  controllers: [],
  exports: [CandidatesModule, PathsService],
  imports: [CandidatesModule],
  providers: [PathsService],
})
export class PathsModule {}
