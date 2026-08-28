// 🏷️ Types

import type { BoundaryViolation } from "../boundaries/boundaries.types";
import type {
  CodependixBoundaryRule,
  CodependixGraphType,
  ResolvedCodependixConfiguration,
} from "@codependix/configuration";
import type { NxProject } from "@codependix/nx";
import type { ProjectGraph } from "@nx/devkit";

/**
 * Everything a boundary check reads about the workspace it is judging.
 *
 * Stated here rather than imported from the command-line host, so this package
 * does not depend on the thing that calls it. A host's own wider run context —
 * `codependix-cli`'s `GraphRunContext`, which also carries an export mode — is
 * structurally assignable to this, so nothing has to be repacked at the call
 * site.
 */
export interface BoundaryCheckContext {
  readonly configuration: ResolvedCodependixConfiguration;
  readonly graph: ProjectGraph;
  readonly projects: NxProject[];
  readonly workingDirectory: string;
}

/** One project whose graph could not be built, and why. */
export interface BoundaryCheckFailure {
  readonly error: string;
  readonly projectName: string;
}

/**
 * What one `--check boundaries` pass found.
 *
 * Failures are carried beside violations rather than thrown, for the same
 * reason every export pass carries them: a NestJS project that cannot boot
 * its container says nothing about whether the other thirty-six break a rule,
 * and a run that abandoned the rest would report a smaller problem than it
 * has.
 */
export interface BoundaryCheckOutcome {
  readonly failures: BoundaryCheckFailure[];
  readonly violations: BoundaryViolation[];
}

/** Arguments accepted when judging one graph level against its rules. */
export interface LevelCheckArguments {
  readonly context: BoundaryCheckContext;
  readonly level: CodependixGraphType;
  readonly rules: readonly CodependixBoundaryRule[];
}
