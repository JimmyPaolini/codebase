import { projectDefaults } from "../../configuration/callidescope.config.js";

/**
 * What synchronization is held to, measured rather than assumed.
 *
 * Ten frames down `SynchronizationCommand.run`, the top-level command every
 * synchronizer runs beneath.
 *
 * Nine direct callees at the widest, where two callables tie:
 * `SynchronizationCommand.synchronize` dispatching to one `synchronize`
 * method per registered synchronizer — a fixed roster — and
 * `PullRequestLabelsCommand.reconcile`'s ordinary sequential orchestration
 * with error handling: list the repository's labels, bail out on failure,
 * plan the reconciliation, bail out on that failing too, then report the
 * plan and report what is stale. Every traced project gates breadth now, the
 * orchestrator included, so the next step or failure branch it gains is what
 * moves this number rather than what a tie once excused it from.
 *
 * Measured by a run scoped to this project and its dependency closure, and set
 * **at** what it measured rather than above it: a stack or a callable at either
 * limit passes, so this gate is green the day it arrives and each number is a
 * starting point to ratchet down from rather than a target to grow into.
 *
 * @see configuration/callidescope.config.ts — `projectDefaults`, spread below
 * for everything this file does not override
 */
export default {
  ...projectDefaults,
  limits: {
    maximumBreadth: 9,
    maximumDepth: 10,
  },
};
