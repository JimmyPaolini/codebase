import { CallidescopeModule } from "@callidescope/cli";
import { ConfigurationModule } from "@callidescope/configuration";
import { ReportModule } from "@callidescope/output";
import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logger";

import { OptionsModule } from "../options/options.module";
import { ProjectsModule } from "../projects/projects.module";

import { PluginService } from "./plugin.service";

/** Provides target inference and the trace the executor runs. */
@Module({
  controllers: [],
  exports: [PluginService],
  imports: [
    CallidescopeModule,
    ConfigurationModule,
    LoggerModule,
    OptionsModule,
    ProjectsModule,
    ReportModule,
  ],
  providers: [PluginService],
})
export class PluginModule {}
