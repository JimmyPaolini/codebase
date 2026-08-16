import { Module } from "@nestjs/common";

import { DiscoveryService } from "./discovery.service";

/**
 * NestJS module that discovers and categorizes git-tracked files.
 */
@Module({
  controllers: [],
  exports: [DiscoveryService],
  imports: [],
  providers: [DiscoveryService],
})
export class DiscoveryModule {}
