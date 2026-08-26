import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logger";

import { PluginModule } from "./modules/plugin/plugin.module";

/**
 * Root module of the plugin's application context.
 *
 * Built once per process and cached — the Nx daemon is long-lived, so paying
 * for a NestJS context on every inference or executor invocation would make
 * this plugin the slowest thing in the graph.
 */
@Module({
  controllers: [],
  exports: [PluginModule],
  imports: [LoggerModule, PluginModule],
  providers: [],
})
export class MainModule {}
