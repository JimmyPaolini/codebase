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
  // Optional so a missing address reaches the prompt: commander refuses a
  // required argument itself, before the command body ever runs.
  arguments: "[address]",
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

  /** Resolves the address and prints its direct callers and callees. */
  private async printBreadth(
    passedParameters: readonly string[],
    options: AddressCommandOptions,
  ): Promise<void> {
    const resolvedOptions =
      await this.inputService.resolveFormatOption(options);
    // Traced before the address is read, not after: the trace is what the
    // prompt completes against, and it is the same trace the lookup needs, so
    // asking first would either offer nothing or cost a second one.
    const workspace = await this.addressLookupService.locate(resolvedOptions);
    const address = await this.resolveAddress({
      passedParameters,
      workspace,
    });
    const resolved = this.resolveDirectCalls({ address, workspace });

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

  /** Logs why an address could not be acted on, and fails the run. */
  private rejectAddress(problem: string | undefined): void {
    this.logger.error("🔭 Rejected a callable address", undefined, {
      problem,
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
   * Reads the address argument, completing it against what the trace found
   * when it was left off.
   *
   * The prompt refuses rather than draws itself when stdin is not a terminal,
   * so a scripted run that forgot the argument fails loudly instead of
   * exiting 0 having rendered a menu nobody could answer.
   */
  private async resolveAddress(args: {
    passedParameters: readonly string[];
    workspace: LocatedWorkspace;
  }): Promise<string> {
    const address = args.passedParameters[0];

    if (address !== undefined) {
      return address;
    }

    return this.inputService.promptForAutocomplete({
      message: "Which callable? (file#qualified-name)",
      subject:
        'A callable address, as in "breadth src/foo.service.ts#FooService.bar"',
      suggestions: this.addressLookupService.listAddresses(args.workspace),
    });
  }

  /**
   * Resolves the address to a callable and its direct calls, or fails the
   * run and returns nothing.
   */
  private resolveDirectCalls(args: {
    address: string;
    workspace: LocatedWorkspace;
  }):
    | undefined
    | {
        callable: DiscoveredCallable;
        directCalls: CallableDirectCalls;
        format: CallidescopeOutputFormat;
        id: CallableId;
      } {
    const resolution = this.addressLookupService.resolve(args);
    const problem = this.addressLookupService.describeProblem({
      address: args.address,
      resolution,
    });

    if (problem !== undefined || resolution.kind !== "resolved") {
      this.rejectAddress(problem);
      return undefined;
    }

    const { id } = resolution;
    const { located } = args.workspace;
    const callable = located.callablesById.get(id);

    if (callable === undefined) {
      this.rejectAddress(
        `"${args.address}" resolved to a callable that was not traced.`,
      );
      return undefined;
    }

    return {
      callable,
      directCalls: this.breadthService.describeDirectCalls({
        callablesById: located.callablesById,
        graph: located.graph,
        id,
      }),
      format: args.workspace.configuration.output.format,
      id,
    };
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

  /**
   * Prints one callable's direct callers and callees.
   *
   * Only a refused command line is caught: it is the reader's own typing to
   * fix, so it is reported as such rather than as a crash. Anything else
   * propagates with its stack intact.
   */
  public async run(
    passedParameters: string[],
    options: AddressCommandOptions,
  ): Promise<void> {
    try {
      await this.printBreadth(passedParameters, options);
    } catch (error) {
      if (!(error instanceof InputError)) {
        throw error;
      }

      this.rejectCommandLine(error);
    }
  }
}
