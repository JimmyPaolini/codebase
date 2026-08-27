import { InputError, InputService } from "@callidescope/configuration";
import { AddressDepthService } from "@callidescope/graph";
import { Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import { LoggerService } from "@codebase/logger";

import { AddressLookupService } from "../address-lookup/address-lookup.service";
import { AddressReportService } from "../address-report/address-report.service";

import type {
  AddressCommandOptions,
  LocatedWorkspace,
} from "../address-lookup/address-lookup.types";
import type {
  CallableId,
  CallidescopeOutputFormat,
} from "@callidescope/configuration";

/**
 * CLI entry point that prints the call stacks above and below one callable.
 */
@Command({
  description:
    "Print every call stack above and below one or more callables, each addressed as <file>#<qualified-name>",
  name: "depth",
})
@Injectable()
export class DepthCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly addressLookupService: AddressLookupService,
    private readonly addressReportService: AddressReportService,
    private readonly addressDepthService: AddressDepthService,
    private readonly inputService: InputService,
    private readonly logger: LoggerService,
  ) {
    super();
    this.logger.setContext(DepthCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Matches every address against the trace, or fails the run naming each one
   * that did not match.
   *
   * All or nothing: a run that printed the addresses it understood and
   * skipped the rest would put a partial report on the stream under an exit
   * code that says it succeeded for the ones it did.
   */
  private identifyAddresses(args: {
    addresses: readonly string[];
    workspace: LocatedWorkspace;
  }): undefined | { address: string; id: CallableId }[] {
    const identified: { address: string; id: CallableId }[] = [];
    const problems: string[] = [];

    for (const address of args.addresses) {
      const resolution = this.addressLookupService.resolve({
        address,
        workspace: args.workspace,
      });
      const problem = this.addressLookupService.describeProblem({
        address,
        resolution,
      });

      if (problem !== undefined || resolution.kind !== "resolved") {
        problems.push(problem ?? `"${address}" resolved to nothing.`);
        continue;
      }

      identified.push({ address, id: resolution.id });
    }

    if (problems.length > 0) {
      this.rejectAddresses(problems);
      return undefined;
    }

    return identified;
  }

  /** Traces every path above and below each resolved address, and prints them. */
  private async printDepth(options: AddressCommandOptions): Promise<void> {
    const resolvedOptions =
      await this.inputService.resolveFormatOption(options);
    // Traced before the addresses are read, not after: the trace is what the
    // prompt completes against, and it is the same trace the lookup needs, so
    // asking first would either offer nothing or cost a second one.
    const workspace = await this.addressLookupService.locate(resolvedOptions);
    const addresses = await this.resolveAddresses({
      options: resolvedOptions,
      workspace,
    });
    const identified = this.identifyAddresses({ addresses, workspace });

    if (identified === undefined) {
      return;
    }

    process.stdout.write(
      this.addressReportService.renderDepthReports({
        format: workspace.configuration.output.format,
        reports: identified.map(({ address, id }) => ({
          address,
          downward: this.addressDepthService.buildDownwardStacks({
            callablesById: workspace.located.callablesById,
            graph: workspace.located.graph,
            startId: id,
          }),
          upward: this.addressDepthService.buildUpwardStacks({
            callablesById: workspace.located.callablesById,
            graph: workspace.located.graph,
            startId: id,
          }),
        })),
      }),
    );
  }

  /** Logs why one or more addresses could not be acted on, and fails the run. */
  private rejectAddresses(problems: readonly string[]): void {
    this.logger.error("🔭 Rejected a callable address", undefined, {
      problems,
    });
    process.exitCode = 1;
  }

  /** Logs a command line the input service refused, and fails the run. */
  private rejectCommandLine(error: InputError): void {
    this.logger.error("🔭 Rejected the command line", undefined, {
      reason: error.message,
    });
    process.exitCode = 1;
  }

  /**
   * Reads `--addresses`, completing it against what the trace found when the
   * flag was left off.
   *
   * The prompt refuses rather than draws itself when stdin is not a terminal,
   * so a scripted run that forgot the flag fails loudly instead of exiting 0
   * having rendered a menu nobody could answer.
   */
  private async resolveAddresses(args: {
    options: AddressCommandOptions;
    workspace: LocatedWorkspace;
  }): Promise<readonly string[]> {
    const addresses = args.options.addresses ?? [];

    if (addresses.length > 0) {
      return addresses;
    }

    return this.inputService.promptForAutocompleteMultiselect({
      message: "Which callables? (file#qualified-name)",
      subject:
        'At least one callable address, as in "depth --addresses src/foo.service.ts#FooService.bar"',
      suggestions: this.addressLookupService.listAddresses(args.workspace),
    });
  }

  // 🌎 Public Methods

  /** Parses `--addresses`, a comma-separated list of callable addresses. */
  @Option({
    description:
      "Comma-separated callable addresses, each <file>#<qualified-name>",
    flags: "-a, --addresses [addresses]",
  })
  public parseAddresses(value: string | undefined): string[] {
    return this.inputService.parseCommaDelimitedOption(value);
  }

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

  /**
   * Resolves the addresses, traces every path above and below each, and
   * prints them.
   *
   * Only a refused command line is caught: it is the reader's own typing to
   * fix, so it is reported as such rather than as a crash. Anything else
   * propagates with its stack intact.
   */
  public async run(
    _passedParameters: string[],
    options: AddressCommandOptions,
  ): Promise<void> {
    try {
      await this.printDepth(options);
    } catch (error) {
      if (!(error instanceof InputError)) {
        throw error;
      }

      this.rejectCommandLine(error);
    }
  }
}
