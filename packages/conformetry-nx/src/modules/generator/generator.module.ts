import { ConfigurationModule } from "@jimmypaolini/conformetry-configuration";
import { Module } from "@nestjs/common";

import { GeneratorService } from "./generator.service";

/**
 * Provides derivation of the consumer's Nx generator plugin.
 *
 * Depends on nothing but the configuration: every emitted file is named after
 * a generator declared there, so no name-case rendering is involved.
 */
@Module({
  controllers: [],
  exports: [ConfigurationModule, GeneratorService],
  imports: [ConfigurationModule],
  providers: [GeneratorService],
})
export class GeneratorModule {}
