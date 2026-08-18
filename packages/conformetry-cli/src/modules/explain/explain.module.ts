import {
  ConfigurationModule,
  InputModule,
  TemplateDiscoveryModule,
} from "@conformetry/configuration";
import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logger";

import { ExplainCommand } from "./explain.command";

/**
 * Provides the explain command.
 */
@Module({
  controllers: [],
  exports: [ExplainCommand],
  imports: [
    ConfigurationModule,
    InputModule,
    LoggerModule,
    TemplateDiscoveryModule,
  ],
  providers: [ExplainCommand],
})
export class ExplainModule {}
