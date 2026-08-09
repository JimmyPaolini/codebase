import { Module } from "@nestjs/common";

import { CommandExecutionService } from "./command-execution.service";

/**
 * Provides command execution behavior for conformetry generators.
 */
@Module({
  controllers: [],
  exports: [CommandExecutionService],
  imports: [],
  providers: [CommandExecutionService],
})
export class CommandExecutionModule {}
