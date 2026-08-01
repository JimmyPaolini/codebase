import { Module } from "@nestjs/common";

import { LoggerModule } from "../logger/logger.module.js";

import { GenerateCommand } from "./generate.command.js";
import { ValidateCommand } from "./validate.command.js";

/**
 * Provides the conformetry CLI command classes.
 */
@Module({
  imports: [LoggerModule],
  providers: [GenerateCommand, ValidateCommand],
})
export class CommandsModule {}
