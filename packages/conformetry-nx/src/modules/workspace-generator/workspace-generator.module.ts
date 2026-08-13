import { Module } from "@nestjs/common";

import { GenerationModule } from "../generation/generation.module";
import { PluginOptionsModule } from "../plugin-options/plugin-options.module";

import { WorkspaceGeneratorService } from "./workspace-generator.service";

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
