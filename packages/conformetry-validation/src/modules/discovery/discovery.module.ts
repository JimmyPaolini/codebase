import { Module } from "@nestjs/common";

import { DiscoveryScopeService } from "./discovery-scope.service";
import { DiscoveryService } from "./discovery.service";

/**
 * Owns workspace project discovery and generator scope resolution.
 *
 * Distinct from `conformetry-configuration`'s discovery module, which finds
 * *templates*; this one finds the *projects* those templates apply to.
 */
@Module({
  controllers: [],
  exports: [DiscoveryScopeService, DiscoveryService],
  imports: [],
  providers: [DiscoveryScopeService, DiscoveryService],
})
export class DiscoveryModule {}
