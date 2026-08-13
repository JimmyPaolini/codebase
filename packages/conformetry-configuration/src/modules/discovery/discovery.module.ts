import { RenderingModule } from "@jimmypaolini/conformetry-generation";
import { Module } from "@nestjs/common";

import { ConfigurationModule } from "../configuration/configuration.module";

import { DiscoveryMatchingService } from "./discovery-matching.service";
import { DiscoveryMetadataService } from "./discovery-metadata.service";
import { DiscoveryTemplatesService } from "./discovery-templates.service";
import { DiscoveryService } from "./discovery.service";

/**
 * Owns template discovery: finding which generator governs a project and
 * pairing its template files with the project's own files.
 *
 * Imports `RenderingModule` rather than substituting locally, so discovery
 * renders a template exactly as generation did.
 */
@Module({
  controllers: [],
  exports: [DiscoveryService],
  imports: [ConfigurationModule, RenderingModule],
  providers: [
    DiscoveryMatchingService,
    DiscoveryMetadataService,
    DiscoveryService,
    DiscoveryTemplatesService,
  ],
})
export class DiscoveryModule {}
