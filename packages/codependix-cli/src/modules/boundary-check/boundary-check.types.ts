// 🏷️ Types

import type { ProjectRunFailure } from "../delivery/delivery.types";
import type { GraphRunContext } from "../map/map.types";
import type { BoundaryViolation } from "@codependix/boundaries";
import type {
  CodependixBoundaryRule,
  CodependixGraphType,
} from "@codependix/configuration";

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
  readonly failures: ProjectRunFailure[];
  readonly violations: BoundaryViolation[];
}

/** Arguments accepted when judging one graph level against its rules. */
export interface LevelCheckArguments {
  readonly context: GraphRunContext;
  readonly level: CodependixGraphType;
  readonly rules: readonly CodependixBoundaryRule[];
}
