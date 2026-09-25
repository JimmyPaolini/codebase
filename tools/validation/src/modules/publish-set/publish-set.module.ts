import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logger";

import { PublishSetCommand } from "./publish-set.command";
import { PublishSetService } from "./publish-set.service";

/**
 * NestJS module for publish set tarball verification.
 */
@Module({
  controllers: [],
  exports: [PublishSetCommand, PublishSetService],
  imports: [LoggerModule],
  providers: [PublishSetCommand, PublishSetService],
})
export class PublishSetModule {}
