import { Module } from "@nestjs/common";

import { FileDiscoveryService } from "./file-discovery.service";
import { IgnoreRulesService } from "./ignore-rules.service";

/**
 * NestJS module that discovers and categorizes the files of a codebase.
 */
@Module({
  controllers: [],
  exports: [FileDiscoveryService],
  imports: [],
  providers: [FileDiscoveryService, IgnoreRulesService],
})
export class FileDiscoveryModule {}
