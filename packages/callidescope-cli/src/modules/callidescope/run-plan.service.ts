import path from "node:path";

import { ConfigurationService } from "@callidescope/configuration";
import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logger";

import {
  CHECK_BREADTH,
  CHECK_DEPTH,
  CHECK_NAMES,
  CHECK_REPORTS,
  CHECK_SEPARATOR,
} from "./run-plan.constants";

import type { CallidescopeCommandOptions } from "./callidescope.types";
import type { PreparedRun, RunMode, RunModeSelection } from "./run-plan.types";
import type {
  ResolvedCallidescopeConfiguration,
  ResolvedCallidescopeMarkdownOutputConfiguration,
} from "@callidescope/configuration";

/**
 * Reads the command line and configuration into what the run will do.
 *
 * Kept away from the command itself so the flag semantics — and now the
 * configuration a run resolves to — can be stated once and tested without
 * the command's own output/reporting concerns: which flag writes, which
 * flag fails, and whether the configuration a run resolved to can even
 * support what was asked of it, are questions this service answers on its
 * own, before `CallidescopeCommand` does anything with the result.
 */
@Injectable()
export class RunPlanService {
  // 🏗 Dependency Injection

  constructor(
    private readonly configurationService: ConfigurationService,
    private readonly logger: LoggerService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** States what `--check` accepts, in front of whatever went wrong. */
  private describeAcceptedCheckNames(problem: string): string {
    return `${problem}. It takes a comma-separated set drawn from ${CHECK_NAMES.map((name) => `"${name}"`).join(" and ")}, as in "--check ${CHECK_NAMES.join(CHECK_SEPARATOR)}".`;
  }

  /**
   * Reads the `--check` value into the set of things the run fails on.
   *
   * A flag passed without a value arrives as `true` and is a mistake rather
   * than a shorthand: it used to mean "fail on a deep stack and on a stale
   * report at once", and a set with nothing in it looks exactly like the flag
   * having been left off.
   */
  private readCheckNames(
    value: string | true | undefined,
    errors: string[],
  ): Set<string> {
    if (value === undefined) {
      return new Set();
    }

    if (value === true) {
      errors.push(this.describeAcceptedCheckNames("--check needs a value"));
      return new Set();
    }

    const names = value
      .split(CHECK_SEPARATOR)
      .map((name) => name.trim())
      .filter((name) => name !== "");

    // An empty or comma-only value is the same mistake as a valueless flag and
    // is refused the same way. Read as "gate nothing" it would be a gate that
    // cannot fail — `--check "$GATES"` with the variable unset would pass
    // forever over a stack twice as deep as anything allowed, which is worse
    // than no gate at all because it looks like protection.
    if (names.length === 0) {
      errors.push(this.describeAcceptedCheckNames("--check needs a value"));
      return new Set();
    }

    return this.validateCheckNames(names, errors);
  }

  /** Merges the markdown destination a flag named over the configured one. */
  private resolveMarkdownDestination(args: {
    configuration: ResolvedCallidescopeConfiguration;
    markdown: string | undefined;
  }): ResolvedCallidescopeMarkdownOutputConfiguration | undefined {
    const configured = args.configuration.output.markdown;

    if (args.markdown === undefined) {
      return configured;
    }

    return this.configurationService.resolveConfiguration({
      output: { markdown: { path: args.markdown } },
    }).output.markdown;
  }

  /** Keeps the names `--check` knows and complains about the rest. */
  private validateCheckNames(names: string[], errors: string[]): Set<string> {
    const accepted = new Set<string>();

    for (const name of names) {
      if (CHECK_NAMES.includes(name)) {
        accepted.add(name);
        continue;
      }

      errors.push(
        this.describeAcceptedCheckNames(`--check does not accept "${name}"`),
      );
    }

    return accepted;
  }

  // 🌎 Public Methods

  /**
   * Reads the command line and configuration into what the run will do.
   *
   * Returns nothing when either was rejected: the rejection is already
   * logged and the exit code already set, so the caller only has to notice
   * the absence and stop.
   */
  public async prepareRun(
    options: CallidescopeCommandOptions,
  ): Promise<PreparedRun | undefined> {
    const { errors, mode } = this.selectMode(options);

    if (errors.length > 0) {
      this.logger.error(`🔭 Rejected the command line`, undefined, {
        reasons: errors,
      });
      process.exitCode = 1;
      return undefined;
    }

    // Resolved again rather than trusting the parser: the flag may be absent,
    // in which case no parser ran at all.
    const workspaceRoot = path.resolve(options.directory ?? process.cwd());

    this.logger.debug("🔭 Starting a call-stack trace", undefined, {
      format: options.format,
      workspaceRoot,
    });

    const loaded = await this.configurationService.loadConfiguration({
      configurationPath: options.config,
      searchDirectory: workspaceRoot,
    });
    const configuration: ResolvedCallidescopeConfiguration = {
      ...loaded,
      output: {
        format: options.format ?? loaded.output.format,
        json:
          options.json === undefined
            ? loaded.output.json
            : { indentation: 2, path: options.json },
        markdown: this.resolveMarkdownDestination({
          configuration: loaded,
          markdown: options.markdown,
        }),
        mermaid: loaded.output.mermaid,
        projectReadmes: loaded.output.projectReadmes,
      },
    };

    const configurationErrors = this.validateConfiguration({
      configuration,
      mode,
    });

    if (configurationErrors.length > 0) {
      this.logger.error(`🔭 Rejected the configuration`, undefined, {
        reasons: configurationErrors,
        workspaceRoot,
      });
      process.exitCode = 1;
      return undefined;
    }

    return { configuration, mode, workspaceRoot };
  }

  /**
   * Reads the flags into what the run writes and what it fails on.
   *
   * `--write --check reports` is refused rather than obeyed: nothing can be
   * stale immediately after being written, so a run asking for both has
   * misunderstood one of them and would pass whatever it was meant to catch.
   */
  public selectMode(options: CallidescopeCommandOptions): RunModeSelection {
    const errors: string[] = [];
    const names = this.readCheckNames(options.check, errors);
    const writes = options.write === true;

    if (writes && names.has(CHECK_REPORTS)) {
      errors.push(
        `--write cannot be combined with --check ${CHECK_REPORTS}: a report cannot be stale in the run that just wrote it. Drop one of them, or run --write and --check ${CHECK_REPORTS} separately.`,
      );
    }

    return {
      errors,
      mode: {
        checksBreadth: names.has(CHECK_BREADTH),
        checksDepth: names.has(CHECK_DEPTH),
        checksReports: names.has(CHECK_REPORTS),
        writes,
      },
    };
  }

  /**
   * Whether a run reads or rewrites the files its reports live in.
   *
   * A run that neither writes nor compares leaves every destination alone: it
   * prints what it traced and nothing else. That is what makes a bare run safe
   * to use at a prompt inside somebody's checkout.
   */
  public touchesFiles(mode: RunMode): boolean {
    return mode.checksReports || mode.writes;
  }

  /**
   * Checks the resolved configuration against what the run mode requires.
   *
   * No default exists for `maximumBreadth`, unlike every other limit: a run
   * asked to gate on it without one configured is refused outright rather
   * than silently passing, which is what falling back to an unbounded limit
   * would otherwise look like.
   */
  public validateConfiguration(args: {
    configuration: ResolvedCallidescopeConfiguration;
    mode: RunMode;
  }): string[] {
    if (
      !args.mode.checksBreadth ||
      args.configuration.limits.maximumBreadth !== undefined
    ) {
      return [];
    }

    return [
      "--check breadth requires limits.maximumBreadth to be set. Add `limits: { maximumBreadth: <number> }` to your callidescope.config.ts before running --check breadth.",
    ];
  }
}
