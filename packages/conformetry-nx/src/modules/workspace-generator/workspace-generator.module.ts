import { Module } from "@nestjs/common";

import { GenerationModule } from "../generation/generation.module.js";
import { PluginOptionsModule } from "../plugin-options/plugin-options.module.js";
import { WorkspaceGeneratorService } from "./workspace-generator.service.js";

/**
 * Provides workspace-generator helpers for the conformetry Nx plugin.
 */
@Module({
  controllers: [],
  exports: [WorkspaceGeneratorService],
  imports: [GenerationModule, PluginOptionsModule],
  providers: [WorkspaceGeneratorService],
})
export class WorkspaceGeneratorModule {}
