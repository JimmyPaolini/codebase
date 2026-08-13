import { InputModule } from "@jimmypaolini/conformetry-configuration";
import { Module } from "@nestjs/common";

import { CommandExecutionModule } from "../command-execution/command-execution.module";
import { PluginOptionsModule } from "../plugin-options/plugin-options.module";

import { GenerationService } from "./generation.service";

/**
 * Provides generation helpers for conformetry workflow execution.
 */
@Module({
  controllers: [],
  exports: [GenerationService],
  imports: [CommandExecutionModule, InputModule, PluginOptionsModule],
  providers: [GenerationService],
})
export class GenerationModule {}
