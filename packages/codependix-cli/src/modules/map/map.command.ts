import path from "node:path";

import { BoundaryReportService } from "@codependix/boundaries";
import { BoundaryCheckService } from "@codependix/boundary-check";
import { InputError, InputService } from "@codependix/configuration";
import { Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import { LoggerService } from "@codebase/logger";

import { CHECK_NAMES } from "../run-plan/run-plan.constants";
import { RunPlanService } from "../run-plan/run-plan.service";

import { MapService } from "./map.service";

import type { GraphRunOutcome } from "../delivery/delivery.types";
import type { RunMode } from "../run-plan/run-plan.types";
import type { MapCommandOptions } from "./map.types";
import type { BoundaryCheckOutcome } from "@codependix/boundary-check";

/**
 * CLI entry point for the codependix dependency graph workflow.
 *
 * `--write` publishes every configured export; `--check` names which finding
 * fails the run — `boundaries` for an edge breaking a declared rule, `reports`
 * for a configured destination that has gone stale. No per-graph-type
 * subcommand: which graphs run, where each project's export lands, and which
 * rules judge them is entirely a function of `codependix.config.ts`, read by
 * `@codependix/configuration`.
 *
 * The two findings are named apart because they belong on opposite sides of a
 * pull request. An export moves with the workspace it describes, so gating
 * staleness on a branch fails every branch that touched a project graph; a
 * broken boundary is caused by the branch and fixed by it. This is the split
 * `callidescope` already made between `--check depth` and `--check reports`,
 * copied wholesale down to the spelling of `reports`.
 */
@Command({
  description: "Map every configured dependency graph and export it",
  name: "map",
})
@Injectable()
export class MapCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly mapService: MapService,
    private readonly boundaryCheckService: BoundaryCheckService,
    private readonly boundaryReportService: BoundaryReportService,
    private readonly inputService: InputService,
    private readonly logger: LoggerService,
    private readonly runPlanService: RunPlanService,
  ) {
    super();
    this.logger.setContext(MapCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Logs a boundary pass's violations and failures, and reports whether the
   * run as a whole should fail.
   *
   * Violations go to the console and the exit code and nowhere else: a list of
   * things currently wrong is not a document worth publishing on the default
   * branch, and not one worth checking for staleness either.
   */
  private reportBoundaries(outcome: BoundaryCheckOutcome): boolean {
    if (outcome.failures.length > 0) {
      this.logger.error("💥 Failed running codependix", undefined, {
        failures: outcome.failures,
      });
    }

    if (outcome.violations.length > 0) {
      this.logger.error("🕸️ Found codependix boundary violations", undefined, {
        summary: this.boundaryReportService.renderSummary(outcome.violations),
        violations: this.boundaryReportService.renderViolations(
          outcome.violations,
        ),
      });
    }

    return outcome.failures.length === 0 && outcome.violations.length === 0;
  }

  /**
   * Logs why a run ended before it started, and fails it.
   *
   * A command line the input service refused — two modes named, none named
   * with no terminal to ask at, or a question walked away from — is reported
   * as a rejected command line rather than as a crash. Nothing was
   * attempted, and the reader's next move is to retype the flags, not to
   * read a stack trace.
   */
  private reportFailure(error: unknown): void {
    this.logger.error(
      error instanceof InputError
        ? "🕸️ Rejected the command line"
        : "💥 Failed running codependix",
      undefined,
      { reason: error instanceof Error ? error.message : String(error) },
    );

    process.exitCode = 1;
  }

  /**
   * Logs an outcome's failures and stale exports, and reports whether the run
   * as a whole should fail.
   *
   * Both are reported together rather than the first one short-circuiting the
   * other, since `MapService.run` already attempted every project
   * regardless of an earlier one's failure.
   */
  private reportOutcome(outcome: GraphRunOutcome): boolean {
    const staleProjects = outcome.results.filter((result) => !result.isCurrent);

    if (outcome.failures.length > 0) {
      this.logger.error("💥 Failed running codependix", undefined, {
        failures: outcome.failures,
      });
    }

    if (staleProjects.length > 0) {
      this.logger.error("🕸️ Found stale codependix exports", undefined, {
        projects: staleProjects.map((result) => result.projectName),
      });
    }

    return outcome.failures.length === 0 && staleProjects.length === 0;
  }
  /** Logs what each pass that ran verified, and nothing for one that did not. */
  private reportSuccess(args: {
    boundaryOutcome: BoundaryCheckOutcome | undefined;
    exportOutcome: GraphRunOutcome | undefined;
  }): void {
    if (args.exportOutcome !== undefined) {
      this.logger.info(
        "🕸️ Verified every configured codependix export is current",
        undefined,
        { projects: args.exportOutcome.results.length },
      );
    }

    if (args.boundaryOutcome !== undefined) {
      this.logger.info("🕸️ Verified every declared codependix boundary holds");
    }
  }

  /**
   * Runs the passes a resolved mode selected, and reports what they found.
   *
   * Split from `run` so the command line's own rejection path stays a
   * handful of lines: everything below here has a mode to act on.
   */
  private async runMode(args: {
    mode: RunMode;
    options: MapCommandOptions;
  }): Promise<void> {
    const { mode, options } = args;
    const context = await this.mapService.buildContext({
      mode: mode.writes ? "write" : "check",
      options,
      workingDirectory: path.resolve(options.directory ?? process.cwd()),
    });
    const exportOutcome = this.runPlanService.touchesFiles(mode)
      ? await this.mapService.run(context)
      : undefined;
    const boundaryOutcome = mode.checksBoundaries
      ? await this.boundaryCheckService.run(context)
      : undefined;
    const exportsPassed =
      exportOutcome === undefined || this.reportOutcome(exportOutcome);
    const boundariesPassed =
      boundaryOutcome === undefined || this.reportBoundaries(boundaryOutcome);

    if (!exportsPassed || !boundariesPassed) {
      process.exitCode = 1;
      return;
    }

    this.reportSuccess({ boundaryOutcome, exportOutcome });
  }

  // 🌎 Public Methods

  /**
   * Parses the set of findings the run fails on.
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

  /** Parses the optional configuration path from command-line input. */
  @Option({
    description: "Path to the codependix configuration file",
    flags: "--config [config]",
  })
  public parseConfig(value: string | undefined): string | undefined {
    return this.inputService.parseOptionalOption(value);
  }

  /** Parses the directory whose Nx workspace this run reads. */
  @Option({
    description: "Directory whose Nx workspace this run reads",
    flags: "-d, --directory [directory]",
  })
  public parseDirectory(value: string | undefined): string {
    return this.inputService.parsePathOption(value);
  }

  /** Parses the `--write` flag from command-line input. */
  @Option({
    description: "Write every configured export",
    flags: "--write",
  })
  public parseWrite(value: boolean | undefined): boolean {
    return this.inputService.parseFlagOption(value);
  }

  /**
   * Runs whatever the command line asked for: exports, boundaries, or both.
   *
   * Every project is attempted regardless of whether an earlier one failed —
   * both passes isolate a project's failure to itself — so this only decides
   * the exit code from what came back. The two passes are also weighed
   * independently rather than the first failure short-circuiting the second:
   * a run gating both should report both, not the one that happened to run
   * first.
   */
  async run(
    _passedParameters: string[],
    options: MapCommandOptions = {},
  ): Promise<void> {
    try {
      const { errors, mode } = await this.runPlanService.selectMode(options);

      if (errors.length > 0) {
        this.logger.error("🕸️ Rejected the command line", undefined, {
          reasons: errors,
        });
        process.exitCode = 1;
        return;
      }

      await this.runMode({ mode, options });
    } catch (error) {
      this.reportFailure(error);
    }
  }
}
