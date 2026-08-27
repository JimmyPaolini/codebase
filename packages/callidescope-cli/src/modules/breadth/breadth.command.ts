import { InputError, InputService } from "@callidescope/configuration";
import { BreadthService } from "@callidescope/graph";
import { Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import { LoggerService } from "@codebase/logger";

import { AddressLookupService } from "../address-lookup/address-lookup.service";
import { AddressReportService } from "../address-report/address-report.service";

import type {
  AddressCommandOptions,
  LocatedWorkspace,
} from "../address-lookup/address-lookup.types";
import type { BreadthReport } from "../address-report/address-report.types";
import type { CallidescopeOutputFormat } from "@callidescope/configuration";

/**
 * CLI entry point that prints one callable's direct callers and callees.
 */
@Command({
  description:
    "Print the direct callers and callees of one or more callables, each addressed as <file>#<qualified-name>",
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

  /**
   * Matches every address against the trace, or fails the run naming each one
   * that did not match.
   *
   * All or nothing: a run that printed the addresses it understood and
   * skipped the rest would put a partial report on the stream under an exit
   * code that says it succeeded for the ones it did.
   */
  private buildReports(args: {
    addresses: readonly string[];
    workspace: LocatedWorkspace;
  }): BreadthReport[] | undefined {
    const reports: BreadthReport[] = [];
    const problems: string[] = [];

    for (const address of args.addresses) {
      const described = this.describeAddress({
        address,
        workspace: args.workspace,
      });

      if (typeof described === "string") {
        problems.push(described);
        continue;
      }

      reports.push(described);
    }

    if (problems.length > 0) {
      this.rejectAddresses(problems);
      return undefined;
    }

    return reports;
  }

  /**
   * Resolves one address to its callable and direct calls, or explains why it
   * could not be.
   *
   * The explanation is returned rather than logged, so the caller can gather
   * every address's before deciding the run's fate.
   */
  private describeAddress(args: {
    address: string;
    workspace: LocatedWorkspace;
  }): BreadthReport | string {
    const resolution = this.addressLookupService.resolve(args);
    const problem = this.addressLookupService.describeProblem({
      address: args.address,
      resolution,
    });

    if (problem !== undefined || resolution.kind !== "resolved") {
      return problem ?? `"${args.address}" resolved to nothing.`;
    }

    const { id } = resolution;
    const { located } = args.workspace;
    const callable = located.callablesById.get(id);

    if (callable === undefined) {
      return `"${args.address}" resolved to a callable that was not traced.`;
    }

    return {
      address: args.address,
      directCalls: this.breadthService.describeDirectCalls({
        callablesById: located.callablesById,
        graph: located.graph,
        id,
      }),
      displayName: callable.node.displayName,
      id,
      location: callable.node.location,
    };
  }

  /** Resolves the addresses and prints their direct callers and callees. */
  private async printBreadth(options: AddressCommandOptions): Promise<void> {
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
    const reports = this.buildReports({ addresses, workspace });

    if (reports === undefined) {
      return;
    }

    process.stdout.write(
      this.addressReportService.renderBreadthReports({
        format: workspace.configuration.output.format,
        reports,
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
        'At least one callable address, as in "breadth --addresses src/foo.service.ts#FooService.bar"',
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
   * Prints each named callable's direct callers and callees.
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
      await this.printBreadth(options);
    } catch (error) {
      if (!(error instanceof InputError)) {
        throw error;
      }

      this.rejectCommandLine(error);
    }
  }
}
