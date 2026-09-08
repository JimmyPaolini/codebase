import { projectDefaults } from "../../configuration/callidescope.config.js";

/**
 * What callidescope-configuration is held to, measured rather than assumed.
 *
 * Six frames is nearly all of this package — it reads a file and resolves
 * limits — and eight is one resolver's fan-out over the fields it merges.
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
    maximumBreadth: 8,
    maximumDepth: 6,
  },
};
