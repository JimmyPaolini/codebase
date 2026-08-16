import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logger";

import { SynchronizationService } from "../synchronization/synchronization.service";

import { AgentSkillsCommand } from "./agent-skills.command";

/**
 * TODO: Document the agentSkills module.
 */
@Module({
  controllers: [],
  exports: [AgentSkillsCommand],
  imports: [LoggerModule],
  providers: [AgentSkillsCommand, SynchronizationService],
})
export class AgentSkillsModule {}
