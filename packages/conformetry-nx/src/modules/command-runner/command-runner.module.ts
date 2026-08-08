import { Module } from "@nestjs/common";

import { CommandRunnerService } from "./command-runner.service.js";

/**
 * Provides command-runner helpers for the conformetry Nx plugin.
 */
@Module({
  controllers: [],
  exports: [CommandRunnerService],
  imports: [],
  providers: [CommandRunnerService],
})
export class CommandRunnerModule {}
