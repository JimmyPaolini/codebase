import { Module } from "@nestjs/common";

import { CommandExecutionModule } from "../command-execution/command-execution.module.js";
import { PluginOptionsModule } from "../plugin-options/plugin-options.module.js";
import { GenerationService } from "./generation.service.js";

/**
 * Provides generation helpers for conformetry workflow execution.
 */
@Module({
  controllers: [],
  exports: [GenerationService],
  imports: [CommandExecutionModule, PluginOptionsModule],
  providers: [GenerationService],
})
export class GenerationModule {}
