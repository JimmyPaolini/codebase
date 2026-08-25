import { BreadthService } from "@callidescope/graph";
import { Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import { LoggerService } from "@codebase/logger";

import { AddressLookupService } from "./address-lookup.service";
import { AddressReportService } from "./address-report.service";
import { TraceOptionParsingService } from "./trace-option-parsing.service";

import type { AddressCommandOptions } from "./callidescope.types";
import type { CallidescopeOutputFormat } from "@callidescope/configuration";

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
    private readonly traceOptionParsingService: TraceOptionParsingService,
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

  /** Reads the address argument, or fails the run when it is missing. */
  private requireAddress(
    passedParameters: readonly string[],
  ): string | undefined {
    const address = passedParameters[0];

    if (address === undefined) {
      this.logger.error("🔭 Rejected the command line", undefined, {
        reasons: [
          'breadth needs a callable address, as in "breadth src/foo.service.ts#FooService.bar".',
        ],
      });
      process.exitCode = 1;
    }

    return address;
  }

  // 🌎 Public Methods

  /** Parses `--config`. */
  @Option({
    description: "Path to a callidescope configuration file",
    flags: "--config [config]",
  })
  public parseConfig(value: string | undefined): string | undefined {
    return this.traceOptionParsingService.parseConfig(value);
  }

  /** Parses `--directory`. */
  @Option({
    description: "Workspace root to trace",
    flags: "-d, --directory [directory]",
  })
  public parseDirectory(value: string | undefined): string {
    return this.traceOptionParsingService.parseDirectory(value);
  }

  /** Parses `--format`. */
  @Option({
    description: "What to print: markdown, mermaid, or json",
    flags: "-f, --format [format]",
  })
  public parseFormat(value: string | undefined): CallidescopeOutputFormat {
    return this.traceOptionParsingService.parseFormat(value);
  }

  /** Parses `--projects`, a comma-separated list of Nx project names. */
  @Option({
    description: "Comma-separated Nx project names to trace",
    flags: "-p, --projects [projects]",
  })
  public parseProjects(value: string | undefined): string[] {
    return this.traceOptionParsingService.parseProjects(value);
  }

  /** Resolves the address and prints its direct callers and callees. */
  public async run(
    passedParameters: string[],
    options: AddressCommandOptions,
  ): Promise<void> {
    const address = this.requireAddress(passedParameters);

    if (address === undefined) {
      return;
    }

    const outcome = await this.addressLookupService.lookup({
      address,
      options,
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
    const callable = outcome.located.callablesById.get(id);

    if (callable === undefined) {
      this.rejectAddress(
        `"${address}" resolved to a callable that was not traced.`,
      );
      return;
    }

    const directCalls = this.breadthService.describeDirectCalls({
      callablesById: outcome.located.callablesById,
      graph: outcome.located.graph,
      id,
    });

    process.stdout.write(
      this.addressReportService.renderBreadth({
        address,
        directCalls,
        displayName: callable.node.displayName,
        format: outcome.configuration.output.format,
        id,
        location: callable.node.location,
      }),
    );
  }
}
