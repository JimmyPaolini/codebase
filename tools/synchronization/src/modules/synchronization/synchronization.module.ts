import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logger";

import { ConformetryGeneratorsModule } from "../conformetry-generators/conformetry-generators.module";
import { ConventionalConfigModule } from "../conventional-config/conventional-config.module";
import { DevcontainerConfigurationModule } from "../devcontainer-configuration/devcontainer-configuration.module";
import { NestjsModuleGraphsModule } from "../nestjs-module-graphs/nestjs-module-graphs.module";
import { NxProjectGraphsModule } from "../nx-project-graphs/nx-project-graphs.module";
import { PullRequestLabelsModule } from "../pull-request-labels/pull-request-labels.module";
import { PullRequestTemplateModule } from "../pull-request-template/pull-request-template.module";
import { SkillExclusionsModule } from "../skill-exclusions/skill-exclusions.module";

import { SynchronizationService } from "./synchronization.service";

/**
 * Root NestJS application module.
 *
 * Every synchronization command is its own Nx target and its own CLI
 * subcommand, run on its own rather than through a shared aggregate. This
 * module exists only so `MainModule` discovers every one of them in a single
 * import.
 */
@Module({
  controllers: [],
  exports: [SynchronizationService],
  imports: [
    LoggerModule,
    ConformetryGeneratorsModule,
    ConventionalConfigModule,
    DevcontainerConfigurationModule,
    NestjsModuleGraphsModule,
    NxProjectGraphsModule,
    PullRequestLabelsModule,
    PullRequestTemplateModule,
    SkillExclusionsModule,
  ],
  providers: [SynchronizationService],
})
export class SynchronizationModule {}
