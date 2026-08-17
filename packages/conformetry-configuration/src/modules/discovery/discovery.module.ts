import { RenderingModule } from "@conformetry/generation";
import { Module } from "@nestjs/common";

import { DiscoveryInstancesService } from "./discovery-instances.service";
import { DiscoveryMatchingService } from "./discovery-matching.service";
import { DiscoveryTemplatesService } from "./discovery-templates.service";
import { DiscoveryService } from "./discovery.service";

/**
 * Owns template discovery: reading template folders, deciding which template a
 * directory is an instance of, and pairing their files.
 *
 * Imports `RenderingModule` rather than substituting locally, so discovery
 * renders a template exactly as generation did.
 */
@Module({
  controllers: [],
  exports: [
    DiscoveryInstancesService,
    DiscoveryMatchingService,
    DiscoveryService,
    DiscoveryTemplatesService,
  ],
  imports: [RenderingModule],
  providers: [
    DiscoveryInstancesService,
    DiscoveryMatchingService,
    DiscoveryService,
    DiscoveryTemplatesService,
  ],
})
export class DiscoveryModule {}
