import { ConfigurationModule, InputModule } from "@conformetry/configuration";
import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logger";

import { ListCommand } from "./list.command";

/**
 * Provides the list command.
 */
@Module({
  controllers: [],
  exports: [ListCommand],
  imports: [ConfigurationModule, InputModule, LoggerModule],
  providers: [ListCommand],
})
export class ListModule {}
