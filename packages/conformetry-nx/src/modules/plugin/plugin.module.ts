import {
  ConfigurationModule,
  DiscoveryModule,
} from "@conformetry/configuration";
import { ReportingModule } from "@conformetry/core";
import { GenerationModule } from "@conformetry/generation";
import { ValidationModule } from "@conformetry/validation";
import { Module } from "@nestjs/common";

import { AdapterModule } from "../adapter/adapter.module";
import { CandidatesModule } from "../candidates/candidates.module";
import { GeneratorModule } from "../generator/generator.module";
import { OptionsModule } from "../options/options.module";
import { PathsModule } from "../paths/paths.module";
import { ProjectsModule } from "../projects/projects.module";
import { ScopeModule } from "../scope/scope.module";

import { PluginService } from "./plugin.service";

/**
 * Wires the generic conformetry packages into one Nx-facing service.
 *
 * The plugin owns no generation or validation logic of its own; it supplies
 * the Nx-shaped inputs — project roots, tags, a `Tree` — that the generic
 * packages cannot know about.
 */
@Module({
  controllers: [],
  exports: [
    AdapterModule,
    CandidatesModule,
    ConfigurationModule,
    GeneratorModule,
    DiscoveryModule,
    GenerationModule,
    OptionsModule,
    PathsModule,
    PluginService,
    ProjectsModule,
    ReportingModule,
    ScopeModule,
    ValidationModule,
  ],
  imports: [
    AdapterModule,
    CandidatesModule,
    ConfigurationModule,
    GeneratorModule,
    DiscoveryModule,
    GenerationModule,
    OptionsModule,
    PathsModule,
    ProjectsModule,
    ReportingModule,
    ScopeModule,
    ValidationModule,
  ],
  providers: [PluginService],
})
export class PluginModule {}
