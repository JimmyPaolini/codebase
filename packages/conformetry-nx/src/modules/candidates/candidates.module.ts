import {
  ConfigurationModule,
  DiscoveryModule,
} from "@jimmypaolini/conformetry-configuration";
import { Module } from "@nestjs/common";

import { CandidatesService } from "./candidates.service";

/**
 * Provides Nx-aware expansion of the configured instance globs.
 *
 * Imports the generic discovery module rather than globbing here, so the
 * plugin and the CLI resolve candidates by exactly the same rules.
 */
@Module({
  controllers: [],
  exports: [CandidatesService],
  imports: [ConfigurationModule, DiscoveryModule],
  providers: [CandidatesService],
})
export class CandidatesModule {}
