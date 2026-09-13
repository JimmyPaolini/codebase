import { projectDefaults } from "../../configuration/callidescope.config.js";

/**
 * What validation is held to, measured rather than assumed.
 *
 * Eight frames down `PullRequestMetadataCommand.run`, the deepest of this
 * project's one-sided checks.
 *
 * Measured by a run scoped to this project and its dependency closure, and set
 * **at** what it measured rather than above it: a stack at the limit passes, so
 * this gate is green the day it arrives and the number is a starting point to
 * ratchet down from rather than a target to grow into.
 *
 * No `maximumBreadth`. The widest callable is
 * `PullRequestReleaseSignificanceCommand.run`, which walks its checks in
 * sequence — resolve, parse, read rules, verify, report — ordinary fan-out
 * that grows by one every time a new check is added, rather than a budget.
 * Gating it would fire on the next such check and say nothing about the shape
 * of the code. The measurement is deliberately not quoted here, because
 * nothing would check it — a sentence naming a number no gate enforces goes
 * false the first time somebody adds a check, which is the decay this whole
 * arrangement exists to end. Run `breadth` against this project to read it.
 * Breadth is left out of this gate until there is a number worth holding.
 *
 * @see configuration/callidescope.config.ts — `projectDefaults`, spread below
 * for everything this file does not override
 */
export default {
  ...projectDefaults,
  limits: {
    maximumBreadth: undefined,
    maximumDepth: 8,
  },
};
