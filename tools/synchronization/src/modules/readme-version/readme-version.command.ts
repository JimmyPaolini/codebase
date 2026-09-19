import { Injectable } from "@nestjs/common";
import { Command, CommandRunner } from "nest-commander";

import { LoggerService } from "@codebase/logger";

import { SynchronizationService } from "../synchronization/synchronization.service";

import { ReadmeVersionService } from "./readme-version.service";

import type {
  SynchronizableCommand,
  SynchronizationMode,
} from "../synchronization/synchronization.types";

/**
 * CLI command that synchronizes the version in the root README.md title
 * with package.json version. Runs in check or write mode.
 */
@Command({
  description: "Run the readme-version command",
  name: "readme-version",
})
@Injectable()
export class ReadmeVersionCommand
  extends CommandRunner
  implements SynchronizableCommand
{
  // 🏗 Dependency Injection

  constructor(
    private readonly logger: LoggerService,
    private readonly readmeVersionService: ReadmeVersionService,
    private readonly synchronizationModeService: SynchronizationService,
  ) {
    super();
    this.logger.setContext(ReadmeVersionCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  readonly synchronizationLabel = "readme-version";

  // 🔏 Private Methods

  /** Handles validation output in check mode. */
  private checkSync(version: string, isSync: boolean): boolean {
    if (isSync) {
      this.logger.info("📄 Verified the root README version is in sync");
      return true;
    }

    const expectedTitle = this.readmeVersionService.formatTitle(version);
    this.logger.info(
      "📄 Detected an out-of-sync root README version",
      undefined,
      {
        expectedTitle,
        version,
      },
    );
    return false;
  }

  /** Handles writing output and updating README in write mode. */
  private writeSync(
    workspaceRoot: string,
    version: string,
    isSync: boolean,
  ): boolean {
    if (isSync) {
      this.logger.info(
        "📄 Verified the root README version was already in sync",
      );
      return true;
    }

    this.readmeVersionService.writeReadmeVersion(workspaceRoot);
    this.logger.info("📄 Synced the root README version", undefined, {
      version,
    });
    return true;
  }

  // 🌎 Public Methods

  /** Runs the readme-version sync command and exits 1 on drift in check mode. */
  async run(
    passedParameters: string[],
    _options?: Record<string, unknown>,
  ): Promise<void> {
    const mode =
      this.synchronizationModeService.resolveSynchronizationModeOrExit({
        invalidModeLabel: "Invalid mode",
        loggerService: this.logger,
        passedParameters,
        usageMessage:
          "💡 Usage: nx run synchronization:readme-version:check (or synchronization:readme-version:write)",
      });

    if (!(await this.synchronize(mode))) {
      process.exit(1);
    }
  }

  /** Synchronizes the root README version and reports success without exiting. */
  async synchronize(mode: SynchronizationMode): Promise<boolean> {
    try {
      await Promise.resolve();
      const workspaceRoot = process.cwd();
      const version =
        this.readmeVersionService.readPackageVersion(workspaceRoot);
      const isSync = this.readmeVersionService.isSynchronized(workspaceRoot);

      if (mode === "check") {
        return this.checkSync(version, isSync);
      }

      return this.writeSync(workspaceRoot, version, isSync);
    } catch (error) {
      const message = error instanceof Error ? error.stack : String(error);
      this.logger.error(
        "💥 Failed synchronizing the root README version",
        message,
      );
      return false;
    }
  }
}
