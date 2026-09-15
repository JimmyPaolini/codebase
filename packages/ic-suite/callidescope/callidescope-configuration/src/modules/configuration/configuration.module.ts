import { Module } from "@nestjs/common";

import { FlagResolutionModule } from "../flag-resolution/flag-resolution.module";
import { InputModule } from "../input/input.module";

import { ConfigurationFileModule } from "./configuration-file.module";
import { ConfigurationService } from "./configuration.service";
import { ProjectConfigurationService } from "./project-configuration.service";

/**
 * Provides the configuration layer's one public service.
 *
 * `ProjectConfigurationService` is provided here, and the three modules above
 * supply the other collaborators `ConfigurationService` is assembled from.
 *
 * `LoggerModule` is deliberately not imported: it is `@Global()`, so the host
 * that bootstraps the application already puts `LoggerService` in scope, and
 * importing it here would shadow whatever a caller registered — including the
 * double a test registers to read a refusal off.
 * None of them is exported: a consumer outside this package injects
 * `ConfigurationService`, which is what makes this layer one entry point
 * rather than four.
 */
@Module({
  controllers: [],
  exports: [ConfigurationService],
  imports: [ConfigurationFileModule, FlagResolutionModule, InputModule],
  providers: [ConfigurationService, ProjectConfigurationService],
})
export class ConfigurationModule {}
