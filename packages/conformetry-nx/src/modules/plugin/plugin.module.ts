import {
  ConfigurationModule,
  DiscoveryModule,
} from "@jimmypaolini/conformetry-configuration";
import { ReportingModule } from "@jimmypaolini/conformetry-core";
import { GenerationModule } from "@jimmypaolini/conformetry-generation";
import { ValidationModule } from "@jimmypaolini/conformetry-validation";
import { Module } from "@nestjs/common";

import { AdapterModule } from "../adapter/adapter.module";
import { CandidatesModule } from "../candidates/candidates.module";
import { GeneratorModule } from "../generator/generator.module";
import { OptionsModule } from "../options/options.module";
import { PathsModule } from "../paths/paths.module";

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
    ReportingModule,
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
    ReportingModule,
    ValidationModule,
  ],
  providers: [PluginService],
})
export class PluginModule {}
