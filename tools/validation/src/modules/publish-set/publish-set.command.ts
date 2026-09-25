import { Injectable } from "@nestjs/common";
import { Command, CommandRunner } from "nest-commander";

import { LoggerService } from "@codebase/logger";

import { formatPublishSetSuccessMessage } from "./publish-set.constants";
import { PublishSetService } from "./publish-set.service";

/**
 * CLI command that verifies publish set tarballs and CLI binaries.
 */
@Command({
  description:
    "Verify that publish set tarballs install, typecheck, and execute CLI binaries cleanly",
  name: "publish-set",
})
@Injectable()
export class PublishSetCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly logger: LoggerService,
    private readonly publishSetService: PublishSetService,
  ) {
    super();
    this.logger.setContext(PublishSetCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Executes the publish set tarball verification and exits 0 on success, 1 on failure.
   */
  public async run(): Promise<void> {
    await Promise.resolve();

    const result = this.publishSetService.verifyPublishSet(process.cwd());

    if (result.succeeded) {
      console.info(
        formatPublishSetSuccessMessage(result.packageCount, result.binaryCount),
      );

      return;
    }

    for (const message of result.messages) {
      console.error(message);
    }

    process.exit(1);
  }
}
