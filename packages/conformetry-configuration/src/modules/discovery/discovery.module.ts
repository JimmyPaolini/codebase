import { RenderingModule } from "@conformetry/generation";
import { Module } from "@nestjs/common";

import { DiscoveryCandidatesService } from "./discovery-candidates.service";
import { DiscoveryMatchingService } from "./discovery-matching.service";
import { DiscoveryTemplatesService } from "./discovery-templates.service";
import { DiscoveryService } from "./discovery.service";

/**
 * Owns template discovery: reading template folders, deciding which template a
 * candidate directory is an instance of, and pairing their files.
 *
 * Imports `RenderingModule` rather than substituting locally, so discovery
 * renders a template exactly as generation did.
 */
@Module({
  controllers: [],
  exports: [
    DiscoveryCandidatesService,
    DiscoveryMatchingService,
    DiscoveryService,
    DiscoveryTemplatesService,
  ],
  imports: [RenderingModule],
  providers: [
    DiscoveryCandidatesService,
    DiscoveryMatchingService,
    DiscoveryService,
    DiscoveryTemplatesService,
  ],
})
export class DiscoveryModule {}
