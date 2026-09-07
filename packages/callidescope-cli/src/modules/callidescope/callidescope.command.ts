import path from "node:path";

import {
  DEFAULT_JSON_INDENTATION,
  DEFAULT_PREVIEW_COUNT,
  DEFAULT_RUN_HEADING,
  InputService,
} from "@callidescope/configuration";
import { AddressService } from "@callidescope/graph";
import {
  MarkdownReportService,
  OutputJsonService,
  OutputMarkdownService,
} from "@callidescope/output";
import { Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import { LoggerService } from "@codebase/logger";

import { ADDRESS_NOT_FOUND_ADVICE } from "../address-lookup/address-lookup.constants";
import { ReportFindingsService } from "../report-findings/report-findings.service";
import { CHECK_NAMES } from "../run-plan/run-plan.constants";
import { RunPlanService } from "../run-plan/run-plan.service";

import {
  buildUnknownCommandMessage,
  PROJECT_README_NAME,
  readRefusalHeadline,
  REJECTED_COMMAND_LINE,
  REJECTED_CONFIGURATION,
  UnresolvedEntryPointAddressError,
} from "./callidescope.constants";
import { CallidescopeService } from "./callidescope.service";

import type {
  CallidescopeCommandOptions,
  SyncDestinationsArguments,
} from "./callidescope.types";
import type {
  CallGraphResult,
  CallidescopeOutputFormat,
  ProjectLimitsLookup,
  ResolvedCallidescopeConfiguration,
  ResolvedCallidescopeProjectReadmeConfiguration,
} from "@callidescope/configuration";
import type { UnresolvedEntryPointAddress } from "@callidescope/graph";
import type { ProjectSection } from "@callidescope/output";
import type { LogData } from "@codebase/logger";

/**
 * CLI entry point for the call-stack tracing workflow.
 *
 * `isDefault` is what makes `callidescope --check depth` work, which is the
 * invocation every piece of documentation here has always shown and the only
 * one a reader would think to type — the honest alternative was
 * `callidescope callidescope`. It stays a named command as well, so the Nx
 * targets that spell it out keep working unchanged, and `depth`, `breadth`,
 * and `limits` are still matched by name before anything falls through here.
 */
@Command({
  description: "Run the callidescope command",
  name: "callidescope",
  options: { isDefault: true },
})
@Injectable()
export class CallidescopeCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly addressService: AddressService,
    private readonly callidescopeService: CallidescopeService,
    private readonly inputService: InputService,
    private readonly outputJsonService: OutputJsonService,
    private readonly outputMarkdownService: OutputMarkdownService,
    private readonly markdownReportService: MarkdownReportService,
    private readonly reportFindingsService: ReportFindingsService,
    private readonly runPlanService: RunPlanService,
    private readonly logger: LoggerService,
  ) {
    super();
    this.logger.setContext(CallidescopeCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Builds one section per scoped project, addressed to that project's README.
   *
   * The map holds the projects the run was scoped to, so a project it only
   * measured through the dependency closure has no root here and is dropped.
   * That is the rule rather than an accident: a scoped run publishes its own
   * projects, and leaves its dependencies' READMEs to the run that is scoped
   * to them.
   */
  private buildProjectSections(args: {
    destination: ResolvedCallidescopeProjectReadmeConfiguration;
    result: CallGraphResult;
    startingProjectRoots: ReadonlyMap<string, string>;
  }): ProjectSection[] {
    return args.result.projects.flatMap((report) => {
      const root = args.startingProjectRoots.get(report.projectName);

      return root === undefined
        ? []
        : [
            {
              content: this.markdownReportService.renderProjectSection({
                heading: args.destination.heading,
                previewCount: args.destination.previewCount,
                rendering: "tree",
                report,
              }),
              path: path.join(root, PROJECT_README_NAME),
            },
          ];
    });
  }

  /**
   * States why one declared address failed to resolve, naming the project and
   * the field that declared it.
   *
   * The field is named rather than left to be inferred, matching the sibling
   * refusal this shares a catch with — which says outright which fields a
   * project configuration may set instead of leaving the reader to guess.
   *
   * An ambiguous address's candidates are rendered by `AddressService`, the
   * same renderer `depth` and `breadth` print, so what a reader is handed for
   * a declared entry point and what they are handed for an address they typed
   * are one thing said one way.
   */
  private describeUnresolvedAddress(
    unresolvedAddress: UnresolvedEntryPointAddress,
  ): string {
    const label =
      unresolvedAddress.projectName ?? "the workspace configuration";
    const { address, resolution } = unresolvedAddress;

    if (resolution.kind === "not-found") {
      return `${label} declares an entryPoints.addresses entry that resolves to nothing: "${address}". ${ADDRESS_NOT_FOUND_ADVICE}`;
    }

    if (resolution.kind === "invalid") {
      return `${label} declares an invalid entryPoints.addresses entry. ${resolution.reason}`;
    }

    return `${label} declares an entryPoints.addresses entry that matches more than one declaration: "${address}". ${this.addressService.describeCandidates(
      { address, candidates: resolution.candidates },
    )}`;
  }

  /** How many stacks a section shows before the rest are folded away. */
  private readPreviewCount(
    configuration: ResolvedCallidescopeConfiguration,
  ): number {
    return (
      configuration.output.projectReadmes?.previewCount ?? DEFAULT_PREVIEW_COUNT
    );
  }

  /**
   * Logs one refusal under its own headline, and fails the run.
   *
   * One method for four refusal channels, because they are one act: a message
   * rather than a stack trace, because every one of them is about a file
   * somebody wrote or a command line somebody typed. Each is reached before
   * anything has been printed and before any destination has been touched, so
   * a refused run leaves the checkout exactly as it found it.
   */
  private reject(headline: string, data: LogData): void {
    this.logger.error(headline, undefined, data);
    process.exitCode = 1;
  }

  /**
   * Prints the run in the requested format.
   *
   * Markdown unless asked otherwise: it is the one rendering that reads well
   * in a terminal, pastes into an issue, and is already what the file
   * destinations write, so there is no second format to keep in step. A
   * diagram printed to a terminal is mermaid source, which is what someone
   * asking for one at a prompt wants to paste somewhere that renders it.
   */
  private report(args: {
    configuration: ResolvedCallidescopeConfiguration;
    projectLimits: ProjectLimitsLookup;
    result: CallGraphResult;
  }): void {
    const { format, json } = args.configuration.output;

    if (format === "json") {
      process.stdout.write(
        this.outputJsonService.buildReport({
          destination: json ?? {
            indentation: DEFAULT_JSON_INDENTATION,
            path: "",
          },
          result: args.result,
        }),
      );

      return;
    }

    process.stdout.write(
      this.markdownReportService.renderRun({
        // Printed rather than spliced, so there is no destination to take a
        // heading or a description from and nothing above it to sit under.
        description: undefined,
        heading: DEFAULT_RUN_HEADING,
        limits: args.projectLimits,
        previewCount: this.readPreviewCount(args.configuration),
        rendering: format === "mermaid" ? "diagram" : "tree",
        result: args.result,
      }),
    );
  }

  /** Writes every configured destination, returning the stale ones. */
  private syncDestinations(args: SyncDestinationsArguments): string[] {
    const stale: string[] = [];
    const { json, markdown, mermaid } = args.configuration.output;

    if (
      json !== undefined &&
      !this.outputJsonService.sync({
        check: args.check,
        destination: json,
        result: args.result,
      })
    ) {
      stale.push(json.path);
    }

    // Both anchored destinations write the same report; they differ only in
    // whether its stacks are printed or drawn.
    for (const [destination, rendering] of [
      [markdown, "tree"],
      [mermaid, "diagram"],
    ] as const) {
      if (
        destination !== undefined &&
        !this.outputMarkdownService.sync({
          check: args.check,
          content: this.markdownReportService.renderRun({
            description: destination.description,
            heading: destination.heading,
            limits: args.projectLimits,
            previewCount: this.readPreviewCount(args.configuration),
            rendering,
            result: args.result,
          }),
          destination,
          result: args.result,
        })
      ) {
        stale.push(destination.path);
      }
    }

    const { projectReadmes } = args.configuration.output;

    if (projectReadmes !== undefined) {
      stale.push(
        ...this.outputMarkdownService.syncProjectReadmes({
          check: args.check,
          destination: projectReadmes,
          sections: this.buildProjectSections({
            destination: projectReadmes,
            result: args.result,
            startingProjectRoots: args.startingProjectRoots,
          }),
        }),
      );
    }

    return stale;
  }

  /** Traces the workspace, reports, and sets the exit code. */
  private async traceWorkspace(
    options: CallidescopeCommandOptions,
  ): Promise<void> {
    const resolvedOptions =
      await this.inputService.resolveFormatOption(options);
    const prepared = await this.runPlanService.prepareRun(resolvedOptions);

    if (prepared === undefined) {
      return;
    }

    const {
      authoredLimits,
      configuration,
      configurationPath,
      mode,
      workspaceRoot,
    } = prepared;

    const outcome = await this.callidescopeService.trace({
      authoredLimits,
      configuration,
      configurationPath,
      directories: resolvedOptions.directories ?? configuration.directories,
      workspaceRoot,
    });

    // Checked only now, and not inside `prepareRun`: whether any project in
    // scope declared `limits.maximumBreadth` is a question the trace above
    // just answered, and `prepareRun` runs before a single project has been
    // reached.
    const projectLimitErrors = this.runPlanService.validateProjectLimits({
      mode,
      projectLimits: outcome.projectLimits,
    });

    if (projectLimitErrors.length > 0) {
      this.reject(REJECTED_CONFIGURATION, {
        reasons: projectLimitErrors,
        workspaceRoot,
      });
      return;
    }

    // Checked before anything is printed or written, like every other refusal.
    if (outcome.unresolvedAddresses.length > 0) {
      throw new UnresolvedEntryPointAddressError(
        outcome.unresolvedAddresses.map((unresolvedAddress) =>
          this.describeUnresolvedAddress(unresolvedAddress),
        ),
      );
    }

    this.report({
      configuration,
      projectLimits: outcome.projectLimits,
      result: outcome.result,
    });

    // Reports are produced before either finding is weighed, so a run that
    // writes and gates leaves its reports behind even when the gate trips.
    const stalePaths = this.runPlanService.touchesFiles(mode)
      ? this.syncDestinations({
          check: mode.checksReports,
          configuration,
          projectLimits: outcome.projectLimits,
          result: outcome.result,
          startingProjectRoots: outcome.startingProjectRoots,
        })
      : [];

    this.logger.info("🔭 Finished a call-stack trace", undefined, {
      deepStackCount: outcome.result.deepStacks.length,
      staleReportCount: stalePaths.length,
      wideCallableCount: outcome.result.wideCallables.length,
    });

    this.reportFindingsService.reportFindings({
      mode,
      result: outcome.result,
      stalePaths,
    });
  }

  // 🌎 Public Methods

  /**
   * Parses the set of things the run fails on.
   *
   * The parser runs only when `--check` carries a value, so anything reaching
   * it is a written set. A `--check` with no value never arrives here and is
   * refused later: a set with nothing in it is indistinguishable from the flag
   * having been left off, which is how one flag came to gate two findings.
   */
  @Option({
    description: `Fail on a comma-separated set drawn from ${CHECK_NAMES.map((name) => `"${name}"`).join(" and ")}`,
    flags: "--check [check]",
  })
  public parseCheck(value: string): string {
    return value;
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

  /** Parses `--format`, which decides what the run prints. */
  @Option({
    description: "What to print: markdown, mermaid, or json",
    flags: "-f, --format [format]",
  })
  public parseFormat(value: string | undefined): CallidescopeOutputFormat {
    return this.inputService.parseFormat(value);
  }

  /** Parses `--json`. */
  @Option({
    description: "Path to write the JSON report to",
    flags: "--json [json]",
  })
  public parseJson(value: string | undefined): string | undefined {
    return this.inputService.parseOptionalOption(value);
  }

  /** Parses `--markdown`. */
  @Option({
    description: "Path to splice the markdown block into",
    flags: "-m, --markdown [markdown]",
  })
  public parseMarkdown(value: string | undefined): string | undefined {
    return this.inputService.parseOptionalOption(value);
  }

  /**
   * Parses `--write`, which asks for every configured destination to be
   * rewritten.
   *
   * A boolean flag reaches the parser as `undefined` when it carries no value,
   * and the parser runs only when the flag is present, so presence is the whole
   * signal.
   */
  @Option({
    description: "Write every configured destination",
    flags: "--write",
  })
  public parseWrite(value: boolean | undefined): boolean {
    return value ?? true;
  }

  /**
   * Traces the workspace, reports, and sets the exit code.
   *
   * The flags are independent: `--write` writes, `--check reports` fails on a
   * stale report, `--check depth` fails on a stack that ran too deep, and none
   * of them turns another on. A run given neither `--write` nor
   * `--check reports` leaves every file alone.
   *
   * A positional argument is refused rather than ignored. This command is the
   * default one, so anything commander could not match as a subcommand arrives
   * here as an operand instead of as `unknown command` — and a `deep` typed
   * where `depth` was meant, quietly tracing the whole workspace and passing,
   * would be a worse answer than the error it replaced.
   */
  public async run(
    passedParameters: string[],
    options: CallidescopeCommandOptions,
  ): Promise<void> {
    const [unexpected] = passedParameters;

    if (unexpected !== undefined) {
      this.reject(REJECTED_COMMAND_LINE, {
        reason: buildUnknownCommandMessage(unexpected),
      });
      return;
    }

    try {
      await this.traceWorkspace(options);
    } catch (error) {
      const headline = readRefusalHeadline(error);

      if (headline === undefined || !(error instanceof Error)) {
        throw error;
      }

      this.reject(headline, { reason: error.message });
    }
  }
}
