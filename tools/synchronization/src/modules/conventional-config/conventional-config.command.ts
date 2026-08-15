import { Injectable } from "@nestjs/common";
import { Command, CommandRunner } from "nest-commander";

import { LoggerService } from "@codebase/logger";

import { SynchronizationService } from "../synchronization/synchronization.service";

import { ConventionalConfigService } from "./conventional-config.service";

/**
 * CLI command that runs the conventional-config sync in check or write mode.
 * Reads the mode from the first positional argument (check|write) and delegates
 * to the synchronization service, exiting with code 1 on drift.
 */
@Command({
  description: "Run the conventional-config command",
  name: "conventional-config",
})
@Injectable()
export class ConventionalConfigCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly conventionalConfigService: ConventionalConfigService,
    private readonly logger: LoggerService,
    private readonly synchronizationModeService: SynchronizationService,
  ) {
    super();
    this.logger.setContext(ConventionalConfigCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Runs the conventional-config sync command, delegating to helpers and exiting 1 on drift. */
  async run(
    passedParameters: string[],
    _options?: Record<string, unknown>,
  ): Promise<void> {
    await Promise.resolve();
    const mode =
      this.synchronizationModeService.resolveSynchronizationModeOrExit({
        invalidModeLabel: "Invalid mode",
        loggerService: this.logger,
        passedParameters,
        usageMessage:
          "💡 Usage: nx run synchronization:start:conventional-config-check (or synchronization:start:conventional-config-write)",
      });
    this.conventionalConfigService.runSynchronization(mode);
  }
}
