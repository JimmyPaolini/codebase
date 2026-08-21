import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logger";

import { SynchronizationService } from "../synchronization/synchronization.service";

import { SkillExclusionsCommand } from "./skill-exclusions.command";

/**
 * Provides the skill-exclusions synchronization command.
 *
 * `SynchronizationService` is provided here rather than imported from its own
 * module, which the aggregate command owns — importing that module back would
 * close a cycle, since it imports this one.
 */
@Module({
  controllers: [],
  exports: [SkillExclusionsCommand],
  imports: [LoggerModule],
  providers: [SkillExclusionsCommand, SynchronizationService],
})
export class SkillExclusionsModule {}
