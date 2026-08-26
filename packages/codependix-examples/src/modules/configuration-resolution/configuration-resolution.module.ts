import { ConfigurationModule as CodependixConfigurationModule } from "@codependix/configuration";
import { Module } from "@nestjs/common";

import { ConfigurationResolutionService } from "./configuration-resolution.service";

/** Provides the configuration-resolution and refusal examples. */
@Module({
  controllers: [],
  exports: [ConfigurationResolutionService],
  imports: [CodependixConfigurationModule],
  providers: [ConfigurationResolutionService],
})
export class ConfigurationResolutionModule {}
