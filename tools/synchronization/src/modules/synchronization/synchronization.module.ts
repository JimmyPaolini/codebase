import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logger";

import { AgentSkillsModule } from "../agent-skills/agent-skills.module";
import { ConformetryGeneratorsModule } from "../conformetry-generators/conformetry-generators.module";
import { ConventionalConfigModule } from "../conventional-config/conventional-config.module";
import { DevcontainerConfigurationModule } from "../devcontainer-configuration/devcontainer-configuration.module";
import { PullRequestTemplateModule } from "../pull-request-template/pull-request-template.module";

import { SynchronizationService } from "./synchronization.service";

/**
 * Root NestJS application module.
 */
@Module({
  controllers: [],
  exports: [SynchronizationService],
  imports: [
    LoggerModule,
    AgentSkillsModule,
    ConformetryGeneratorsModule,
    ConventionalConfigModule,
    DevcontainerConfigurationModule,
    PullRequestTemplateModule,
  ],
  providers: [SynchronizationService],
})
export class SynchronizationModule {}
