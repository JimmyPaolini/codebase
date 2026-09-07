import { Module } from "@nestjs/common";

import { RunnerService } from "./runner.service";

/**
 * Owns the shared envelope for running a language validator.
 *
 * Imported by `conformetry-validation`, which drives the registered language
 * validators, and by any package composing them (such as
 * `conformetry-jupyter`).
 */
@Module({
  controllers: [],
  exports: [RunnerService],
  imports: [],
  providers: [RunnerService],
})
export class RunnerModule {}
