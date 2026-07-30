import { Module } from "@nestjs/common";

import { LoggerModule } from "../logger/logger.module";
import { PublishLogsModule } from "../publish-logs/publish-logs.module";

import { ArchiveLogsShellService } from "./archive-logs-shell.service";
import { ArchiveLogsCommand } from "./archive-logs.command";
import { ArchiveLogsService } from "./archive-logs.service";

/**
 * Module that registers the archive-logs command and its dependencies.
 */
@Module({
  controllers: [],
  exports: [ArchiveLogsCommand, ArchiveLogsService],
  imports: [LoggerModule, PublishLogsModule],
  providers: [ArchiveLogsCommand, ArchiveLogsShellService, ArchiveLogsService],
})
export class ArchiveLogsModule {}
