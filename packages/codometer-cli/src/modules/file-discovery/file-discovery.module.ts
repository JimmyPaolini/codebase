import { Module } from "@nestjs/common";

import { FileDiscoveryService } from "./file-discovery.service";

/**
 * NestJS module that discovers and categorizes git-tracked files.
 */
@Module({
  controllers: [],
  exports: [FileDiscoveryService],
  imports: [],
  providers: [FileDiscoveryService],
})
export class FileDiscoveryModule {}
