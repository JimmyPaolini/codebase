import { Module } from "@nestjs/common";

import { FileDiscoveryService } from "./file-discovery.service";

/**
 * TODO: Document the fileDiscovery module.
 */
@Module({
  controllers: [],
  exports: [FileDiscoveryService],
  imports: [],
  providers: [FileDiscoveryService],
})
export class FileDiscoveryModule {}
