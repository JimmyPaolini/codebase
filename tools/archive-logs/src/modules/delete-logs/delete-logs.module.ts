import { Module } from "@nestjs/common";

import { LoggerModule } from "../logger/logger.module";

import { DeleteLogsCommand } from "./delete-logs.command";
import { DeleteLogsService } from "./delete-logs.service";

/**
 * Module that registers the delete-logs command and its dependencies.
 */
@Module({
  controllers: [],
  exports: [DeleteLogsCommand, DeleteLogsService],
  imports: [LoggerModule],
  providers: [DeleteLogsCommand, DeleteLogsService],
})
export class DeleteLogsModule {}
