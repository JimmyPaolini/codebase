import { ConfigurationModule } from "@jimmypaolini/conformetry-configuration";
import { RenderingModule } from "@jimmypaolini/conformetry-generation";
import { Module } from "@nestjs/common";

import { GeneratorService } from "./generator.service";

/**
 * Provides derivation of the consumer's Nx generator plugin.
 *
 * Depends on rendering only for its name-case helpers, so a factory name is
 * derived by the same rules a template placeholder is.
 */
@Module({
  controllers: [],
  exports: [ConfigurationModule, GeneratorService, RenderingModule],
  imports: [ConfigurationModule, RenderingModule],
  providers: [GeneratorService],
})
export class GeneratorModule {}
