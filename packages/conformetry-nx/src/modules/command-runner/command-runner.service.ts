import { Injectable } from "@nestjs/common";

import { COMMAND_RUNNER_SERVICE_NAME } from "./command-runner.constants";

/**
 * Placeholder command-runner service for the conformetry Nx package.
 */
@Injectable()
export class CommandRunnerService {
  /**
   * Returns a simple marker for command-runner usage.
   */
  public getCommandRunnerName(): string {
    return COMMAND_RUNNER_SERVICE_NAME;
  }
}
