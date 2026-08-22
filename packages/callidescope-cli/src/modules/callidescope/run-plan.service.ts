import { Injectable } from "@nestjs/common";

import {
  CHECK_DEPTH,
  CHECK_NAMES,
  CHECK_REPORTS,
  CHECK_SEPARATOR,
} from "./run-plan.constants";

import type { CallidescopeCommandOptions } from "./callidescope.types";
import type { RunMode, RunModeSelection } from "./run-plan.types";

/**
 * Reads a command line into what the run will do.
 *
 * Kept away from the command itself so the flag semantics can be stated once
 * and tested without tracing anything: which flag writes and which flag fails
 * are two separate questions, and the tool used to answer both of them with
 * one boolean.
 */
@Injectable()
export class RunPlanService {
  // 🏗 Dependency Injection

  constructor() {}

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
}
