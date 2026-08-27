import path from "node:path";

import { ConfigurationService, InputService } from "@codometer/configuration";
import { Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import { LoggerService } from "@codebase/logger";

import { DeliveryService } from "../delivery/delivery.service";
import { ReportService } from "../report/report.service";
import { RunPlanService } from "../run-plan/run-plan.service";

import { CodometerService } from "./codometer.service";

import type { ReportFindingsArguments } from "../run-plan/run-plan.types";
import type {
  CodometerCommandOptions,
  MeasurementResult,
} from "./codometer.types";
import type { ResolvedCodometerConfiguration } from "@codometer/configuration";

/**
 * CLI entry point for the repository measurement workflow.
 */
@Command({
  description: "Run the codometer command",
  name: "codometer",
})
@Injectable()
export class CodometerCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly configurationService: ConfigurationService,
    private readonly codometerService: CodometerService,
    private readonly deliveryService: DeliveryService,
    private readonly reportService: ReportService,
    private readonly runPlanService: RunPlanService,
    private readonly inputService: InputService,
    private readonly logger: LoggerService,
  ) {
    super();
    this.logger.setContext(CodometerCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Say which files were left out because codometer writes them.
   *
   * Announced rather than left to be noticed. A file missing from the counts
   * with no explanation reads as a measurement bug, and the last repository to
   * hit this wrote the exclusion into its ignore file by hand.
   */
  private announceOutputPaths(outputPaths: string[]): void {
    if (outputPaths.length === 0) {
      return;
    }

    this.logger.info(
      `📊 Excluded the files codometer writes from what it measures`,
      undefined,
      { paths: outputPaths },
    );
  }

  /**
   * Read the configuration, or say why it could not be read.
   *
   * A configuration nothing can parse fails the run rather than being taken as
   * an empty one. An empty configuration measures the whole tree and gates
   * nothing, which is exactly the run a broken limit would have to be caught
   * by.
   */
  private async readConfiguration(
    options: CodometerCommandOptions,
    workingDirectory: string,
  ): Promise<ResolvedCodometerConfiguration | undefined> {
    try {
      const configuration = await this.configurationService.loadConfiguration({
        configurationPath: options.config,
        searchDirectory: workingDirectory,
      });

      this.logger.debug("🗂️ Loaded the configuration", undefined, {
        configuredPath: options.config,
      });

      return configuration;
    } catch (error: unknown) {
      this.logger.error(`📊 Rejected the configuration`, undefined, {
        reason: error instanceof Error ? error.message : String(error),
      });
      process.exitCode = 1;
      return undefined;
    }
  }

  /** Report every breached limit, and say whether one of them fails the run. */
  private reportBreaches(args: ReportFindingsArguments): boolean {
    const breached = args.measurement.limits.filter((limit) => limit.breached);
    const failing = breached.filter((limit) => limit.severity === "fail");
    const warning = breached.filter((limit) => limit.severity === "warn");

    if (warning.length > 0) {
      this.logger.warn(`📊 Breached a warning limit`, undefined, {
        limits: warning,
      });
    }

    if (failing.length > 0) {
      this.logger.error(`📊 Breached a failing limit`, undefined, {
        limits: failing,
      });
    }

    return args.mode.checksLimits && failing.length > 0;
  }

  /**
   * Report every breached documentation length limit, and say whether one of
   * them fails the run. Mirrors `reportBreaches`' limit-breach vocabulary.
   */
  private reportDocumentationBreaches(args: ReportFindingsArguments): boolean {
    const breached = args.measurement.documentation.filter(
      (entry) => entry.breached,
    );
    const failing = breached.filter((entry) => entry.severity === "fail");
    const warning = breached.filter((entry) => entry.severity === "warn");

    if (warning.length > 0) {
      this.logger.warn(`📊 Breached a documentation length limit`, undefined, {
        documentation: warning,
      });
    }

    if (failing.length > 0) {
      this.logger.error(`📊 Breached a documentation length limit`, undefined, {
        documentation: failing,
      });
    }

    return args.mode.checksLimits && failing.length > 0;
  }

  /**
   * Report whatever the run could not do, and say whether it fails the run.
   *
   * A failure is neither staleness nor a breach: it is the run not having
   * finished. It stops any run that produces or gates an output, because a
   * report built from a partial measurement is not one to publish and a gate
   * that could not be evaluated has not been passed. A run that does neither
   * says so and exits clean, exactly as its flags promised.
   */
  private reportFailures(args: ReportFindingsArguments): boolean {
    if (args.measurement.failures.length === 0) {
      return false;
    }

    this.logger.error(`📊 Failed to measure part of the run`, undefined, {
      failures: args.measurement.failures,
    });

    return (
      args.mode.checksLimits || args.mode.checksReports || args.mode.writes
    );
  }

  /** Weigh every finding, set the exit code once, and say the run is done. */
  private reportFindings(args: ReportFindingsArguments): void {
    const failed = this.reportFailures(args);
    const stale = this.reportStaleness(args);
    const breached = this.reportBreaches(args);
    const documented = this.reportDocumentationBreaches(args);

    if (failed || stale || breached || documented) {
      process.exitCode = 1;
    }

    this.logger.info("✅ Finished the codometer run", undefined, {
      breachCount: args.measurement.limits.filter((limit) => limit.breached)
        .length,
      targetCount: args.measurement.targets.length,
    });
  }

  /** Report every stale destination, and say whether that fails the run. */
  private reportStaleness(args: ReportFindingsArguments): boolean {
    if (args.stalePaths.length === 0) {
      return false;
    }

    this.logger.error(`📊 Found stale reports`, undefined, {
      paths: args.stalePaths,
    });

    return true;
  }

  /**
   * Resolve the directory the run measures, and announce that it started.
   */
  private resolveWorkingDirectory(options: CodometerCommandOptions): string {
    const workingDirectory = path.resolve(
      this.parseDirectory(options.directory),
    );

    this.logger.debug("🚀 Started the codometer run", undefined, {
      directory: workingDirectory,
    });

    return workingDirectory;
  }

  // 🌎 Public Methods

  /**
   * Parse the set of things the run fails on from command-line input.
   *
   * The parser runs only when `--check` carries a value, so anything reaching
   * it is a written set. A `--check` with no value never arrives here at all
   * and is refused later, because a set with nothing in it is indistinguishable
   * from the flag having been left off — which is how check mode once silently
   * became write mode.
   */
  @Option({
    description: `Fail on a comma-separated set drawn from "reports" and "limits"`,
    flags: "--check [check]",
  })
  public parseCheck(value: string): string {
    return value;
  }

  /**
   * Parse the optional configuration path from command-line input.
   */
  @Option({
    description: "Path to the codometer configuration file",
    flags: "--config [config]",
  })
  public parseConfig(value: string | undefined): string | undefined {
    return value;
  }

  /**
   * Parse the directory option from command-line input.
   */
  @Option({
    description: "Directory to analyze",
    flags: "-d, --directory [directory]",
  })
  public parseDirectory(value: unknown): string {
    return this.inputService.parseDirectoryOption(value);
  }

  /**
   * Parse the optional report path from command-line input.
   */
  @Option({
    description: "Path to write the report to; the console when omitted",
    flags: "--json [json]",
  })
  public parseJson(value: string | undefined): string | undefined {
    return value;
  }

  /**
   * Parse the optional badge document path from command-line input.
   */
  @Option({
    description:
      "Path to write the rendered badges to as a whole document; the console when omitted",
    flags: "-m, --markdown [markdown]",
  })
  public parseMarkdown(value: string | undefined): string | undefined {
    return value;
  }

  /**
   * Parse the required splice destination from command-line input.
   *
   * The path is mandatory and never defaulted. Splicing rewrites a file
   * somebody else wrote the rest of, so a run that guessed the filename would
   * edit a document nobody pointed it at.
   */
  @Option({
    description:
      "Markdown file to splice the badge block into, between its markers",
    flags: "--readme <readme>",
  })
  public parseReadme(value: string): string {
    return value;
  }

  /**
   * Parse the write flag from command-line input.
   *
   * A boolean flag reaches the parser as `undefined` when it carries no value,
   * and the parser runs only when the flag is present, so presence is the
   * whole signal.
   */
  @Option({
    description: "Write every resolved destination",
    flags: "--write",
  })
  public parseWrite(value: boolean | undefined): boolean {
    return value ?? true;
  }

  /**
   * Measure the repository and produce every resolved output.
   *
   * Flags are independent: `--write` writes, `--check reports` fails on a stale
   * report, `--check limits` fails on a breached limit, and none of them turns
   * another on. Every output is produced before any finding is weighed, so a
   * run that writes and gates leaves the report behind even when the gate
   * trips.
   */
  async run(
    _passedParameters: string[],
    options: CodometerCommandOptions,
  ): Promise<void> {
    const workingDirectory = this.resolveWorkingDirectory(options);
    const { errors, mode } = this.runPlanService.selectMode(options);

    if (errors.length > 0) {
      this.logger.error(`📊 Rejected the command line`, undefined, {
        reasons: errors,
      });
      process.exitCode = 1;
      return;
    }

    const configuration = await this.readConfiguration(
      options,
      workingDirectory,
    );

    if (configuration === undefined) {
      return;
    }

    const destinations = this.runPlanService.resolveDestinations({
      configuration,
      options,
      workingDirectory,
    });
    const outputPaths = this.runPlanService.listOutputPaths({
      destinations,
      workingDirectory,
    });

    this.announceOutputPaths(outputPaths);

    const measurement: MeasurementResult = this.codometerService.measure({
      configuration,
      outputPaths,
      workingDirectory,
    });
    const report = this.reportService.build(measurement);
    const stalePaths = this.deliveryService.deliver({
      destinations,
      measurement,
      mode,
      report,
      scope: this.runPlanService.selectScope(workingDirectory),
    });

    this.reportFindings({ measurement, mode, stalePaths });
  }
}
