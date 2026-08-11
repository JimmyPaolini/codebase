import { Module } from "@nestjs/common";

import { PluginOptionsService } from "./plugin-options.service.js";

/**
 * Provides plugin option resolution helpers.
 */
@Module({
  controllers: [],
  exports: [PluginOptionsService],
  imports: [],
  providers: [PluginOptionsService],
})
export class PluginOptionsModule {}
