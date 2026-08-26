import {
  CALLIDESCOPE_OUTPUT_FORMATS,
  InputService,
} from "@callidescope/configuration";
import { BreadthService } from "@callidescope/graph";
import { Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import { LoggerService } from "@codebase/logger";

import { AddressLookupService } from "../address-lookup/address-lookup.service";
import { AddressReportService } from "../address-report/address-report.service";

import type { AddressCommandOptions } from "../address-lookup/address-lookup.types";
import type {
  CallableId,
  CallidescopeOutputFormat,
} from "@callidescope/configuration";
import type {
  CallableDirectCalls,
  DiscoveredCallable,
} from "@callidescope/graph";

/**
 * CLI entry point that prints one callable's direct callers and callees.
 */
@Command({
  arguments: "<address>",
  description:
    "Print the direct callers and callees of one callable, addressed as <file>#<qualified-name>",
  name: "breadth",
})
@Injectable()
export class BreadthCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly addressLookupService: AddressLookupService,
    private readonly addressReportService: AddressReportService,
    private readonly breadthService: BreadthService,
    private readonly inputService: InputService,
    private readonly logger: LoggerService,
  ) {
    super();
    this.logger.setContext(BreadthCommand.name);
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
        'breadth needs a callable address, as in "breadth src/foo.service.ts#FooService.bar".',
      ],
    });
    process.exitCode = 1;

    return undefined;
  }

  /**
   * Resolves the address to a callable and its direct calls, or fails the
   * run and returns nothing.
   */
  private async resolveDirectCalls(args: {
    address: string;
    options: AddressCommandOptions;
  }): Promise<
    | undefined
    | {
        callable: DiscoveredCallable;
        directCalls: CallableDirectCalls;
        format: CallidescopeOutputFormat;
        id: CallableId;
      }
  > {
    const outcome = await this.addressLookupService.lookup(args);
    const problem = this.addressLookupService.describeProblem({
      address: args.address,
      resolution: outcome.resolution,
    });

    if (problem !== undefined || outcome.resolution.kind !== "resolved") {
      this.rejectAddress(problem);
      return undefined;
    }

    const { id } = outcome.resolution;
    const callable = outcome.located.callablesById.get(id);

    if (callable === undefined) {
      this.rejectAddress(
        `"${args.address}" resolved to a callable that was not traced.`,
      );
      return undefined;
    }

    return {
      callable,
      directCalls: this.breadthService.describeDirectCalls({
        callablesById: outcome.located.callablesById,
        graph: outcome.located.graph,
        id,
      }),
      format: outcome.configuration.output.format,
      id,
    };
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

  /** Resolves the address and prints its direct callers and callees. */
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
    const resolved = await this.resolveDirectCalls({
      address,
      options: resolvedOptions,
    });

    if (resolved === undefined) {
      return;
    }

    process.stdout.write(
      this.addressReportService.renderBreadth({
        address,
        directCalls: resolved.directCalls,
        displayName: resolved.callable.node.displayName,
        format: resolved.format,
        id: resolved.id,
        location: resolved.callable.node.location,
      }),
    );
  }
}
