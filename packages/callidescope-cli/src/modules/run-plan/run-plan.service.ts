import {
  ConfigurationService,
  flagResolutionError,
  FlagResolutionService,
} from "@callidescope/configuration";
import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logger";

import {
  CHECK_BREADTH,
  CHECK_DEPTH,
  CHECK_NAMES,
  CHECK_REPORTS,
  CHECK_SEPARATOR,
  DESTINATION_FLAG_NAMES,
} from "./run-plan.constants";

import type { AddressCommandOptions } from "../address-lookup/address-lookup.types";
import type { CallidescopeCommandOptions } from "../callidescope/callidescope.types";
import type {
  PreparedLookup,
  PreparedRun,
  RunMode,
  RunModeSelection,
} from "./run-plan.types";
import type { ProjectLimitsLookup } from "@callidescope/configuration";

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
    private readonly flagResolutionService: FlagResolutionService,
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

  /**
   * Reports a command line nothing can be done with, and fails the run.
   *
   * Two gates reach this rather than one: what `--check` and `--write` mean
   * together is decided from the command line alone, while whether a
   * destination flag has anything to override needs the configuration loaded
   * first. Both report under the same headline, so which of the two refused
   * is a detail of the reasons rather than of the message.
   */
  private reject(reasons: readonly string[]): void {
    this.logger.error("🔭 Rejected the command line", undefined, { reasons });
    process.exitCode = 1;
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
   * Reads `depth` and `breadth`'s scoping flags into a workspace root and a
   * resolved configuration, with no `--check`/`--write` mode to select.
   *
   * A lookup command never writes or compares a destination, so it has no
   * mode to reject in the first place — only the workspace to trace and the
   * format to print in, both of which every run already resolves the same
   * way `prepareRun` does.
   *
   * A refused command line is thrown rather than returned: unlike a run,
   * every caller here needs the resolved workspace to do anything at all, so
   * there is no half-prepared lookup to hand back. `InputError` is the class
   * every command already reports as a rejected command line.
   */
  public async prepareLookup(
    options: AddressCommandOptions,
  ): Promise<PreparedLookup> {
    const workspaceRoot = process.cwd();
    // The file-aware load rather than the plain one, for the same reason
    // `prepareRun` uses it: a lookup resolves a configuration beside every
    // project it reaches, so it has to know which file it has already read as
    // this run's own. Without the path, a run pointed at a configuration
    // sitting at some project's root has that file read a second time as that
    // project's — and refused for the workspace-only fields it legitimately
    // sets.
    const {
      authored,
      configuration: loaded,
      path: configurationPath,
    } = await this.configurationService.loadConfigurationFile({
      configurationPath: options.config,
      searchDirectory: workspaceRoot,
    });
    const { configuration, errors, format } =
      this.flagResolutionService.resolveRunFlags({
        configuration: loaded,
        flags: { directories: options.directories, format: options.format },
      });

    if (errors.length > 0) {
      throw flagResolutionError(errors);
    }

    return {
      authoredLimits: authored.limits,
      configuration,
      configurationPath,
      format,
      workspaceRoot,
    };
  }

  /**
   * Reads the command line and configuration into what the run will do.
   *
   * Returns nothing when the command line was rejected: the rejection is
   * already logged and the exit code already set, so the caller only has to
   * notice the absence and stop. A run's configuration can still be rejected
   * after this — `--check breadth` needs to know which projects a run
   * reached before it can say whether any of them declared a limit, which
   * `validateProjectLimits` answers only once a trace has resolved that.
   */
  public async prepareRun(
    options: CallidescopeCommandOptions,
  ): Promise<PreparedRun | undefined> {
    const { errors: modeErrors, mode } = this.selectMode(options);

    if (modeErrors.length > 0) {
      this.reject(modeErrors);
      return undefined;
    }

    const workspaceRoot = process.cwd();

    this.logger.debug("🔭 Starting a call-stack trace", undefined, {
      format: options.format,
      workspaceRoot,
    });

    // The file-aware load rather than the plain one: the trace resolves a
    // configuration beside every project it reaches, and needs to know which
    // file it has already read as this run's own so it is not read twice.
    const {
      authored,
      configuration: loaded,
      path: configurationPath,
    } = await this.configurationService.loadConfigurationFile({
      configurationPath: options.config,
      searchDirectory: workspaceRoot,
    });
    // Every combination of a flag with a configured value happens here and
    // nowhere else, under one precedence rule this service does not restate.
    const { configuration, errors, format } =
      this.flagResolutionService.resolveRunFlags({
        configuration: loaded,
        flags: {
          // The mode flags are handed over with the rest rather than held
          // back, so the resolver is given the whole command line and the
          // rule that it changes nothing for them is exercised rather than
          // merely written down. `selectMode` above is what reads them.
          check: options.check,
          directories: options.directories,
          format: options.format,
          json: options.json,
          markdown: options.markdown,
          write: options.write,
        },
      });

    if (errors.length > 0) {
      this.reject(errors);
      return undefined;
    }

    return {
      authoredLimits: authored.limits,
      configuration,
      configurationPath,
      format,
      mode,
      workspaceRoot,
    };
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

    // A destination with no verb is the one mistake this command used to make
    // silently: it exited 0, logged a finished trace, and wrote nothing. These
    // flags are destinations rather than actions — `--write` and
    // `--check reports` are the verbs — and a run given neither deliberately
    // leaves every file alone, which is what makes a bare run safe to type
    // inside somebody's checkout. So the answer is to refuse and name the
    // missing verb, never to let a destination imply one.
    const namedDestinations = DESTINATION_FLAG_NAMES.filter(
      (flag) => options[flag] !== undefined,
    );

    if (namedDestinations.length > 0 && !writes && !names.has(CHECK_REPORTS)) {
      const single = namedDestinations.length === 1;

      errors.push(
        `${namedDestinations.map((flag) => `--${flag}`).join(" and ")} ${single ? "names a destination" : "name destinations"} but nothing writes or compares ${single ? "it" : "them"}. Add --write to write ${single ? "it" : "them"}, or --check ${CHECK_REPORTS} to fail on ${single ? "it" : "them"} being out of date.`,
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
   * Checks what a trace resolved every project in scope declared, against
   * what the run mode requires.
   *
   * No default exists for `maximumBreadth`, unlike every other limit — and
   * unlike depth, no *workspace* default exists for it either: a single
   * breadth number was never something anybody could pick for a whole
   * workspace, which is why breadth has no gate at all until some project
   * picks its own. `projectLimits.byProject` is read directly rather than
   * re-derived from the files, because that map is what the gate itself is
   * judged against — asking a second way is how a run ends up reading two
   * different numbers for the same project.
   *
   * A project that wrote `maximumBreadth: undefined` is simply not asked
   * about: it is neither the reason this refuses nor a reason a project that
   * did pick a number stops being gated.
   */
  public validateProjectLimits(args: {
    mode: RunMode;
    projectLimits: ProjectLimitsLookup;
  }): string[] {
    if (!args.mode.checksBreadth) {
      return [];
    }

    const declaresBreadth = [...args.projectLimits.byProject.values()].some(
      (limits) => limits.maximumBreadth !== undefined,
    );

    if (declaresBreadth) {
      return [];
    }

    return [
      "--check breadth requires at least one project in scope to declare limits.maximumBreadth. Add `limits: { maximumBreadth: <number> }` to that project's callidescope.config.ts before running --check breadth.",
    ];
  }
}
