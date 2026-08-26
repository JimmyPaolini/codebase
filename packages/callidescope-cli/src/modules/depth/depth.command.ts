import {
  CALLIDESCOPE_OUTPUT_FORMATS,
  InputService,
} from "@callidescope/configuration";
import { CallTreeService } from "@callidescope/graph";
import { Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import { LoggerService } from "@codebase/logger";

import { AddressLookupService } from "../address-lookup/address-lookup.service";
import { AddressReportService } from "../address-report/address-report.service";

import type { AddressCommandOptions } from "../address-lookup/address-lookup.types";
import type { CallidescopeOutputFormat } from "@callidescope/configuration";

/**
 * CLI entry point that prints the call stacks above and below one callable.
 */
@Command({
  arguments: "<address>",
  description:
    "Print every call stack above and below one callable, addressed as <file>#<qualified-name>",
  name: "depth",
})
@Injectable()
export class DepthCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly addressLookupService: AddressLookupService,
    private readonly addressReportService: AddressReportService,
    private readonly callTreeService: CallTreeService,
    private readonly inputService: InputService,
    private readonly logger: LoggerService,
  ) {
    super();
    this.logger.setContext(DepthCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Logs why an address could not be acted on, and fails the run. */
  private rejectAddress(problem: string | undefined): void {
    this.logger.error("🔭 Rejected a callable address", undefined, {
      problem,
    });
    process.exitCode = 1;
  }

  /**
   * Reads the address argument, prompting for it when it is missing and the
   * session can be prompted, or failing the run otherwise.
   */
  private async resolveAddress(
    passedParameters: readonly string[],
    canPrompt: boolean,
  ): Promise<string | undefined> {
    const address = passedParameters[0];

    if (address !== undefined) {
      return address;
    }

    if (canPrompt) {
      return this.inputService.promptForText({
        message: "Which callable? (file#qualified-name)",
      });
    }

    this.logger.error("🔭 Rejected the command line", undefined, {
      reasons: [
        'depth needs a callable address, as in "depth src/foo.service.ts#FooService.bar".',
      ],
    });
    process.exitCode = 1;

    return undefined;
  }

  /** Fills in `--format` by prompting, when it was left off and can be asked. */
  private async resolveOptions(
    options: AddressCommandOptions,
    canPrompt: boolean,
  ): Promise<AddressCommandOptions> {
    if (options.format !== undefined || !canPrompt) {
      return options;
    }

    const format = await this.inputService.promptForSelect({
      choices: CALLIDESCOPE_OUTPUT_FORMATS,
      message: "Which output format?",
    });

    return { ...options, format };
  }

  // 🌎 Public Methods

  /** Parses `--config`. */
  @Option({
    description: "Path to a callidescope configuration file",
    flags: "--config [config]",
  })
  public parseConfig(value: string | undefined): string | undefined {
    return this.inputService.parseOptionalOption(value);
  }

  /** Parses `--directories`, a comma-separated list of project directories. */
  @Option({
    description: "Comma-separated project directories to trace",
    flags: "-d, --directories [directories]",
  })
  public parseDirectories(value: string | undefined): string[] {
    return this.inputService.parseCommaDelimitedOption(value);
  }

  /** Parses `--format`. */
  @Option({
    description: "What to print: markdown, mermaid, or json",
    flags: "-f, --format [format]",
  })
  public parseFormat(value: string | undefined): CallidescopeOutputFormat {
    return this.inputService.parseFormat(value);
  }

  /** Parses the opt-out from interactive prompting. */
  @Option({
    description: "Never prompt for missing values",
    flags: "--no-interactive",
  })
  public parseInteractive(): boolean {
    return false;
  }

  /**
   * Resolves the address, traces every path above and below it, and prints
   * them.
   */
  public async run(
    passedParameters: string[],
    options: AddressCommandOptions,
  ): Promise<void> {
    const canPrompt = this.inputService.canPrompt(options.interactive);
    const address = await this.resolveAddress(passedParameters, canPrompt);

    if (address === undefined) {
      return;
    }

    const resolvedOptions = await this.resolveOptions(options, canPrompt);
    const outcome = await this.addressLookupService.lookup({
      address,
      options: resolvedOptions,
    });
    const problem = this.addressLookupService.describeProblem({
      address,
      resolution: outcome.resolution,
    });

    if (problem !== undefined || outcome.resolution.kind !== "resolved") {
      this.rejectAddress(problem);
      return;
    }

    const { id } = outcome.resolution;
    const downward = this.callTreeService.buildDownwardStacks({
      callablesById: outcome.located.callablesById,
      graph: outcome.located.graph,
      startId: id,
    });
    const upward = this.callTreeService.buildUpwardStacks({
      callablesById: outcome.located.callablesById,
      graph: outcome.located.graph,
      startId: id,
    });

    process.stdout.write(
      this.addressReportService.renderDepth({
        address,
        downward,
        format: outcome.configuration.output.format,
        upward,
      }),
    );
  }
}
