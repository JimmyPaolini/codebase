import { projectDefaults } from "../../configuration/callidescope.config.js";

/**
 * What codometer-changes is held to, measured rather than assumed.
 *
 * Ten, which is the figure spec #589 quotes: this package measures ten on its
 * own and was gated at the workspace's seventeen, which is to say it was not
 * gated at all. Ten is where the gate on it actually starts.
 *
 * Measured by a run scoped to this project and its dependency closure, and set
 * **at** what it measured rather than above it: a stack at the limit passes, so
 * this gate is green the day it arrives and the number is a starting point to
 * ratchet down from rather than a target to grow into.
 *
 * @see configuration/callidescope.config.ts — `projectDefaults`, spread below
 * for everything this file does not override
 */
export default {
  ...projectDefaults,
  limits: {
    maximumBreadth: 7,
    maximumDepth: 10,
  },
};
