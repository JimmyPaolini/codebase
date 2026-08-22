import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logger";

import { ConformetryGeneratorsModule } from "../conformetry-generators/conformetry-generators.module";
import { ConventionalConfigModule } from "../conventional-config/conventional-config.module";
import { DevcontainerConfigurationModule } from "../devcontainer-configuration/devcontainer-configuration.module";
import { NestjsModuleGraphsModule } from "../nestjs-module-graphs/nestjs-module-graphs.module";
import { NxProjectGraphsModule } from "../nx-project-graphs/nx-project-graphs.module";
import { PullRequestTemplateModule } from "../pull-request-template/pull-request-template.module";
import { SkillExclusionsModule } from "../skill-exclusions/skill-exclusions.module";

import { SynchronizationKindsService } from "./synchronization-kinds.service";
import { SynchronizationCommand } from "./synchronization.command";
import { SynchronizationService } from "./synchronization.service";

/**
 * Root NestJS application module.
 */
@Module({
  controllers: [],
  exports: [
    SynchronizationCommand,
    SynchronizationKindsService,
    SynchronizationService,
  ],
  imports: [
    LoggerModule,
    ConformetryGeneratorsModule,
    ConventionalConfigModule,
    DevcontainerConfigurationModule,
    NestjsModuleGraphsModule,
    NxProjectGraphsModule,
    PullRequestTemplateModule,
    SkillExclusionsModule,
  ],
  providers: [
    SynchronizationCommand,
    SynchronizationKindsService,
    SynchronizationService,
  ],
})
export class SynchronizationModule {}
