import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logger";

import { SynchronizationService } from "../synchronization/synchronization.service";

import { PullRequestLabelsGithubService } from "./pull-request-labels-github.service";
import { PullRequestLabelsCommand } from "./pull-request-labels.command";
import { PullRequestLabelsService } from "./pull-request-labels.service";

/**
 * Provides the pull-request-labels synchronization command.
 *
 * `SynchronizationService` is provided here rather than imported from its own
 * module, which the aggregate command owns — importing that module back would
 * close a cycle, since it imports this one.
 */
@Module({
  controllers: [],
  exports: [PullRequestLabelsCommand, PullRequestLabelsService],
  imports: [LoggerModule],
  providers: [
    PullRequestLabelsCommand,
    PullRequestLabelsGithubService,
    PullRequestLabelsService,
    SynchronizationService,
  ],
})
export class PullRequestLabelsModule {}
