import { Module } from "@nestjs/common";

import { LoggerModule } from "../logger/logger.module";

import { PublishLogsService } from "./publish-logs.service";

/**
 * Module that registers the publish-logs service and its dependencies.
 */
@Module({
  controllers: [],
  exports: [PublishLogsService],
  imports: [LoggerModule],
  providers: [PublishLogsService],
})
export class PublishLogsModule {}
