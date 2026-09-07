/**
 * What synchronization is held to, measured rather than assumed.
 *
 * Ten frames down `SynchronizationCommand.run`, the top-level command every
 * synchronizer runs beneath.
 *
 * No `maximumBreadth`. Two callables tie at the project's widest, nine, and
 * they are not the same shape. `SynchronizationCommand.synchronize`
 * dispatches to one `synchronize` method per registered synchronizer, so its
 * width is that fixed roster rather than a budget to hold down.
 * `PullRequestLabelsCommand.reconcile` is ordinary sequential orchestration
 * with error handling: list the repository's labels, bail out on failure,
 * plan the reconciliation, bail out on that failing too, then report the
 * plan and report what is stale — a width that grows by one every time a
 * step or a failure branch is added, rather than a budget. A tie decides
 * against gating: holding the fixed roster down would also hold down the
 * orchestrator sitting beside it at the same number, and gating it would
 * fire on the next ordinary step and say nothing about the shape of the
 * code. The measurement is deliberately not quoted here, because nothing
 * would check it — a sentence naming a number no gate enforces goes false
 * the first time somebody adds a step, which is the decay this whole
 * arrangement exists to end. Run `breadth` against this project to read it.
 * Breadth is left out of this gate until there is a number worth holding.
 *
 * Measured by a run scoped to this project and its dependency closure, and set
 * **at** what it measured rather than above it: a stack at the limit passes, so
 * this gate is green the day it arrives and the number is a starting point to
 * ratchet down from rather than a target to grow into.
 *
 * @see configuration/callidescope.config.ts — the limits this file falls back
 * to for everything it does not name, and why it neither spreads nor imports
 * them
 */
export default {
  limits: {
    maximumDepth: 10,
  },
};
