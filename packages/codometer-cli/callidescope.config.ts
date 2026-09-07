/**
 * What codometer-cli is held to, measured rather than assumed.
 *
 * Sixteen is one under the workspace's seventeen, and the deepest of any
 * package here bar `callidescope-nx`, whose two executors are what pin that
 * seventeen. Eleven is `MeasureCommand.run`, which is the command itself.
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
    maximumBreadth: 11,
    maximumDepth: 16,
  },
};
