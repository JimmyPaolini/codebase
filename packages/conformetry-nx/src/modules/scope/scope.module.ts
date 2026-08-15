import { Module } from "@nestjs/common";

import { ScopeService } from "./scope.service";

/**
 * Provides the reading and matching of a generator's project scope.
 *
 * Depends on nothing: a scope is answered from the configuration and a list of
 * projects the caller already has, so this stays usable from the graph, from a
 * generator, and from the install-time bootstrap alike.
 */
@Module({
  controllers: [],
  exports: [ScopeService],
  imports: [],
  providers: [ScopeService],
})
export class ScopeModule {}
