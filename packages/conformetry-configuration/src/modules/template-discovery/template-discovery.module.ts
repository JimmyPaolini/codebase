import { RenderingModule } from "@conformetry/generation";
import { Module } from "@nestjs/common";

import { TemplateDiscoveryCandidatesService } from "./template-discovery-candidates.service";
import { TemplateDiscoveryMatchingService } from "./template-discovery-matching.service";
import { TemplateDiscoveryTemplatesService } from "./template-discovery-templates.service";
import { TemplateDiscoveryService } from "./template-discovery.service";

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
    TemplateDiscoveryCandidatesService,
    TemplateDiscoveryMatchingService,
    TemplateDiscoveryService,
    TemplateDiscoveryTemplatesService,
  ],
  imports: [RenderingModule],
  providers: [
    TemplateDiscoveryCandidatesService,
    TemplateDiscoveryMatchingService,
    TemplateDiscoveryService,
    TemplateDiscoveryTemplatesService,
  ],
})
export class TemplateDiscoveryModule {}
